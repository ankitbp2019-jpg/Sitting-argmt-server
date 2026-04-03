/**
 * Holiday Management Service
 * Provides holiday checking functionality for schedule generation
 */

// Sample holiday dates (can be extended or loaded from database)
const HOLIDAYS = [
  // Common holidays (YYYY-MM-DD format will be checked against any year)
  '01-01', // New Year's Day
  '01-26', // Republic Day (India)
  '08-15', // Independence Day (India)
  '10-02', // Gandhi Jayanti
  '12-25', // Christmas
  // Add more holidays as needed
];

/**
 * Check if a date is a holiday
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is a holiday
 */
export const isHoliday = (date) => {
  const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return HOLIDAYS.includes(monthDay);
};

/**
 * Check if a date is a weekend
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is Saturday or Sunday
 */
export const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
};

/**
 * Check if a date is suitable for exams (not weekend or holiday)
 * @param {Date} date - Date to check
 * @returns {Object} Result with isSuitable and reason
 */
export const isExamSuitable = (date) => {
  if (isWeekend(date)) {
    return { isSuitable: false, reason: 'Weekend' };
  }
  
  if (isHoliday(date)) {
    return { isSuitable: false, reason: 'Holiday' };
  }
  
  return { isSuitable: true, reason: null };
};

/**
 * Find next suitable exam date
 * @param {Date} startDate - Starting date
 * @param {number} maxDays - Maximum days to search ahead
 * @returns {Date|null} Next suitable date or null if not found
 */
export const findNextSuitableDate = (startDate, maxDays = 30) => {
  const currentDate = new Date(startDate);
  
  for (let i = 0; i < maxDays; i++) {
    const checkDate = new Date(currentDate);
    checkDate.setDate(currentDate.getDate() + i);
    
    const { isSuitable } = isExamSuitable(checkDate);
    if (isSuitable) {
      return checkDate;
    }
  }
  
  return null; // No suitable date found within range
};

export default {
  isHoliday,
  isWeekend,
  isExamSuitable,
  findNextSuitableDate,
  HOLIDAYS
};
