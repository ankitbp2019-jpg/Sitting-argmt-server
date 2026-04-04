import express from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ExamPlan } from '../models/index.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * @route   GET /exam-plans
 * @desc    Get all exam plans
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
  try {
    const { status, academicYear } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (academicYear) query.academicYear = academicYear;
    
    const plans = await ExamPlan.find(query)
      .sort({ createdAt: -1 })
      .select('-seatAssignments')
      .lean();

    return res.status(200).json(
      new ApiResponse(true, 'Exam plans retrieved', { plans })
    );
  } catch (error) {
    logger.error('Error fetching exam plans:', error);
    return res.status(500).json(
      new ApiResponse(false, 'Error fetching exam plans')
    );
  }
}));

/**
 * @route   GET /exam-plans/:id
 * @desc    Get exam plan by ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const plan = await ExamPlan.findById(req.params.id).lean();
    
    if (!plan) {
      return res.status(404).json(
        new ApiResponse(false, 'Exam plan not found')
      );
    }

    return res.status(200).json(
      new ApiResponse(true, 'Exam plan retrieved', { plan })
    );
  } catch (error) {
    logger.error('Error fetching exam plan:', error);
    return res.status(500).json(
      new ApiResponse(false, 'Error fetching exam plan')
    );
  }
}));

/**
 * @route   POST /exam-plans
 * @desc    Create new exam plan
 * @access  Private
 */
router.post('/', asyncHandler(async (req, res) => {
  try {
    const {
      name,
      description,
      academicYear,
      roomConfig,
      branchGroups,
      subjects,
      scheduledDates,
      planMode,
      gapDays
    } = req.body;

    const plan = await ExamPlan.create({
      name,
      description,
      academicYear,
      roomConfig,
      branchGroups,
      subjects,
      scheduledDates,
      planMode,
      gapDays,
      status: 'draft'
    });

    return res.status(201).json(
      new ApiResponse(true, 'Exam plan created', { plan })
    );
  } catch (error) {
    logger.error('Error creating exam plan:', error);
    return res.status(500).json(
      new ApiResponse(false, error.message || 'Error creating exam plan')
    );
  }
}));

/**
 * @route   PUT /exam-plans/:id
 * @desc    Update exam plan
 * @access  Private
 */
router.put('/:id', asyncHandler(async (req, res) => {
  try {
    const updates = req.body;
    delete updates._id; // Prevent ID modification
    
    const plan = await ExamPlan.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).lean();

    if (!plan) {
      return res.status(404).json(
        new ApiResponse(false, 'Exam plan not found')
      );
    }

    return res.status(200).json(
      new ApiResponse(true, 'Exam plan updated', { plan })
    );
  } catch (error) {
    logger.error('Error updating exam plan:', error);
    return res.status(500).json(
      new ApiResponse(false, error.message || 'Error updating exam plan')
    );
  }
}));

/**
 * @route   POST /exam-plans/:id/confirm
 * @desc    Confirm exam plan (change status to confirmed)
 * @access  Private
 */
router.post('/:id/confirm', asyncHandler(async (req, res) => {
  try {
    const plan = await ExamPlan.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmed' },
      { new: true }
    ).lean();

    if (!plan) {
      return res.status(404).json(
        new ApiResponse(false, 'Exam plan not found')
      );
    }

    return res.status(200).json(
      new ApiResponse(true, 'Exam plan confirmed', { plan })
    );
  } catch (error) {
    logger.error('Error confirming exam plan:', error);
    return res.status(500).json(
      new ApiResponse(false, 'Error confirming exam plan')
    );
  }
}));

/**
 * @route   POST /exam-plans/:id/generate-seats
 * @desc    Generate seat assignments
 * @access  Private
 */
