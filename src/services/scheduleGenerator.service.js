/**
 * Schedule Generator Service
 * Generates exam schedules with date management and session allocation
 */

import { isExamSuitable } from './holiday.service.js';

/**
 * Generate exam schedule for multiple groups
 * @param {Object} params - Schedule generation parameters
 * @param {Date} params.startDate - Starting date for exams
 * @param {number} params.gapDays - Number of days to gap between groups
 * @param {string[]} params.sessions - Available sessions ['morning', 'afternoon', 'evening']
 * @param {Object[]} params.groups - Array of exam groups
 * @param {string} params.groups[].collegeCode - College code (4 characters)
 * @param {string[]} params.groups[].branches - Array of branch codes
 * @param {string} params.groups[].year - Year code (2 digits)
 * @param {string[]} params.groups[].enrollmentRangeIds - Array of enrollment range IDs
 * @returns {Object[]} Array of generated schedule objects
 * @throws {Error} If parameters are invalid
 */
export const generateSchedule = ({ startDate, gapDays, sessions, groups }) => {
  // Input validation
  if (!startDate || !(startDate instanceof Date)) {
    throw new Error('Start date is required and must be a Date object');
  }
  
  if (typeof gapDays !== 'number' || gapDays < 0) {
    throw new Error('Gap days must be a non-negative number');
  }
  
  if (!Array.isArray(sessions) || sessions.length === 0) {
    throw new Error('Sessions must be a non-empty array');
  }
  
  if (sessions.length > 3) {
    throw new Error('Maximum 3 sessions allowed per day');
  }
  
  if (!Array.isArray(groups) || groups.length === 0) {
    throw new Error('Groups must be a non-empty array');
  }
  
  // Validate sessions
  const validSessions = ['morning', 'afternoon', 'evening'];
  for (const session of sessions) {
    if (!validSessions.includes(session)) {
      throw new Error(`Invalid session: ${session}. Must be one of: ${validSessions.join(', ')}`);
    }
  }
  
  // Validate groups
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    
    if (!group.collegeCode || typeof group.collegeCode !== 'string') {
      throw new Error(`Group ${i + 1}: College code is required and must be a string`);
    }
    
    if (!Array.isArray(group.branches) || group.branches.length === 0) {
      throw new Error(`Group ${i + 1}: Branches must be a non-empty array`);
    }
    
    if (!group.year || typeof group.year !== 'string') {
      throw new Error(`Group ${i + 1}: Year is required and must be a string`);
    }
    
    if (!Array.isArray(group.enrollmentRangeIds) || group.enrollmentRangeIds.length === 0) {
      throw new Error(`Group ${i + 1}: Enrollment range IDs must be a non-empty array`);
    }
    
    // Validate branch-enrollment mapping
    if (group.branches.length !== group.enrollmentRangeIds.length) {
      throw new Error(`Group ${i + 1}: Number of branches must match number of enrollment range IDs`);
    }
    
    // Validate college code format
    if (!/^[A-Z]{4}$/.test(group.collegeCode)) {
      throw new Error(`Group ${i + 1}: College code must be exactly 4 uppercase letters`);
    }
  }
  
  // Date range validation - prevent schedules beyond 1 year
  const maxDate = new Date(startDate);
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  
  // Generate schedule
  const schedule = [];
  let currentDate = new Date(startDate);
  
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];
    
    // Check if current date is suitable for exams
    const { isSuitable, reason } = isExamSuitable(currentDate);
    if (!isSuitable) {
      throw new Error(`Cannot schedule exam on ${currentDate.toDateString()}. Reason: ${reason}`);
    }
    
    // Assign sessions for this group
    for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
      const session = sessions[sessionIndex];
      
      // Create schedule entry for this session
      const scheduleEntry = {
        date: new Date(currentDate),
        session,
        collegeCode: group.collegeCode,
        branches: group.branches.map((branchCode, index) => ({
          branchCode,
          year: group.year,
          enrollmentRangeId: group.enrollmentRangeIds[index]
        }))
      };
      
      schedule.push(scheduleEntry);
    }
    
    // Move to next date for next group
    currentDate.setDate(currentDate.getDate() + gapDays);
    
    // Check if current date exceeds maximum allowed date
    if (currentDate > maxDate) {
      throw new Error('Schedule cannot extend beyond 1 year from start date');
    }
  }
  
  return schedule;
};

