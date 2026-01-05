'use server'

import { cookies } from 'next/headers';
import * as xlsx from 'xlsx';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

interface Customer {
  id: string;
  storeId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  customerType: 'personal' | 'business';
  customerGroup?: string;
  gender?: 'male' | 'female' | 'other';
  birthday?: string;
  zalo?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  creditLimit: number;
  currentDebt: number;
  loyaltyPoints: number;
  lifetimePoints: number;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'diamond';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface CustomerWithDebt extends Customer {
  totalSales: number;
  totalPayments: number;
  calculatedDebt: number;
}

interface DebtInfo {
  totalSales: number;
  totalPayments: number;
  currentDebt: number;
  creditLimit: number;
  availableCredit: number;
  isOverLimit: boolean;
}

interface DebtHistoryItem {
  id: string;
  type: 'sale' | 'payment';
  date: string;
  amount: number;
  description: string;
  runningBalance: number;
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
 * Fetch all customers for the current store
 */
export async function getCustomers(includeDebt: boolean = false): Promise<{ 
  success: boolean; 
  customers?: CustomerWithDebt[]; 
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

    const url = new URL(`${getBaseUrl()}/api/customers`);
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
      return { success: false, error: data.error || 'Không thể lấy danh sách khách hàng' };
    }

    return { success: true, customers: data.customers };
  } catch (error: unknown) {
    console.error('Error fetching customers:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy danh sách khách hàng' };
  }
}

/**
 * Get a single customer by ID
 */
export async function getCustomer(customerId: string, options?: { includeDebt?: boolean; includeLoyalty?: boolean }): Promise<{ 
  success: boolean; 
  customer?: Customer; 
  debtInfo?: DebtInfo;
  loyaltyInfo?: {
    currentPoints: number;
    lifetimePoints: number;
    currentTier: string;
    tierDiscount: number;
    nextTier: string | null;
    pointsToNextTier: number;
  };
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

    const url = new URL(`${getBaseUrl()}/api/customers/${customerId}`);
    url.searchParams.set('storeId', storeId);
    if (options?.includeDebt) {
      url.searchParams.set('includeDebt', 'true');
    }
    if (options?.includeLoyalty) {
      url.searchParams.set('includeLoyalty', 'true');
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
      return { success: false, error: data.error || 'Không thể lấy thông tin khách hàng' };
    }

    return { 
      success: true, 
      customer: data.customer,
      debtInfo: data.debtInfo,
      loyaltyInfo: data.loyaltyInfo,
    };
  } catch (error: unknown) {
    console.error('Error fetching customer:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy thông tin khách hàng' };
  }
}


/**
 * Create or update a customer
 */
export async function upsertCustomer(customer: Partial<Customer>): Promise<{ 
  success: boolean; 
  error?: string; 
  customerId?: string 
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

    const isUpdate = !!customer.id;
    const url = isUpdate 
      ? `${getBaseUrl()}/api/customers/${customer.id}?storeId=${storeId}`
      : `${getBaseUrl()}/api/customers?storeId=${storeId}`;

    const response = await fetch(url, {
      method: isUpdate ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        customerType: customer.customerType,
        customerGroup: customer.customerGroup,
        gender: customer.gender,
        birthday: customer.birthday,
        zalo: customer.zalo,
        bankName: customer.bankName,
        bankAccountNumber: customer.bankAccountNumber,
        bankBranch: customer.bankBranch,
        creditLimit: customer.creditLimit,
        status: customer.status,
        loyaltyPoints: customer.loyaltyPoints,
        lifetimePoints: customer.lifetimePoints,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể tạo hoặc cập nhật khách hàng' };
    }

    return { success: true, customerId: data.customer?.id };
  } catch (error: unknown) {
    console.error('Error upserting customer:', error);
    return { success: false, error: 'Không thể tạo hoặc cập nhật khách hàng' };
  }
}

/**
 * Delete a customer
 */
export async function deleteCustomer(customerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/customers/${customerId}?storeId=${storeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể xóa khách hàng' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting customer:', error);
    return { success: false, error: 'Không thể xóa khách hàng' };
  }
}

/**
 * Update customer status
 */
export async function updateCustomerStatus(customerId: string, status: 'active' | 'inactive'): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/customers/${customerId}?storeId=${storeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể cập nhật trạng thái khách hàng' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating customer status:', error);
    return { success: false, error: 'Không thể cập nhật trạng thái khách hàng' };
  }
}


