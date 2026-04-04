import { SeatMapping, SeatingPlan, StudentPermanentSeat } from '../models/index.js';
import { logger } from '../utils/logger.js';

const generateSeatingPlan = async ({
  scheduleId,
  rooms,
  students,
  useFixedSeating = true
}) => {
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

  // Check for duplicate students
  const uniqueStudents = [...new Set(students)];
  if (uniqueStudents.length !== students.length) {
    throw new Error('Duplicate student enrollment numbers found');
  }

  // Check seat capacity
  const totalSeats = rooms.reduce((sum, room) => sum + (room.rows * room.cols), 0);
  if (students.length > totalSeats) {
    throw new Error(`Not enough seats available. Required: ${students.length}, Available: ${totalSeats}`);
  }

  // Validate room configuration
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    if (!room.roomNumber || !room.rows || !room.cols) {
      throw new Error(`Room ${i + 1}: Missing required fields (roomNumber, rows, cols)`);
    }
    if (room.rows < 1 || room.cols < 1) {
      throw new Error(`Room ${i + 1}: Rows and cols must be positive numbers`);
    }
  }

  try {
    logger.info(`Generating seating plan for schedule: ${scheduleId}, Fixed seating: ${useFixedSeating}`);

    const seats = [];
    const newMappings = [];
    const permanentSeatAssignments = [];
    const occupiedSeats = new Set();
    
    // Step 1: Check for permanent seat assignments (FIXED SEATING SYSTEM)
    const permanentSeatMap = new Map();
    
    if (useFixedSeating) {
      const permanentSeats = await StudentPermanentSeat.find({
        enrollmentNumber: { $in: students },
        isActive: true
      });
      
      permanentSeats.forEach(seat => {
        permanentSeatMap.set(seat.enrollmentNumber, seat);
      });
      
      logger.info(`Found ${permanentSeats.length} students with permanent seats`);
    }

    // Step 2 — Check SeatMapping
    const existingMappings = await SeatMapping.find({
      enrollmentNumber: { $in: students },
      scheduleId
    });

    const mappingMap = new Map();
    existingMappings.forEach(m => {
      mappingMap.set(m.enrollmentNumber, m);
    });

    // Step 3: Build room coordinate map for quick lookup
    const roomCoordMap = new Map();
    rooms.forEach(room => {
      for (let r = 1; r <= room.rows; r++) {
        for (let c = 1; c <= room.cols; c++) {
          const key = `${room.roomNumber}-R${r}C${c}`;
          roomCoordMap.set(key, { roomNumber: room.roomNumber, row: r, col: c });
        }
      }
    });

    // Step 4: Assign seats with FIXED SEATING priority
    const unassignedStudents = [];

    for (const enrollmentNumber of students) {
      let seatAssigned = false;

      // PRIORITY 1: Check if student has a permanent seat (FIXED SEATING)
      if (useFixedSeating) {
        const permanentSeat = permanentSeatMap.get(enrollmentNumber);
        
        if (permanentSeat) {
          const seatKey = `${permanentSeat.roomNumber}-R${permanentSeat.row}C${permanentSeat.col}`;
          
          // Check if the permanent seat is in our current room layout
          if (roomCoordMap.has(seatKey) && !occupiedSeats.has(seatKey)) {
            seats.push({
              seatNumber: permanentSeat.seatNumber,
              enrollmentNumber,
              roomNumber: permanentSeat.roomNumber,
              row: permanentSeat.row,
              col: permanentSeat.col,
              status: 'assigned',
              isFixedSeat: true
            });
            
            occupiedSeats.add(seatKey);
            seatAssigned = true;
            
            logger.debug(`Fixed seat reused for ${enrollmentNumber}: ${permanentSeat.seatNumber}`);
          }
        }
      }

      // PRIORITY 2: Check for existing schedule-specific mapping
      if (!seatAssigned) {
        const existingMapping = mappingMap.get(enrollmentNumber);
        
        if (existingMapping) {
          const seatKey = `${existingMapping.roomNumber}-R${existingMapping.row}C${existingMapping.col}`;
          
          if (roomCoordMap.has(seatKey) && !occupiedSeats.has(seatKey)) {
            seats.push({
              seatNumber: existingMapping.deskId || `${existingMapping.roomNumber}-R${existingMapping.row}C${existingMapping.col}`,
              enrollmentNumber,
              roomNumber: existingMapping.roomNumber,
              row: existingMapping.row,
              col: existingMapping.col,
              status: 'assigned',
              isFixedSeat: false
            });
            
            occupiedSeats.add(seatKey);
            seatAssigned = true;
            
            logger.debug(`Schedule-specific seat reused for ${enrollmentNumber}`);
          }
        }
      }

      // If not assigned yet, add to unassigned list for new assignment
      if (!seatAssigned) {
        unassignedStudents.push(enrollmentNumber);
      }
    }

    // Step 5: Assign new seats to unassigned students
    for (const enrollmentNumber of unassignedStudents) {
      let seatAssigned = false;
      
      for (const room of rooms) {
        if (seatAssigned) break;
        
        for (let r = 1; r <= room.rows; r++) {
          if (seatAssigned) break;
          
          for (let c = 1; c <= room.cols; c++) {
            const seatKey = `${room.roomNumber}-R${r}C${c}`;
            
            if (!occupiedSeats.has(seatKey)) {
              const seatNumber = `${room.roomNumber}-R${r}C${c}`;
              
              seats.push({
                seatNumber,
                enrollmentNumber,
                roomNumber: room.roomNumber,
                row: r,
                col: c,
                status: 'assigned',
                isFixedSeat: false
              });
              
              occupiedSeats.add(seatKey);
              seatAssigned = true;
              
              // Add to new mappings for this schedule
              newMappings.push({
                enrollmentNumber,
                scheduleId,
                roomNumber: room.roomNumber,
                row: r,
                col: c,
                deskId: seatNumber
              });
              
              // If fixed seating is enabled, also create permanent seat assignment
              if (useFixedSeating) {
                permanentSeatAssignments.push({
                  enrollmentNumber,
                  roomNumber: room.roomNumber,
                  row: r,
                  col: c,
                  seatNumber,
                  originScheduleId: scheduleId
                });
              }
              
              logger.debug(`New seat assigned for ${enrollmentNumber}: ${seatNumber}`);
              break;
            }
          }
        }
      }
      
      if (!seatAssigned) {
        throw new Error(`Could not assign seat for ${enrollmentNumber} - all seats occupied`);
      }
    }

    // Step 6: Add empty seats for remaining positions
    for (const room of rooms) {
      for (let r = 1; r <= room.rows; r++) {
        for (let c = 1; c <= room.cols; c++) {
          const seatKey = `${room.roomNumber}-R${r}C${c}`;
          
          if (!occupiedSeats.has(seatKey)) {
            const seatNumber = `${room.roomNumber}-R${r}C${c}`;
            
            seats.push({
              seatNumber,
              enrollmentNumber: null,
              roomNumber: room.roomNumber,
              row: r,
              col: c,
              status: 'empty'
            });
          }
        }
      }
    }

    // Step 7: Save schedule-specific seat mappings
    if (newMappings.length > 0) {
      await SeatMapping.insertMany(newMappings);
      logger.info(`Created ${newMappings.length} new schedule-specific seat mappings`);
    }

    // Step 8: Save permanent seat assignments (FIXED SEATING)
    if (useFixedSeating && permanentSeatAssignments.length > 0) {
      const result = await StudentPermanentSeat.bulkCreateSeats(permanentSeatAssignments);
      logger.info(`Created ${result.created} new permanent seat assignments, skipped ${result.skipped} (already had permanent seats)`);
    }

    // Step 9: Create or update SeatingPlan
    const planData = {
      scheduleId,
      date: new Date(),
      session: 'morning',
      rooms: rooms.map(room => ({
        roomNumber: room.roomNumber,
        rows: room.rows,
        cols: room.cols
      })),
      seats: seats.sort((a, b) => {
        // Sort by room, then row, then col
        if (a.roomNumber !== b.roomNumber) return a.roomNumber.localeCompare(b.roomNumber);
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      })
    };

    let seatingPlan = await SeatingPlan.findBySchedule(scheduleId);
    
    if (seatingPlan) {
      seatingPlan.rooms = planData.rooms;
      seatingPlan.seats = planData.seats;
      await seatingPlan.save();
      logger.info(`Updated existing seating plan`);
    } else {
      seatingPlan = await SeatingPlan.create(planData);
      logger.info(`Created new seating plan`);
    }

    logger.info(`Seating plan generation completed: ${seats.length} total seats, ${seats.filter(s => s.status === 'assigned').length} assigned, ${seats.filter(s => s.isFixedSeat).length} fixed seats`);
    
    return seatingPlan;

  } catch (error) {
    logger.error(`Error generating seating plan for schedule ${scheduleId}:`, error);
    throw error;
  }
};

