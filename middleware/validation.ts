import { Context, Next } from 'hono';
import { z } from 'zod';
import logger from '../lib/logger';

// Request validation middleware
export const validateRequest = (schema: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) => {
  return async (c: Context, next: Next) => {
    try {
      // Validate request body
      if (schema.body) {
        const body = await c.req.json().catch(() => ({}));
        const result = schema.body.safeParse(body);
        if (!result.success) {
          logger.warn('Request body validation failed:', {
            errors: result.error.errors,
            url: c.req.url,
            method: c.req.method
          });
          
          return c.json({
            error: 'Validation Error',
            message: 'Request body validation failed',
            details: result.error.errors
          }, 400);
        }
      }

      // Validate query parameters
      if (schema.query) {
        const query = Object.fromEntries(new URL(c.req.url).searchParams);
        const result = schema.query.safeParse(query);
        if (!result.success) {
          logger.warn('Query validation failed:', {
            errors: result.error.errors,
            url: c.req.url,
            method: c.req.method
          });
          
          return c.json({
            error: 'Validation Error',
            message: 'Query parameters validation failed',
            details: result.error.errors
          }, 400);
        }
      }

      // Validate URL parameters
      if (schema.params) {
        const params = c.req.param();
        const result = schema.params.safeParse(params);
        if (!result.success) {
          logger.warn('Params validation failed:', {
            errors: result.error.errors,
            url: c.req.url,
            method: c.req.method
          });
          
          return c.json({
            error: 'Validation Error',
            message: 'URL parameters validation failed',
            details: result.error.errors
          }, 400);
        }
      }

      await next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      return c.json({
        error: 'Internal Server Error',
        message: 'Request validation failed'
      }, 500);
    }
  };
};

