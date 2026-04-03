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

    // 1. Check if schedule exists
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

    // 5. Upload seating plan to Cloudinary
    try {
      const { uploadSeatingPlan } = await import('../services/cloudinary.service.js');
      const cloudinaryUrl = await uploadSeatingPlan(seatingPlan, seatingPlan._id.toString());
      seatingPlan.cloudinaryUrl = cloudinaryUrl;
      logger.info(`Seating plan uploaded to Cloudinary: ${cloudinaryUrl}`);
    } catch (cloudinaryError) {
      logger.error('Cloudinary upload failed:', cloudinaryError);
      // Continue without failing - Cloudinary is not critical
      seatingPlan.cloudinaryUrl = null;
    }

    await seatingPlan.save();

    logger.info(`Seating plan created successfully for schedule: ${scheduleId}`);

    // 6. Return success response
    return res.status(201).json(
      new ApiResponse(201, {
        seatingPlan: {
          id: seatingPlan._id,
          scheduleId: seatingPlan.scheduleId,
          date: seatingPlan.date,
          session: seatingPlan.session,
          rooms: seatingPlan.rooms,
          cloudinaryUrl: seatingPlan.cloudinaryUrl,
          totalSeats: seatingPlan.totalSeats,
          assignedSeats: seatingPlan.assignedSeats,
          emptySeats: seatingPlan.emptySeats
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

    // Generic server error
    return res.status(500).json(
      new ApiResponse(500, null, 'Internal server error while creating seating plan')
    );
  }
});

/**
 * Get seating plan by schedule ID
 * @route GET /api/seating/schedule/:scheduleId
 * @access Private
 */
export const getSeatingPlanBySchedule = asyncHandler(async (req, res) => {
  const { scheduleId } = req.params;

  if (!scheduleId) {
    return res.status(400).json(
      new ApiResponse(400, null, 'Schedule ID is required')
    );
  }

  try {
    logger.info(`Fetching seating plan for schedule: ${scheduleId}`);

    // Check if schedule exists
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json(
        new ApiResponse(404, null, 'Schedule not found')
      );
    }

    // Get seating plan
    const { SeatingPlan } = await import('../models/index.js');
    const seatingPlan = await SeatingPlan.findBySchedule(scheduleId);

    if (!seatingPlan) {
      return res.status(404).json(
        new ApiResponse(404, null, 'Seating plan not found for this schedule')
      );
    }

    logger.info(`Seating plan retrieved successfully for schedule: ${scheduleId}`);

    return res.status(200).json(
      new ApiResponse(200, {
        seatingPlan: {
          id: seatingPlan._id,
          scheduleId: seatingPlan.scheduleId,
          date: seatingPlan.date,
          session: seatingPlan.session,
          rooms: seatingPlan.rooms,
          seats: seatingPlan.seats,
          totalSeats: seatingPlan.totalSeats,
          assignedSeats: seatingPlan.assignedSeats,
          emptySeats: seatingPlan.emptySeats,
          deletedSeats: seatingPlan.deletedSeats
        }
      }, 'Seating plan retrieved successfully')
    );

  } catch (error) {
    logger.error(`Error fetching seating plan for schedule ${scheduleId}:`, error);

    return res.status(500).json(
      new ApiResponse(500, null, 'Internal server error while fetching seating plan')
    );
  }
});

/**
 * Update seat assignment (drag & drop support)
 * @route PUT /api/seating/seat
 * @access Private
 */
