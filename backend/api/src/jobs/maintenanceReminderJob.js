const Vehicle = require('../models/Vehicle');
const Maintenance = require('../models/Maintenance');
const User = require('../models/User');
const Part = require('../models/Part');
const jobQueue = require('../services/jobQueue');
const { EMAIL_JOB_TYPES } = require('./emailJob');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Maintenance job types
 */
const MAINTENANCE_JOB_TYPES = {
  SCHEDULE_REMINDERS: 'SCHEDULE_REMINDERS',
  SEND_SINGLE_REMINDER: 'SEND_SINGLE_REMINDER',
  CHECK_OVERDUE_MAINTENANCE: 'CHECK_OVERDUE_MAINTENANCE',
  UPDATE_MAINTENANCE_SCHEDULE: 'UPDATE_MAINTENANCE_SCHEDULE'
};

/**
 * Maintenance types with intervals
 */
const MAINTENANCE_TYPES = {
  OIL_CHANGE: {
    name: 'Oil Change',
    description: 'Engine oil and filter replacement',
    icon: 'oil-change',
    mileageInterval: 5000,
    monthsInterval: 6
  },
  TIRE_ROTATION: {
    name: 'Tire Rotation',
    description: 'Rotate tires for even wear',
    icon: 'tire-rotation',
    mileageInterval: 6000,
    monthsInterval: 6
  },
  BRAKE_INSPECTION: {
    name: 'Brake Inspection',
    description: 'Check brake pads, rotors, and fluid',
    icon: 'brake-inspection',
    mileageInterval: 12000,
    monthsInterval: 12
  },
  AIR_FILTER: {
    name: 'Air Filter Replacement',
    description: 'Engine air filter replacement',
    icon: 'air-filter',
    mileageInterval: 15000,
    monthsInterval: 12
  },
  TRANSMISSION_SERVICE: {
    name: 'Transmission Service',
    description: 'Transmission fluid change',
    icon: 'transmission',
    mileageInterval: 50000,
    monthsInterval: 48
  },
  COOLANT_FLUSH: {
    name: 'Coolant Flush',
    description: 'Cooling system flush and refill',
    icon: 'coolant',
    mileageInterval: 50000,
    monthsInterval: 60
  }
};

/**
 * Main maintenance reminder job handler
 * @param {Object} job - Bull job object
 * @returns {Promise<Object>} Job result
 */
