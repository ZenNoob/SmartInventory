/**
 * Middleware exports
 */

// Authentication middleware
export {
  authenticate,
  storeContext,
  authorize,
  requirePermission,
  ensureTenantContext,
  type AuthUser,
  type AuthRequest,
} from './auth';

// Permission middleware
export {
  requireModulePermission,
  requireAllPermissions,
  requireAnyPermission,
  requireStoreAccess,
  requireMinRole,
  requireUserManagement,
  permissions,
  type PermissionCheckOptions,
} from './permission';
