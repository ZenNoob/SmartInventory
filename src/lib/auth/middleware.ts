import { NextRequest, NextResponse } from 'next/server';
import { validateToken, type JwtPayload } from './jwt';
import { query } from '@/lib/db';
import type { Permission, Module } from '@/lib/types';

const AUTH_COOKIE_NAME = 'auth-token';

export interface AuthenticatedRequest extends NextRequest {
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
export function getTokenFromRequest(request: NextRequest): string | null {
  // Try cookie first
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  // Try Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Authenticate a request and return user info
 * Checks both token validity and session in database
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
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
  // Admin has all permissions
  if (user.role === 'admin') return true;

  // Check specific permissions
  const modulePermissions = user.permissions?.[module];
  if (!modulePermissions) return false;

  return modulePermissions.includes(permission);
}

/**
 * Middleware wrapper for protected API routes
 * Returns user info if authenticated, error response otherwise
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: JwtPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  const authResult = await authenticateRequest(request);

  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 }
    );
  }

  return handler(request, authResult.user);
}

/**
 * Middleware wrapper for protected API routes with permission check
 */
export async function withAuthAndPermission(
  request: NextRequest,
  module: Module,
  permission: Permission,
  handler: (request: NextRequest, user: JwtPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  const authResult = await authenticateRequest(request);

  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 }
    );
  }

  if (!hasPermission(authResult.user, module, permission)) {
    return NextResponse.json(
      { error: 'Permission denied' },
      { status: 403 }
    );
  }

  return handler(request, authResult.user);
}

/**
 * Get store ID from request headers or query params
 */
export function getStoreIdFromRequest(request: NextRequest): string | null {
  // Try header first
  const headerStoreId = request.headers.get('X-Store-Id');
  if (headerStoreId) return headerStoreId;

  // Try query param
  const url = new URL(request.url);
  return url.searchParams.get('storeId');
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
 * Create authentication error response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Create forbidden error response
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
