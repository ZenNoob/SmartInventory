'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { AppUser, Permissions } from "@/lib/types";

// Permissions for admin role
const adminPermissions: Permissions = {
    dashboard: ['view'],
    pos: ['view', 'add', 'edit', 'delete'],
    categories: ['view', 'add', 'edit', 'delete'],
    units: ['view', 'add', 'edit', 'delete'],
    products: ['view', 'add', 'edit', 'delete'],
    purchases: ['view', 'add', 'edit', 'delete'],
    sales: ['view', 'add', 'edit', 'delete'],
    customers: ['view', 'add', 'edit', 'delete'],
    reports: ['view'],
    users: ['view', 'add', 'edit', 'delete'],
    settings: ['view', 'edit'],
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
  
  // If the user is an admin, always return full permissions.
  // Otherwise, return the permissions from their profile.
  const permissions = userProfile?.role === 'admin' 
    ? adminPermissions 
    : userProfile?.permissions;

  return { 
    role: userProfile?.role, 
    permissions: permissions,
    isLoading 
  };
}
