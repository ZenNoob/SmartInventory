'use server'

import { cookies } from 'next/headers';
import { Shift, ShiftWithSummary } from '@/lib/repositories/shift-repository';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

/**
 * Get the current store ID from cookies
 */
async function getStoreId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('storeId')?.value || null;
}

/**
 * Get the auth token from cookies
 */
async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value || null;
}

/**
 * Get all shifts with optional filters
 */
export async function getShifts(options?: {
  page?: number;
  pageSize?: number;
  userId?: string;
  status?: 'active' | 'closed';
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ 
  success: boolean; 
  error?: string; 
  data?: Shift[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}> {
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
    if (options?.page) params.append('page', options.page.toString());
    if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
    if (options?.userId) params.append('userId', options.userId);
    if (options?.status) params.append('status', options.status);
    if (options?.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options?.dateTo) params.append('dateTo', options.dateTo);

    const response = await fetch(
      `${getBaseUrl()}/api/shifts?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Store-Id': storeId,
        },
        cache: 'no-store',
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể lấy danh sách ca làm việc.' };
    }

    return { 
      success: true, 
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  } catch (error: unknown) {
    console.error("Error getting shifts:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể lấy danh sách ca làm việc.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get a single shift by ID
 */
export async function getShift(
  shiftId: string,
  withSummary: boolean = false
): Promise<{ success: boolean; error?: string; shift?: Shift | ShiftWithSummary }> {
  try {
    const storeId = await getStoreId();
    const token = await getAuthToken();

    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng. Vui lòng chọn cửa hàng.' };
    }

    if (!token) {
      return { success: false, error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' };
    }

    const params = withSummary ? '?withSummary=true' : '';
    const response = await fetch(
      `${getBaseUrl()}/api/shifts/${shiftId}${params}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Store-Id': storeId,
        },
        cache: 'no-store',
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể lấy thông tin ca làm việc.' };
    }

    return { success: true, shift: result.shift };
  } catch (error: unknown) {
    console.error("Error getting shift:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể lấy thông tin ca làm việc.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get sales for a specific shift
 */
export async function getShiftSales(
  shiftId: string
): Promise<{ 
  success: boolean; 
  error?: string; 
  data?: Array<{
    id: string;
    invoiceNumber: string;
    customerId?: string;
    customerName?: string;
    transactionDate: string;
    finalAmount: number;
  }>;
}> {
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
      `${getBaseUrl()}/api/sales?shiftId=${shiftId}&pageSize=1000`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Store-Id': storeId,
        },
        cache: 'no-store',
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể lấy danh sách đơn hàng.' };
    }

    return { success: true, data: result.data };
  } catch (error: unknown) {
    console.error("Error getting shift sales:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể lấy danh sách đơn hàng.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Close a shift with ending cash and calculate cash difference
 * Cash difference = Ending Cash - (Starting Cash + Cash Sales + Cash Payments)
 */
export async function closeShift(
  shiftId: string,
  endingCash: number
): Promise<{ success: boolean; error?: string; shift?: ShiftWithSummary }> {
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

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể đóng ca làm việc.' };
    }

    return { success: true, shift: result.shift };
  } catch (error: unknown) {
    console.error("Error closing shift:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể đóng ca làm việc.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Update shift cash values (starting cash and/or ending cash)
 * Recalculates cash difference automatically
 */
export async function updateShift(
  shiftId: string,
  updateData: { startingCash: number; endingCash?: number }
): Promise<{ success: boolean; error?: string; shift?: Shift }> {
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

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể cập nhật ca làm việc.' };
    }

    return { success: true, shift: result.shift };
  } catch (error: unknown) {
    console.error("Error updating shift:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể cập nhật ca làm việc.';
    return { success: false, error: errorMessage };
  }
}
