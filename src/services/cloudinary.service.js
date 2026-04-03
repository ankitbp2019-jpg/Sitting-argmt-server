import { v2 as cloudinary } from 'cloudinary';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

/**
 * Upload seating plan JSON to Cloudinary
 * @param {Object} seatingPlan - The seating plan data
 * @param {string} planId - The seating plan ID
 * @returns {Promise<string>} - The Cloudinary URL
 */
export const uploadSeatingPlan = async (seatingPlan, planId) => {
  try {
    logger.info(`Uploading seating plan ${planId} to Cloudinary`);

    // Convert seating plan to JSON string
    const jsonContent = JSON.stringify(seatingPlan, null, 2);
    
    // Create a buffer from the JSON content
    const buffer = Buffer.from(jsonContent, 'utf-8');
    
    // Convert buffer to base64 for Cloudinary upload
    const base64Content = buffer.toString('base64');
    const dataURI = `data:application/json;base64,${base64Content}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: config.cloudinary.folder,
      public_id: `seating-plan-${planId}`,
      resource_type: 'raw',
      overwrite: true,
    });

    logger.info(`Seating plan ${planId} uploaded to Cloudinary: ${result.secure_url}`);
    return result.secure_url;

  } catch (error) {
    logger.error(`Error uploading seating plan ${planId} to Cloudinary:`, error);
    throw new Error(`Failed to upload seating plan: ${error.message}`);
  }
};

/**
 * Delete seating plan from Cloudinary
 * @param {string} planId - The seating plan ID
 * @returns {Promise<boolean>}
 */
export const deleteSeatingPlan = async (planId) => {
  try {
    logger.info(`Deleting seating plan ${planId} from Cloudinary`);

    const publicId = `${config.cloudinary.folder}/seating-plan-${planId}`;
    
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw'
    });

    if (result.result === 'ok') {
      logger.info(`Seating plan ${planId} deleted from Cloudinary`);
      return true;
    } else {
      logger.warn(`Could not delete seating plan ${planId} from Cloudinary: ${result.result}`);
      return false;
    }

  } catch (error) {
    logger.error(`Error deleting seating plan ${planId} from Cloudinary:`, error);
    return false;
  }
};

export default {
  uploadSeatingPlan,
  deleteSeatingPlan,
};
