import mongoose from 'mongoose';

const enrollmentRangeSchema = new mongoose.Schema({
  collegeCode: {
    type: String,
    required: [true, 'College code is required'],
    length: [4, 'College code must be exactly 4 characters'],
    match: [/^[A-Z]{4}$/, 'College code must contain only uppercase letters'],
    uppercase: true,
    trim: true
  },
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
  startRoll: {
    type: Number,
    required: [true, 'Start roll number is required'],
    min: [1, 'Start roll number must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Start roll number must be an integer'
    }
  },
  endRoll: {
    type: Number,
    required: [true, 'End roll number is required'],
    validate: {
      validator: function(value) {
        return Number.isInteger(value) && value > this.startRoll;
      },
      message: 'End roll number must be an integer greater than start roll'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  autoIndex: false  // Disable automatic index creation - NO INDEXES
});

// REMOVED ALL INDEXES - No indexing as requested

// Virtual for total students
enrollmentRangeSchema.virtual('totalStudents').get(function() {
  return this.endRoll - this.startRoll + 1;
});

// Virtual for formatted range
enrollmentRangeSchema.virtual('formattedRange').get(function() {
  return `${this.startRoll}-${this.endRoll}`;
});

// Virtual for unique identifier
enrollmentRangeSchema.virtual('uniqueId').get(function() {
  return `${this.collegeCode}-${this.branchCode}-${this.year}`;
});

// Pre-save validation to ensure endRoll > startRoll
enrollmentRangeSchema.pre('save', function(next) {
  if (this.endRoll <= this.startRoll) {
    const error = new Error('End roll number must be greater than start roll number');
    return next(error);
  }
  next();
});

export const EnrollmentRange = mongoose.model('EnrollmentRange', enrollmentRangeSchema);
export default EnrollmentRange;