router.post('/:id/generate-seats', asyncHandler(async (req, res) => {
  try {
    const plan = await ExamPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json(
        new ApiResponse(false, 'Exam plan not found')
      );
    }

    // Generate seat assignments for each scheduled date
    const seatAssignments = [];
    
    for (const dateSlot of plan.scheduledDates) {
      const { date, branches, subjects } = dateSlot;
      const { rows, cols } = plan.roomConfig;
      
      // Get all students for this date
      let allStudents = [];
      
      for (const branchCode of branches) {
        const branchGroup = plan.branchGroups.find(bg => bg.branchCode === branchCode);
        if (branchGroup) {
          for (const college of branchGroup.colleges) {
            for (const range of college.rollRanges) {
              const start = parseInt(range.start);
              const end = parseInt(range.end);
              for (let roll = start; roll <= end; roll++) {
                allStudents.push({
                  rollNumber: roll.toString().padStart(4, '0'),
                  branchCode,
                  collegeCode: college.collegeCode
                });
              }
            }
          }
        }
      }

      // Interleave students from different branches
      // Group by branch first
      const byBranch = {};
      allStudents.forEach(s => {
        if (!byBranch[s.branchCode]) byBranch[s.branchCode] = [];
        byBranch[s.branchCode].push(s);
      });

      // Interleave
      const branchCodes = Object.keys(byBranch);
      const maxCount = Math.max(...branchCodes.map(b => byBranch[b].length));
      const interleaved = [];
      
      for (let i = 0; i < maxCount; i++) {
        branchCodes.forEach(bc => {
          if (byBranch[bc][i]) interleaved.push(byBranch[bc][i]);
        });
      }

      // Assign to seats
      let seatNum = 1;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const student = interleaved[seatNum - 1];
          if (student) {
            seatAssignments.push({
              date,
              seatNumber: seatNum,
              row: row + 1,
              col: col + 1,
              rollNumber: student.rollNumber,
              branchCode: student.branchCode,
              collegeCode: student.collegeCode,
              subjectCode: subjects.find(s => s.branchCode === student.branchCode)?.subjectCode
            });
          }
          seatNum++;
        }
      }
    }

    plan.seatAssignments = seatAssignments;
    await plan.save();

    return res.status(200).json(
      new ApiResponse(true, 'Seat assignments generated', {
        totalAssignments: seatAssignments.length
      })
    );
  } catch (error) {
    logger.error('Error generating seat assignments:', error);
    return res.status(500).json(
      new ApiResponse(false, 'Error generating seat assignments')
    );
  }
}));

/**
 * @route   GET /exam-plans/:id/seats/:date
 * @desc    Get seat assignments for a specific date
 * @access  Private
 */
router.get('/:id/seats/:date', asyncHandler(async (req, res) => {
  try {
    const plan = await ExamPlan.findById(req.params.id).lean();
    
    if (!plan) {
      return res.status(404).json(
        new ApiResponse(false, 'Exam plan not found')
      );
    }

    const dateStr = req.params.date;
    const seats = plan.seatAssignments?.filter(s => 
      s.date.toISOString().split('T')[0] === dateStr
    ) || [];

    // Arrange in grid format
    const { rows, cols } = plan.roomConfig;
    const grid = [];
    
    for (let r = 1; r <= rows; r++) {
      const row = [];
      for (let c = 1; c <= cols; c++) {
        const seat = seats.find(s => s.row === r && s.col === c);
        row.push(seat || { row: r, col: c, isEmpty: true });
      }
      grid.push(row);
    }

    return res.status(200).json(
      new ApiResponse(true, 'Seat assignments retrieved', {
        date: dateStr,
        roomName: plan.roomConfig.roomName,
        grid,
        totalSeats: rows * cols,
        occupiedSeats: seats.length,
        emptySeats: (rows * cols) - seats.length
      })
    );
  } catch (error) {
    logger.error('Error fetching seat assignments:', error);
    return res.status(500).json(
      new ApiResponse(false, 'Error fetching seat assignments')
    );
  }
}));

/**
 * @route   DELETE /exam-plans/:id
 * @desc    Delete exam plan
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  try {
    const plan = await ExamPlan.findByIdAndDelete(req.params.id);

    if (!plan) {
      return res.status(404).json(
        new ApiResponse(false, 'Exam plan not found')
      );
    }

    return res.status(200).json(
      new ApiResponse(true, 'Exam plan deleted')
    );
  } catch (error) {
    logger.error('Error deleting exam plan:', error);
    return res.status(500).json(
      new ApiResponse(false, 'Error deleting exam plan')
    );
  }
}));

export default router;
