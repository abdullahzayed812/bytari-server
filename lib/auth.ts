import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-make-it-at-least-32-characters-long';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

// Salt rounds for password hashing
const SALT_ROUNDS = 12;

export interface JWTPayload {
  userId: number;
  email: string;
  userType: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'veterinary-backend',
    audience: 'veterinary-app'
  });
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' }, 
    JWT_SECRET, 
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'veterinary-backend',
      audience: 'veterinary-app'
    }
  );
}

/**
 * Generate both access and refresh tokens
 */
export function generateAuthTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>): AuthTokens {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'veterinary-backend',
      audience: 'veterinary-app'
    }) as JWTPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    throw new Error('Token verification failed');
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Refresh access token using refresh token
 */
export function refreshAccessToken(refreshToken: string): string {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET, {
      issuer: 'veterinary-backend',
      audience: 'veterinary-app'
    }) as JWTPayload & { type?: string };
    
    // Ensure it's a refresh token
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }
    
    // Generate new access token
    const { type, iat, exp, ...payload } = decoded;
    return generateAccessToken(payload);
    
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  return { valid: true };
}

/**
 * Generate secure random string for password reset tokens
 */
export function generateSecureToken(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

