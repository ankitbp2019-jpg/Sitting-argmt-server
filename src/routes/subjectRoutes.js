import express from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Subject } from '../models/index.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * @route   GET /subjects
 * @desc    Get all subjects
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
  try {
    const { branchCode, collegeCode, year } = req.query;
    
    let query = { active: true };
    if (branchCode) query.branchCode = branchCode.toUpperCase();
    if (collegeCode) query.collegeCode = collegeCode.toUpperCase();
    if (year) query.year = year;
    
    const subjects = await Subject.find(query).sort({ branchCode: 1, code: 1 }).lean();

    return res.status(200).json(
      new ApiResponse(true, 'Subjects retrieved successfully', { subjects })
    );
  } catch (error) {
    logger.error('Error fetching subjects:', error);
    return res.status(500).json(
      new ApiResponse(false, 'Error fetching subjects')
    );
  }
}));

/**
 * @route   GET /subjects/:id
 * @desc    Get subject by ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id).lean();
    
    if (!subject) {
      return res.status(404).json(
        new ApiResponse(false, 'Subject not found')
      );
    }

    return res.status(200).json(
      new ApiResponse(true, 'Subject retrieved successfully', { subject })
    );
  } catch (error) {
    logger.error('Error fetching subject:', error);
    return res.status(500).json(
      new ApiResponse(false, 'Error fetching subject')
    );
  }
}));

/**
 * @route   POST /subjects
 * @desc    Create new subject
 * @access  Private
 */
router.post('/', asyncHandler(async (req, res) => {
  try {
    const { code, name, branchCode, collegeCode, year } = req.body;

    // Check if subject already exists
    const existing = await Subject.findOne({
      code: code.toUpperCase(),
      branchCode: branchCode.toUpperCase(),
      collegeCode: collegeCode.toUpperCase(),
      year
    });

    if (existing) {
      return res.status(409).json(
        new ApiResponse(false, 'Subject already exists for this branch/college/year')
      );
    }

    const subject = await Subject.create({
      code,
      name,
      branchCode,
      collegeCode,
      year
    });

    return res.status(201).json(
      new ApiResponse(true, 'Subject created successfully', { subject })
    );
  } catch (error) {
    logger.error('Error creating subject:', error);
    return res.status(500).json(
      new ApiResponse(false, error.message || 'Error creating subject')
    );
  }
}));

/**
 * @route   POST /subjects/batch
 * @desc    Create multiple subjects
 * @access  Private
 */
router.post('/batch', asyncHandler(async (req, res) => {
  try {
    const { subjects } = req.body;

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json(
        new ApiResponse(false, 'Subjects array is required')
      );
    }

    const created = [];
    const errors = [];

    for (const subj of subjects) {
      try {
        // Check for existing
        const existing = await Subject.findOne({
          code: subj.code.toUpperCase(),
          branchCode: subj.branchCode.toUpperCase(),
          collegeCode: subj.collegeCode.toUpperCase(),
          year: subj.year
        });

        if (existing) {
          errors.push(`${subj.code} already exists`);
          continue;
        }

        const subject = await Subject.create(subj);
        created.push(subject);
      } catch (err) {
        errors.push(`${subj.code}: ${err.message}`);
      }
    }

    return res.status(201).json(
      new ApiResponse(
        true,
        `Created ${created.length} subjects, ${errors.length} errors`,
        { subjects: created, errors: errors.length > 0 ? errors : null }
      )
    );
  } catch (error) {
    logger.error('Error creating batch subjects:', error);
    return res.status(500).json(
      new ApiResponse(false, 'Error creating subjects')
    );
  }
}));

/**
 * @route   PUT /subjects/:id
 * @desc    Update subject
 * @access  Private
 */
router.put('/:id', asyncHandler(async (req, res) => {
  try {
    const { name, active } = req.body;
    
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { name, active },
      { new: true, runValidators: true }
    );

    if (!subject) {
      return res.status(404).json(
        new ApiResponse(false, 'Subject not found')
      );
    }

    return res.status(200).json(
      new ApiResponse(true, 'Subject updated successfully', { subject })
    );
  } catch (error) {
    logger.error('Error updating subject:', error);
    return res.status(500).json(
      new ApiResponse(false, 'Error updating subject')
    );
  }
}));

/**
 * @route   DELETE /subjects/:id
 * @desc    Delete subject (soft delete by setting active: false)
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );

    if (!subject) {
      return res.status(404).json(
        new ApiResponse(false, 'Subject not found')
      );
    }

    return res.status(200).json(
      new ApiResponse(true, 'Subject deleted successfully')
    );
  } catch (error) {
    logger.error('Error deleting subject:', error);
    return res.status(500).json(
      new ApiResponse(false, 'Error deleting subject')
    );
  }
}));

export default router;
