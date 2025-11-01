'use server'

import { AppUser, Permissions } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";

export async function upsertUser(user: Omit<AppUser, 'id'> & { id?: string; password?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const { auth, firestore } = await getAdminServices();

    const userDataForDb: AppUser = {
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        permissions: user.permissions || {},
    };

    if (user.id) {
      // Update existing user
      await auth.updateUser(user.id, {
        email: user.email,
        displayName: user.displayName,
      });
      await firestore.collection('users').doc(user.id).set(userDataForDb, { merge: true });

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
      await firestore.collection('users').doc(userRecord.uid).set({ id: userRecord.uid, ...userDataForDb });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error upserting user:", error);
    return { success: false, error: error.message || 'Không thể tạo hoặc cập nhật người dùng.' };
  }
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { auth, firestore } = await getAdminServices();
        
        await auth.deleteUser(userId);
        await firestore.collection('users').doc(userId).delete();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user:", error);
        return { success: false, error: error.message || 'Không thể xóa người dùng.' };
    }
}
