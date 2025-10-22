'use client';

import { useDoc, useFirestore, useUser } from "@/firebase";
import { doc } from "firebase/firestore";

export function useUserRole() {
  const { user } = useUser();
  const firestore = useFirestore();
  const userDocRef = user ? doc(firestore, 'users', user.uid) : null;
  const { data: userProfile } = useDoc(userDocRef);

  return { role: userProfile?.role };
}
