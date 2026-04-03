import { Router } from 'express';
import { HealthController } from '../controllers/healthController.js';

const router = Router();

/**
 * @route   GET /
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', HealthController.getHealth);

export default router;
