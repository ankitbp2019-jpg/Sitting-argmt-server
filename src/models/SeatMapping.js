import mongoose from 'mongoose';

const seatMappingSchema = new mongoose.Schema({
  enrollmentNumber: {
    type: String,
    required: [true, 'Enrollment number is required'],
    trim: true,
    maxlength: [20, 'Enrollment number cannot exceed 20 characters']
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: [true, 'Schedule reference is required']
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
  deskId: {
    type: String,
    trim: true,
    maxlength: [15, 'Desk ID cannot exceed 15 characters'],
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  autoIndex: false  // Disable automatic index creation - NO INDEXES
});

// REMOVED ALL INDEXES - No indexing as requested

// Virtual for formatted seat position
seatMappingSchema.virtual('formattedSeat').get(function() {
  return `${this.roomNumber}-R${this.row}C${this.col}`;
});

// Virtual for seat coordinates object
seatMappingSchema.virtual('coordinates').get(function() {
  return {
    row: this.row,
    column: this.col,
    room: this.roomNumber
  };
});

// Virtual for unique seat identifier across schedules
seatMappingSchema.virtual('uniqueSeatId').get(function() {
  return `${this.scheduleId}-${this.enrollmentNumber}`;
});

// Pre-save validation to ensure no duplicate seats in same room
seatMappingSchema.pre('save', async function(next) {
  // Check if another seat mapping exists with same room, row, col
  const existingSeat = await this.constructor.findOne({
    roomNumber: this.roomNumber,
    row: this.row,
    col: this.col,
    _id: { $ne: this._id }
  });
  
  if (existingSeat) {
    const error = new Error(`Seat R${this.row}C${this.col} in room ${this.roomNumber} is already assigned`);
    return next(error);
  }
  
  next();
});

// Static method to find seats by room
seatMappingSchema.statics.findByRoom = function(roomNumber) {
  return this.find({ roomNumber }).sort({ row: 1, col: 1 });
};

// Static method to find seat by enrollment number
seatMappingSchema.statics.findByEnrollment = function(enrollmentNumber) {
  return this.findOne({ enrollmentNumber });
};

// Static method to find seats by schedule
seatMappingSchema.statics.findBySchedule = function(scheduleId) {
  return this.find({ scheduleId }).sort({ roomNumber: 1, row: 1, col: 1 });
};

// Static method to find seat by enrollment in specific schedule
seatMappingSchema.statics.findByEnrollmentInSchedule = function(enrollmentNumber, scheduleId) {
  return this.findOne({ enrollmentNumber, scheduleId });
};

// Instance method to get neighboring seats
seatMappingSchema.methods.getNeighbors = function() {
  return this.constructor.find({
    roomNumber: this.roomNumber,
    scheduleId: this.scheduleId,
    $or: [
      { row: this.row - 1, col: this.col },
      { row: this.row + 1, col: this.col },
      { row: this.row, col: this.col - 1 },
      { row: this.row, col: this.col + 1 }
    ]
  });
};

// Instance method to get student's schedule info
seatMappingSchema.methods.getScheduleInfo = function() {
  return this.constructor.findById(this._id).populate('scheduleId');
};

export const SeatMapping = mongoose.model('SeatMapping', seatMappingSchema);
export default SeatMapping;
