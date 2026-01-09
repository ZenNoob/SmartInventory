'use client';

import { apiClient } from '@/lib/api-client';

interface DebtHistoryItem {
  id: string;
  type: 'sale' | 'payment';
  date: string;
  amount: number;
  description: string;
  runningBalance: number;
}

interface DebtInfo {
  totalSales: number;
  totalPayments: number;
  currentDebt: number;
  creditLimit: number;
  availableCredit: number;
  isOverLimit: boolean;
}

interface CustomerWithDebt {
  id: string;
  storeId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  customerType?: string;
  customerGroup?: string;
  gender?: string;
  birthday?: string;
  zalo?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  creditLimit: number;
  currentDebt: number;
  loyaltyPoints?: number;
  lifetimePoints?: number;
  loyaltyTier?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  totalSales: number;
  totalPayments: number;
  calculatedDebt: number;
}

/**
 * Fetch all customers for the current store with debt info
 */
export async function getCustomers(includeDebt: boolean = false): Promise<{
  success: boolean;
  customers?: CustomerWithDebt[];
  error?: string;
}> {
  try {
    const customers = await apiClient.getCustomers() as Array<Record<string, unknown>>;
    
    if (includeDebt) {
      // Lấy thông tin công nợ cho từng khách hàng
      const customersWithDebt = await Promise.all(
        customers.map(async (customer) => {
          try {
            const debtResult = await getCustomerDebt(customer.id as string, false);
            return {
              ...customer,
              totalSales: debtResult.debtInfo?.totalSales || 0,
              totalPayments: debtResult.debtInfo?.totalPayments || 0,
              calculatedDebt: debtResult.debtInfo?.currentDebt || 0,
              currentDebt: debtResult.debtInfo?.currentDebt || 0,
            } as CustomerWithDebt;
          } catch {
            return {
              ...customer,
              totalSales: 0,
              totalPayments: 0,
              calculatedDebt: 0,
              currentDebt: 0,
            } as CustomerWithDebt;
          }
        })
      );
      return { success: true, customers: customersWithDebt };
    }
    
    return { success: true, customers: customers as unknown as CustomerWithDebt[] };
  } catch (error: unknown) {
    console.error('Error fetching customers:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách khách hàng' 
    };
  }
}

/**
 * Get a single customer by ID
 */
export async function getCustomer(customerId: string, options?: { includeDebt?: boolean; includeLoyalty?: boolean }): Promise<{
  success: boolean;
  customer?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const customer = await apiClient.getCustomer(customerId) as Record<string, unknown>;
    
    if (options?.includeDebt) {
      const debtResult = await getCustomerDebt(customerId, false);
      if (debtResult.success && debtResult.debtInfo) {
        customer.currentDebt = debtResult.debtInfo.currentDebt;
        customer.creditLimit = debtResult.debtInfo.creditLimit || customer.creditLimit || 0;
      }
    }
    
    return { success: true, customer };
  } catch (error: unknown) {
    console.error('Error fetching customer:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy thông tin khách hàng' 
    };
  }
}

/**
 * Create or update a customer
 */
export async function upsertCustomer(customer: Record<string, unknown>): Promise<{ success: boolean; customerId?: string; error?: string }> {
  try {
    const id = customer.id as string | undefined;
    if (id) {
      await apiClient.updateCustomer(id, customer);
      return { success: true, customerId: id };
    } else {
      const result = await apiClient.createCustomer(customer) as { id: string };
      return { success: true, customerId: result.id };
    }
  } catch (error: unknown) {
    console.error('Error upserting customer:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo hoặc cập nhật khách hàng' 
    };
  }
}

/**
 * Delete a customer
 */
export async function deleteCustomer(customerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.deleteCustomer(customerId);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting customer:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể xóa khách hàng' 
    };
  }
}


/**
 * Update customer status
 */
export async function updateCustomerStatus(
  customerId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.updateCustomer(customerId, { status });
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating customer status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể cập nhật trạng thái khách hàng',
    };
  }
}

/**
 * Generate customer template for import
 */
export async function generateCustomerTemplate(): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  return {
    success: true,
    data: '', // Base64 encoded Excel data would go here
  };
}

/**
 * Get customer debt information and history
 */
export async function getCustomerDebt(customerId: string, includeHistory: boolean = false): Promise<{
  success: boolean;
  debtInfo?: DebtInfo;
  history?: DebtHistoryItem[];
  error?: string;
}> {
  try {
    const data = await apiClient.request<{
      success: boolean;
      debtInfo: DebtInfo;
      history: DebtHistoryItem[];
    }>(`/customers/${customerId}/debt?includeHistory=${includeHistory}`);
    
    return { 
      success: true, 
      debtInfo: data.debtInfo,
      history: data.history,
    };
  } catch (error: unknown) {
    console.error('Error fetching customer debt:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy công nợ khách hàng' 
    };
  }
}


/**
 * Import customers from file
 */
export async function importCustomers(
  customers: Array<Record<string, unknown>>
): Promise<{ success: boolean; imported?: number; error?: string }> {
  try {
    let imported = 0;
    for (const customer of customers) {
      await apiClient.createCustomer(customer);
      imported++;
    }
    return { success: true, imported };
  } catch (error: unknown) {
    console.error('Error importing customers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể import khách hàng',
    };
  }
}
