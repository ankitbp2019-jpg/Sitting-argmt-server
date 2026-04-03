import { HealthService } from '../services/healthService.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export class HealthController {
  static getHealth = asyncHandler(async (req, res) => {
    const healthStatus = HealthService.getHealthStatus();
    const dbHealth = await HealthService.checkDatabaseHealth();
    
    const response = ApiResponse.success('Health check successful', {
      ...healthStatus,
      database: dbHealth
    });
    
    res.status(200).json(response);
  });
}

export default HealthController;
