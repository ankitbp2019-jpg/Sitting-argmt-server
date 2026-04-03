/**
 * Enrollment Number Generator Service
 * Generates enrollment numbers based on college, branch, year, and roll range
 */

/**
 * Generate enrollment numbers for a given range
 * @param {Object} params - Generation parameters
 * @param {string} params.collegeCode - College code (4 characters)
 * @param {string} params.branchCode - Branch code (2 characters)
 * @param {string} params.year - Year code (2 digits)
 * @param {number} params.startRoll - Starting roll number
 * @param {number} params.endRoll - Ending roll number
 * @returns {string[]} Array of generated enrollment numbers
 * @throws {Error} If parameters are invalid
 */
export const generateEnrollments = ({ collegeCode, branchCode, year, startRoll, endRoll }) => {
  // Input validation
  if (!collegeCode || typeof collegeCode !== 'string') {
    throw new Error('College code is required and must be a string');
  }
  
  if (!branchCode || typeof branchCode !== 'string') {
    throw new Error('Branch code is required and must be a string');
  }
  
  if (!year || typeof year !== 'string') {
    throw new Error('Year is required and must be a string');
  }
  
  if (typeof startRoll !== 'number' || startRoll < 1) {
    throw new Error('Start roll must be a positive number');
  }
  
  if (typeof endRoll !== 'number' || endRoll < 1) {
    throw new Error('End roll must be a positive number');
  }
  
  if (startRoll > endRoll) {
    throw new Error('Start roll cannot be greater than end roll');
  }
  
  // Format validation
  if (collegeCode.length !== 4) {
    throw new Error('College code must be exactly 4 characters');
  }
  
  if (branchCode.length !== 2) {
    throw new Error('Branch code must be exactly 2 characters');
  }
  
  if (year.length !== 2) {
    throw new Error('Year must be exactly 2 characters');
  }
  
  if (!/^\d{2}$/.test(year)) {
    throw new Error('Year must contain only digits');
  }
  
  // Generate enrollment numbers
  const enrollments = [];
  const formattedCollegeCode = collegeCode.toUpperCase();
  const formattedBranchCode = branchCode.toUpperCase();
  
  for (let roll = startRoll; roll <= endRoll; roll++) {
    // Zero-pad roll number to 4 digits
    const paddedRoll = roll.toString().padStart(4, '0');
    
    // Format: [collegeCode][branchCode][year][roll(4 digits)]
    const enrollmentNumber = `${formattedCollegeCode}${formattedBranchCode}${year}${paddedRoll}`;
    
    enrollments.push(enrollmentNumber);
  }
  
  return enrollments;
};

/**
 * Generate a single enrollment number
 * @param {Object} params - Generation parameters
 * @param {string} params.collegeCode - College code (4 characters)
 * @param {string} params.branchCode - Branch code (2 characters)
 * @param {string} params.year - Year code (2 digits)
 * @param {number} params.roll - Roll number
 * @returns {string} Generated enrollment number
 * @throws {Error} If parameters are invalid
 */
export const generateSingleEnrollment = ({ collegeCode, branchCode, year, roll }) => {
  return generateEnrollments({
    collegeCode,
    branchCode,
    year,
    startRoll: roll,
    endRoll: roll
  })[0];
};

/**
 * Validate enrollment number format
 * @param {string} enrollmentNumber - Enrollment number to validate
 * @returns {Object} Parsed components or null if invalid
 */
export const validateEnrollmentNumber = (enrollmentNumber) => {
  if (!enrollmentNumber || typeof enrollmentNumber !== 'string') {
    return null;
  }
  
  // Expected format: 4+2+2+4 = 12 characters
  if (enrollmentNumber.length !== 12) {
    return null;
  }
  
  const collegeCode = enrollmentNumber.substring(0, 4);
  const branchCode = enrollmentNumber.substring(4, 6);
  const year = enrollmentNumber.substring(6, 8);
  const roll = enrollmentNumber.substring(8);
  
  // Validate components
  if (!/^[A-Z]{4}$/.test(collegeCode)) {
    return null;
  }
  
  if (!/^[A-Z]{2}$/.test(branchCode)) {
    return null;
  }
  
  if (!/^\d{2}$/.test(year)) {
    return null;
  }
  
  if (!/^\d{4}$/.test(roll)) {
    return null;
  }
  
  return {
    collegeCode,
    branchCode,
    year,
    roll: parseInt(roll, 10)
  };
};

/**
 * Extract roll number from enrollment number
 * @param {string} enrollmentNumber - Enrollment number
 * @returns {number|null} Roll number or null if invalid
 */
export const extractRollNumber = (enrollmentNumber) => {
  const parsed = validateEnrollmentNumber(enrollmentNumber);
  return parsed ? parsed.roll : null;
};

export default {
  generateEnrollments,
  generateSingleEnrollment,
  validateEnrollmentNumber,
  extractRollNumber
};
