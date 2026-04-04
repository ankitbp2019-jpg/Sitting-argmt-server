import express from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Schedule } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { planBranchBasedSchedules, checkCapacity, generateBranchBasedSchedules } from '../services/branchSchedule.service.js';

const router = express.Router();

/**
 * @route   GET /schedules
 * @desc    Get all schedules
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
  try {
    logger.info('Fetching all schedules');
    
    const schedules = await Schedule.find()
      .sort({ date: 1 })
      .lean();
    
    logger.info(`Retrieved ${schedules.length} schedules`);
    
    return res.status(200).json(
      new ApiResponse(true, 'Schedules retrieved successfully', { schedules })
    );
  } catch (error) {
    logger.error('Error fetching schedules:', error);
    return res.status(500).json(
      new ApiResponse(500, null, 'Internal server error while fetching schedules')
    );
  }
}));

/**
 * @route   POST /schedules
 * @desc    Create a new schedule
 * @access  Private
 */
router.post('/', asyncHandler(async (req, res) => {
  try {
    const { date, session, branches, description } = req.body;
    
    if (!date || !session || !branches) {
      return res.status(400).json(
        new ApiResponse(400, null, 'Date, session, and branches are required')
      );
    }
    
    // Check for duplicate schedule
    const existingSchedule = await Schedule.findOne({
      date: new Date(date),
      session
    });
    
    if (existingSchedule) {
      return res.status(409).json(
        new ApiResponse(409, null, 'Schedule already exists for this date and session')
      );
    }
    
    const schedule = await Schedule.create({
      date: new Date(date),
      session,
      branches,
      description,
      status: 'planned'
    });
    
    logger.info(`Created schedule: ${schedule._id}`);
    
    return res.status(201).json(
      new ApiResponse(true, 'Schedule created successfully', { schedule })
    );
  } catch (error) {
    logger.error('Error creating schedule:', error);
    return res.status(500).json(
      new ApiResponse(500, null, 'Internal server error while creating schedule')
    );
  }
}));

/**
 * @route   POST /schedules/generate
 * @desc    Generate multiple schedules with date gaps
 * @access  Private
 */
router.post('/generate', asyncHandler(async (req, res) => {
  try {
    const { startDate, gapDays, sessions, branchGroups, collegeCode, year, enrollmentRangeId } = req.body;
    
    if (!startDate || !branchGroups || !Array.isArray(branchGroups)) {
      return res.status(400).json(
        new ApiResponse(400, null, 'Start date and branch groups are required')
      );
    }
    
    // Use provided values or defaults
    const defaultCollegeCode = collegeCode || 'TEST';
    const defaultYear = year || '24';
    const defaultEnrollmentRangeId = enrollmentRangeId || new mongoose.Types.ObjectId();
    const validSessions = ['morning', 'afternoon', 'evening'];
    const sessionList = sessions?.filter(s => validSessions.includes(s)) || ['morning'];
    
    const generatedSchedules = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < branchGroups.length; i++) {
      const examDate = new Date(start);
      examDate.setDate(start.getDate() + (i * (gapDays || 1)));
      
      // Build branches array with required fields
      const branches = branchGroups[i].map(branchCode => ({
        branchCode: branchCode.toUpperCase().substring(0, 2),
        year: defaultYear,
        enrollmentRangeId: defaultEnrollmentRangeId
      }));
      
      for (const session of sessionList) {
        try {
          // Check if schedule already exists
          const existing = await Schedule.findOne({
            date: { 
              $gte: new Date(examDate.setHours(0, 0, 0, 0)), 
              $lt: new Date(examDate.setHours(23, 59, 59, 999)) 
            },
            session,
            collegeCode: defaultCollegeCode
          });
          
          if (!existing) {
            const saved = await Schedule.create({
              date: examDate,
              session,
              collegeCode: defaultCollegeCode,
              branches,
              description: `Exam for branches: ${branchGroups[i].join(', ')}`
            });
            generatedSchedules.push(saved);
          }
        } catch (err) {
          logger.warn(`Skipped duplicate or invalid schedule: ${err.message}`);
        }
      }
    }
    
    logger.info(`Generated ${generatedSchedules.length} schedules`);
    
    return res.status(201).json(
      new ApiResponse(true, `Generated ${generatedSchedules.length} schedules successfully`, { 
        schedules: generatedSchedules,
        totalCreated: generatedSchedules.length 
      })
    );
  } catch (error) {
    logger.error('Error generating schedules:', error);
    return res.status(500).json(
      new ApiResponse(500, null, error.message || 'Internal server error while generating schedules')
    );
  }
}));

