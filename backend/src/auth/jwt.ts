import jwt, { SignOptions } from 'jsonwebtoken';
import type { Permissions, UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'smart-inventory-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'; // 8 hours as per requirement 5.4

/**
 * Legacy JWT Payload (for backward compatibility)
 */
export interface JwtPayload {
  userId: string;
  email: string;
  displayName?: string;
  role: string;
  permissions?: Permissions;
  iat?: number;
  exp?: number;
}

/**
 * Multi-tenant JWT Payload structure
 * Aligned with design document specification
 * 
 * Requirements: 5.1, 5.4
 */
export interface MultiTenantJwtPayload {
  sub: string;              // user_id in Tenant DB (standard JWT claim)
  tenant_id: string;        // tenant_id
  tenant_user_id: string;   // user_id in Master DB (TenantUsers)
  email: string;
  role: UserRole;
  stores: string[];         // accessible store_ids
  session_id: string;       // session identifier
  iat?: number;             // issued at
  exp?: number;             // expiration
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

/**
 * User with stores info (for login response)
 */
export interface UserWithStores {
  id: string;
  tenantId: string;
  tenantUserId: string;
  email: string;
  displayName?: string;
  role: UserRole;
  permissions?: Permissions;
  stores: Store[];
  currentStoreId?: string;
}

/**
 * Generate a legacy JWT token for authenticated user
 * Token is valid for 8 hours
 * @param user - User data to encode in token
 * @returns JWT token string
 * @deprecated Use generateMultiTenantToken for multi-tenant support
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

  return jwt.sign(payload as object, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
}

/**
 * Generate a multi-tenant JWT token
 * Token is valid for 8 hours as per requirement 5.4
 * 
 * @param payload - Multi-tenant payload data
 * @returns JWT token string
 * 
 * Requirements: 5.1, 5.4
 */
export function generateMultiTenantToken(payload: {
  userId: string;
  tenantUserId: string;
  tenantId: string;
  email: string;
  role: UserRole;
  stores: string[];
  sessionId: string;
}): string {
  const tokenPayload: Omit<MultiTenantJwtPayload, 'iat' | 'exp'> = {
    sub: payload.userId,
    tenant_id: payload.tenantId,
    tenant_user_id: payload.tenantUserId,
    email: payload.email,
    role: payload.role,
    stores: payload.stores,
    session_id: payload.sessionId,
  };

  return jwt.sign(tokenPayload as object, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
}

/**
 * Validate and decode a JWT token (legacy format)
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
 * Validate and decode a multi-tenant JWT token
 * @param token - JWT token to validate
 * @returns Decoded payload if valid, null if invalid or expired
 * 
 * Requirements: 5.1, 5.4
 */
export function validateMultiTenantToken(token: string): MultiTenantJwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as MultiTenantJwtPayload;
    // Check if it's a multi-tenant token by verifying required fields
    if (decoded.tenant_id && decoded.sub) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Decode a JWT token without validation (for debugging)
 * @param token - JWT token to decode
 * @returns Decoded payload or null
 */
export function decodeToken(token: string): JwtPayload | MultiTenantJwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload | MultiTenantJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Check if a token is a multi-tenant token
 * @param token - JWT token to check
 * @returns True if multi-tenant token, false otherwise
 */
export function isMultiTenantToken(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return false;
  return 'tenant_id' in decoded && 'sub' in decoded;
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

/**
 * Get tenant_id from a multi-tenant token
 * @param token - JWT token
 * @returns tenant_id or null
 */
export function getTenantIdFromToken(token: string): string | null {
  const decoded = validateMultiTenantToken(token);
  return decoded?.tenant_id || null;
}

/**
 * Get user_id from a token (supports both legacy and multi-tenant)
 * @param token - JWT token
 * @returns user_id or null
 */
export function getUserIdFromToken(token: string): string | null {
  const decoded = decodeToken(token);
  if (!decoded) return null;
  
  // Multi-tenant token uses 'sub' field
  if ('sub' in decoded) {
    return decoded.sub;
  }
  // Legacy token uses 'userId' field
  if ('userId' in decoded) {
    return decoded.userId;
  }
  return null;
}

/**
 * Get accessible stores from a multi-tenant token
 * @param token - JWT token
 * @returns Array of store IDs or empty array
 */
export function getStoresFromToken(token: string): string[] {
  const decoded = validateMultiTenantToken(token);
  return decoded?.stores || [];
}

/**
 * Get role from a token (supports both legacy and multi-tenant)
 * @param token - JWT token
 * @returns role or null
 */
export function getRoleFromToken(token: string): string | null {
  const decoded = decodeToken(token);
  if (!decoded) return null;
  return decoded.role || null;
}