/**
 * Auto-rearrange seats to maintain compact seating after deletions
 * When a seat is deleted/emptied, shift students up to fill gaps
 * @param {string} scheduleId - Schedule ID
 * @param {string} clearedSeatNumber - Seat number that was cleared
 * @returns {Object} Updated seating plan with rearranged seats
 */
const autoRearrangeSeats = async (scheduleId, clearedSeatNumber) => {
  try {
    logger.info(`Auto-rearranging seats for schedule ${scheduleId} after clearing ${clearedSeatNumber}`);
    
    const seatingPlan = await SeatingPlan.findBySchedule(scheduleId);
    if (!seatingPlan) {
      throw new Error('Seating plan not found');
    }
    
    // Get all assigned seats sorted by room, row, col
    const assignedSeats = seatingPlan.seats
      .filter(s => s.status === 'assigned' && s.enrollmentNumber)
      .sort((a, b) => {
        if (a.roomNumber !== b.roomNumber) return a.roomNumber.localeCompare(b.roomNumber);
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      });
    
    // Get empty seats
    const emptySeats = seatingPlan.seats
      .filter(s => s.status === 'empty' || !s.enrollmentNumber)
      .sort((a, b) => {
        if (a.roomNumber !== b.roomNumber) return a.roomNumber.localeCompare(b.roomNumber);
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      });
    
    if (assignedSeats.length === 0 || emptySeats.length === 0) {
      logger.info('No rearrangement needed');
      return seatingPlan;
    }
    
    // Find gaps - empty seats that come before assigned seats in the same room
    const rearrangements = [];
    
    for (const room of seatingPlan.rooms) {
      const roomAssigned = assignedSeats.filter(s => s.roomNumber === room.roomNumber);
      const roomEmpty = emptySeats.filter(s => s.roomNumber === room.roomNumber);
      
      if (roomEmpty.length === 0 || roomAssigned.length === 0) continue;
      
      // Find the first empty seat and the last assigned seat in this room
      const firstEmpty = roomEmpty[0];
      const lastAssigned = roomAssigned[roomAssigned.length - 1];
      
      // Check if there's a gap (empty seat comes before an assigned seat)
      const emptyPos = (firstEmpty.row - 1) * room.cols + firstEmpty.col;
      const lastAssignedPos = (lastAssigned.row - 1) * room.cols + lastAssigned.col;
      
      if (emptyPos < lastAssignedPos) {
        // There's a gap - move the last assigned student to the first empty seat
        const studentToMove = lastAssigned;
        const targetSeat = firstEmpty;
        
        // Update the seat assignment
        const seatIndex = seatingPlan.seats.findIndex(s => s.seatNumber === studentToMove.seatNumber);
        const targetIndex = seatingPlan.seats.findIndex(s => s.seatNumber === targetSeat.seatNumber);
        
        if (seatIndex !== -1 && targetIndex !== -1) {
          // Move student to new seat
          seatingPlan.seats[targetIndex] = {
            ...seatingPlan.seats[targetIndex],
            enrollmentNumber: studentToMove.enrollmentNumber,
            status: 'assigned',
            isFixedSeat: studentToMove.isFixedSeat
          };
          
          // Clear old seat
          seatingPlan.seats[seatIndex] = {
            ...seatingPlan.seats[seatIndex],
            enrollmentNumber: null,
            status: 'empty',
            isFixedSeat: false
          };
          
          rearrangements.push({
            enrollmentNumber: studentToMove.enrollmentNumber,
            from: studentToMove.seatNumber,
            to: targetSeat.seatNumber
          });
          
          logger.info(`Rearranged: ${studentToMove.enrollmentNumber} moved from ${studentToMove.seatNumber} to ${targetSeat.seatNumber}`);
        }
      }
    }
    
    // Save the rearranged plan
    await seatingPlan.save();
    
    // Update SeatMapping records
    for (const move of rearrangements) {
      await SeatMapping.findOneAndUpdate(
        { scheduleId, enrollmentNumber: move.enrollmentNumber },
        {
          roomNumber: move.to.split('-')[0],
          row: parseInt(move.to.match(/R(\d+)/)[1]),
          col: parseInt(move.to.match(/C(\d+)/)[1]),
          deskId: move.to
        }
      );
    }
    
    logger.info(`Auto-rearrangement completed: ${rearrangements.length} students moved`);
    
    return {
      seatingPlan,
      rearrangements,
      message: `${rearrangements.length} students rearranged for compact seating`
    };
    
  } catch (error) {
    logger.error(`Error in auto-rearrange:`, error);
    throw error;
  }
};

