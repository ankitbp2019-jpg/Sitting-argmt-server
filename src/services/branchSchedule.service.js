import mongoose from 'mongoose';
import { Schedule } from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * Branch-Based Schedule Planner Service
 * 
 * Key Features:
 * 1. Same branch code = same exam date (regardless of college)
 * 2. Manual dates OR auto gap (default 3-4 days)
 * 3. Room capacity validation
 * 4. Multi-college support for same branch
 */

/**
 * Plan exam schedules based on branch groupings
 * @param {Object} params - Planning parameters
 * @param {Array} params.branches - Array of {branchCode, collegeCode, year, enrollmentRangeId, studentCount}
 * @param {Date} params.startDate - Starting date for exams
 * @param {number} params.gapDays - Days between exams (default: 3)
 * @param {Object} params.roomConfig - Room layout {rows, cols, roomName}
 * @param {Array} params.sessions - Available sessions ['morning', 'afternoon', 'evening']
 * @param {boolean} params.autoCalculate - If true, use gapDays; if false, use provided dates
 * @param {Array} params.manualDates - Optional array of dates for manual scheduling
 * @returns {Object} Planned schedules with capacity info
 */
export const planBranchBasedSchedules = async ({
  branches,
  startDate,
  gapDays = 3,
  roomConfig,
  sessions = ['morning'],
  autoCalculate = true,
  manualDates = []
}) => {
  if (!branches || !Array.isArray(branches) || branches.length === 0) {
    throw new Error('Branches array is required');
  }

  if (!startDate && autoCalculate) {
    throw new Error('Start date is required for auto-calculated schedules');
  }

  if (!roomConfig || !roomConfig.rows || !roomConfig.cols) {
    throw new Error('Room configuration with rows and cols is required');
  }

  try {
    logger.info(`Planning branch-based schedules for ${branches.length} branch entries`);

    // Group branches by branchCode (same branch = same exam day)
    const branchGroups = new Map();
    
    for (const branch of branches) {
      if (!branchGroups.has(branch.branchCode)) {
        branchGroups.set(branch.branchCode, {
          branchCode: branch.branchCode,
          colleges: [],
          totalStudents: 0,
          entries: []
        });
      }
      
      const group = branchGroups.get(branch.branchCode);
      group.colleges.push({
        collegeCode: branch.collegeCode,
        year: branch.year,
        enrollmentRangeId: branch.enrollmentRangeId,
        studentCount: branch.studentCount || 0
      });
      group.totalStudents += (branch.studentCount || 0);
      group.entries.push(branch);
    }

    const uniqueBranches = Array.from(branchGroups.values());
    const seatsPerSession = roomConfig.rows * roomConfig.cols;
    const totalSeatsPerDay = seatsPerSession * sessions.length;

    logger.info(`Grouped into ${uniqueBranches.length} unique branches, ${totalSeatsPerDay} seats/day`);

    // Check capacity and plan dates
    const plannedSchedules = [];
    const warnings = [];
    let currentDate = autoCalculate ? new Date(startDate) : null;
    let dateIndex = 0;

    for (const branchGroup of uniqueBranches) {
      // Check if this branch group fits in available seats
      if (branchGroup.totalStudents > totalSeatsPerDay) {
        warnings.push({
          branchCode: branchGroup.branchCode,
          students: branchGroup.totalStudents,
          availableSeats: totalSeatsPerDay,
          message: `Branch ${branchGroup.branchCode} has ${branchGroup.totalStudents} students but only ${totalSeatsPerDay} seats available per day`
        });
      }

      // Calculate required sessions for this branch
      const requiredSessions = Math.ceil(branchGroup.totalStudents / seatsPerSession);
      
      // Determine exam date
      let examDate;
      if (autoCalculate) {
        examDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() + gapDays);
      } else if (dateIndex < manualDates.length) {
        examDate = new Date(manualDates[dateIndex]);
      } else {
        examDate = new Date(startDate);
        currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + gapDays);
      }

      // Create schedule entries for each college in this branch group
      for (const college of branchGroup.colleges) {
        for (let s = 0; s < Math.min(requiredSessions, sessions.length); s++) {
          const session = sessions[s];
          const sessionDate = new Date(examDate);
          
          // Check for conflicts
          const existingConflict = await Schedule.findOne({
            date: {
              $gte: new Date(sessionDate.setHours(0, 0, 0, 0)),
              $lt: new Date(sessionDate.setHours(23, 59, 59, 999))
            },
            session,
            'branches.branchCode': branchGroup.branchCode
          });

          plannedSchedules.push({
            date: examDate,
            session,
            collegeCode: college.collegeCode,
            year: college.year,
            branchCode: branchGroup.branchCode,
            branches: [{
              branchCode: branchGroup.branchCode,
              year: college.year,
              enrollmentRangeId: college.enrollmentRangeId
            }],
            studentCount: Math.min(college.studentCount, seatsPerSession),
            roomConfig,
            totalSeats: seatsPerSession,
            assignedSeats: Math.min(college.studentCount, seatsPerSession),
            emptySeats: Math.max(0, seatsPerSession - college.studentCount),
            hasConflict: !!existingConflict,
            conflictInfo: existingConflict ? {
              scheduleId: existingConflict._id,
              message: `Branch ${branchGroup.branchCode} already has exam on this date`
            } : null
          });
        }
      }

      dateIndex++;
    }

    // Summary statistics
    const summary = {
      totalBranches: uniqueBranches.length,
      totalColleges: new Set(branches.map(b => b.collegeCode)).size,
      totalStudents: branches.reduce((sum, b) => sum + (b.studentCount || 0), 0),
      totalExamDates: dateIndex,
      seatsPerDay: totalSeatsPerDay,
      capacityUtilization: Math.round(
        (branches.reduce((sum, b) => sum + (b.studentCount || 0), 0) / 
        (totalSeatsPerDay * dateIndex)) * 100
      ),
      warnings: warnings.length > 0 ? warnings : null
    };

    logger.info(`Schedule planning complete: ${plannedSchedules.length} schedule entries, ${warnings.length} warnings`);

    return {
      schedules: plannedSchedules,
      branchGroups: uniqueBranches,
      summary,
      canGenerate: warnings.length === 0
    };

  } catch (error) {
    logger.error('Error in planBranchBasedSchedules:', error);
    throw error;
  }
};

