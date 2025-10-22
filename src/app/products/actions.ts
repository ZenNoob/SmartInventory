'use server'

import { Product } from "@/lib/types";
import { firebaseConfig } from '@/firebase/config';
import { initializeApp as initializeAdminApp, getApps as getAdminApps, getApp as getAdminApp, cert } from 'firebase-admin/app';
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getServiceAccount() {
  const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!serviceAccountB64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 environment variable is not set.');
  }
  try {
    const serviceAccountJson = Buffer.from(serviceAccountB64, 'base64').toString('utf-8');
    return JSON.parse(serviceAccountJson);
  } catch (e) {
    console.error('Failed to parse service account JSON.', e);
    throw new Error('Invalid service account credentials format.');
  }
}

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


export async function upsertProduct(product: Partial<Product>): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = await getAdminServices();

    if (product.id) {
      // Update existing product
      const productRef = firestore.collection('products').doc(product.id);
      await productRef.set(product, { merge: true });
    } else {
      // Create new product
      const productRef = firestore.collection('products').doc();
      await productRef.set({ ...product, id: productRef.id });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error upserting product:", error);
    return { success: false, error: error.message || 'Không thể tạo hoặc cập nhật sản phẩm.' };
  }
}
