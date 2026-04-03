// Validation utilities and schemas
// This file can be extended with validation libraries like Joi or express-validator

export const validateRequest = (schema) => {
  return (req, res, next) => {
    // Placeholder for validation logic
    // Implement actual validation based on schema here
    next();
  };
};

export const commonValidations = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
};

export default {
  validateRequest,
  commonValidations
};
