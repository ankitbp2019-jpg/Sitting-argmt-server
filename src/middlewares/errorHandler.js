// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };

  // Mongoose validation error (if using MongoDB)
  if (err.name === 'ValidationError') {
    error.message = Object.values(err.errors).map(val => val.message).join(', ');
    error.status = 400;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    error.message = 'Duplicate field value entered';
    error.status = 400;
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    error.message = 'Resource not found';
    error.status = 404;
  }

  res.status(error.status).json({
    success: false,
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export default {
  errorHandler,
  notFound
};
