import { SeatMapping, SeatingPlan } from '../models/index.js';
import { logger } from '../utils/logger.js';

const generateSeatingPlan = async ({
  scheduleId,
  rooms,
  students
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

  // Check for duplicate students
  const uniqueStudents = [...new Set(students)];
  if (uniqueStudents.length !== students.length) {
    throw new Error('Duplicate student enrollment numbers found');
  }

  // Check capacity
  const totalCapacity = rooms.reduce((sum, room) => sum + (room.rows * room.cols), 0);
  if (students.length > totalCapacity) {
    throw new Error(`Not enough seats. Required: ${students.length}, Available: ${totalCapacity}`);
  }

  try {
    logger.info(`Generating seating plan for schedule: ${scheduleId}`);

    const seats = [];
    let studentIndex = 0;

    // Fetch existing mappings
    const existingMappings = await SeatMapping.find({
      enrollmentNumber: { $in: students },
      scheduleId
    });

    const mappingMap = new Map();
    existingMappings.forEach(m => {
      mappingMap.set(m.enrollmentNumber, m);
    });

    const newMappings = [];

    // Loop through rooms
    for (let room of rooms) {
      const { roomNumber, rows, cols } = room;

      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {

          if (studentIndex >= students.length) break;

          const enrollmentNumber = students[studentIndex];
          const seatNumber = `${roomNumber}-R${r}C${c}`;

          let mapping = mappingMap.get(enrollmentNumber);

          // If already mapped → reuse existing seat position
          if (mapping) {
            seats.push({
              seatNumber: mapping.deskId || `${mapping.roomNumber}-R${mapping.row}C${mapping.col}`,
              enrollmentNumber,
              roomNumber: mapping.roomNumber,
              row: mapping.row,
              col: mapping.col,
              status: 'assigned'
            });

            logger.debug(`Reusing existing seat for ${enrollmentNumber}: ${mapping.roomNumber}-R${mapping.row}C${mapping.col}`);

          } else {
            // Assign new seat in current room
            const newSeat = {
              seatNumber,
              enrollmentNumber,
              roomNumber,
              row: r,
              col: c,
              status: 'assigned'
            };

            seats.push(newSeat);

            newMappings.push({
              enrollmentNumber,
              scheduleId,
              roomNumber,
              row: r,
              col: c,
              deskId: seatNumber
            });

            logger.debug(`Assigned new seat for ${enrollmentNumber}: ${seatNumber}`);
          }

          studentIndex++;
        }
      }
    }

    // Add empty seats if any remaining
    for (let room of rooms) {
      const { roomNumber, rows, cols } = room;
      
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          const seatNumber = `${roomNumber}-R${r}C${c}`;
          
          // Check if this seat is already assigned
          const isAssigned = seats.some(seat => seat.seatNumber === seatNumber);
          
          if (!isAssigned) {
            seats.push({
              seatNumber,
              enrollmentNumber: null,
              roomNumber,
              row: r,
              col: c,
              status: 'empty'
            });
          }
        }
      }
    }

    // Save new mappings
    if (newMappings.length > 0) {
      await SeatMapping.insertMany(newMappings);
      logger.info(`Created ${newMappings.length} new seat mappings`);
    }

    // Create or update SeatingPlan
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

    logger.info(`Seating plan generation completed: ${seats.length} total seats`);
    
    return seatingPlan;

  } catch (error) {
    logger.error(`Error generating seating plan for schedule ${scheduleId}:`, error);
    throw error;
  }
};

export default generateSeatingPlan;
