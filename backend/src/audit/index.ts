import { Request } from 'express';
import {
  auditLogRepository,
  AuditAction,
  CreateAuditLogInput,
} from '../repositories/audit-log-repository';

/**
 * Extract IP address from request
 */
export function getIpAddress(request: Request): string {
  // Try X-Forwarded-For header first (for proxied requests)
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ip.split(',')[0].trim();
  }

  // Try X-Real-IP header
  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Try socket remote address
  if (request.socket?.remoteAddress) {
    return request.socket.remoteAddress;
  }

  // Default to unknown
  return 'unknown';
}

/**
 * Extract User-Agent from request
 */
export function getUserAgent(request: Request): string {
  const userAgent = request.headers['user-agent'];
  return userAgent || 'unknown';
}

/**
 * Log an audit event
 */
export async function logAudit(input: CreateAuditLogInput): Promise<void> {
  try {
    await auditLogRepository.create(input);
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main flow
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Log a CREATE action
 */
export async function logCreate(
  storeId: string,
  entityType: string,
  entityId: string,
  newValues: Record<string, unknown>,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    storeId,
    action: 'CREATE',
    entityType,
    entityId,
    newValues,
    userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log an UPDATE action
 */
export async function logUpdate(
  storeId: string,
  entityType: string,
  entityId: string,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    storeId,
    action: 'UPDATE',
    entityType,
    entityId,
    oldValues,
    newValues,
    userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log a DELETE action
 */
export async function logDelete(
  storeId: string,
  entityType: string,
  entityId: string,
  oldValues: Record<string, unknown>,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    storeId,
    action: 'DELETE',
    entityType,
    entityId,
    oldValues,
    userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log a LOGIN action
 */
export async function logLogin(
  storeId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    storeId,
    action: 'LOGIN',
    entityType: 'User',
    entityId: userId,
    userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log a LOGOUT action
 */
export async function logLogout(
  storeId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    storeId,
    action: 'LOGOUT',
    entityType: 'User',
    entityId: userId,
    userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log a LOGIN_FAILED action
 */
export async function logLoginFailed(
  storeId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    storeId,
    action: 'LOGIN_FAILED',
    entityType: 'User',
    newValues: { email },
    ipAddress,
    userAgent,
  });
}

/**
 * Log an EXPORT action
 */
export async function logExport(
  storeId: string,
  entityType: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    storeId,
    action: 'EXPORT',
    entityType,
    newValues: details,
    userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log a VIEW action
 */
export async function logView(
  storeId: string,
  entityType: string,
  entityId?: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    storeId,
    action: 'VIEW',
    entityType,
    entityId,
    userId,
    ipAddress,
    userAgent,
  });
}

// Re-export types and repository
export { auditLogRepository } from '../repositories/audit-log-repository';
export type {
  AuditLog,
  AuditAction,
  CreateAuditLogInput,
  AuditLogFilterOptions,
  PaginatedAuditLogs,
} from '../repositories/audit-log-repository';
