import { asyncHandler } from '../middlewares/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Schedule } from '../models/index.js';
import generateSeatingPlan from '../services/seating.service.js';
import { logger } from '../utils/logger.js';

/**
 * Create seating plan for a schedule
 * @route POST /api/seating/generate
 * @access Private
 */
export const createSeatingPlan = asyncHandler(async (req, res) => {
  const { scheduleId, rooms, students } = req.body;

  // Input validation
  if (!scheduleId || typeof scheduleId !== 'string') {
    return res.status(400).json(
      new ApiResponse(400, null, 'Schedule ID is required and must be a string')
    );
  }

  if (!Array.isArray(rooms) || rooms.length === 0) {
    return res.status(400).json(
      new ApiResponse(400, null, 'Rooms must be a non-empty array')
    );
  }

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json(
      new ApiResponse(400, null, 'Students must be a non-empty array')
    );
  }

  try {
    logger.info(`Creating seating plan for schedule: ${scheduleId}`);

    // 1. Fetch schedule and check if it exists
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json(
        new ApiResponse(404, null, 'Schedule not found')
      );
    }

    // 2. Prevent duplicate seating plan
    const { SeatingPlan } = await import('../models/index.js');
    const existingSeatingPlan = await SeatingPlan.findBySchedule(scheduleId);
    if (existingSeatingPlan) {
      return res.status(409).json(
        new ApiResponse(409, null, 'Seating plan already exists for this schedule')
      );
    }

    // 3. Call seating service to generate plan
    const seatingPlan = await generateSeatingPlan({
      scheduleId,
      rooms,
      students
    });

    // 4. Update seating plan with actual schedule data
    seatingPlan.date = schedule.date;
    seatingPlan.session = schedule.session;
    await seatingPlan.save();

    // 5. Return populated seating plan
    const populatedSeatingPlan = await SeatingPlan.findById(seatingPlan._id).populate('scheduleId');

    logger.info(`Seating plan created successfully for schedule: ${scheduleId}`);

    // 6. Return response using ApiResponse
    return res.status(201).json(
      new ApiResponse(201, {
        seatingPlan: {
          id: populatedSeatingPlan._id,
          scheduleId: populatedSeatingPlan.scheduleId,
          date: populatedSeatingPlan.date,
          session: populatedSeatingPlan.session,
          rooms: populatedSeatingPlan.rooms,
          totalSeats: populatedSeatingPlan.totalSeats,
          assignedSeats: populatedSeatingPlan.assignedSeats,
          emptySeats: populatedSeatingPlan.emptySeats,
          schedule: populatedSeatingPlan.scheduleId // Populated schedule data
        }
      }, 'Seating plan created successfully')
    );

  } catch (error) {
    logger.error(`Error creating seating plan for schedule ${scheduleId}:`, error);

    // Handle specific error cases
    if (error.message.includes('Not enough seats')) {
      return res.status(400).json(
        new ApiResponse(400, null, error.message)
      );
    }

    if (error.message.includes('Duplicate student')) {
      return res.status(400).json(
        new ApiResponse(400, null, error.message)
      );
    }

    if (error.message.includes('validation')) {
      return res.status(400).json(
        new ApiResponse(400, null, `Validation error: ${error.message}`)
      );
    }

    // Generic server error - prevents crashes
    return res.status(500).json(
      new ApiResponse(500, null, 'Internal server error while creating seating plan')
    );
  }
});

export default {
  createSeatingPlan
};
