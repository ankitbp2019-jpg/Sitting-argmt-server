import mongoose from 'mongoose';

const seatingPlanSchema = new mongoose.Schema({
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: [true, 'Schedule reference is required'],
    index: true
  },
  date: {
    type: Date,
    required: [true, 'Exam date is required'],
    validate: {
      validator: function(value) {
        return value >= new Date();
      },
      message: 'Exam date cannot be in the past'
    }
  },
  session: {
    type: String,
    required: [true, 'Exam session is required'],
    enum: {
      values: ['morning', 'afternoon', 'evening'],
      message: 'Session must be morning, afternoon, or evening'
    }
  },
  rooms: [{
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
      maxlength: [10, 'Room number cannot exceed 10 characters']
    },
    rows: {
      type: Number,
      required: [true, 'Number of rows is required'],
      min: [1, 'Rows must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Rows must be an integer'
      }
    },
    cols: {
      type: Number,
      required: [true, 'Number of columns is required'],
      min: [1, 'Columns must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Columns must be an integer'
      }
    }
  }],
  seats: [{
    seatNumber: {
      type: String,
      required: [true, 'Seat number is required'],
      trim: true,
      maxlength: [15, 'Seat number cannot exceed 15 characters']
    },
    enrollmentNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'Enrollment number cannot exceed 20 characters'],
      default: null
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
    status: {
      type: String,
      required: [true, 'Seat status is required'],
      enum: {
        values: ['assigned', 'deleted', 'empty'],
        message: 'Status must be assigned, deleted, or empty'
      },
      default: 'empty'
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for schedule uniqueness
seatingPlanSchema.index({ scheduleId: 1 }, { unique: true });

// Index for date-based queries
seatingPlanSchema.index({ date: 1, session: 1 });

// Compound index for seat lookups
seatingPlanSchema.index({ 'seats.roomNumber': 1, 'seats.row': 1, 'seats.col': 1 });

// Index for enrollment number lookups
seatingPlanSchema.index({ 'seats.enrollmentNumber': 1 });

// Virtual for formatted date
seatingPlanSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Virtual for unique identifier
seatingPlanSchema.virtual('uniqueId').get(function() {
  return `${this.scheduleId}-${this.formattedDate}-${this.session}`;
});

// Virtual for total rooms
seatingPlanSchema.virtual('totalRooms').get(function() {
  return this.rooms.length;
});

// Virtual for total seats
seatingPlanSchema.virtual('totalSeats').get(function() {
  return this.seats.length;
});

// Virtual for assigned seats count
seatingPlanSchema.virtual('assignedSeats').get(function() {
  return this.seats.filter(seat => seat.status === 'assigned').length;
});

// Virtual for empty seats count
seatingPlanSchema.virtual('emptySeats').get(function() {
  return this.seats.filter(seat => seat.status === 'empty').length;
});

// Virtual for deleted seats count
seatingPlanSchema.virtual('deletedSeats').get(function() {
  return this.seats.filter(seat => seat.status === 'deleted').length;
});

// Pre-save validation to ensure room capacity matches seats
seatingPlanSchema.pre('save', function(next) {
  const roomCapacities = {};
  
  // Calculate total capacity from rooms
  this.rooms.forEach(room => {
    roomCapacities[room.roomNumber] = room.rows * room.cols;
  });
  
  // Count seats per room
  const seatCounts = {};
  this.seats.forEach(seat => {
    seatCounts[seat.roomNumber] = (seatCounts[seat.roomNumber] || 0) + 1;
  });
  
  // Validate capacity matches
  for (const [roomNumber, capacity] of Object.entries(roomCapacities)) {
    const seatCount = seatCounts[roomNumber] || 0;
    if (seatCount > capacity) {
      const error = new Error(`Room ${roomNumber} has ${seatCount} seats but capacity is ${capacity}`);
      return next(error);
    }
  }
  
  next();
});

// Static method to find by schedule
seatingPlanSchema.statics.findBySchedule = function(scheduleId) {
  return this.findOne({ scheduleId }).populate('scheduleId');
};

// Static method to find by date and session
seatingPlanSchema.statics.findByDateAndSession = function(date, session) {
  return this.findOne({ date, session }).populate('scheduleId');
};

// Instance method to get seats by room
seatingPlanSchema.methods.getSeatsByRoom = function(roomNumber) {
  return this.seats.filter(seat => seat.roomNumber === roomNumber);
};

// Instance method to get seat by enrollment number
seatingPlanSchema.methods.getSeatByEnrollment = function(enrollmentNumber) {
  return this.seats.find(seat => seat.enrollmentNumber === enrollmentNumber);
};

// Instance method to update seat assignment (drag & drop support)
seatingPlanSchema.methods.updateSeatAssignment = function(seatNumber, enrollmentNumber, status = 'assigned') {
  const seat = this.seats.find(s => s.seatNumber === seatNumber);
  if (seat) {
    seat.enrollmentNumber = enrollmentNumber;
    seat.status = status;
    return this.save();
  }
  throw new Error(`Seat ${seatNumber} not found`);
};

// Instance method to clear seat assignment
seatingPlanSchema.methods.clearSeatAssignment = function(seatNumber) {
  const seat = this.seats.find(s => s.seatNumber === seatNumber);
  if (seat) {
    seat.enrollmentNumber = null;
    seat.status = 'empty';
    return this.save();
  }
  throw new Error(`Seat ${seatNumber} not found`);
};

export const SeatingPlan = mongoose.model('SeatingPlan', seatingPlanSchema);
export default SeatingPlan;