/**
 * Generate schedule with automatic session balancing
 * @param {Object} params - Schedule generation parameters
 * @param {Date} params.startDate - Starting date for exams
 * @param {number} params.gapDays - Number of days to gap between groups
 * @param {Object[]} params.groups - Array of exam groups
 * @returns {Object[]} Array of generated schedule objects
 */
export const generateBalancedSchedule = ({ startDate, gapDays, groups }) => {
  const defaultSessions = ['morning', 'afternoon'];
  
  // Alternate sessions for better resource utilization
  const sessions = groups.map((_, index) => {
    return index % 2 === 0 ? defaultSessions : [...defaultSessions].reverse();
  }).flat();
  
  return generateSchedule({
    startDate,
    gapDays,
    sessions,
    groups
  });
};

/**
 * Generate schedule with custom date ranges
 * @param {Object} params - Schedule generation parameters
 * @param {Date[]} params.dates - Array of specific dates
 * @param {string[]} params.sessions - Sessions for each date
 * @param {Object[]} params.groups - Array of exam groups
 * @returns {Object[]} Array of generated schedule objects
 */
export const generateCustomSchedule = ({ dates, sessions, groups }) => {
  if (!Array.isArray(dates) || dates.length === 0) {
    throw new Error('Dates must be a non-empty array');
  }
  
  if (!Array.isArray(sessions) || sessions.length !== dates.length) {
    throw new Error('Sessions array must match dates array length');
  }
  
  if (!Array.isArray(groups) || groups.length !== dates.length) {
    throw new Error('Groups array must match dates array length');
  }
  
  const schedule = [];
  
  for (let i = 0; i < dates.length; i++) {
    const group = groups[i];
    const date = dates[i];
    const session = sessions[i];
    
    const scheduleEntry = {
      date: new Date(date),
      session,
      collegeCode: group.collegeCode,
      branches: group.branches.map((branchCode, index) => ({
        branchCode,
        year: group.year,
        enrollmentRangeId: group.enrollmentRangeIds[index]
      }))
    };
    
    schedule.push(scheduleEntry);
  }
  
  return schedule;
};

/**
 * Validate generated schedule
 * @param {Object[]} schedule - Generated schedule array
 * @returns {Object} Validation result with errors and warnings
 */
export const validateSchedule = (schedule) => {
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  if (!Array.isArray(schedule)) {
    result.isValid = false;
    result.errors.push('Schedule must be an array');
    return result;
  }
  
  // Check for duplicate schedules
  const scheduleKeys = new Set();
  
  for (let i = 0; i < schedule.length; i++) {
    const entry = schedule[i];
    
    // Check required fields
    if (!entry.date || !(entry.date instanceof Date)) {
      result.errors.push(`Entry ${i + 1}: Valid date is required`);
      result.isValid = false;
    }
    
    if (!entry.session) {
      result.errors.push(`Entry ${i + 1}: Session is required`);
      result.isValid = false;
    }
    
    if (!entry.collegeCode) {
      result.errors.push(`Entry ${i + 1}: College code is required`);
      result.isValid = false;
    }
    
    if (!Array.isArray(entry.branches)) {
      result.errors.push(`Entry ${i + 1}: Branches array is required`);
      result.isValid = false;
    }
    
    // Check for duplicates
    const key = `${entry.date.toISOString().split('T')[0]}-${entry.session}-${entry.collegeCode}`;
    if (scheduleKeys.has(key)) {
      result.warnings.push(`Duplicate schedule found: ${key}`);
    }
    scheduleKeys.add(key);
  }
  
  return result;
};

/**
 * Format schedule for display
 * @param {Object[]} schedule - Generated schedule array
 * @returns {Object[]} Formatted schedule with readable dates
 */
export const formatSchedule = (schedule) => {
  return schedule.map(entry => ({
    ...entry,
    formattedDate: entry.date.toISOString().split('T')[0],
    readableDate: entry.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }));
};

export default {
  generateSchedule,
  generateBalancedSchedule,
  generateCustomSchedule,
  validateSchedule,
  formatSchedule
};
