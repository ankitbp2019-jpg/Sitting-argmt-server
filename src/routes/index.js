import { Router } from 'express';
import healthRoutes from './healthRoutes.js';

const router = Router();

// Mount routes
router.use('/', healthRoutes);

export default router;
