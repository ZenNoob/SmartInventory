import { NextRequest } from 'next/server';
import { auditLogRepository, AuditAction, CreateAuditLogInput } from '../repositories/audit-log-repository';

/**
 * Extract IP address from request
 */
export function getIpAddress(request: NextRequest): string {
  // Try X-Forwarded-For header first (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Try X-Real-IP header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Default to unknown
  return 'unknown';
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
  tableName: string,
  recordId: string,
  newValues: Record<string, unknown>,
  userId?: string,
  storeId?: string,
  ipAddress?: string
): Promise<void> {
  await logAudit({
    action: 'CREATE',
    tableName,
    recordId,
    newValues,
    userId,
    storeId,
    ipAddress,
  });
}

/**
 * Log an UPDATE action
 */
export async function logUpdate(
  tableName: string,
  recordId: string,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
  userId?: string,
  storeId?: string,
  ipAddress?: string
): Promise<void> {
  await logAudit({
    action: 'UPDATE',
    tableName,
    recordId,
    oldValues,
    newValues,
    userId,
    storeId,
    ipAddress,
  });
}

/**
 * Log a DELETE action
 */
export async function logDelete(
  tableName: string,
  recordId: string,
  oldValues: Record<string, unknown>,
  userId?: string,
  storeId?: string,
  ipAddress?: string
): Promise<void> {
  await logAudit({
    action: 'DELETE',
    tableName,
    recordId,
    oldValues,
    userId,
    storeId,
    ipAddress,
  });
}

/**
 * Log a LOGIN action
 */
export async function logLogin(
  userId: string,
  storeId?: string,
  ipAddress?: string
): Promise<void> {
  await logAudit({
    action: 'LOGIN',
    userId,
    storeId,
    ipAddress,
  });
}

/**
 * Log a LOGOUT action
 */
export async function logLogout(
  userId: string,
  storeId?: string,
  ipAddress?: string
): Promise<void> {
  await logAudit({
    action: 'LOGOUT',
    userId,
    storeId,
    ipAddress,
  });
}

/**
 * Log a LOGIN_FAILED action
 */
export async function logLoginFailed(
  email: string,
  ipAddress?: string
): Promise<void> {
  await logAudit({
    action: 'LOGIN_FAILED',
    newValues: { email },
    ipAddress,
  });
}

/**
 * Log an EXPORT action
 */
export async function logExport(
  tableName: string,
  userId?: string,
  storeId?: string,
  ipAddress?: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    action: 'EXPORT',
    tableName,
    newValues: details,
    userId,
    storeId,
    ipAddress,
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
