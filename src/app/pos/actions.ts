'use server'

import { cookies } from 'next/headers';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

/**
 * Get the current store ID from cookies
 */
async function getStoreId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('storeId')?.value || cookieStore.get('store-id')?.value || null;
}

/**
 * Get the auth token from cookies
 */
async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value || cookieStore.get('auth-token')?.value || null;
}

/**
 * Get all products for POS
 */
export async function getProducts(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
}): Promise<{ success: boolean; error?: string; data?: unknown[]; total?: number }> {
  try {
    const storeId = await getStoreId();
    const token = await getAuthToken();

    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng. Vui lòng chọn cửa hàng.' };
    }

    if (!token) {
      return { success: false, error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' };
    }

    const params = new URLSearchParams();
    if (options?.page) params.set('page', options.page.toString());
    if (options?.pageSize) params.set('pageSize', options.pageSize.toString());
    if (options?.search) params.set('search', options.search);
    if (options?.categoryId) params.set('categoryId', options.categoryId);
    params.set('status', 'active'); // Only active products for POS

    const response = await fetch(`${getBaseUrl()}/api/products?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy danh sách sản phẩm.' };
    }

    return { success: true, data: data.data, total: data.total };
  } catch (error: unknown) {
    console.error("Error getting products:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể lấy danh sách sản phẩm.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get product by barcode for POS scanning
 */
export async function getProductByBarcode(
  barcode: string
): Promise<{ success: boolean; error?: string; product?: unknown }> {
  try {
    const storeId = await getStoreId();
    const token = await getAuthToken();

    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng. Vui lòng chọn cửa hàng.' };
    }

    if (!token) {
      return { success: false, error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' };
    }

    if (!barcode) {
      return { success: false, error: 'Mã vạch không được để trống.' };
    }

    const response = await fetch(`${getBaseUrl()}/api/products/barcode/${encodeURIComponent(barcode)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: `Không tìm thấy sản phẩm với mã vạch "${barcode}".` };
      }
      return { success: false, error: data.error || 'Không thể tìm sản phẩm.' };
    }

    return { success: true, product: data.product };
  } catch (error: unknown) {
    console.error("Error getting product by barcode:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể tìm sản phẩm.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get all customers for POS
 */
export async function getCustomers(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{ success: boolean; error?: string; data?: unknown[]; total?: number }> {
  try {
    const storeId = await getStoreId();
    const token = await getAuthToken();

    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng. Vui lòng chọn cửa hàng.' };
    }

    if (!token) {
      return { success: false, error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' };
    }

    const params = new URLSearchParams();
    if (options?.page) params.set('page', options.page.toString());
    if (options?.pageSize) params.set('pageSize', options.pageSize.toString());
    if (options?.search) params.set('search', options.search);
    params.set('status', 'active'); // Only active customers

    const response = await fetch(`${getBaseUrl()}/api/customers?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy danh sách khách hàng.' };
    }

    return { success: true, data: data.data, total: data.total };
  } catch (error: unknown) {
    console.error("Error getting customers:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể lấy danh sách khách hàng.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get all units for POS
 */
export async function getUnits(): Promise<{ success: boolean; error?: string; data?: unknown[] }> {
  try {
    const storeId = await getStoreId();
    const token = await getAuthToken();

    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng. Vui lòng chọn cửa hàng.' };
    }

    if (!token) {
      return { success: false, error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' };
    }

    const response = await fetch(`${getBaseUrl()}/api/units`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy danh sách đơn vị.' };
    }

    return { success: true, data: data.data || data.units };
  } catch (error: unknown) {
    console.error("Error getting units:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể lấy danh sách đơn vị.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get store settings for POS
 */
export async function getStoreSettings(): Promise<{ success: boolean; error?: string; settings?: unknown }> {
  try {
    const storeId = await getStoreId();
    const token = await getAuthToken();

    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng. Vui lòng chọn cửa hàng.' };
    }

    if (!token) {
      return { success: false, error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' };
    }

    const response = await fetch(`${getBaseUrl()}/api/settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy cài đặt cửa hàng.' };
    }

    return { success: true, settings: data.settings };
  } catch (error: unknown) {
    console.error("Error getting store settings:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể lấy cài đặt cửa hàng.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Start a new shift
 */
export async function startShift(
  userId: string,
  userName: string,
  startingCash: number
): Promise<{ success: boolean; error?: string; shiftId?: string }> {
  try {
    const storeId = await getStoreId();
    const token = await getAuthToken();

    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng. Vui lòng chọn cửa hàng.' };
    }

    if (!token) {
      return { success: false, error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' };
    }

    const response = await fetch(`${getBaseUrl()}/api/shifts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify({
        userId,
        userName,
        startingCash,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể bắt đầu ca làm việc.' };
    }

    return { success: true, shiftId: data.shift?.id };
  } catch (error: unknown) {
    console.error("Error starting shift:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể bắt đầu ca làm việc.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Close a shift
 */
export async function closeShift(
  shiftId: string,
  endingCash: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const storeId = await getStoreId();
    const token = await getAuthToken();

    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng. Vui lòng chọn cửa hàng.' };
    }

    if (!token) {
      return { success: false, error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' };
    }

    const response = await fetch(`${getBaseUrl()}/api/shifts/${shiftId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify({
        action: 'close',
        endingCash,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể đóng ca làm việc.' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Error closing shift:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể đóng ca làm việc.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Update shift cash values
 */
export async function updateShift(
  shiftId: string,
  updateData: { startingCash: number; endingCash: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    const storeId = await getStoreId();
    const token = await getAuthToken();

    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng. Vui lòng chọn cửa hàng.' };
    }

    if (!token) {
      return { success: false, error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' };
    }

    const response = await fetch(`${getBaseUrl()}/api/shifts/${shiftId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify({
        startingCash: updateData.startingCash,
        endingCash: updateData.endingCash,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể cập nhật ca làm việc.' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating shift:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể cập nhật ca làm việc.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get active shift for a user
 */
export async function getActiveShift(
  userId: string
): Promise<{ success: boolean; error?: string; shift?: unknown }> {
  try {
    const storeId = await getStoreId();
    const token = await getAuthToken();

    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng. Vui lòng chọn cửa hàng.' };
    }

    if (!token) {
      return { success: false, error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' };
    }

    const response = await fetch(
      `${getBaseUrl()}/api/shifts?activeOnly=true&userId=${userId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Store-Id': storeId,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy thông tin ca làm việc.' };
    }

    return { success: true, shift: data.shift };
  } catch (error: unknown) {
    console.error("Error getting active shift:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể lấy thông tin ca làm việc.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get shift with summary
 */
export async function getShiftWithSummary(
  shiftId: string
): Promise<{ success: boolean; error?: string; shift?: unknown }> {
  try {
    const storeId = await getStoreId();
    const token = await getAuthToken();

    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng. Vui lòng chọn cửa hàng.' };
    }

    if (!token) {
      return { success: false, error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' };
    }

    const response = await fetch(
      `${getBaseUrl()}/api/shifts/${shiftId}?withSummary=true`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Store-Id': storeId,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy thông tin ca làm việc.' };
    }

    return { success: true, shift: data.shift };
  } catch (error: unknown) {
    console.error("Error getting shift with summary:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể lấy thông tin ca làm việc.';
    return { success: false, error: errorMessage };
  }
}