/**
 * @route   GET /schedules/:id
 * @desc    Get schedule by ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await Schedule.findById(id);
    
    if (!schedule) {
      return res.status(404).json(
        new ApiResponse(404, null, 'Schedule not found')
      );
    }
    
    return res.status(200).json(
      new ApiResponse(true, 'Schedule retrieved successfully', { schedule })
    );
  } catch (error) {
    logger.error('Error fetching schedule:', error);
    return res.status(500).json(
      new ApiResponse(500, null, 'Internal server error while fetching schedule')
    );
  }
}));

/**
 * @route   DELETE /schedules/:id
 * @desc    Delete schedule
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await Schedule.findByIdAndDelete(id);
    
    if (!schedule) {
      return res.status(404).json(
        new ApiResponse(404, null, 'Schedule not found')
      );
    }
    
    logger.info(`Deleted schedule: ${id}`);
    
    return res.status(200).json(
      new ApiResponse(true, 'Schedule deleted successfully')
    );
  } catch (error) {
    logger.error('Error deleting schedule:', error);
    return res.status(500).json(
      new ApiResponse(500, null, 'Internal server error while deleting schedule')
    );
  }
}));

/**
 * @route   POST /schedules/plan
 * @desc    Plan branch-based schedules (preview before generating)
 * @access  Private
 */
router.post('/plan', asyncHandler(async (req, res) => {
  try {
    const {
      branches,
      startDate,
      gapDays,
      roomConfig,
      sessions,
      autoCalculate,
      manualDates
    } = req.body;

    if (!branches || !Array.isArray(branches)) {
      return res.status(400).json(
        new ApiResponse(false, 'Branches array is required')
      );
    }

    const plan = await planBranchBasedSchedules({
      branches,
      startDate: startDate ? new Date(startDate) : null,
      gapDays: gapDays || 3,
      roomConfig: roomConfig || { rows: 6, cols: 8, roomName: 'A101' },
      sessions: sessions || ['morning'],
      autoCalculate: autoCalculate !== false,
      manualDates: manualDates?.map(d => new Date(d)) || []
    });

    return res.status(200).json(
      new ApiResponse(true, 'Schedule plan created', plan)
    );
  } catch (error) {
    logger.error('Error planning schedules:', error);
    return res.status(500).json(
      new ApiResponse(false, error.message || 'Error planning schedules')
    );
  }
}));

/**
 * @route   POST /schedules/check-capacity
 * @desc    Check room capacity for given branches
 * @access  Private
 */
router.post('/check-capacity', asyncHandler(async (req, res) => {
  try {
    const { branches, roomConfig, sessions } = req.body;

    if (!branches || !roomConfig) {
      return res.status(400).json(
        new ApiResponse(false, 'Branches and roomConfig are required')
      );
    }

    const analysis = checkCapacity({
      branches,
      roomConfig,
      sessions: sessions || ['morning']
    });

    return res.status(200).json(
      new ApiResponse(true, 'Capacity analysis complete', analysis)
    );
  } catch (error) {
    logger.error('Error checking capacity:', error);
    return res.status(500).json(
      new ApiResponse(false, error.message || 'Error checking capacity')
    );
  }
}));

/**
 * @route   POST /schedules/generate-branch-based
 * @desc    Generate branch-based schedules (same branch same day)
 * @access  Private
 */
router.post('/generate-branch-based', asyncHandler(async (req, res) => {
  try {
    const {
      branches,
      startDate,
      gapDays,
      roomConfig,
      sessions,
      autoCalculate,
      manualDates,
      strictMode
    } = req.body;

    if (!branches || !Array.isArray(branches)) {
      return res.status(400).json(
        new ApiResponse(false, 'Branches array is required')
      );
    }

    const result = await generateBranchBasedSchedules({
      branches,
      startDate: startDate ? new Date(startDate) : null,
      gapDays: gapDays || 3,
      roomConfig: roomConfig || { rows: 6, cols: 8, roomName: 'A101' },
      sessions: sessions || ['morning'],
      autoCalculate: autoCalculate !== false,
      manualDates: manualDates?.map(d => new Date(d)) || [],
      strictMode: strictMode !== false
    });

    return res.status(201).json(
      new ApiResponse(
        true,
        `Generated ${result.generated.length} schedules, skipped ${result.skipped.length}`,
        result
      )
    );
  } catch (error) {
    logger.error('Error generating branch-based schedules:', error);
    return res.status(500).json(
      new ApiResponse(false, error.message || 'Error generating schedules')
    );
  }
}));

/**
 * @route   GET /schedules/by-branch/:branchCode
 * @desc    Get all schedules for a specific branch
 * @access  Private
 */
router.get('/by-branch/:branchCode', asyncHandler(async (req, res) => {
  try {
    const { branchCode } = req.params;
    
    const schedules = await Schedule.find({
      'branches.branchCode': branchCode.toUpperCase()
    }).sort({ date: 1 }).lean();

    return res.status(200).json(
      new ApiResponse(true, `Schedules for branch ${branchCode}`, { schedules })
    );
  } catch (error) {
    logger.error('Error fetching branch schedules:', error);
    return res.status(500).json(
      new ApiResponse(false, 'Error fetching branch schedules')
    );
  }
}));

export default router;
