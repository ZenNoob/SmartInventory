import type { Module, Permission, Permissions } from '@/lib/types';

/**
 * Check if user has a specific permission for a module
 */
export function hasPermission(
  userPermissions: Permissions | undefined,
  userRole: string | undefined,
  module: Module,
  permission: Permission
): boolean {
  // Admin has all permissions
  if (userRole === 'admin') return true;

  // Check specific permissions
  const modulePermissions = userPermissions?.[module];
  if (!modulePermissions) return false;

  return modulePermissions.includes(permission);
}

/**
 * Check if user can view a module
 */
export function canView(
  userPermissions: Permissions | undefined,
  userRole: string | undefined,
  module: Module
): boolean {
  return hasPermission(userPermissions, userRole, module, 'view');
}

/**
 * Check if user can add to a module
 */
export function canAdd(
  userPermissions: Permissions | undefined,
  userRole: string | undefined,
  module: Module
): boolean {
  return hasPermission(userPermissions, userRole, module, 'add');
}

/**
 * Check if user can edit in a module
 */
export function canEdit(
  userPermissions: Permissions | undefined,
  userRole: string | undefined,
  module: Module
): boolean {
  return hasPermission(userPermissions, userRole, module, 'edit');
}

/**
 * Check if user can delete from a module
 */
export function canDelete(
  userPermissions: Permissions | undefined,
  userRole: string | undefined,
  module: Module
): boolean {
  return hasPermission(userPermissions, userRole, module, 'delete');
}

/**
 * Get all permissions for a module
 */
export function getModulePermissions(
  userPermissions: Permissions | undefined,
  userRole: string | undefined,
  module: Module
): Permission[] {
  // Admin has all permissions
  if (userRole === 'admin') {
    return ['view', 'add', 'edit', 'delete'];
  }

  return userPermissions?.[module] || [];
}

/**
 * Check if user has any permission for a module
 */
export function hasAnyPermission(
  userPermissions: Permissions | undefined,
  userRole: string | undefined,
  module: Module
): boolean {
  // Admin has all permissions
  if (userRole === 'admin') return true;

  const modulePermissions = userPermissions?.[module];
  return modulePermissions !== undefined && modulePermissions.length > 0;
}

/**
 * Check if user has all specified permissions for a module
 */
export function hasAllPermissions(
  userPermissions: Permissions | undefined,
  userRole: string | undefined,
  module: Module,
  requiredPermissions: Permission[]
): boolean {
  // Admin has all permissions
  if (userRole === 'admin') return true;

  return requiredPermissions.every(permission =>
    hasPermission(userPermissions, userRole, module, permission)
  );
}

/**
 * Get all accessible modules for a user
 */
export function getAccessibleModules(
  userPermissions: Permissions | undefined,
  userRole: string | undefined
): Module[] {
  // Admin has access to all modules
  if (userRole === 'admin') {
    return [
      'dashboard', 'categories', 'units', 'products', 'purchases',
      'suppliers', 'sales', 'customers', 'cash-flow', 'reports_shifts',
      'reports_income_statement', 'reports_profit', 'reports_debt',
      'reports_supplier_debt', 'reports_transactions', 'reports_supplier_debt_tracking',
      'reports_revenue', 'reports_sold_products', 'reports_inventory',
      'reports_ai_segmentation', 'reports_ai_basket_analysis', 'users',
      'settings', 'pos', 'ai_forecast'
    ];
  }

  if (!userPermissions) return [];

  return Object.keys(userPermissions).filter(
    module => userPermissions[module as Module]?.length > 0
  ) as Module[];
}

/**
 * Permission check result with details
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check permission with detailed result
 */
export function checkPermission(
  userPermissions: Permissions | undefined,
  userRole: string | undefined,
  module: Module,
  permission: Permission
): PermissionCheckResult {
  // Admin has all permissions
  if (userRole === 'admin') {
    return { allowed: true };
  }

  // Check if user has any permissions defined
  if (!userPermissions) {
    return {
      allowed: false,
      reason: 'Người dùng chưa được phân quyền',
    };
  }

  // Check module permissions
  const modulePermissions = userPermissions[module];
  if (!modulePermissions || modulePermissions.length === 0) {
    return {
      allowed: false,
      reason: `Bạn không có quyền truy cập module này`,
    };
  }

  // Check specific permission
  if (!modulePermissions.includes(permission)) {
    const permissionNames: Record<Permission, string> = {
      view: 'xem',
      add: 'thêm',
      edit: 'sửa',
      delete: 'xóa',
    };
    return {
      allowed: false,
      reason: `Bạn không có quyền ${permissionNames[permission]}`,
    };
  }

  return { allowed: true };
}

/**
 * Create a permission checker function bound to user's permissions
 */
export function createPermissionChecker(
  userPermissions: Permissions | undefined,
  userRole: string | undefined
) {
  return {
    hasPermission: (module: Module, permission: Permission) =>
      hasPermission(userPermissions, userRole, module, permission),
    canView: (module: Module) => canView(userPermissions, userRole, module),
    canAdd: (module: Module) => canAdd(userPermissions, userRole, module),
    canEdit: (module: Module) => canEdit(userPermissions, userRole, module),
    canDelete: (module: Module) => canDelete(userPermissions, userRole, module),
    getModulePermissions: (module: Module) =>
      getModulePermissions(userPermissions, userRole, module),
    hasAnyPermission: (module: Module) =>
      hasAnyPermission(userPermissions, userRole, module),
    hasAllPermissions: (module: Module, permissions: Permission[]) =>
      hasAllPermissions(userPermissions, userRole, module, permissions),
    getAccessibleModules: () => getAccessibleModules(userPermissions, userRole),
    checkPermission: (module: Module, permission: Permission) =>
      checkPermission(userPermissions, userRole, module, permission),
  };
}
