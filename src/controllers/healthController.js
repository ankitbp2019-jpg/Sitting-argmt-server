import { HealthService } from '../services/healthService.js';

export class HealthController {
  static async getHealth(req, res) {
    try {
      const healthStatus = HealthService.getHealthStatus();
      const dbHealth = await HealthService.checkDatabaseHealth();
      
      res.status(200).json({
        ...healthStatus,
        database: dbHealth
      });
    } catch (error) {
      res.status(500).json({
        status: 'ERROR',
        message: 'Health check failed',
        error: error.message
      });
    }
  }
}

export default HealthController;
