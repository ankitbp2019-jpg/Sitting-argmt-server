import mongoose from 'mongoose';

/**
 * Student Permanent Seat Model
 * Tracks fixed seating assignments for students across all exam schedules
 * Core feature: Once assigned, a student keeps the same seat for all exams
 */
const studentPermanentSeatSchema = new mongoose.Schema({
  enrollmentNumber: {
    type: String,
    required: [true, 'Enrollment number is required'],
    trim: true,
    maxlength: [20, 'Enrollment number cannot exceed 20 characters']
    // REMOVED: unique and index - No indexing as requested
  },
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    trim: true,
    maxlength: [10, 'Room number cannot exceed 10 characters']
  },
  row: {
    type: Number,
    required: [true, 'Row number is required'],
    min: [1, 'Row number must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Row number must be an integer'
    }
  },
  col: {
    type: Number,
    required: [true, 'Column number is required'],
    min: [1, 'Column number must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Column number must be an integer'
    }
  },
  seatNumber: {
    type: String,
    required: [true, 'Seat number is required'],
    trim: true,
    maxlength: [15, 'Seat number cannot exceed 15 characters']
  },
  // Track when this permanent assignment was created
  assignedAt: {
    type: Date,
    default: Date.now
  },
  // Track which schedule first created this assignment
  originScheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    default: null
  },
  // Flag to indicate if this assignment is active
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  autoIndex: false  // Disable automatic index creation - NO INDEXES
});

// REMOVED ALL INDEXES - No indexing as requested

// Virtual for formatted seat position
studentPermanentSeatSchema.virtual('formattedSeat').get(function() {
  return `${this.roomNumber}-R${this.row}C${this.col}`;
});

// Virtual for coordinates
studentPermanentSeatSchema.virtual('coordinates').get(function() {
  return {
    row: this.row,
    col: this.col,
    room: this.roomNumber
  };
});

// Static method: Find permanent seat by enrollment number
studentPermanentSeatSchema.statics.findByEnrollment = function(enrollmentNumber) {
  return this.findOne({ enrollmentNumber, isActive: true });
};

// Static method: Find all permanent seats in a room
studentPermanentSeatSchema.statics.findByRoom = function(roomNumber) {
  return this.find({ roomNumber, isActive: true }).sort({ row: 1, col: 1 });
};

// Static method: Get or create permanent seat for a student
studentPermanentSeatSchema.statics.getOrCreateSeat = async function({
  enrollmentNumber,
  roomNumber,
  row,
  col,
  seatNumber,
  originScheduleId = null
}) {
  // Check if student already has a permanent seat
  let permanentSeat = await this.findOne({ enrollmentNumber, isActive: true });
  
  if (permanentSeat) {
    // Return existing permanent seat
    return {
      seat: permanentSeat,
      isNew: false,
      isExisting: true
    };
  }
  
  // Check if the requested seat is already occupied by another student
  const seatOccupied = await this.findOne({
    roomNumber,
    row,
    col,
    isActive: true,
    enrollmentNumber: { $ne: enrollmentNumber }
  });
  
  if (seatOccupied) {
    throw new Error(`Seat ${roomNumber}-R${row}C${col} is already permanently assigned to ${seatOccupied.enrollmentNumber}`);
  }
  
  // Create new permanent seat assignment
  permanentSeat = await this.create({
    enrollmentNumber,
    roomNumber,
    row,
    col,
    seatNumber,
    originScheduleId
  });
  
  return {
    seat: permanentSeat,
    isNew: true,
    isExisting: false
  };
};

// Static method: Update permanent seat (for drag & drop reassignments)
studentPermanentSeatSchema.statics.updatePermanentSeat = async function({
  enrollmentNumber,
  newRoomNumber,
  newRow,
  newCol,
  newSeatNumber
}) {
  const permanentSeat = await this.findOne({ enrollmentNumber, isActive: true });
  
  if (!permanentSeat) {
    throw new Error(`No permanent seat found for enrollment ${enrollmentNumber}`);
  }
  
  // Check if new seat is occupied
  const seatOccupied = await this.findOne({
    roomNumber: newRoomNumber,
    row: newRow,
    col: newCol,
    isActive: true,
    enrollmentNumber: { $ne: enrollmentNumber }
  });
  
  if (seatOccupied) {
    throw new Error(`Cannot move to seat ${newSeatNumber} - already occupied by ${seatOccupied.enrollmentNumber}`);
  }
  
  // Update the permanent seat
  permanentSeat.roomNumber = newRoomNumber;
  permanentSeat.row = newRow;
  permanentSeat.col = newCol;
  permanentSeat.seatNumber = newSeatNumber;
  
  await permanentSeat.save();
  return permanentSeat;
};

// Static method: Clear permanent seat (when student is removed from system)
studentPermanentSeatSchema.statics.clearPermanentSeat = async function(enrollmentNumber) {
  const result = await this.findOneAndUpdate(
    { enrollmentNumber, isActive: true },
    { isActive: false },
    { new: true }
  );
  return result;
};

// Static method: Get all permanent seats with pagination
studentPermanentSeatSchema.statics.getAllPermanentSeats = async function({
  page = 1,
  limit = 100,
  sortBy = 'enrollmentNumber',
  order = 'asc'
}) {
  const skip = (page - 1) * limit;
  const sortOrder = order === 'desc' ? -1 : 1;
  
  const [seats, total] = await Promise.all([
    this.find({ isActive: true })
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit),
    this.countDocuments({ isActive: true })
  ]);
  
  return {
    seats,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// Static method: Bulk create permanent seats
studentPermanentSeatSchema.statics.bulkCreateSeats = async function(seatAssignments) {
  // Filter out any that already have permanent seats
  const enrollmentNumbers = seatAssignments.map(s => s.enrollmentNumber);
  
  const existingSeats = await this.find({
    enrollmentNumber: { $in: enrollmentNumbers },
    isActive: true
  }).select('enrollmentNumber');
  
  const existingSet = new Set(existingSeats.map(s => s.enrollmentNumber));
  
  const newAssignments = seatAssignments.filter(
    s => !existingSet.has(s.enrollmentNumber)
  );
  
  if (newAssignments.length === 0) {
    return { created: 0, skipped: seatAssignments.length };
  }
  
  const result = await this.insertMany(newAssignments, { ordered: false });
  
  return {
    created: result.length,
    skipped: seatAssignments.length - result.length
  };
};

// Instance method: Check if this seat is occupied
studentPermanentSeatSchema.methods.checkAvailability = async function() {
  const occupied = await this.constructor.findOne({
    roomNumber: this.roomNumber,
    row: this.row,
    col: this.col,
    isActive: true,
    enrollmentNumber: { $ne: this.enrollmentNumber }
  });
  
  return !occupied;
};

export const StudentPermanentSeat = mongoose.model('StudentPermanentSeat', studentPermanentSeatSchema);
export default StudentPermanentSeat;