/**
 * Get customer debt information
 */
export async function getCustomerDebt(customerId: string, includeHistory: boolean = false): Promise<{
  success: boolean;
  customer?: { id: string; name: string; creditLimit: number };
  debtInfo?: DebtInfo;
  history?: DebtHistoryItem[];
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

    const url = new URL(`${getBaseUrl()}/api/customers/${customerId}/debt`);
    url.searchParams.set('storeId', storeId);
    if (includeHistory) {
      url.searchParams.set('includeHistory', 'true');
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
      return { success: false, error: data.error || 'Không thể lấy thông tin công nợ' };
    }

    return {
      success: true,
      customer: data.customer,
      debtInfo: data.debtInfo,
      history: data.history,
    };
  } catch (error: unknown) {
    console.error('Error fetching customer debt:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy thông tin công nợ' };
  }
}

/**
 * Check customer credit limit before sale
 */
export async function checkCreditLimit(customerId: string, additionalDebt: number): Promise<{
  success: boolean;
  withinLimit?: boolean;
  currentDebt?: number;
  creditLimit?: number;
  projectedDebt?: number;
  warning?: string | null;
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

    const response = await fetch(`${getBaseUrl()}/api/customers/${customerId}/debt?storeId=${storeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify({ additionalDebt }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể kiểm tra hạn mức tín dụng' };
    }

    return {
      success: true,
      withinLimit: data.withinLimit,
      currentDebt: data.currentDebt,
      creditLimit: data.creditLimit,
      projectedDebt: data.projectedDebt,
      warning: data.warning,
    };
  } catch (error: unknown) {
    console.error('Error checking credit limit:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi kiểm tra hạn mức tín dụng' };
  }
}


/**
 * Generate customer import template
 */
export async function generateCustomerTemplate(): Promise<{ success: boolean; error?: string; data?: string }> {
  try {
    const headers = [
      "name", "customerType", "phone", "email", "address", 
      "customerGroup", "gender", "birthday", "zalo", "creditLimit",
      "bankName", "bankAccountNumber", "bankBranch"
    ];
    const ws = xlsx.utils.aoa_to_sheet([headers]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Customers");
    const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
    
    return { success: true, data: buffer.toString('base64') };
  } catch (error: unknown) {
    console.error("Error generating customer template:", error);
    return { success: false, error: 'Không thể tạo file mẫu.' };
  }
}

/**
 * Import customers from Excel file
 */
export async function importCustomers(base64Data: string): Promise<{ success: boolean; error?: string; createdCount?: number }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const customersData = xlsx.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

    if (customersData.length === 0) {
      return { success: false, error: "File không có dữ liệu." };
    }

    let createdCount = 0;
    const errors: string[] = [];

    for (const row of customersData) {
      const name = row.name as string;
      // Basic validation
      if (!name) {
        console.warn("Skipping row due to missing name:", row);
        continue;
      }

      const customerData = {
        name: name,
        customerType: row.customerType === 'business' ? 'business' : 'personal',
        phone: row.phone?.toString() || undefined,
        email: row.email as string || undefined,
        address: row.address as string || undefined,
        customerGroup: row.customerGroup as string || undefined,
        gender: ['male', 'female', 'other'].includes(row.gender as string) ? row.gender as string : undefined,
        birthday: row.birthday ? new Date(row.birthday as string).toISOString().split('T')[0] : undefined,
        zalo: row.zalo?.toString() || undefined,
        bankName: row.bankName as string || undefined,
        bankAccountNumber: row.bankAccountNumber?.toString() || undefined,
        bankBranch: row.bankBranch as string || undefined,
        creditLimit: !isNaN(parseFloat(row.creditLimit as string)) ? parseFloat(row.creditLimit as string) : 0,
      };

      const response = await fetch(`${getBaseUrl()}/api/customers?storeId=${storeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Store-Id': storeId,
        },
        body: JSON.stringify(customerData),
      });

      if (response.ok) {
        createdCount++;
      } else {
        const data = await response.json();
        errors.push(`${name}: ${data.error || 'Lỗi không xác định'}`);
      }
    }

    if (errors.length > 0 && createdCount === 0) {
      return { success: false, error: errors.join('; ') };
    }

    return { success: true, createdCount };
  } catch (error: unknown) {
    console.error("Error importing customers:", error);
    return { success: false, error: 'Không thể nhập file khách hàng.' };
  }
}
