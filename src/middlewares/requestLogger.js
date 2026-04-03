// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(log);
    }
  });
  
  next();
};

export default requestLogger;
