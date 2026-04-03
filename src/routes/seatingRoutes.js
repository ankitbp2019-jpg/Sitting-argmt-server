import express from 'express';
import { createSeatingPlan, getSeatingPlanBySchedule, updateSeatAssignment, clearSeatAssignment } from '../controllers/seatingController.js';
import { validate } from '../middlewares/validate.middleware.js';
import { body, param } from 'express-validator';

const router = express.Router();

/**
 * @route   POST /api/seating/generate
 * @desc    Create seating plan for a schedule
 * @access  Private
 */
router.post('/generate',
  [
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
      .withMessage('Room number must be a string')
      .isLength({ min: 1, max: 10 })
      .withMessage('Room number must be between 1 and 10 characters'),
    
    body('rooms.*.rows')
      .isInt({ min: 1, max: 50 })
      .withMessage('Rows must be an integer between 1 and 50'),
    
    body('rooms.*.cols')
      .isInt({ min: 1, max: 50 })
      .withMessage('Columns must be an integer between 1 and 50'),
    
    body('students')
      .isArray({ min: 1 })
      .withMessage('Students must be a non-empty array'),
    
    body('students.*')
      .notEmpty()
      .withMessage('Student enrollment number is required')
      .isString()
      .withMessage('Student enrollment number must be a string')
      .isLength({ min: 8, max: 20 })
      .withMessage('Student enrollment number must be between 8 and 20 characters')
  ],
  validate,
  createSeatingPlan
);

/**
 * @route   GET /api/seating/schedule/:scheduleId
 * @desc    Get seating plan by schedule ID
 * @access  Private
 */
router.get('/schedule/:scheduleId',
  [
    param('scheduleId')
      .notEmpty()
      .withMessage('Schedule ID is required')
      .isMongoId()
      .withMessage('Invalid schedule ID format')
  ],
  validate,
  getSeatingPlanBySchedule
);

/**
 * @route   PUT /api/seating/seat
 * @desc    Update seat assignment (drag & drop support)
 * @access  Private
 */
router.put('/seat',
  [
    body('scheduleId')
      .notEmpty()
      .withMessage('Schedule ID is required')
      .isMongoId()
      .withMessage('Invalid schedule ID format'),
    
    body('seatNumber')
      .notEmpty()
      .withMessage('Seat number is required')
      .isString()
      .withMessage('Seat number must be a string')
      .matches(/^[A-Za-z0-9\-]+-R\d+C\d+$/)
      .withMessage('Seat number must be in format: Room-R1C1 (e.g., A101-R1C1)'),
    
    body('enrollmentNumber')
      .notEmpty()
      .withMessage('Enrollment number is required')
      .isString()
      .withMessage('Enrollment number must be a string')
      .isLength({ min: 8, max: 20 })
      .withMessage('Enrollment number must be between 8 and 20 characters')
  ],
  validate,
  updateSeatAssignment
);

/**
 * @route   DELETE /api/seating/seat
 * @desc    Clear seat assignment
 * @access  Private
 */
router.delete('/seat',
  [
    body('scheduleId')
      .notEmpty()
      .withMessage('Schedule ID is required')
      .isMongoId()
      .withMessage('Invalid schedule ID format'),
    
    body('seatNumber')
      .notEmpty()
      .withMessage('Seat number is required')
      .isString()
      .withMessage('Seat number must be a string')
      .matches(/^[A-Za-z0-9\-]+-R\d+C\d+$/)
      .withMessage('Seat number must be in format: Room-R1C1 (e.g., A101-R1C1)')
  ],
  validate,
  clearSeatAssignment
);

export default router;
