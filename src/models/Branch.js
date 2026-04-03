import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Branch name is required'],
    trim: true,
    maxlength: [100, 'Branch name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Branch code is required'],
    uppercase: true,
    trim: true,
    length: [2, 'Branch code must be exactly 2 characters'],
    match: [/^[A-Z]{2}$/, 'Branch code must contain only uppercase letters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for faster queries
branchSchema.index({ code: 1 }, { unique: true });

// Virtual for formatted display
branchSchema.virtual('formatted').get(function() {
  return `${this.code} - ${this.name}`;
});

export const Branch = mongoose.model('Branch', branchSchema);
export default Branch;
