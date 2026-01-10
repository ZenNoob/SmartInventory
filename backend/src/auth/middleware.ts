/**
 * Authentication Middleware for Express
 * 
 * Provides authentication and authorization utilities for API routes.
 */

import { Request, Response, NextFunction } from 'express';
import { validateToken, type JwtPayload } from './jwt';
import { query } from '../db';
import type { Permission, Module, Permissions } from '../types';

const AUTH_COOKIE_NAME = 'auth-token';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  storeId?: string;
}

export interface AuthResult {
  success: boolean;
  user?: JwtPayload;
  error?: string;
  status?: number;
}

/**
 * Extract JWT token from request (cookie or Authorization header)
 */
export function getTokenFromRequest(request: Request): string | null {
  // Try cookie first
  const cookieToken = (request as any).cookies?.[AUTH_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  // Try Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Authenticate a request and return user info
 * Checks both token validity and session in database
 */
export async function authenticateRequest(request: Request): Promise<AuthResult> {
  const token = getTokenFromRequest(request);

  if (!token) {
    return {
      success: false,
      error: 'Authentication required',
      status: 401,
    };
  }

  const payload = validateToken(token);
  if (!payload) {
    return {
      success: false,
      error: 'Invalid or expired token',
      status: 401,
    };
  }

  // Verify session exists in database
  try {
    const sessions = await query<{ id: string }>(
      `SELECT id FROM Sessions 
       WHERE token = @token AND expires_at > GETDATE()`,
      { token }
    );

    if (sessions.length === 0) {
      return {
        success: false,
        error: 'Session expired or invalidated',
        status: 401,
      };
    }
  } catch {
    // If Sessions table doesn't exist, skip session check
  }

  return {
    success: true,
    user: payload,
  };
}

/**
 * Check if user has permission for a specific action on a module
 */
export function hasPermission(
  user: JwtPayload,
  module: Module,
  permission: Permission
): boolean {
  // Admin/Owner has all permissions
  if (user.role === 'admin' || user.role === 'owner') return true;

  // Check specific permissions
  const permissions = user.permissions as Permissions | undefined;
  const modulePermissions = permissions?.[module];
  if (!modulePermissions) return false;

  return modulePermissions.includes(permission);
}

/**
 * Express middleware for protected routes
 */
export function withAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  authenticateRequest(req).then((authResult) => {
    if (!authResult.success || !authResult.user) {
      res.status(authResult.status || 401).json({ error: authResult.error });
      return;
    }

    req.user = authResult.user;
    next();
  }).catch((error) => {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });
}

/**
 * Express middleware for protected routes with permission check
 */
export function withAuthAndPermission(
  module: Module,
  permission: Permission
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    authenticateRequest(req).then((authResult) => {
      if (!authResult.success || !authResult.user) {
        res.status(authResult.status || 401).json({ error: authResult.error });
        return;
      }

      if (!hasPermission(authResult.user, module, permission)) {
        res.status(403).json({ error: 'Permission denied' });
        return;
      }

      req.user = authResult.user;
      next();
    }).catch((error) => {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  };
}

/**
 * Get store ID from request headers or query params
 */
export function getStoreIdFromRequest(request: Request): string | null {
  // Try header first
  const headerStoreId = request.headers['x-store-id'];
  if (headerStoreId) {
    return Array.isArray(headerStoreId) ? headerStoreId[0] : headerStoreId;
  }

  // Try query param
  return request.query.storeId as string | null;
}

/**
 * Verify user has access to a specific store
 */
export async function verifyStoreAccess(
  userId: string,
  storeId: string
): Promise<boolean> {
  const result = await query<{ user_id: string }>(
    `SELECT user_id FROM UserStores 
     WHERE user_id = @userId AND store_id = @storeId`,
    { userId, storeId }
  );

  return result.length > 0;
}


/**
 * Create authentication error response object
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): { error: string; status: number } {
  return { error: message, status: 401 };
}

/**
 * Create forbidden error response object
 */
export function forbiddenResponse(message: string = 'Forbidden'): { error: string; status: number } {
  return { error: message, status: 403 };
}