async function processMaintenanceJob(job) {
  const { type, data } = job.data;
  const startTime = Date.now();

  try {
    logger.info('Processing maintenance job', { 
      jobId: job.id, 
      type 
    });

    let result;

    switch (type) {
      case MAINTENANCE_JOB_TYPES.SCHEDULE_REMINDERS:
        result = await scheduleReminders(data, job);
        break;

      case MAINTENANCE_JOB_TYPES.SEND_SINGLE_REMINDER:
        result = await sendSingleReminder(data, job);
        break;

      case MAINTENANCE_JOB_TYPES.CHECK_OVERDUE_MAINTENANCE:
        result = await checkOverdueMaintenance(data, job);
        break;

      case MAINTENANCE_JOB_TYPES.UPDATE_MAINTENANCE_SCHEDULE:
        result = await updateMaintenanceSchedule(data, job);
        break;

      default:
        throw new Error(`Unknown maintenance job type: ${type}`);
    }

    const duration = Date.now() - startTime;
    logger.info('Maintenance job completed', { 
      jobId: job.id, 
      type,
      duration,
      result 
    });

    return result;
  } catch (error) {
    logger.error('Maintenance job failed', { 
      jobId: job.id, 
      type,
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
}

/**
 * Schedule maintenance reminders for all vehicles
 * @param {Object} data - Job data
 * @param {Object} job - Bull job instance
 */
async function scheduleReminders(data = {}, job) {
  try {
    const { checkOverdue = true } = data;
    const remindersSent = [];
    const errors = [];

    // Get all active vehicles
    const vehicles = await Vehicle.findAll({
      where: { active: true },
      include: [
        {
          model: User,
          attributes: ['id', 'email', 'firstName', 'notificationPreferences']
        },
        {
          model: Maintenance,
          order: [['serviceDate', 'DESC']],
          limit: 10
        }
      ]
    });

    await job.progress(10);

    const totalVehicles = vehicles.length;
    let processedCount = 0;

    for (const vehicle of vehicles) {
      try {
        // Check if user wants maintenance reminders
        if (!vehicle.User?.notificationPreferences?.maintenanceReminders) {
          continue;
        }

        // Check each maintenance type
        for (const [key, maintenanceType] of Object.entries(MAINTENANCE_TYPES)) {
          const nextMaintenance = await calculateNextMaintenance(vehicle, maintenanceType);
          
          if (nextMaintenance.shouldSendReminder) {
            // Queue reminder email
            await jobQueue.addJob('email-queue', {
              type: EMAIL_JOB_TYPES.SEND_MAINTENANCE_REMINDER,
              data: {
                to: vehicle.User.email,
                firstName: vehicle.User.firstName,
                vehicle: {
                  id: vehicle.id,
                  year: vehicle.year,
                  make: vehicle.make,
                  model: vehicle.model,
                  vin: vehicle.vin,
                  mileage: vehicle.currentMileage,
                  licensePlate: vehicle.licensePlate
                },
                maintenance: {
                  type: maintenanceType,
                  nextDue: nextMaintenance.nextDue,
                  urgency: nextMaintenance.urgency,
                  recommendedParts: await getRecommendedParts(vehicle, maintenanceType),
                  history: await getMaintenanceHistory(vehicle.id, key)
                },
                urgency: nextMaintenance.urgency
              }
            });

            remindersSent.push({
              vehicleId: vehicle.id,
              userId: vehicle.User.id,
              maintenanceType: maintenanceType.name,
              urgency: nextMaintenance.urgency
            });
          }
        }

        processedCount++;
        await job.progress(10 + Math.round((processedCount / totalVehicles) * 80));
      } catch (error) {
        logger.error('Failed to process vehicle reminders', {
          vehicleId: vehicle.id,
          error: error.message
        });
        errors.push({
          vehicleId: vehicle.id,
          error: error.message
        });
      }
    }

    await job.progress(100);

    return {
      vehiclesProcessed: totalVehicles,
      remindersSent: remindersSent.length,
      errors: errors.length,
      details: {
        remindersSent,
        errors
      }
    };
  } catch (error) {
    logger.error('Failed to schedule reminders', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Calculate next maintenance for a vehicle
 * @param {Object} vehicle - Vehicle record
 * @param {Object} maintenanceType - Maintenance type configuration
 * @returns {Object} Next maintenance details
 */
async function calculateNextMaintenance(vehicle, maintenanceType) {
  try {
    // Get last maintenance of this type
    const lastMaintenance = await Maintenance.findOne({
      where: {
        vehicleId: vehicle.id,
        type: maintenanceType.name
      },
      order: [['serviceDate', 'DESC']]
    });

    let nextDueMileage;
    let nextDueDate;

    if (lastMaintenance) {
      // Calculate based on last maintenance
      nextDueMileage = lastMaintenance.mileage + maintenanceType.mileageInterval;
      nextDueDate = new Date(lastMaintenance.serviceDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + maintenanceType.monthsInterval);
    } else {
      // No previous maintenance - use vehicle purchase date or current date
      nextDueMileage = vehicle.currentMileage + maintenanceType.mileageInterval;
      nextDueDate = new Date();
      nextDueDate.setMonth(nextDueDate.getMonth() + maintenanceType.monthsInterval);
    }

    // Check if maintenance is due
    const mileageRemaining = nextDueMileage - vehicle.currentMileage;
    const daysRemaining = Math.floor((nextDueDate - new Date()) / (1000 * 60 * 60 * 24));

    let urgency = 'upcoming';
    let shouldSendReminder = false;

    // Determine urgency
    if (mileageRemaining < 0 || daysRemaining < 0) {
      urgency = 'overdue';
      shouldSendReminder = true;
    } else if (mileageRemaining < 500 || daysRemaining < 7) {
      urgency = 'due';
      shouldSendReminder = true;
    } else if (mileageRemaining < 1000 || daysRemaining < 30) {
      urgency = 'upcoming';
      shouldSendReminder = true;
    }

    return {
      nextDueMileage,
      nextDueDate,
      mileageRemaining,
      daysRemaining,
      urgency,
      shouldSendReminder
    };
  } catch (error) {
    logger.error('Failed to calculate next maintenance', {
      vehicleId: vehicle.id,
      maintenanceType: maintenanceType.name,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get recommended parts for maintenance type
 * @param {Object} vehicle - Vehicle record
 * @param {Object} maintenanceType - Maintenance type
 * @returns {Promise<Array>} Recommended parts
 */
async function getRecommendedParts(vehicle, maintenanceType) {
  try {
    // Map maintenance types to part categories
    const partCategories = {
      'Oil Change': ['Engine Oil', 'Oil Filter'],
      'Tire Rotation': ['Tires'],
      'Brake Inspection': ['Brake Pads', 'Brake Rotors', 'Brake Fluid'],
      'Air Filter Replacement': ['Air Filter'],
      'Transmission Service': ['Transmission Fluid'],
      'Coolant Flush': ['Coolant', 'Radiator']
    };

    const categories = partCategories[maintenanceType.name] || [];
    const parts = [];

    for (const category of categories) {
      const compatibleParts = await Part.findAll({
        where: {
          category,
          active: true
        },
        include: [{
          model: PartCompatibility,
          where: {
            [Op.or]: [
              {
                make: vehicle.make,
                model: vehicle.model,
                yearStart: { [Op.lte]: vehicle.year },
                yearEnd: { [Op.gte]: vehicle.year }
              },
              {
                universal: true
              }
            ]
          }
        }],
        limit: 3,
        order: [['rating', 'DESC'], ['price', 'ASC']]
      });

      parts.push(...compatibleParts.map(part => ({
        id: part.id,
        name: part.name,
        description: part.description,
        price: part.price.toFixed(2),
        image: part.images?.[0] || 'https://modmasterpro.com/default-part.jpg',
        link: `${process.env.APP_URL}/parts/${part.id}`
      })));
    }

    return parts.slice(0, 5); // Return top 5 recommended parts
  } catch (error) {
    logger.error('Failed to get recommended parts', {
      vehicleId: vehicle.id,
      maintenanceType: maintenanceType.name,
      error: error.message
    });
    return [];
  }
}

/**
 * Get maintenance history for a vehicle
 * @param {string} vehicleId - Vehicle ID
 * @param {string} maintenanceKey - Maintenance type key
 * @returns {Promise<Array>} Maintenance history
 */
async function getMaintenanceHistory(vehicleId, maintenanceKey) {
  try {
    const history = await Maintenance.findAll({
      where: {
        vehicleId,
        type: MAINTENANCE_TYPES[maintenanceKey].name
      },
      order: [['serviceDate', 'DESC']],
      limit: 5,
      attributes: ['serviceDate', 'mileage', 'cost', 'notes']
    });

    return history.map(record => ({
      date: new Date(record.serviceDate).toLocaleDateString(),
      service: record.type,
      mileage: record.mileage,
      cost: record.cost?.toFixed(2)
    }));
  } catch (error) {
    logger.error('Failed to get maintenance history', {
      vehicleId,
      error: error.message
    });
    return [];
  }
}

/**
 * Send a single maintenance reminder
 * @param {Object} data - Reminder data
 * @param {Object} job - Bull job instance
 */
async function sendSingleReminder(data, job) {
  const { vehicleId, maintenanceType, userId } = data;

  try {
    // Get vehicle and user details
    const vehicle = await Vehicle.findByPk(vehicleId, {
      include: [{ model: User }]
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    const user = vehicle.User || await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Calculate maintenance details
    const maintenance = MAINTENANCE_TYPES[maintenanceType];
    if (!maintenance) {
      throw new Error('Invalid maintenance type');
    }

    const nextMaintenance = await calculateNextMaintenance(vehicle, maintenance);

    // Queue reminder email
    await jobQueue.addJob('email-queue', {
      type: EMAIL_JOB_TYPES.SEND_MAINTENANCE_REMINDER,
      data: {
        to: user.email,
        firstName: user.firstName,
        vehicle: {
          id: vehicle.id,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          vin: vehicle.vin,
          mileage: vehicle.currentMileage,
          licensePlate: vehicle.licensePlate
        },
        maintenance: {
          type: maintenance,
          nextDue: nextMaintenance.nextDue,
          urgency: nextMaintenance.urgency,
          recommendedParts: await getRecommendedParts(vehicle, maintenance),
          history: await getMaintenanceHistory(vehicle.id, maintenanceType)
        },
        urgency: nextMaintenance.urgency
      }
    });

    return {
      success: true,
      vehicleId,
      userId: user.id,
      maintenanceType: maintenance.name,
      urgency: nextMaintenance.urgency
    };
  } catch (error) {
    logger.error('Failed to send single reminder', {
      vehicleId,
      maintenanceType,
      error: error.message
    });
    throw error;
  }
}

/**
 * Check for overdue maintenance across all vehicles
 * @param {Object} data - Job data
 * @param {Object} job - Bull job instance
 */
async function checkOverdueMaintenance(data = {}, job) {
  try {
    const overdueItems = [];

    // Get all active vehicles
    const vehicles = await Vehicle.findAll({
      where: { active: true },
      include: [{ model: User }]
    });

    for (const vehicle of vehicles) {
      for (const [key, maintenanceType] of Object.entries(MAINTENANCE_TYPES)) {
        const nextMaintenance = await calculateNextMaintenance(vehicle, maintenanceType);
        
        if (nextMaintenance.urgency === 'overdue') {
          overdueItems.push({
            vehicleId: vehicle.id,
            userId: vehicle.userId,
            maintenanceType: maintenanceType.name,
            daysOverdue: Math.abs(nextMaintenance.daysRemaining),
            milesOverdue: Math.abs(nextMaintenance.mileageRemaining)
          });

          // Send urgent reminder
          await jobQueue.addJob('maintenance-queue', {
            type: MAINTENANCE_JOB_TYPES.SEND_SINGLE_REMINDER,
            data: {
              vehicleId: vehicle.id,
              maintenanceType: key,
              userId: vehicle.userId
            }
          }, {
            priority: 1 // High priority for overdue items
          });
        }
      }
    }

    return {
      overdueCount: overdueItems.length,
      overdueItems
    };
  } catch (error) {
    logger.error('Failed to check overdue maintenance', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Update maintenance schedule for a vehicle
 * @param {Object} data - Update data
 * @param {Object} job - Bull job instance
 */
async function updateMaintenanceSchedule(data, job) {
  const { vehicleId, maintenanceRecords } = data;

  try {
    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    const updatedRecords = [];

    for (const record of maintenanceRecords) {
      // Create or update maintenance record
      const [maintenance, created] = await Maintenance.findOrCreate({
        where: {
          vehicleId,
          type: record.type,
          serviceDate: record.serviceDate
        },
        defaults: {
          mileage: record.mileage,
          cost: record.cost,
          notes: record.notes,
          serviceProvider: record.serviceProvider,
          parts: record.parts
        }
      });

      if (!created) {
        await maintenance.update({
          mileage: record.mileage,
          cost: record.cost,
          notes: record.notes,
          serviceProvider: record.serviceProvider,
          parts: record.parts
        });
      }

      updatedRecords.push({
        id: maintenance.id,
        type: maintenance.type,
        created
      });
    }

    // Update vehicle current mileage if provided
    if (data.currentMileage) {
      await vehicle.update({
        currentMileage: data.currentMileage,
        lastMaintenanceAt: new Date()
      });
    }

    return {
      vehicleId,
      recordsUpdated: updatedRecords.length,
      records: updatedRecords
    };
  } catch (error) {
    logger.error('Failed to update maintenance schedule', {
      vehicleId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  processMaintenanceJob,
  MAINTENANCE_JOB_TYPES,
  MAINTENANCE_TYPES
};