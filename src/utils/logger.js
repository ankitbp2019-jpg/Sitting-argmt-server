// Logger utility
export const logger = {
  info: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...args);
    }
  },
  
  error: (message, ...args) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, ...args);
  },
  
  warn: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args);
    }
  },
  
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`, ...args);
    }
  }
};

export default logger;
