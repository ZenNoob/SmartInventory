'use server'

import { ThemeSettings } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";

export async function upsertThemeSettings(settings: ThemeSettings): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = await getAdminServices();

    const settingsRef = firestore.collection('settings').doc('theme');
    await settingsRef.set(settings, { merge: true });

    return { success: true };
  } catch (error: any) {
    console.error("Error upserting theme settings:", error);
    return { success: false, error: error.message || 'Không thể cập nhật cài đặt giao diện.' };
  }
}

export async function getThemeSettings(): Promise<ThemeSettings | null> {
    try {
        const { firestore } = await getAdminServices();
        const doc = await firestore.collection('settings').doc('theme').get();
        if (doc.exists) {
            const data = doc.data();
            // Convert any Timestamps to plain objects if they exist
            if (data) {
                // This is a simple deep-clone-like operation to handle nested objects if any
                const plainData = JSON.parse(JSON.stringify(data, (key, value) => {
                    if (value && typeof value === 'object' && value.hasOwnProperty('_seconds')) {
                        // Check for Firestore Timestamp-like object
                        return new Date(value._seconds * 1000).toISOString();
                    }
                    return value;
                }));
                return plainData as ThemeSettings;
            }
            return data as ThemeSettings;
        }
        return null;
    } catch (error) {
        console.error("Error getting theme settings:", error);
        return null;
    }
}
