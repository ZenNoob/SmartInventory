
'use server'

import { AppUser, Permissions } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";
import * as fs from 'fs/promises';
import * as path from 'path';

export async function upsertUser(user: Partial<Omit<AppUser, 'id'>> & { id?: string; password?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const { auth, firestore } = await getAdminServices();

    const userDataForDb: Partial<AppUser> = {
        ...(user.email && { email: user.email }),
        ...(user.displayName && { displayName: user.displayName }),
        ...(user.role && { role: user.role }),
        ...(user.permissions && { permissions: user.permissions }),
    };

    if (user.id) {
      // Update existing user
      await auth.updateUser(user.id, {
        ...(user.email && { email: user.email }),
        ...(user.displayName && { displayName: user.displayName }),
        ...(user.password && { password: user.password }),
      });
      await firestore.collection('users').doc(user.id).set(userDataForDb, { merge: true });

    } else {
      // Create new user
      if (!user.password) {
        return { success: false, error: "Mật khẩu là bắt buộc cho người dùng mới." };
      }
      if (!user.email) {
        return { success: false, error: "Email là bắt buộc cho người dùng mới." };
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

export async function saveDefaultPermissionsForRole(role: string, permissions: Permissions): Promise<{ success: boolean; error?: string }> {
    if (role === 'custom' || role === 'admin') {
        return { success: false, error: "Không thể ghi đè quyền cho vai trò 'custom' hoặc 'admin'." };
    }
    
    try {
        const filePath = path.join(process.cwd(), 'src', 'hooks', 'use-user-role.ts');
        const fileContent = await fs.readFile(filePath, 'utf-8');

        // This is a simplified and potentially fragile way to update the file.
        // It relies on a specific structure of the defaultPermissions object.
        const permissionsString = JSON.stringify(permissions, null, 8).replace(/"/g, "'");

        const regex = new RegExp(`(\\s*${role}:\\s*)\{[^]*?\\}`, 'm');
        
        if (!regex.test(fileContent)) {
            return { success: false, error: `Không tìm thấy cấu hình mặc định cho vai trò '${role}' trong file.` };
        }

        const newFileContent = fileContent.replace(regex, `$1${permissionsString},`);

        await fs.writeFile(filePath, newFileContent, 'utf-8');
        
        return { success: true };
    } catch (error: any) {
        console.error("Error saving default permissions:", error);
        return { success: false, error: error.message || "Không thể lưu quyền mặc định." };
    }
}
