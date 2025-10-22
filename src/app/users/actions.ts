'use server'

import { AppUser } from "@/lib/types";
import { firebaseConfig } from '@/firebase/config';
import { initializeApp as initializeAdminApp, getApps as getAdminApps, getApp as getAdminApp, cert } from 'firebase-admin/app';
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getServiceAccount() {
  const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!serviceAccountB64) {
    console.error('FIREBASE_SERVICE_ACCOUNT_B64 environment variable is not set. This is required for admin actions.');
    throw new Error('Server configuration error: Missing service account credentials.');
  }
  try {
    // Decode the Base64 string to get the original JSON string
    const serviceAccountJson = Buffer.from(serviceAccountB64, 'base64').toString('utf-8');
    // Parse the decoded JSON string
    return JSON.parse(serviceAccountJson);
  } catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_B64 JSON.', e);
    throw new Error('Server configuration error: Invalid service account credentials format.');
  }
}

// This is an admin action, so we use firebase-admin
async function getAdminServices() {
    if (!getAdminApps().length) {
       const serviceAccount = getServiceAccount();
       initializeAdminApp({
         credential: cert(serviceAccount),
         databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
       });
    }
    const adminApp = getAdminApp();
    return { auth: getAuth(adminApp), firestore: getFirestore(adminApp) };
}


export async function upsertUser(user: AppUser & { password?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const { auth, firestore } = await getAdminServices();
    const userRole = user.role || 'inventory_manager';

    if (user.id) {
      // Update existing user
      await auth.updateUser(user.id, {
        email: user.email,
        displayName: user.displayName,
      });
      await firestore.collection('users').doc(user.id).set({
        role: userRole,
        displayName: user.displayName,
        email: user.email,
      }, { merge: true });

    } else {
      // Create new user
      if (!user.password) {
        return { success: false, error: "Mật khẩu là bắt buộc cho người dùng mới." };
      }
      const userRecord = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
      });
      await firestore.collection('users').doc(userRecord.uid).set({
        role: userRole,
        displayName: user.displayName,
        email: user.email,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error upserting user:", error);
    return { success: false, error: error.message || 'Không thể tạo hoặc cập nhật người dùng.' };
  }
}
