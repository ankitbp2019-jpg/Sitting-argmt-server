import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Subject code is required'],
    uppercase: true,
    trim: true,
    maxlength: [20, 'Subject code cannot exceed 20 characters']
  },
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    maxlength: [100, 'Subject name cannot exceed 100 characters']
  },
  branchCode: {
    type: String,
    required: [true, 'Branch code is required'],
    uppercase: true,
    trim: true,
    length: [2, 'Branch code must be exactly 2 characters'],
    match: [/^[A-Z]{2}$/, 'Branch code must contain only uppercase letters']
  },
  collegeCode: {
    type: String,
    required: [true, 'College code is required'],
    uppercase: true,
    trim: true,
    length: [4, 'College code must be exactly 4 characters'],
    match: [/^[A-Z0-9]{4}$/, 'College code must be 4 characters']
  },
  year: {
    type: String,
    required: [true, 'Year is required'],
    length: [2, 'Year must be exactly 2 characters'],
    match: [/^\d{2}$/, 'Year must contain only digits']
  },
  active: {
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

// Virtual for full identifier
subjectSchema.virtual('uniqueId').get(function() {
  return `${this.collegeCode}-${this.branchCode}-${this.year}-${this.code}`;
});

export const Subject = mongoose.model('Subject', subjectSchema);
export default Subject;
