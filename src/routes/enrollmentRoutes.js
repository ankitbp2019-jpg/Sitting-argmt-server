import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { enrollmentSchema } from '../validators/enrollment.validator.js';
import { EnrollmentController } from '../controllers/enrollmentController.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

/**
 * @route   POST /enrollments
 * @desc    Create new enrollment
 * @access  Public
 */
router.post('/', validate(enrollmentSchema), EnrollmentController.create);

/**
 * @route   GET /enrollments
 * @desc    Get all enrollments
 * @access  Public
 */
router.get('/', EnrollmentController.getAll);

/**
 * @route   GET /enrollments/:id
 * @desc    Get enrollment by ID
 * @access  Public
 */
router.get('/:id', EnrollmentController.getById);

export default router;
