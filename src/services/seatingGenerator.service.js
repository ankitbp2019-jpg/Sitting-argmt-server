/**
 * Seating Generator Service
 * Generates seating plans with room management and student assignment
 */

import { SeatingPlan } from '../models/SeatingPlan.js';
import { SeatMapping } from '../models/SeatMapping.js';
import { logger } from '../utils/logger.js';

/**
 * Generate seating plan for a schedule
 * @param {Object} params - Seating generation parameters
 * @param {string} params.scheduleId - Schedule ID
 * @param {Object[]} params.rooms - Array of room configurations
 * @param {string} params.rooms[].roomNumber - Room number
 * @param {number} params.rooms[].rows - Number of rows in room
 * @param {number} params.rooms[].cols - Number of columns in room
 * @param {string[]} params.students - Array of enrollment numbers
 * @returns {Object} Generated seating plan with seats array
 * @throws {Error} If parameters are invalid or seats insufficient
 */
export const generateSeatingPlan = async ({ scheduleId, rooms, students }) => {
  // Input validation
  if (!scheduleId || typeof scheduleId !== 'string') {
    throw new Error('Schedule ID is required and must be a string');
  }
  
  if (!Array.isArray(rooms) || rooms.length === 0) {
    throw new Error('Rooms must be a non-empty array');
  }
  
  if (!Array.isArray(students) || students.length === 0) {
    throw new Error('Students must be a non-empty array');
  }
  
  // Validate rooms configuration
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    
    if (!room.roomNumber || typeof room.roomNumber !== 'string') {
      throw new Error(`Room ${i + 1}: Room number is required and must be a string`);
    }
    
    if (typeof room.rows !== 'number' || room.rows < 1) {
      throw new Error(`Room ${i + 1}: Rows must be a positive number`);
    }
    
    if (typeof room.cols !== 'number' || room.cols < 1) {
      throw new Error(`Room ${i + 1}: Columns must be a positive number`);
    }
    
    if (typeof room.rows !== 'number' || !Number.isInteger(room.rows)) {
      throw new Error(`Room ${i + 1}: Rows must be an integer`);
    }
    
    if (typeof room.cols !== 'number' || !Number.isInteger(room.cols)) {
      throw new Error(`Room ${i + 1}: Columns must be an integer`);
    }
  }
  
  // Validate students
  const uniqueStudents = [...new Set(students)];
  if (uniqueStudents.length !== students.length) {
    throw new Error('Duplicate student enrollment numbers found');
  }
  
  // Calculate total capacity
  const totalCapacity = rooms.reduce((sum, room) => sum + (room.rows * room.cols), 0);
  if (students.length > totalCapacity) {
    throw new Error(`Not enough seats. Required: ${students.length}, Available: ${totalCapacity}`);
  }
  
  try {
    logger.info(`Generating seating plan for schedule: ${scheduleId}`);
    
    // Check if seating plan already exists
    let seatingPlan = await SeatingPlan.findBySchedule(scheduleId);
    
    if (seatingPlan) {
      logger.info(`Updating existing seating plan for schedule: ${scheduleId}`);
    } else {
      logger.info(`Creating new seating plan for schedule: ${scheduleId}`);
    }
    
    // Get existing seat mappings for this schedule
    const existingMappings = await SeatMapping.findBySchedule(scheduleId);
    const existingSeatMap = new Map();
    
    existingMappings.forEach(mapping => {
      existingSeatMap.set(mapping.enrollmentNumber, {
        seatNumber: mapping.seatNumber,
        roomNumber: mapping.roomNumber,
        row: mapping.row,
        col: mapping.col
      });
    });
    
    // Generate seats array
    const seats = [];
    let studentIndex = 0;
    
    // Loop through rooms → rows → cols
    for (let roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
      const room = rooms[roomIndex];
      
      for (let row = 1; row <= room.rows; row++) {
        for (let col = 1; col <= room.cols; col++) {
          const seatNumber = `${room.roomNumber}-R${row}C${col}`;
          
          if (studentIndex < students.length) {
            const enrollmentNumber = students[studentIndex];
            
            // Check if student already has a seat mapping
            const existingMapping = existingSeatMap.get(enrollmentNumber);
            
            if (existingMapping) {
              // Reuse existing seat
              seats.push({
                seatNumber: existingMapping.seatNumber,
                enrollmentNumber,
                roomNumber: existingMapping.roomNumber,
                row: existingMapping.row,
                col: existingMapping.col,
                status: 'assigned'
              });
              
              logger.debug(`Reusing existing seat for student ${enrollmentNumber}: ${existingMapping.seatNumber}`);
            } else {
              // Assign new seat
              seats.push({
                seatNumber,
                enrollmentNumber,
                roomNumber: room.roomNumber,
                row,
                col,
                status: 'assigned'
              });
              
              logger.debug(`Assigned new seat for student ${enrollmentNumber}: ${seatNumber}`);
            }
            
            studentIndex++;
          } else {
            // Add empty seat
            seats.push({
              seatNumber,
              enrollmentNumber: null,
              roomNumber: room.roomNumber,
              row,
              col,
              status: 'empty'
            });
          }
        }
      }
    }
    
    // Create or update seating plan
    const planData = {
      scheduleId,
      date: new Date(), // Will be populated from schedule
      session: 'morning', // Will be populated from schedule
      rooms: rooms.map(room => ({
        roomNumber: room.roomNumber,
        rows: room.rows,
        cols: room.cols
      })),
      seats
    };
    
    if (seatingPlan) {
      // Update existing plan
      seatingPlan.rooms = planData.rooms;
      seatingPlan.seats = planData.seats;
      await seatingPlan.save();
      logger.info(`Updated seating plan with ${seats.length} seats`);
    } else {
      // Create new plan
      seatingPlan = await SeatingPlan.create(planData);
      logger.info(`Created new seating plan with ${seats.length} seats`);
    }
    
    // Save new seat mappings to database
    const newMappings = [];
    seats.forEach(seat => {
      if (seat.status === 'assigned' && seat.enrollmentNumber) {
        const existingMapping = existingSeatMap.get(seat.enrollmentNumber);
        
        // Only add if this is a new assignment (not reusing existing)
        if (!existingMapping || existingMapping.seatNumber !== seat.seatNumber) {
          newMappings.push({
            enrollmentNumber: seat.enrollmentNumber,
            scheduleId,
            roomNumber: seat.roomNumber,
            row: seat.row,
            col: seat.col,
            deskId: seat.seatNumber
          });
        }
      }
    });
    
    // Bulk insert new mappings
    if (newMappings.length > 0) {
      await SeatMapping.insertMany(newMappings);
      logger.info(`Created ${newMappings.length} new seat mappings`);
    }
    
    // Return the complete seating plan
    const result = await SeatingPlan.findBySchedule(scheduleId);
    
    logger.info(`Seating plan generation completed for schedule: ${scheduleId}`);
    return result;
    
  } catch (error) {
    logger.error(`Error generating seating plan for schedule ${scheduleId}:`, error);
    throw error;
  }
};

