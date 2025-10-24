'use server'

import { firebaseConfig } from '@/firebase/config';
import { initializeApp as initializeAdminApp, getApps as getAdminApps, getApp as getAdminApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from "firebase-admin/firestore";
import { toPlainObject } from './utils';

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

export async function getAdminServices() {
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
