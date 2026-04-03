// Response formatting utility
export const successResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    message,
    data,
    statusCode
  };
};

export const errorResponse = (message = 'Error', statusCode = 500, error = null) => {
  return {
    success: false,
    message,
    statusCode,
    ...(process.env.NODE_ENV === 'development' && error && { error })
  };
};

export const paginatedResponse = (data, pagination, message = 'Success') => {
  return {
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: Math.ceil(pagination.total / pagination.limit)
    }
  };
};

export default {
  successResponse,
  errorResponse,
  paginatedResponse
};
