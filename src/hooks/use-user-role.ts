'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { AppUser } from "@/lib/types";

export function useUserRole() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userDocRef);

  const isLoading = isUserLoading || isProfileLoading;

  return { 
    role: userProfile?.role, 
    permissions: userProfile?.permissions,
    isLoading 
  };
}
