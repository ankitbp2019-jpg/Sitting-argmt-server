import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  collegeCode: {
    type: String,
    required: [true, 'College code is required'],
    length: [4, 'College code must be exactly 4 characters'],
    match: [/^[A-Z]{4}$/, 'College code must contain only uppercase letters'],
    uppercase: true,
    trim: true
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
  branches: [{
    branchCode: {
      type: String,
      required: [true, 'Branch code is required'],
      length: [2, 'Branch code must be exactly 2 characters'],
      match: [/^[A-Z]{2}$/, 'Branch code must contain only uppercase letters'],
      uppercase: true,
      trim: true
    },
    year: {
      type: String,
      required: [true, 'Year is required'],
      length: [2, 'Year must be exactly 2 characters'],
      match: [/^\d{2}$/, 'Year must contain only digits']
    },
    enrollmentRangeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EnrollmentRange',
      required: [true, 'Enrollment range reference is required']
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  autoIndex: false  // Disable automatic index creation - NO INDEXES
});

// REMOVED ALL INDEXES - No indexing as requested

// Virtual for formatted date
scheduleSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Virtual for total branches
scheduleSchema.virtual('totalBranches').get(function() {
  return this.branches.length;
});

// Virtual for total students (requires population)
scheduleSchema.virtual('totalStudents', {
  ref: 'EnrollmentRange',
  localField: 'branches.enrollmentRangeId',
  foreignField: '_id',
  count: true
});

// Virtual for unique schedule identifier
scheduleSchema.virtual('uniqueId').get(function() {
  return `${this.collegeCode}-${this.formattedDate}-${this.session}`;
});

// Pre-save validation to prevent duplicate branches in same schedule
scheduleSchema.pre('save', function(next) {
  const branchCombinations = this.branches.map(b => `${b.branchCode}-${b.year}`);
  const uniqueCombinations = [...new Set(branchCombinations)];
  
  if (branchCombinations.length !== uniqueCombinations.length) {
    const error = new Error('Duplicate branch-year combinations found in schedule');
    return next(error);
  }
  
  next();
});

export const Schedule = mongoose.model('Schedule', scheduleSchema);
export default Schedule;
