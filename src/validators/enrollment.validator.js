import Joi from 'joi';

export const enrollmentSchema = Joi.object({
  collegeCode: Joi.string()
    .length(4)
    .required()
    .messages({
      'string.length': 'College code must be exactly 4 characters',
      'any.required': 'College code is required'
    }),
  
  branchCode: Joi.string()
    .length(2)
    .required()
    .messages({
      'string.length': 'Branch code must be exactly 2 characters',
      'any.required': 'Branch code is required'
    }),
  
  year: Joi.string()
    .length(2)
    .required()
    .messages({
      'string.length': 'Year must be exactly 2 characters',
      'any.required': 'Year is required'
    }),
  
  startRoll: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.base': 'Start roll must be a number',
      'number.integer': 'Start roll must be an integer',
      'number.min': 'Start roll must be at least 1',
      'any.required': 'Start roll is required'
    }),
  
  endRoll: Joi.number()
    .integer()
    .min(Joi.ref('startRoll'))
    .required()
    .messages({
      'number.base': 'End roll must be a number',
      'number.integer': 'End roll must be an integer',
      'number.min': 'End roll must be greater than start roll',
      'any.required': 'End roll is required'
    })
});

export default enrollmentSchema;
