import { Context } from 'hono';
import logger from '../lib/logger';

// Global error handler for Hono
export const errorHandler = (error: Error, c: Context) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: c.req.url,
    method: c.req.method,
    timestamp: new Date().toISOString()
  });

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    return c.json({
      error: 'Internal Server Error',
      message: 'Something went wrong. Please try again later.',
      timestamp: new Date().toISOString()
    }, 500);
  }

  // Development: show detailed error
  return c.json({
    error: 'Internal Server Error',
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  }, 500);
};

