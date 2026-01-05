'use server'

import { cookies, headers } from 'next/headers';

function getBaseUrl(): string {
  // For server actions, we need to construct the URL from headers
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

interface Category {
  id: string;
  storeId: string;
  name: string;
  description?: string;
}

interface CategoryWithProductCount extends Category {
  productCount: number;
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
 * Fetch all categories for the current store
 */
export async function getCategories(includeProductCount: boolean = false): Promise<{ 
  success: boolean; 
  categories?: CategoryWithProductCount[]; 
  error?: string 
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const baseUrl = getBaseUrl();
    const url = new URL(`${baseUrl}/api/categories`);
    url.searchParams.set('storeId', storeId);
    if (includeProductCount) {
      url.searchParams.set('includeProductCount', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy danh sách danh mục' };
    }

    return { success: true, categories: data.categories };
  } catch (error: unknown) {
    console.error('Error fetching categories:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy danh sách danh mục' };
  }
}

/**
 * Create or update a category
 */
export async function upsertCategory(category: Partial<Category>): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const baseUrl = getBaseUrl();
    const isUpdate = !!category.id;
    const url = isUpdate 
      ? `${baseUrl}/api/categories/${category.id}?storeId=${storeId}`
      : `${baseUrl}/api/categories?storeId=${storeId}`;

    const response = await fetch(url, {
      method: isUpdate ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify({
        name: category.name,
        description: category.description,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể tạo hoặc cập nhật danh mục' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error upserting category:', error);
    return { success: false, error: 'Không thể tạo hoặc cập nhật danh mục' };
  }
}

/**
 * Delete a category
 */
export async function deleteCategory(categoryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/categories/${categoryId}?storeId=${storeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể xóa danh mục' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting category:', error);
    return { success: false, error: 'Không thể xóa danh mục' };
  }
}
