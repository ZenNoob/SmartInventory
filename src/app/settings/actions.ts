'use server'

import { ThemeSettings } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";
import { toPlainObject } from "@/lib/utils";

export async function upsertThemeSettings(settings: Partial<ThemeSettings>): Promise<{ success: boolean; error?: string }> {
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
            return toPlainObject(data) as ThemeSettings;
        }
        return null;
    } catch (error) {
        console.error("Error getting theme settings:", error);
        return null;
    }
}