/**
 * Generate seating plan with automatic room allocation
 * @param {Object} params - Seating generation parameters
 * @param {string} params.scheduleId - Schedule ID
 * @param {string[]} params.students - Array of enrollment numbers
 * @param {number} params.maxRoomSize - Maximum room size (default: 60)
 * @returns {Object} Generated seating plan
 */
export const generateAutoSeatingPlan = async ({ scheduleId, students, maxRoomSize = 60 }) => {
  if (!students || students.length === 0) {
    throw new Error('Students array is required');
  }
  
  // Calculate optimal room configuration
  const rooms = [];
  let remainingStudents = students.length;
  let roomNumber = 1;
  
  while (remainingStudents > 0) {
    const roomCapacity = Math.min(maxRoomSize, remainingStudents);
    
    // Calculate optimal room dimensions (close to square)
    const rows = Math.ceil(Math.sqrt(roomCapacity));
    const cols = Math.ceil(roomCapacity / rows);
    
    rooms.push({
      roomNumber: `Room${roomNumber.toString().padStart(3, '0')}`,
      rows,
      cols
    });
    
    remainingStudents -= (rows * cols);
    roomNumber++;
  }
  
  logger.info(`Auto-generated ${rooms.length} rooms for ${students.length} students`);
  
  return generateSeatingPlan({
    scheduleId,
    rooms,
    students
  });
};

/**
 * Update seat assignment (drag & drop support)
 * @param {Object} params - Update parameters
 * @param {string} params.scheduleId - Schedule ID
 * @param {string} params.seatNumber - Seat number
 * @param {string} params.enrollmentNumber - Student enrollment number
 * @returns {Object} Updated seating plan
 */
export const updateSeatAssignment = async ({ scheduleId, seatNumber, enrollmentNumber }) => {
  if (!scheduleId || !seatNumber || !enrollmentNumber) {
    throw new Error('Schedule ID, seat number, and enrollment number are required');
  }
  
  try {
    const seatingPlan = await SeatingPlan.findBySchedule(scheduleId);
    if (!seatingPlan) {
      throw new Error('Seating plan not found for this schedule');
    }
    
    // Update seat assignment
    await seatingPlan.updateSeatAssignment(seatNumber, enrollmentNumber);
    
    // Update seat mapping
    const seat = seatingPlan.seats.find(s => s.seatNumber === seatNumber);
    if (seat) {
      await SeatMapping.findOneAndUpdate(
        { scheduleId, enrollmentNumber },
        {
          roomNumber: seat.roomNumber,
          row: seat.row,
          col: seat.col,
          deskId: seat.seatNumber
        },
        { upsert: true, new: true }
      );
    }
    
    logger.info(`Updated seat assignment: ${enrollmentNumber} → ${seatNumber}`);
    
    return await SeatingPlan.findBySchedule(scheduleId);
    
  } catch (error) {
    logger.error(`Error updating seat assignment:`, error);
    throw error;
  }
};

/**
 * Clear seat assignment
 * @param {Object} params - Clear parameters
 * @param {string} params.scheduleId - Schedule ID
 * @param {string} params.seatNumber - Seat number
 * @returns {Object} Updated seating plan
 */
export const clearSeatAssignment = async ({ scheduleId, seatNumber }) => {
  if (!scheduleId || !seatNumber) {
    throw new Error('Schedule ID and seat number are required');
  }
  
  try {
    const seatingPlan = await SeatingPlan.findBySchedule(scheduleId);
    if (!seatingPlan) {
      throw new Error('Seating plan not found for this schedule');
    }
    
    // Get seat info before clearing
    const seat = seatingPlan.seats.find(s => s.seatNumber === seatNumber);
    const enrollmentNumber = seat?.enrollmentNumber;
    
    // Clear seat assignment
    await seatingPlan.clearSeatAssignment(seatNumber);
    
    // Remove seat mapping
    if (enrollmentNumber) {
      await SeatMapping.deleteOne({ scheduleId, enrollmentNumber });
    }
    
    logger.info(`Cleared seat assignment: ${seatNumber}`);
    
    return await SeatingPlan.findBySchedule(scheduleId);
    
  } catch (error) {
    logger.error(`Error clearing seat assignment:`, error);
    throw error;
  }
};

export default {
  generateSeatingPlan,
  generateAutoSeatingPlan,
  updateSeatAssignment,
  clearSeatAssignment
};
