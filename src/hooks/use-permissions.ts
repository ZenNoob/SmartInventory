'use client';

import { useMemo } from 'react';
import { useUserRole } from './use-user-role';
import { createPermissionChecker } from '@/lib/auth/permissions';
import type { Module, Permission } from '@/lib/types';

/**
 * Hook for checking user permissions in components
 * Provides convenient methods to check permissions for modules
 */
export function usePermissions() {
  const { permissions, role, isLoading } = useUserRole();

  const checker = useMemo(() => {
    return createPermissionChecker(permissions, role);
  }, [permissions, role]);

  return {
    ...checker,
    isLoading,
    permissions,
    role,
  };
}

/**
 * Hook for checking permission on a specific module
 * Returns permission state for a single module
 */
export function useModulePermissions(module: Module) {
  const { permissions, role, isLoading } = useUserRole();

  const modulePermissions = useMemo(() => {
    const checker = createPermissionChecker(permissions, role);
    return {
      canView: checker.canView(module),
      canAdd: checker.canAdd(module),
      canEdit: checker.canEdit(module),
      canDelete: checker.canDelete(module),
      permissions: checker.getModulePermissions(module),
      hasAccess: checker.hasAnyPermission(module),
    };
  }, [permissions, role, module]);

  return {
    ...modulePermissions,
    isLoading,
  };
}

/**
 * Hook for checking if user has a specific permission
 * Returns a boolean indicating if the user has the permission
 */
export function useHasPermission(module: Module, permission: Permission): boolean {
  const { permissions, role } = useUserRole();

  return useMemo(() => {
    const checker = createPermissionChecker(permissions, role);
    return checker.hasPermission(module, permission);
  }, [permissions, role, module, permission]);
}

/**
 * Hook for getting all accessible modules for the current user
 */
export function useAccessibleModules(): Module[] {
  const { permissions, role } = useUserRole();

  return useMemo(() => {
    const checker = createPermissionChecker(permissions, role);
    return checker.getAccessibleModules();
  }, [permissions, role]);
}
