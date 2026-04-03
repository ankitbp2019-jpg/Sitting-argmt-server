import { asyncHandler } from '../middlewares/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export class EnrollmentController {
  static create = asyncHandler(async (req, res) => {
    // req.body is already validated by middleware
    const { collegeCode, branchCode, year, startRoll, endRoll } = req.body;
    
    // TODO: Add actual database logic here
    const enrollment = {
      id: Date.now().toString(),
      collegeCode,
      branchCode,
      year,
      startRoll,
      endRoll,
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json(
      ApiResponse.success('Enrollment created successfully', enrollment)
    );
  });

  static getAll = asyncHandler(async (req, res) => {
    // TODO: Add actual database logic here
    const enrollments = []; // Empty array for now
    
    res.status(200).json(
      ApiResponse.success('Enrollments retrieved successfully', enrollments)
    );
  });

  static getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // TODO: Add actual database logic here
    // For now, return a mock enrollment
    const enrollment = {
      id,
      collegeCode: 'ABCD',
      branchCode: 'CS',
      year: '23',
      startRoll: 1,
      endRoll: 60,
      createdAt: new Date().toISOString()
    };
    
    res.status(200).json(
      ApiResponse.success('Enrollment retrieved successfully', enrollment)
    );
  });
}

export default EnrollmentController;
