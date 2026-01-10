'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { AccessDenied } from '@/components/access-denied';
import type { Module, Permission } from '@/lib/types';

interface PermissionGuardProps {
  children: ReactNode;
  module: Module;
  permission?: Permission;
  fallback?: ReactNode;
  showAccessDenied?: boolean;
}

/**
 * Component that guards content based on user permissions
 * 
 * @param children - Content to render if user has permission
 * @param module - The module to check permission for
 * @param permission - The specific permission to check (defaults to 'view')
 * @param fallback - Optional custom fallback component
 * @param showAccessDenied - Whether to show AccessDenied component (default: true)
 */
export function PermissionGuard({
  children,
  module,
  permission = 'view',
  fallback,
  showAccessDenied = true,
}: PermissionGuardProps) {
  const { hasPermission, isLoading } = usePermissions();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  // Check permission
  const hasAccess = hasPermission(module, permission);

  if (!hasAccess) {
    // Return custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Return AccessDenied component if enabled
    if (showAccessDenied) {
      return <AccessDenied />;
    }

    // Return null if no fallback and AccessDenied is disabled
    return null;
  }

  return <>{children}</>;
}

/**
 * Component that conditionally renders content based on permission
 * Does not show AccessDenied, just hides content
 */
interface RequirePermissionProps {
  children: ReactNode;
  module: Module;
  permission?: Permission;
}

export function RequirePermission({
  children,
  module,
  permission = 'view',
}: RequirePermissionProps) {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return null;
  }

  const hasAccess = hasPermission(module, permission);

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
