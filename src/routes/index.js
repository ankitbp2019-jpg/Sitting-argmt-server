import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import enrollmentRoutes from './enrollmentRoutes.js';
import seatingRoutes from './seatingRoutes.js';
import scheduleRoutes from './scheduleRoutes.js';
import subjectRoutes from './subjectRoutes.js';
import examPlanRoutes from './examPlanRoutes.js';

const router = Router();

// Mount routes
router.use('/', healthRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/seating', seatingRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/subjects', subjectRoutes);
router.use('/exam-plans', examPlanRoutes);

export default router;
