// Health check service
export class HealthService {
  static getHealthStatus() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    };
  }

  static async checkDatabaseHealth() {
    // Placeholder for database health check
    // Implement actual database connection check here
    return {
      status: 'connected',
      responseTime: '1ms'
    };
  }
}

export default HealthService;