export const updateSeatAssignment = asyncHandler(async (req, res) => {
  const { scheduleId, seatNumber, enrollmentNumber } = req.body;

  if (!scheduleId || !seatNumber || !enrollmentNumber) {
    return res.status(400).json(
      new ApiResponse(400, null, 'Schedule ID, seat number, and enrollment number are required')
    );
  }

  try {
    logger.info(`Updating seat assignment: ${enrollmentNumber} → ${seatNumber}`);

    const { updateSeatAssignment: updateSeat } = await import('../services/seatingGenerator.service.js');

    const updatedSeatingPlan = await updateSeat({
      scheduleId,
      seatNumber,
      enrollmentNumber
    });

    logger.info(`Seat assignment updated successfully`);

    return res.status(200).json(
      new ApiResponse(200, {
        seatingPlan: {
          id: updatedSeatingPlan._id,
          seats: updatedSeatingPlan.seats,
          assignedSeats: updatedSeatingPlan.assignedSeats,
          emptySeats: updatedSeatingPlan.emptySeats
        }
      }, 'Seat assignment updated successfully')
    );

  } catch (error) {
    logger.error(`Error updating seat assignment:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json(
        new ApiResponse(404, null, error.message)
      );
    }

    return res.status(500).json(
      new ApiResponse(500, null, 'Internal server error while updating seat assignment')
    );
  }
});

/**
 * Clear seat assignment
 * @route DELETE /api/seating/seat
 * @access Private
 */
export const clearSeatAssignment = asyncHandler(async (req, res) => {
  const { scheduleId, seatNumber } = req.body;

  if (!scheduleId || !seatNumber) {
    return res.status(400).json(
      new ApiResponse(400, null, 'Schedule ID and seat number are required')
    );
  }

  try {
    logger.info(`Clearing seat assignment: ${seatNumber}`);

    const { clearSeatAssignment: clearSeat } = await import('../services/seatingGenerator.service.js');

    const updatedSeatingPlan = await clearSeat({
      scheduleId,
      seatNumber
    });

    logger.info(`Seat assignment cleared successfully`);

    return res.status(200).json(
      new ApiResponse(200, {
        seatingPlan: {
          id: updatedSeatingPlan._id,
          seats: updatedSeatingPlan.seats,
          assignedSeats: updatedSeatingPlan.assignedSeats,
          emptySeats: updatedSeatingPlan.emptySeats
        }
      }, 'Seat assignment cleared successfully')
    );

  } catch (error) {
    logger.error(`Error clearing seat assignment:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json(
        new ApiResponse(404, null, error.message)
      );
    }

    return res.status(500).json(
      new ApiResponse(500, null, 'Internal server error while clearing seat assignment')
    );
  }
});

/**
 * Get all seating plans
 * @route GET /api/seating
 * @access Private
 */
export const getAllSeatingPlans = asyncHandler(async (req, res) => {
  try {
    logger.info('Fetching all seating plans');

    const { SeatingPlan } = await import('../models/index.js');
    
    // Fetch all seating plans, sorted by date (latest first)
    const seatingPlans = await SeatingPlan.find()
      .sort({ date: -1 })
      .select('_id date session rooms seats createdAt')
      .lean();

    // Format response
    const formattedPlans = seatingPlans.map(plan => ({
      id: plan._id,
      date: plan.date,
      session: plan.session,
      totalRooms: plan.rooms?.length || 0,
      totalStudents: plan.seats?.filter(seat => seat.status === 'assigned').length || 0,
      totalSeats: plan.seats?.length || 0,
      createdAt: plan.createdAt
    }));

    logger.info(`Retrieved ${formattedPlans.length} seating plans`);

    return res.status(200).json(
      new ApiResponse(200, {
        plans: formattedPlans,
        total: formattedPlans.length
      }, 'Seating plans retrieved successfully')
    );

  } catch (error) {
    logger.error('Error fetching seating plans:', error);

    return res.status(500).json(
      new ApiResponse(500, null, 'Internal server error while fetching seating plans')
    );
  }
});

/**
 * Download seating plan as PDF
 * @route GET /api/seating/pdf/:id
 * @access Private
 */
export const downloadSeatingPlanPDF = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    logger.info(`Generating PDF for seating plan: ${id}`);

    const { SeatingPlan } = await import('../models/index.js');
    const { generateSeatingPlanPDF } = await import('../services/pdf.service.js');

    // Find seating plan
    const seatingPlan = await SeatingPlan.findById(id);

    if (!seatingPlan) {
      return res.status(404).json(
        new ApiResponse(404, null, 'Seating plan not found')
      );
    }

    // Generate PDF
    const pdfBuffer = await generateSeatingPlanPDF(seatingPlan);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="seating-plan-${id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    logger.info(`PDF generated successfully for seating plan: ${id}`);

    // Send PDF
    return res.send(pdfBuffer);

  } catch (error) {
    logger.error(`Error generating PDF for seating plan ${id}:`, error);

    return res.status(500).json(
      new ApiResponse(500, null, 'Internal server error while generating PDF')
    );
  }
});

export default {
  createSeatingPlan,
  getSeatingPlanBySchedule,
  getAllSeatingPlans,
  updateSeatAssignment,
  clearSeatAssignment,
  downloadSeatingPlanPDF
};
