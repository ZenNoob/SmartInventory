'use server'

import { cookies } from 'next/headers';
import type { Permissions } from '@/lib/types';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

interface User {
  id: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'accountant' | 'inventory_manager' | 'salesperson' | 'custom';
  permissions?: Permissions;
  status: 'active' | 'inactive';
  failedLoginAttempts: number;
  lockedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserStoreAssignment {
  storeId: string;
  storeName: string;
  storeCode: string;
  role?: string;
  permissions?: Permissions;
}

interface UserWithStores extends User {
  stores: UserStoreAssignment[];
}

/**
 * Get auth token from cookies
 */
async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('auth-token')?.value || null;
}

/**
 * Get current store ID from cookies
 */
async function getCurrentStoreId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('current-store-id')?.value || null;
}

/**
 * Fetch all users (admin only)
 */
export async function getUsers(storeId?: string): Promise<{
  success: boolean;
  users?: UserWithStores[];
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const currentStoreId = storeId || await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const url = new URL(`${getBaseUrl()}/api/users`);
    if (currentStoreId) {
      url.searchParams.set('storeId', currentStoreId);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(currentStoreId && { 'X-Store-Id': currentStoreId }),
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy danh sách người dùng' };
    }

    return { success: true, users: data.users };
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy danh sách người dùng' };
  }
}

/**
 * Get a single user by ID
 */
export async function getUser(userId: string): Promise<{
  success: boolean;
  user?: UserWithStores;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const url = new URL(`${getBaseUrl()}/api/users/${userId}`);
    if (storeId) {
      url.searchParams.set('storeId', storeId);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(storeId && { 'X-Store-Id': storeId }),
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy thông tin người dùng' };
    }

    return { success: true, user: data.user };
  } catch (error: unknown) {
    console.error('Error fetching user:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy thông tin người dùng' };
  }
}

/**
 * Create or update a user
 */
export async function upsertUser(user: {
  id?: string;
  email?: string;
  password?: string;
  displayName?: string;
  role?: 'admin' | 'accountant' | 'inventory_manager' | 'salesperson' | 'custom';
  permissions?: Permissions;
  status?: 'active' | 'inactive';
  storeIds?: string[];
}): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const isUpdate = !!user.id;
    const url = isUpdate
      ? `${getBaseUrl()}/api/users/${user.id}`
      : `${getBaseUrl()}/api/users`;

    const body: Record<string, unknown> = {};
    if (user.email !== undefined) body.email = user.email;
    if (user.password !== undefined && user.password !== '') body.password = user.password;
    if (user.displayName !== undefined) body.displayName = user.displayName;
    if (user.role !== undefined) body.role = user.role;
    if (user.permissions !== undefined) body.permissions = user.permissions;
    if (user.status !== undefined) body.status = user.status;
    if (user.storeIds !== undefined) body.storeIds = user.storeIds;

    const response = await fetch(url, {
      method: isUpdate ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(storeId && { 'X-Store-Id': storeId }),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể tạo hoặc cập nhật người dùng' };
    }

    return { success: true, userId: data.user?.id };
  } catch (error: unknown) {
    console.error('Error upserting user:', error);
    return { success: false, error: 'Không thể tạo hoặc cập nhật người dùng' };
  }
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const response = await fetch(`${getBaseUrl()}/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(storeId && { 'X-Store-Id': storeId }),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể xóa người dùng' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    return { success: false, error: 'Không thể xóa người dùng' };
  }
}

/**
 * Update user status
 */
export async function updateUserStatus(
  userId: string,
  status: 'active' | 'inactive'
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const response = await fetch(`${getBaseUrl()}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(storeId && { 'X-Store-Id': storeId }),
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể cập nhật trạng thái người dùng' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating user status:', error);
    return { success: false, error: 'Không thể cập nhật trạng thái người dùng' };
  }
}

/**
 * Assign stores to a user
 */
export async function assignUserStores(
  userId: string,
  storeIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const response = await fetch(`${getBaseUrl()}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(storeId && { 'X-Store-Id': storeId }),
      },
      body: JSON.stringify({ storeIds }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể gán cửa hàng cho người dùng' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error assigning stores to user:', error);
    return { success: false, error: 'Không thể gán cửa hàng cho người dùng' };
  }
}
