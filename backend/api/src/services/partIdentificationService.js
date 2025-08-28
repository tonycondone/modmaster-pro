const Part = require('../models/Part');
const Vehicle = require('../models/Vehicle');
const logger = require('../utils/logger');

/**
 * Service for identifying and matching automotive parts
 */
class PartIdentificationService {
  constructor() {
    this.partDatabase = new Map();
    this.vehicleDatabase = new Map();
    this.initializePartDatabase();
  }

  /**
   * Initialize part database with common automotive parts
   */
  initializePartDatabase() {
    // Common automotive parts with their characteristics
    const partData = [
      // Engine Parts
      { category: 'engine', name: 'Engine Block', keywords: ['block', 'engine', 'cylinder'] },
      { category: 'engine', name: 'Cylinder Head', keywords: ['head', 'cylinder', 'valve'] },
      { category: 'engine', name: 'Pistons', keywords: ['piston', 'cylinder', 'combustion'] },
      { category: 'engine', name: 'Connecting Rods', keywords: ['rod', 'connecting', 'piston'] },
      { category: 'engine', name: 'Crankshaft', keywords: ['crankshaft', 'crank', 'shaft'] },
      { category: 'engine', name: 'Camshaft', keywords: ['camshaft', 'cam', 'valve'] },
      { category: 'engine', name: 'Timing Belt', keywords: ['timing', 'belt', 'chain'] },
      { category: 'engine', name: 'Oil Pump', keywords: ['oil', 'pump', 'lubrication'] },

      // Transmission Parts
      { category: 'transmission', name: 'Transmission Case', keywords: ['transmission', 'case', 'gearbox'] },
      { category: 'transmission', name: 'Torque Converter', keywords: ['torque', 'converter', 'fluid'] },
      { category: 'transmission', name: 'Clutch Disc', keywords: ['clutch', 'disc', 'friction'] },
      { category: 'transmission', name: 'Pressure Plate', keywords: ['pressure', 'plate', 'clutch'] },
      { category: 'transmission', name: 'Flywheel', keywords: ['flywheel', 'clutch', 'engine'] },

      // Brake System
      { category: 'brake', name: 'Brake Disc', keywords: ['brake', 'disc', 'rotor'] },
      { category: 'brake', name: 'Brake Pads', keywords: ['brake', 'pad', 'friction'] },
      { category: 'brake', name: 'Brake Caliper', keywords: ['caliper', 'brake', 'piston'] },
      { category: 'brake', name: 'Brake Drum', keywords: ['drum', 'brake', 'shoe'] },
      { category: 'brake', name: 'Brake Shoes', keywords: ['shoe', 'brake', 'drum'] },
      { category: 'brake', name: 'Master Cylinder', keywords: ['master', 'cylinder', 'brake'] },
      { category: 'brake', name: 'Brake Lines', keywords: ['line', 'brake', 'fluid'] },

      // Suspension
      { category: 'suspension', name: 'Shock Absorber', keywords: ['shock', 'absorber', 'damper'] },
      { category: 'suspension', name: 'Struts', keywords: ['strut', 'suspension', 'spring'] },
      { category: 'suspension', name: 'Coil Springs', keywords: ['spring', 'coil', 'suspension'] },
      { category: 'suspension', name: 'Control Arms', keywords: ['control', 'arm', 'suspension'] },
      { category: 'suspension', name: 'Ball Joints', keywords: ['ball', 'joint', 'suspension'] },
      { category: 'suspension', name: 'Tie Rod Ends', keywords: ['tie', 'rod', 'steering'] },
      { category: 'suspension', name: 'Sway Bar', keywords: ['sway', 'bar', 'stabilizer'] },

      // Electrical
      { category: 'electrical', name: 'Alternator', keywords: ['alternator', 'generator', 'charging'] },
      { category: 'electrical', name: 'Starter Motor', keywords: ['starter', 'motor', 'ignition'] },
      { category: 'electrical', name: 'Battery', keywords: ['battery', 'power', 'electrical'] },
      { category: 'electrical', name: 'Ignition Coil', keywords: ['ignition', 'coil', 'spark'] },
      { category: 'electrical', name: 'Spark Plugs', keywords: ['spark', 'plug', 'ignition'] },
      { category: 'electrical', name: 'Wiring Harness', keywords: ['wire', 'harness', 'electrical'] },

      // Cooling System
      { category: 'cooling', name: 'Radiator', keywords: ['radiator', 'cooling', 'coolant'] },
      { category: 'cooling', name: 'Water Pump', keywords: ['water', 'pump', 'coolant'] },
      { category: 'cooling', name: 'Thermostat', keywords: ['thermostat', 'cooling', 'temperature'] },
      { category: 'cooling', name: 'Cooling Fan', keywords: ['fan', 'cooling', 'radiator'] },
      { category: 'cooling', name: 'Radiator Hoses', keywords: ['hose', 'radiator', 'coolant'] },

      // Fuel System
      { category: 'fuel', name: 'Fuel Pump', keywords: ['fuel', 'pump', 'injection'] },
      { category: 'fuel', name: 'Fuel Injectors', keywords: ['injector', 'fuel', 'injection'] },
      { category: 'fuel', name: 'Fuel Filter', keywords: ['filter', 'fuel', 'filtration'] },
      { category: 'fuel', name: 'Fuel Tank', keywords: ['tank', 'fuel', 'storage'] },
      { category: 'fuel', name: 'Fuel Lines', keywords: ['line', 'fuel', 'delivery'] },

      // Exhaust System
      { category: 'exhaust', name: 'Exhaust Manifold', keywords: ['manifold', 'exhaust', 'header'] },
      { category: 'exhaust', name: 'Catalytic Converter', keywords: ['catalytic', 'converter', 'emissions'] },
      { category: 'exhaust', name: 'Muffler', keywords: ['muffler', 'exhaust', 'silencer'] },
      { category: 'exhaust', name: 'Exhaust Pipe', keywords: ['pipe', 'exhaust', 'tailpipe'] },

      // Body Parts
      { category: 'body', name: 'Hood', keywords: ['hood', 'bonnet', 'engine'] },
      { category: 'body', name: 'Doors', keywords: ['door', 'panel', 'entry'] },
      { category: 'body', name: 'Fenders', keywords: ['fender', 'wing', 'wheel'] },
      { category: 'body', name: 'Bumper', keywords: ['bumper', 'protection', 'impact'] },
      { category: 'body', name: 'Headlights', keywords: ['headlight', 'light', 'illumination'] },
      { category: 'body', name: 'Taillights', keywords: ['taillight', 'rear', 'light'] }
    ];

    partData.forEach(part => {
      this.partDatabase.set(part.name.toLowerCase(), part);
    });

    logger.info(`Part database initialized with ${partData.length} parts`);
  }

