import { TRPCError } from '@trpc/server';

/**
 * Custom error classes for better error handling
 */

export class AuthenticationError extends TRPCError {
  constructor(message: string = 'Authentication required') {
    super({
      code: 'UNAUTHORIZED',
      message,
    });
  }
}

export class AuthorizationError extends TRPCError {
  constructor(message: string = 'Insufficient permissions') {
    super({
      code: 'FORBIDDEN',
      message,
    });
  }
}

export class ValidationError extends TRPCError {
  constructor(message: string = 'Validation failed') {
    super({
      code: 'BAD_REQUEST',
      message,
    });
  }
}

export class NotFoundError extends TRPCError {
  constructor(message: string = 'Resource not found') {
    super({
      code: 'NOT_FOUND',
      message,
    });
  }
}

export class ConflictError extends TRPCError {
  constructor(message: string = 'Resource already exists') {
    super({
      code: 'CONFLICT',
      message,
    });
  }
}

export class RateLimitError extends TRPCError {
  constructor(message: string = 'Rate limit exceeded') {
    super({
      code: 'TOO_MANY_REQUESTS',
      message,
    });
  }
}

export class InternalServerError extends TRPCError {
  constructor(message: string = 'Internal server error') {
    super({
      code: 'INTERNAL_SERVER_ERROR',
      message,
    });
  }
}

