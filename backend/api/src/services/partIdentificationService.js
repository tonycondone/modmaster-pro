const logger = require('../utils/logger');
const Part = require('../models/Part');
const { Op } = require('sequelize');

/**
 * Identify parts from AI detection results
 */
async function identifyParts(detections) {
  try {
    const identifiedParts = [];

    for (const detection of detections) {
      // Try to find existing part in database
      let part = await findPartByAttributes(detection);

      if (!part) {
        // Try to identify from external databases
        part = await searchExternalDatabases(detection);
      }

      if (part) {
        identifiedParts.push({
          ...part,
          confidence: detection.confidence,
          bounding_box: detection.bbox,
          metadata: detection.metadata
        });
      } else {
        // Create placeholder for unknown part
        identifiedParts.push({
          name: detection.label || 'Unknown Part',
          category: detection.category || 'uncategorized',
          confidence: detection.confidence,
          bounding_box: detection.bbox,
          metadata: detection.metadata,
          needs_manual_review: true
        });
      }
    }

    return identifiedParts;
  } catch (error) {
    logger.error('Part identification error:', error);
    throw error;
  }
}

/**
 * Find part by attributes
 */
async function findPartByAttributes(detection) {
  const { label, attributes = {} } = detection;

  // Build search query
  const searchConditions = [];

  if (attributes.oem_number) {
    searchConditions.push({ oem_number: attributes.oem_number });
  }

  if (attributes.part_number) {
    searchConditions.push({ universal_part_number: attributes.part_number });
  }

  if (label) {
    searchConditions.push({
      name: {
        [Op.iLike]: `%${label}%`
      }
    });
  }

  if (searchConditions.length === 0) {
    return null;
  }

  try {
    const part = await Part.findOne({
      where: {
        [Op.or]: searchConditions
      }
    });

    return part ? part.toJSON() : null;
  } catch (error) {
    logger.error('Database search error:', error);
    return null;
  }
}

/**
 * Search external databases for part information
 */
async function searchExternalDatabases(detection) {
  // This would integrate with external part databases
  // For now, return null
  return null;
}

/**
 * Match parts with vehicle compatibility
 */
async function matchPartsWithVehicle(parts, vehicleInfo) {
  const compatibleParts = [];

  for (const part of parts) {
    const isCompatible = await checkCompatibility(part, vehicleInfo);
    
    compatibleParts.push({
      ...part,
      compatible: isCompatible,
      compatibility_notes: isCompatible ? null : 'Compatibility verification required'
    });
  }

  return compatibleParts;
}

/**
 * Check part compatibility with vehicle
 */
async function checkCompatibility(part, vehicleInfo) {
  if (!part.vehicle_compatibility || part.vehicle_compatibility.length === 0) {
    return true; // Universal part
  }

  const { make, model, year, engine_type } = vehicleInfo;

  return part.vehicle_compatibility.some(compat => {
    return (
      (!compat.make || compat.make === make) &&
      (!compat.model || compat.model === model) &&
      (!compat.year_start || year >= compat.year_start) &&
      (!compat.year_end || year <= compat.year_end) &&
      (!compat.engine_type || compat.engine_type === engine_type)
    );
  });
}

/**
 * Enhance part data with additional information
 */
async function enhancePartData(parts) {
  const enhancedParts = [];

  for (const part of parts) {
    const enhanced = { ...part };

    // Add pricing information
    if (part.oem_number) {
      enhanced.market_price = await getMarketPrice(part.oem_number);
    }

    // Add availability
    enhanced.availability = await checkAvailability(part);

    // Add alternatives
    enhanced.alternatives = await findAlternatives(part);

    enhancedParts.push(enhanced);
  }

  return enhancedParts;
}

/**
 * Get market price for part
 */
async function getMarketPrice(oemNumber) {
  // This would integrate with pricing services
  return null;
}

/**
 * Check part availability
 */
async function checkAvailability(part) {
  // This would check inventory systems
  return {
    in_stock: true,
    quantity: 10,
    lead_time: '2-3 days'
  };
}

/**
 * Find alternative parts
 */
async function findAlternatives(part) {
  // This would search for compatible alternatives
  return [];
}

module.exports = {
  identifyParts,
  matchPartsWithVehicle,
  enhancePartData,
  checkCompatibility
};