  /**
   * Identify part from AI detection results
   */
  async identifyPart(detectionResult) {
    try {
      const { confidence, boundingBox, features, className } = detectionResult;

      // Start with the AI detected class
      let identifiedPart = this.getPartByClassName(className);

      // If not found, try to match by features
      if (!identifiedPart && features) {
        identifiedPart = this.matchPartByFeatures(features);
      }

      // If still not found, create a generic identification
      if (!identifiedPart) {
        identifiedPart = {
          category: 'unknown',
          name: className || 'Unknown Part',
          keywords: [className || 'unknown'],
          confidence: confidence * 0.5 // Reduce confidence for unknown parts
        };
      }

      // Get additional part information
      const partInfo = await this.getPartInformation(identifiedPart);

      return {
        id: this.generatePartId(),
        name: identifiedPart.name,
        category: identifiedPart.category,
        confidence: Math.min(confidence, identifiedPart.confidence || confidence),
        boundingBox,
        partNumber: partInfo.partNumber,
        brand: partInfo.brand,
        description: partInfo.description,
        estimatedPrice: partInfo.estimatedPrice,
        compatibility: partInfo.compatibility,
        condition: this.assessPartCondition(detectionResult),
        recommendations: await this.getPartRecommendations(identifiedPart)
      };
    } catch (error) {
      logger.error('Part identification error:', error);
      throw error;
    }
  }

  /**
   * Get part by AI classification name
   */
  getPartByClassName(className) {
    if (!className) return null;

    const normalizedName = className.toLowerCase();
    
    // Direct match
    if (this.partDatabase.has(normalizedName)) {
      return this.partDatabase.get(normalizedName);
    }

    // Keyword matching
    for (const [name, part] of this.partDatabase) {
      if (part.keywords.some(keyword => 
        normalizedName.includes(keyword) || keyword.includes(normalizedName)
      )) {
        return part;
      }
    }

    return null;
  }

  /**
   * Match part by visual features
   */
  matchPartByFeatures(features) {
    // This would use more sophisticated matching in a real implementation
    // For now, we'll do basic shape and size matching
    const { shape, size, color, texture } = features;

    // Example: round parts might be wheels, drums, etc.
    if (shape === 'circular') {
      if (size === 'large') {
        return this.partDatabase.get('brake disc');
      }
    }

    // Example: rectangular parts might be filters, radiators, etc.
    if (shape === 'rectangular') {
      if (texture === 'mesh' || texture === 'finned') {
        return this.partDatabase.get('radiator');
      }
    }

    return null;
  }

