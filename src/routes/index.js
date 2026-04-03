import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import enrollmentRoutes from './enrollmentRoutes.js';

const router = Router();

// Mount routes
router.use('/', healthRoutes);
router.use('/enrollments', enrollmentRoutes);

export default router;