/**
 * Clear a seat and optionally auto-rearrange
 * @param {Object} params - Parameters
 * @param {string} params.scheduleId - Schedule ID
 * @param {string} params.seatNumber - Seat number to clear
 * @param {boolean} params.autoRearrange - Whether to auto-rearrange after clearing
 * @returns {Object} Result with updated seating plan
 */
const clearSeatWithRearrange = async ({ scheduleId, seatNumber, autoRearrange = true }) => {
  try {
    const seatingPlan = await SeatingPlan.findBySchedule(scheduleId);
    if (!seatingPlan) {
      throw new Error('Seating plan not found');
    }
    
    const seatIndex = seatingPlan.seats.findIndex(s => s.seatNumber === seatNumber);
    if (seatIndex === -1) {
      throw new Error(`Seat ${seatNumber} not found`);
    }
    
    const seat = seatingPlan.seats[seatIndex];
    const enrollmentNumber = seat.enrollmentNumber;
    
    // Clear the seat
    seatingPlan.seats[seatIndex] = {
      ...seat,
      enrollmentNumber: null,
      status: 'empty',
      isFixedSeat: false
    };
    
    await seatingPlan.save();
    
    // Remove schedule-specific mapping
    await SeatMapping.deleteOne({ scheduleId, seatNumber });
    
    // Note: We DON'T remove the permanent seat assignment
    // The student keeps their permanent seat for future schedules
    
    logger.info(`Cleared seat ${seatNumber} for schedule ${scheduleId}`);
    
    // Auto-rearrange if enabled
    if (autoRearrange) {
      return await autoRearrangeSeats(scheduleId, seatNumber);
    }
    
    return { seatingPlan, rearrangements: [] };
    
  } catch (error) {
    logger.error(`Error clearing seat:`, error);
    throw error;
  }
};

export default generateSeatingPlan;
export { autoRearrangeSeats, clearSeatWithRearrange };
