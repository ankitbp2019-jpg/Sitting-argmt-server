import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

// Required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET'
];

// Validate required environment variables
const validateEnvVars = () => {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}`;
    
    if (isDevelopment) {
      logger.warn(`${errorMessage} - Using placeholder values for development`);
      // Set placeholder values for development
      if (!process.env.MONGODB_URI) {
        process.env.MONGODB_URI = 'mongodb://localhost:27017/seating-generator-dev';
      }
      if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = 'dev-secret-do-not-use-in-production';
      }
    } else {
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
  
  // Warn about optional but recommended variables
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    logger.warn('Cloudinary credentials not fully configured. PDF and JSON uploads will be disabled.');
  }
  
  logger.info('Environment variables validated successfully');
};

// Validate on module load
validateEnvVars();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || 'seating-plans',
  },
};

export default config;
