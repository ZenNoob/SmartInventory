'use server'

import { cookies } from 'next/headers';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

/**
 * Payment entity interface
 */
interface Payment {
  id: string;
  storeId: string;
  customerId: string;
  paymentDate: string;
  amount: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

/**
 * Payment with customer information
 */
interface PaymentWithCustomer extends Payment {
  customerName: string;
  customerPhone?: string;
}

/**
 * Paginated result interface
 */
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
 * Fetch all customer payments for the current store
 */
export async function getPayments(options?: {
  page?: number;
  pageSize?: number;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{
  success: boolean;
  payments?: PaymentWithCustomer[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
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

    const url = new URL(`${getBaseUrl()}/api/payments`);
    url.searchParams.set('storeId', storeId);
    
    if (options?.page) {
      url.searchParams.set('page', options.page.toString());
    }
    if (options?.pageSize) {
      url.searchParams.set('pageSize', options.pageSize.toString());
    }
    if (options?.customerId) {
      url.searchParams.set('customerId', options.customerId);
    }
    if (options?.dateFrom) {
      url.searchParams.set('dateFrom', options.dateFrom);
    }
    if (options?.dateTo) {
      url.searchParams.set('dateTo', options.dateTo);
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
      return { success: false, error: data.error || 'Không thể lấy danh sách thanh toán' };
    }

    return {
      success: true,
      payments: data.data,
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: data.totalPages,
    };
  } catch (error: unknown) {
    console.error('Error fetching payments:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy danh sách thanh toán' };
  }
}

/**
 * Get payments for a specific customer
 */
export async function getCustomerPayments(customerId: string): Promise<{
  success: boolean;
  payments?: Payment[];
  error?: string;
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

    const url = new URL(`${getBaseUrl()}/api/payments`);
    url.searchParams.set('storeId', storeId);
    url.searchParams.set('customerId', customerId);
    url.searchParams.set('pageSize', '1000'); // Get all payments for customer

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
      return { success: false, error: data.error || 'Không thể lấy danh sách thanh toán' };
    }

    return { success: true, payments: data.data };
  } catch (error: unknown) {
    console.error('Error fetching customer payments:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy danh sách thanh toán' };
  }
}

/**
 * Add a new customer payment
 */
export async function addPayment(paymentData: {
  customerId: string;
  paymentDate: string;
  amount: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string; paymentId?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/payments?storeId=${storeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify({
        customerId: paymentData.customerId,
        paymentDate: paymentData.paymentDate,
        amount: paymentData.amount,
        notes: paymentData.notes,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể ghi nhận thanh toán' };
    }

    return { success: true, paymentId: data.payment?.id };
  } catch (error: unknown) {
    console.error('Error adding payment:', error);
    return { success: false, error: 'Không thể ghi nhận thanh toán' };
  }
}
