'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { AppUser, Permissions, Module } from "@/lib/types";

// Define default permissions for each role
const defaultPermissions: Record<string, Permissions> = {
    admin: {
        dashboard: ['view'],
        pos: ['view', 'add', 'edit', 'delete'],
        categories: ['view', 'add', 'edit', 'delete'],
        units: ['view', 'add', 'edit', 'delete'],
        products: ['view', 'add', 'edit', 'delete'],
        purchases: ['view', 'add', 'edit', 'delete'],
        sales: ['view', 'add', 'edit', 'delete'],
        customers: ['view', 'add', 'edit', 'delete'],
        'cash-flow': ['view', 'add', 'edit', 'delete'],
        reports: ['view'],
        users: ['view', 'add', 'edit', 'delete'],
        settings: ['view', 'edit'],
    },
    accountant: {
        dashboard: ['view'],
        sales: ['view', 'add', 'edit'],
        customers: ['view', 'add', 'edit'],
        'cash-flow': ['view', 'add', 'edit', 'delete'],
        reports: ['view'],
    },
    inventory_manager: {
        dashboard: ['view'],
        categories: ['view', 'add', 'edit'],
        units: ['view', 'add', 'edit'],
        products: ['view', 'add', 'edit'],
        purchases: ['view', 'add', 'edit'],
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
  
  const permissions = userProfile?.role && userProfile.role !== 'custom'
    ? defaultPermissions[userProfile.role]
    : userProfile?.permissions;

  return { 
    role: userProfile?.role, 
    permissions: permissions,
    isLoading 
  };
}
