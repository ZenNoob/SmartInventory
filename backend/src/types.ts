/**
 * Backend Type Definitions
 * 
 * This file contains shared type definitions for the backend.
 */

// Permission types
export type Permission = 'view' | 'add' | 'edit' | 'delete';

export type Module = 
  | 'dashboard'
  | 'categories'
  | 'units'
  | 'products'
  | 'purchases'
  | 'suppliers'
  | 'sales'
  | 'customers'
  | 'cash-flow'
  | 'reports_shifts'
  | 'reports_income_statement'
  | 'reports_profit'
  | 'reports_debt'
  | 'reports_supplier_debt'
  | 'reports_transactions'
  | 'reports_supplier_debt_tracking'
  | 'reports_revenue'
  | 'reports_sold_products'
  | 'reports_inventory'
  | 'reports_ai_segmentation'
  | 'reports_ai_basket_analysis'
  | 'users'
  | 'settings'
  | 'pos'
  | 'ai_forecast'
  | 'stores'; // Added for store management

export type Permissions = {
  [key in Module]?: Permission[];
};

/**
 * Role hierarchy for Multi-tenant RBAC
 * owner > company_manager > store_manager > salesperson
 */
export type UserRole = 'owner' | 'company_manager' | 'store_manager' | 'salesperson';

/**
 * Role hierarchy levels (higher number = more permissions)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  company_manager: 3,
  store_manager: 2,
  salesperson: 1,
};

/**
 * Check if a role has higher or equal authority than another role
 */
export function hasRoleAuthority(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Get roles that a user can manage (roles below their own)
 */
export function getManageableRoles(userRole: UserRole): UserRole[] {
  const userLevel = ROLE_HIERARCHY[userRole];
  return (Object.keys(ROLE_HIERARCHY) as UserRole[]).filter(
    role => ROLE_HIERARCHY[role] < userLevel
  );
}
