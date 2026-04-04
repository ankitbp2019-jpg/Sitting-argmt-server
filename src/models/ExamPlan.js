import mongoose from 'mongoose';

const examPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
    maxlength: [100, 'Plan name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    match: [/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY']
  },
  // Room Configuration - Multiple rooms/classes support
  rooms: [{
    roomId: {
      type: String,
      required: true
    },
    roomName: {
      type: String,
      required: true,
      default: 'Room A101'
    },
    rows: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
      default: 6
    },
    cols: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
      default: 8
    },
    capacity: {
      type: Number,
      default: function() {
        return this.rows * this.cols;
      }
    },
    sessions: [{
      type: String,
      enum: ['morning', 'afternoon', 'evening']
    }]
  }],
  // Default sessions if not specified per room
  sessions: [{
    type: String,
    enum: ['morning', 'afternoon', 'evening'],
    default: 'morning'
  }],
  // Branch groups with student info
  branchGroups: [{
    branchCode: {
      type: String,
      required: true,
      uppercase: true
    },
    totalStudents: {
      type: Number,
      required: true,
      min: 0
    },
    colleges: [{
      collegeCode: {
        type: String,
        required: true,
        uppercase: true
      },
      year: String,
      rollRanges: [{
        start: String,
        end: String,
        count: Number
      }]
    }]
  }],
  // Subjects per branch
  subjects: [{
    branchCode: {
      type: String,
      required: true,
      uppercase: true
    },
    subjectCode: {
      type: String,
      required: true,
      uppercase: true
    },
    subjectName: String,
    examDate: Date,
    session: {
      type: String,
      enum: ['morning', 'afternoon', 'evening'],
      default: 'morning'
    }
  }],
  // Schedule metadata
  scheduledDates: [{
    date: Date,
    branches: [String],
    subjects: [{
      branchCode: String,
      subjectCode: String
    }],
    totalStudents: Number,
    seatsAvailable: Number
  }],
  // Planning mode
  planMode: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'auto'
  },
  gapDays: {
    type: Number,
    default: 3
  },
  // Status
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'completed'],
    default: 'draft'
  },
  // Seat assignments (generated later)
  seatAssignments: [{
    date: Date,
    seatNumber: Number,
    row: Number,
    col: Number,
    rollNumber: String,
    branchCode: String,
    collegeCode: String,
    subjectCode: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  autoIndex: false  // Disable automatic index creation - NO INDEXES
});

// REMOVED ALL INDEXES - No indexing as requested

// Virtual for total capacity per day (all rooms combined)
examPlanSchema.virtual('seatsPerDay').get(function() {
  if (!this.rooms || this.rooms.length === 0) return 0;
  return this.rooms.reduce((total, room) => {
    const roomCapacity = room.rows * room.cols;
    const roomSessions = room.sessions?.length || this.sessions?.length || 1;
    return total + (roomCapacity * roomSessions);
  }, 0);
});

// Virtual for capacity breakdown by room
examPlanSchema.virtual('roomCapacities').get(function() {
  if (!this.rooms || this.rooms.length === 0) return [];
  return this.rooms.map(room => ({
    roomId: room.roomId,
    roomName: room.roomName,
    capacity: room.rows * room.cols,
    rows: room.rows,
    cols: room.cols,
    sessions: room.sessions || this.sessions || ['morning']
  }));
});

// Virtual for exam duration in days
examPlanSchema.virtual('examDuration').get(function() {
  if (!this.scheduledDates || this.scheduledDates.length === 0) return 0;
  const dates = this.scheduledDates.map(d => new Date(d.date));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  return Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
});

// Virtual for unique branch count
examPlanSchema.virtual('branchCount').get(function() {
  return this.branchGroups?.length || 0;
});

// Virtual for total subjects count
examPlanSchema.virtual('totalSubjects').get(function() {
  return this.subjects?.length || 0;
});

// Method to check capacity for a specific date across all rooms
examPlanSchema.methods.checkDateCapacity = function(date) {
  const totalSeatsPerDay = this.seatsPerDay;
  const dateData = this.scheduledDates.find(d => d.date.toISOString().split('T')[0] === date);
  
  // Calculate per-room capacity breakdown
  const roomBreakdown = this.rooms.map(room => {
    const roomCapacity = room.rows * room.cols;
    const roomSessions = room.sessions?.length || this.sessions?.length || 1;
    const roomTotal = roomCapacity * roomSessions;
    return {
      roomId: room.roomId,
      roomName: room.roomName,
      total: roomTotal,
      used: 0, // Will be calculated if we have room-specific allocation
      remaining: roomTotal
    };
  });
  
  if (!dateData) {
    return { 
      available: totalSeatsPerDay, 
      used: 0, 
      remaining: totalSeatsPerDay,
      rooms: roomBreakdown
    };
  }
  
  return {
    available: totalSeatsPerDay,
    used: dateData.totalStudents,
    remaining: totalSeatsPerDay - dateData.totalStudents,
    rooms: roomBreakdown
  };
};

// Method to find best room distribution for students
examPlanSchema.methods.distributeStudentsAcrossRooms = function(totalStudents) {
  const distribution = [];
  let remainingStudents = totalStudents;
  
  for (const room of this.rooms) {
    const roomCapacity = room.rows * room.cols;
    const roomSessions = room.sessions?.length || this.sessions?.length || 1;
    const roomTotalCapacity = roomCapacity * roomSessions;
    
    const allocated = Math.min(remainingStudents, roomTotalCapacity);
    distribution.push({
      roomId: room.roomId,
      roomName: room.roomName,
      allocated: allocated,
      capacity: roomTotalCapacity,
      rows: room.rows,
      cols: room.cols
    });
    
    remainingStudents -= allocated;
    if (remainingStudents <= 0) break;
  }
  
  return {
    distribution,
    totalAllocated: totalStudents - remainingStudents,
    overflow: remainingStudents > 0 ? remainingStudents : 0
  };
};

export const ExamPlan = mongoose.model('ExamPlan', examPlanSchema);
export default ExamPlan;
