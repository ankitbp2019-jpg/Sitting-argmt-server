import express from 'express';
import { createSeatingPlan } from '../controllers/seatingController.simple.js';
import { validate } from '../middlewares/validate.middleware.js';
import { body } from 'express-validator';

const router = express.Router();

/**
 * @route   POST /api/seating/generate
 * @desc    Create seating plan for a schedule
 * @access  Private
 */
router.post('/generate',
  [
    // Basic validation
    body('scheduleId')
      .notEmpty()
      .withMessage('Schedule ID is required')
      .isMongoId()
      .withMessage('Invalid schedule ID format'),
    
    body('rooms')
      .isArray({ min: 1 })
      .withMessage('Rooms must be a non-empty array'),
    
    body('rooms.*.roomNumber')
      .notEmpty()
      .withMessage('Room number is required')
      .isString()
      .withMessage('Room number must be a string'),
    
    body('rooms.*.rows')
      .isInt({ min: 1 })
      .withMessage('Rows must be a positive integer'),
    
    body('rooms.*.cols')
      .isInt({ min: 1 })
      .withMessage('Columns must be a positive integer'),
    
    body('students')
      .isArray({ min: 1 })
      .withMessage('Students must be a non-empty array'),
    
    body('students.*')
      .notEmpty()
      .withMessage('Student enrollment number is required')
      .isString()
      .withMessage('Student enrollment number must be a string')
  ],
  validate,
  createSeatingPlan
);

export default router;
