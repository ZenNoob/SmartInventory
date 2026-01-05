import jwt from 'jsonwebtoken';
import type { AppUser, Permissions } from '@/lib/types';

const JWT_SECRET = process.env.JWT_SECRET || 'smart-inventory-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

export interface JwtPayload {
  userId: string;
  email: string;
  displayName?: string;
  role: string;
  permissions?: Permissions;
  iat?: number;
  exp?: number;
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  businessType?: string;
  logo?: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'inactive';
}

export interface UserWithStores extends AppUser {
  stores: Store[];
  currentStoreId?: string;
}

/**
 * Generate a JWT token for authenticated user
 * Token is valid for 24 hours
 * @param user - User data to encode in token
 * @returns JWT token string
 */
export function generateToken(user: {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  permissions?: Permissions;
}): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    permissions: user.permissions,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Validate and decode a JWT token
 * @param token - JWT token to validate
 * @returns Decoded payload if valid, null if invalid or expired
 */
export function validateToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Decode a JWT token without validation (for debugging)
 * @param token - JWT token to decode
 * @returns Decoded payload or null
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired
 * @param token - JWT token to check
 * @returns True if expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}
