'use server'

import { cookies } from 'next/headers';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

interface Supplier {
  id: string;
  storeId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface SupplierWithDebt extends Supplier {
  totalPurchases: number;
  totalPayments: number;
  debt: number;
}

interface SupplierPayment {
  id?: string;
  supplierId: string;
  paymentDate: string;
  amount: number;
  notes?: string;
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
 * Fetch all suppliers for the current store
 */
export async function getSuppliers(includeDebt: boolean = false): Promise<{ 
  success: boolean; 
  suppliers?: SupplierWithDebt[]; 
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

    const url = new URL(`${getBaseUrl()}/api/suppliers`);
    url.searchParams.set('storeId', storeId);
    if (includeDebt) {
      url.searchParams.set('includeDebt', 'true');
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
      return { success: false, error: data.error || 'Không thể lấy danh sách nhà cung cấp' };
    }

    return { success: true, suppliers: data.suppliers };
  } catch (error: unknown) {
    console.error('Error fetching suppliers:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy danh sách nhà cung cấp' };
  }
}

/**
 * Get a single supplier by ID
 */
export async function getSupplier(supplierId: string, includeDebt: boolean = false): Promise<{ 
  success: boolean; 
  supplier?: Supplier; 
  debtInfo?: { totalPurchases: number; totalPayments: number; debt: number };
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

    const url = new URL(`${getBaseUrl()}/api/suppliers/${supplierId}`);
    url.searchParams.set('storeId', storeId);
    if (includeDebt) {
      url.searchParams.set('includeDebt', 'true');
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
      return { success: false, error: data.error || 'Không thể lấy thông tin nhà cung cấp' };
    }

    return { 
      success: true, 
      supplier: data.supplier,
      debtInfo: data.debtInfo,
    };
  } catch (error: unknown) {
    console.error('Error fetching supplier:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy thông tin nhà cung cấp' };
  }
}

/**
 * Create or update a supplier
 */
export async function upsertSupplier(supplier: Partial<Supplier>): Promise<{ 
  success: boolean; 
  error?: string; 
  supplierId?: string 
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

    const isUpdate = !!supplier.id;
    const url = isUpdate 
      ? `${getBaseUrl()}/api/suppliers/${supplier.id}?storeId=${storeId}`
      : `${getBaseUrl()}/api/suppliers?storeId=${storeId}`;

    const response = await fetch(url, {
      method: isUpdate ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify({
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        taxCode: supplier.taxCode,
        notes: supplier.notes,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể tạo hoặc cập nhật nhà cung cấp' };
    }

    return { success: true, supplierId: data.supplier?.id };
  } catch (error: unknown) {
    console.error('Error upserting supplier:', error);
    return { success: false, error: 'Không thể tạo hoặc cập nhật nhà cung cấp' };
  }
}

/**
 * Delete a supplier
 */
export async function deleteSupplier(supplierId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/suppliers/${supplierId}?storeId=${storeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể xóa nhà cung cấp' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting supplier:', error);
    return { success: false, error: 'Không thể xóa nhà cung cấp' };
  }
}

/**
 * Add a supplier payment
 */
export async function addSupplierPayment(
  paymentData: Omit<SupplierPayment, 'id'>
): Promise<{ success: boolean; error?: string; paymentId?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/supplier-payments?storeId=${storeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể ghi nhận thanh toán cho nhà cung cấp' };
    }

    return { success: true, paymentId: data.payment?.id };
  } catch (error: unknown) {
    console.error('Error adding supplier payment:', error);
    return { success: false, error: 'Không thể ghi nhận thanh toán cho nhà cung cấp' };
  }
}