  /**
   * Get additional part information
   */
  async getPartInformation(identifiedPart) {
    try {
      // In a real system, this would query a comprehensive parts database
      // For now, we'll provide mock data based on part category
      
      const mockData = {
        engine: {
          brand: ['OEM', 'Bosch', 'Denso', 'NGK'],
          priceRange: [50, 500]
        },
        brake: {
          brand: ['Brembo', 'ATE', 'Zimmermann', 'Bosch'],
          priceRange: [20, 200]
        },
        suspension: {
          brand: ['Bilstein', 'KYB', 'Monroe', 'Gabriel'],
          priceRange: [30, 300]
        },
        electrical: {
          brand: ['Bosch', 'Denso', 'Valeo', 'Hella'],
          priceRange: [25, 250]
        },
        default: {
          brand: ['OEM', 'Aftermarket'],
          priceRange: [20, 150]
        }
      };

      const categoryData = mockData[identifiedPart.category] || mockData.default;
      const randomBrand = categoryData.brand[Math.floor(Math.random() * categoryData.brand.length)];
      const [minPrice, maxPrice] = categoryData.priceRange;
      const estimatedPrice = Math.floor(Math.random() * (maxPrice - minPrice) + minPrice);

      return {
        partNumber: this.generatePartNumber(identifiedPart),
        brand: randomBrand,
        description: `${identifiedPart.name} for automotive applications`,
        estimatedPrice: estimatedPrice,
        compatibility: await this.getPartCompatibility(identifiedPart)
      };
    } catch (error) {
      logger.error('Get part information error:', error);
      return {
        partNumber: 'N/A',
        brand: 'Unknown',
        description: identifiedPart.name,
        estimatedPrice: 0,
        compatibility: []
      };
    }
  }

  /**
   * Assess part condition from detection data
   */
  assessPartCondition(detectionResult) {
    const { confidence, features } = detectionResult;

    // Basic condition assessment based on confidence and features
    if (confidence > 0.9) {
      return 'excellent';
    } else if (confidence > 0.7) {
      return 'good';
    } else if (confidence > 0.5) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * Get part compatibility information
   */
  async getPartCompatibility(identifiedPart) {
    try {
      // Mock compatibility data - in reality, this would query a comprehensive database
      const mockCompatibility = [
        'Toyota Camry 2015-2020',
        'Honda Accord 2016-2021',
        'Nissan Altima 2014-2019',
        'Ford Fusion 2013-2020'
      ];

      return mockCompatibility.slice(0, Math.floor(Math.random() * 3) + 1);
    } catch (error) {
      logger.error('Get part compatibility error:', error);
      return [];
    }
  }

  /**
   * Get part recommendations
   */
  async getPartRecommendations(identifiedPart) {
    try {
      // Get related parts that might need replacement
      const relatedParts = await this.getRelatedParts(identifiedPart);
      
      // Get marketplace parts
      const marketplaceParts = await Part.findByCategory(identifiedPart.category, {
        limit: 5
      });

      return {
        relatedParts,
        marketplaceParts: marketplaceParts.data || []
      };
    } catch (error) {
      logger.error('Get part recommendations error:', error);
      return {
        relatedParts: [],
        marketplaceParts: []
      };
    }
  }

  /**
   * Get related parts that often need replacement together
   */
  getRelatedParts(identifiedPart) {
    const relatedPartsMap = {
      'brake disc': ['Brake Pads', 'Brake Caliper'],
      'brake pads': ['Brake Disc', 'Brake Fluid'],
      'shock absorber': ['Struts', 'Coil Springs'],
      'alternator': ['Battery', 'Wiring Harness'],
      'water pump': ['Thermostat', 'Radiator Hoses'],
      'clutch disc': ['Pressure Plate', 'Flywheel']
    };

    const partName = identifiedPart.name.toLowerCase();
    return relatedPartsMap[partName] || [];
  }

  /**
   * Generate part ID
   */
  generatePartId() {
    return `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate mock part number
   */
  generatePartNumber(identifiedPart) {
    const categoryPrefix = {
      engine: 'ENG',
      brake: 'BRK',
      suspension: 'SUS',
      electrical: 'ELC',
      cooling: 'COL',
      fuel: 'FUL',
      exhaust: 'EXH',
      body: 'BOD',
      transmission: 'TRN'
    };

    const prefix = categoryPrefix[identifiedPart.category] || 'GEN';
    const number = Math.floor(Math.random() * 900000) + 100000;
    
    return `${prefix}-${number}`;
  }

  /**
   * Batch identify multiple parts
   */
  async batchIdentifyParts(detectionResults) {
    try {
      const identifiedParts = [];

      for (const detection of detectionResults) {
        const identifiedPart = await this.identifyPart(detection);
        identifiedParts.push(identifiedPart);
      }

      return identifiedParts;
    } catch (error) {
      logger.error('Batch part identification error:', error);
      throw error;
    }
  }

  /**
   * Update part database with new learning data
   */
  updatePartDatabase(newPartData) {
    try {
      newPartData.forEach(part => {
        this.partDatabase.set(part.name.toLowerCase(), part);
      });

      logger.info(`Part database updated with ${newPartData.length} new parts`);
    } catch (error) {
      logger.error('Update part database error:', error);
    }
  }
}

// Export singleton instance
module.exports = new PartIdentificationService();