/**
 * Check room capacity for given branches
 * @param {Object} params - Capacity check parameters
 * @param {Array} params.branches - Branches to check
 * @param {Object} params.roomConfig - Room layout
 * @param {Array} params.sessions - Available sessions
 * @returns {Object} Capacity analysis
 */
export const checkCapacity = ({
  branches,
  roomConfig,
  sessions = ['morning']
}) => {
  const seatsPerSession = roomConfig.rows * roomConfig.cols;
  const totalSeatsPerDay = seatsPerSession * sessions.length;
  const totalStudents = branches.reduce((sum, b) => sum + (b.studentCount || 0), 0);
  
  // Group by branch for analysis
  const branchGroups = new Map();
  for (const branch of branches) {
    if (!branchGroups.has(branch.branchCode)) {
      branchGroups.set(branch.branchCode, { students: 0, colleges: new Set() });
    }
    const group = branchGroups.get(branch.branchCode);
    group.students += (branch.studentCount || 0);
    group.colleges.add(branch.collegeCode);
  }

  const branchAnalysis = Array.from(branchGroups.entries()).map(([code, data]) => ({
    branchCode: code,
    students: data.students,
    colleges: Array.from(data.colleges),
    fitsInOneDay: data.students <= totalSeatsPerDay,
    requiredDays: Math.ceil(data.students / totalSeatsPerDay)
  }));

  return {
    totalStudents,
    totalSeatsPerDay,
    seatsPerSession,
    branchCount: branchGroups.size,
    minRequiredDays: Math.max(...branchAnalysis.map(b => b.requiredDays)),
    allBranchesFit: branchAnalysis.every(b => b.fitsInOneDay),
    branchAnalysis,
    isViable: totalStudents <= (totalSeatsPerDay * branchGroups.size)
  };
};

/**
 * Generate branch-based schedules and save to database
 * @param {Object} params - Generation parameters
 * @returns {Object} Generated schedules
 */
export const generateBranchBasedSchedules = async (params) => {
  const plan = await planBranchBasedSchedules(params);
  
  if (!plan.canGenerate && params.strictMode) {
    throw new Error(`Cannot generate schedules: ${plan.summary.warnings.map(w => w.message).join(', ')}`);
  }

  const generatedSchedules = [];
  const skippedSchedules = [];

  for (const scheduleData of plan.schedules) {
    try {
      // Check for existing schedule
      const existing = await Schedule.findOne({
        date: scheduleData.date,
        session: scheduleData.session,
        collegeCode: scheduleData.collegeCode
      });

      if (existing) {
        skippedSchedules.push({
          ...scheduleData,
          skipReason: 'Schedule already exists for this college/date/session'
        });
        continue;
      }

      const newSchedule = await Schedule.create({
        date: scheduleData.date,
        session: scheduleData.session,
        collegeCode: scheduleData.collegeCode,
        branches: scheduleData.branches,
        description: `Branch ${scheduleData.branchCode} exam - ${scheduleData.studentCount} students`
      });

      generatedSchedules.push(newSchedule);
    } catch (error) {
      logger.warn(`Failed to create schedule for ${scheduleData.collegeCode}: ${error.message}`);
      skippedSchedules.push({
        ...scheduleData,
        skipReason: error.message
      });
    }
  }

  return {
    generated: generatedSchedules,
    skipped: skippedSchedules,
    summary: {
      ...plan.summary,
      generatedCount: generatedSchedules.length,
      skippedCount: skippedSchedules.length
    }
  };
};

export default {
  planBranchBasedSchedules,
  checkCapacity,
  generateBranchBasedSchedules
};
