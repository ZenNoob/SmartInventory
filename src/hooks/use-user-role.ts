

'use client';

import { useMemo } from "react";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { AppUser, Permissions, SoftwarePackage, ThemeSettings } from "@/lib/types";

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
        'reports_supplier_debt': [
                'view'
        ],
        'reports_transactions': [
                'view'
        ],
        'reports_profit': [
                'view'
        ],
        'reports_supplier_debt_tracking': [
                'view'
        ],
        'purchases': [
                'view',
                'add',
                'edit'
        ],
        'reports_sold_products': [
                'view'
        ],
        'products': [
                'view',
                'add',
                'edit'
        ],
        'suppliers': [
                'view'
        ],
        'pos': [
                'view',
                'add',
                'edit'
        ],
        'units': [
                'view',
                'add',
                'edit'
        ],
        'customers': [
                'view',
                'add',
                'edit'
        ],
        'reports_ai_basket_analysis': [
                'view'
        ],
        'reports_shifts': [
                'view'
        ],
        'reports_inventory': [
                'view'
        ],
        'ai_forecast': [
                'view'
        ],
        'sales': [
                'view',
                'add',
                'edit'
        ],
        'reports_debt': [
                'view'
        ],
        'reports_income_statement': [
                'view'
        ],
        'categories': [
                'view',
                'add',
                'edit'
        ],
        'reports_revenue': [
                'view'
        ],
        'users': [],
        'reports': [
                'view'
        ],
        'settings': [],
        'reports_ai_segmentation': [
                'view'
        ],
        'cash-flow': [
                'view',
                'add',
                'edit',
                'delete'
        ],
        'dashboard': [
                'view'
        ]
},
    salesperson: {
        pos: ['view', 'add'],
        customers: ['view', 'add'],
    },
    custom: {},
};

// Define permissions for each software package
const packagePermissions: Record<SoftwarePackage, (keyof Permissions)[]> = {
  basic: [
    'dashboard', 'pos', 'categories', 'units', 'suppliers', 'products', 
    'purchases', 'sales', 'customers', 'cash-flow', 
    'reports_revenue', 'reports_inventory', 'reports_debt', 'reports_supplier_debt'
  ],
  standard: [
    'dashboard', 'pos', 'categories', 'units', 'suppliers', 'products', 
    'purchases', 'sales', 'customers', 'cash-flow',
    'reports_shifts', 'reports_income_statement', 'reports_profit', 'reports_debt',
    'reports_supplier_debt', 'reports_transactions', 'reports_supplier_debt_tracking',
    'reports_revenue', 'reports_sold_products', 'reports_inventory',
    'users', 'settings'
  ],
  advanced: [
    'dashboard', 'pos', 'categories', 'units', 'suppliers', 'products', 
    'purchases', 'sales', 'customers', 'cash-flow',
    'reports_shifts', 'reports_income_statement', 'reports_profit', 'reports_debt',
    'reports_supplier_debt', 'reports_transactions', 'reports_supplier_debt_tracking',
    'reports_revenue', 'reports_sold_products', 'reports_inventory',
    'reports_ai_segmentation', 'reports_ai_basket_analysis', 'ai_forecast',
    'users', 'settings'
  ],
};


export function useUserRole() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'theme');
  }, [firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userDocRef);
  const { data: settings, isLoading: isSettingsLoading } = useDoc<ThemeSettings>(settingsDocRef);

  const isLoading = isUserLoading || isProfileLoading || isSettingsLoading;
  
  const permissions = useMemo(() => {
    const role = userProfile?.role;
    const userPermissions = userProfile?.permissions;
    const softwarePackage = settings?.softwarePackage || 'advanced';
    
    // Always prioritize the specific permissions stored on the user object.
    // Fall back to the role's default permissions if the permissions field doesn't exist.
    let basePermissions: Permissions = userPermissions 
        ? userPermissions 
        : (role ? defaultPermissions[role] : {});

    // If a software package is set, filter the base permissions
    if (softwarePackage) {
      const allowedModules = packagePermissions[softwarePackage];
      const filteredPermissions: Permissions = {};
      
      for (const module of allowedModules) {
        if (basePermissions[module]) {
          filteredPermissions[module] = basePermissions[module];
        }
      }
      return filteredPermissions;
    }
    
    return basePermissions;
  }, [userProfile, settings]);


  return { 
    role: userProfile?.role, 
    permissions: permissions,
    isLoading 
  };
}
