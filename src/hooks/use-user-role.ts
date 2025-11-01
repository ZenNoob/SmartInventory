
'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { AppUser, Permissions } from "@/lib/types";

// Define default permissions for each role
const defaultPermissions: Record<string, Permissions> = {
    admin: {
        dashboard: ['view'],
        pos: ['view', 'add', 'edit', 'delete'],
        categories: ['view', 'add', 'edit', 'delete'],
        units: ['view', 'add', 'edit', 'delete'],
        suppliers: ['view', 'add', 'edit', 'delete'],
        products: ['view', 'add', 'edit', 'delete'],
        purchases: ['view', 'add', 'edit', 'delete'],
        sales: ['view', 'add', 'edit', 'delete'],
        customers: ['view', 'add', 'edit', 'delete'],
        'cash-flow': ['view', 'add', 'edit', 'delete'],
        reports_shifts: ['view'],
        reports_income_statement: ['view'],
        reports_profit: ['view'],
        reports_debt: ['view'],
        reports_supplier_debt: ['view'],
        reports_transactions: ['view'],
        reports_supplier_debt_tracking: ['view'],
        reports_revenue: ['view'],
        reports_sold_products: ['view'],
        reports_inventory: ['view'],
        reports_ai_segmentation: ['view'],
        reports_ai_basket_analysis: ['view'],
        ai_forecast: ['view'],
        users: ['view', 'add', 'edit', 'delete'],
        settings: ['view', 'edit'],
    },
    accountant: {
        dashboard: ['view'],
        sales: ['view', 'add', 'edit'],
        customers: ['view', 'add', 'edit'],
        'cash-flow': ['view', 'add', 'edit', 'delete'],
        reports_income_statement: ['view'],
        reports_profit: ['view'],
        reports_debt: ['view'],
        reports_transactions: ['view'],
        reports_revenue: ['view'],
        reports_sold_products: ['view'],
    },
    inventory_manager: {
        dashboard: ['view'],
        categories: ['view', 'add', 'edit'],
        units: ['view', 'add', 'edit'],
        suppliers: ['view', 'add', 'edit', 'delete'],
        products: ['view', 'add', 'edit'],
        purchases: ['view', 'add', 'edit'],
        reports_inventory: ['view'],
    },
    salesperson: {
        pos: ['view', 'add'],
        customers: ['view', 'add'],
    },
    custom: {},
};


export function useUserRole() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userDocRef);

  const isLoading = isUserLoading || isProfileLoading;
  
  // FIXED LOGIC: Prioritize stored permissions. If they exist (even if empty), use them.
  // Fallback to default role permissions only if the 'permissions' field is missing entirely.
  const permissions = userProfile?.permissions !== undefined 
    ? userProfile.permissions 
    : (userProfile?.role ? defaultPermissions[userProfile.role] : undefined);


  return { 
    role: userProfile?.role, 
    permissions: permissions,
    isLoading 
  };
}
