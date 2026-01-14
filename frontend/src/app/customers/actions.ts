'use client';

import { apiClient } from '@/lib/api-client';

/**
 * Fetch all customers for the current store
 */
export async function getCustomers(
  _params?:
    | boolean
    | {
        page?: number;
        pageSize?: number;
        search?: string;
        customerType?: string;
      }
): Promise<{
  success: boolean;
  customers?: CustomerWithDebt[];
  error?: string;
}> {
  try {
    const customers = await apiClient.getCustomers();
    return { success: true, customers: customers as unknown as CustomerWithDebt[] };
  } catch (error: unknown) {
    console.error('Error fetching customers:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Đã xảy ra lỗi khi lấy danh sách khách hàng',
    };
  }
}

/**
 * Get a single customer by ID
 */
export async function getCustomer(
  customerId: string,
  _options?: { includeDebt?: boolean; includeLoyalty?: boolean }
): Promise<{
  success: boolean;
  customer?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const customer = await apiClient.getCustomer(customerId);
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
 * Get customer debt information
 */
export async function getCustomerDebt(
  customerId: string,
  _includeHistory?: boolean
): Promise<{
  success: boolean;
  debt?: number;
  debtInfo?: CustomerDebtInfo;
  history?: CustomerDebtHistory[];
  error?: string;
}> {
  try {
    const customer = await apiClient.getCustomer(customerId);
    const customerData = customer as {
      debt?: number;
      currentDebt?: number;
      totalSales?: number;
      totalPayments?: number;
      creditLimit?: number;
    };

    const currentDebt = customerData.currentDebt || customerData.debt || 0;
    const creditLimit = customerData.creditLimit || 0;
    
    const debtInfo: CustomerDebtInfo = {
      totalDebt: customerData.debt || customerData.currentDebt || 0,
      currentDebt: currentDebt,
      totalSales: customerData.totalSales || 0,
      totalPayments: customerData.totalPayments || 0,
      isOverLimit: creditLimit > 0 && currentDebt > creditLimit,
      availableCredit: creditLimit > 0 ? Math.max(0, creditLimit - currentDebt) : 0,
      history: [],
    };

    // Create history items with required fields
    const history: CustomerDebtHistory[] = [];

    return { 
      success: true, 
      debt: debtInfo.totalDebt,
      debtInfo,
      history,
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
  data: string | Array<Record<string, unknown>>
): Promise<{ success: boolean; imported?: number; createdCount?: number; error?: string }> {
  try {
    // If data is a string (base64), parse it first
    let customers: Array<Record<string, unknown>>;
    if (typeof data === 'string') {
      // In real implementation, this would decode base64 and parse Excel/CSV
      // For now, return mock success
      return { success: true, imported: 0, createdCount: 0 };
    } else {
      customers = data;
    }

    let imported = 0;
    for (const customer of customers) {
      await apiClient.createCustomer(customer);
      imported++;
    }
    return { success: true, imported, createdCount: imported };
  } catch (error: unknown) {
    console.error('Error importing customers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể import khách hàng',
    };
  }
}


// Types
export interface CustomerDebtHistory {
  id: string;
  customerId: string;
  amount: number;
  type: 'sale' | 'payment';
  date: string;
  description: string;
  runningBalance: number;
}

export interface CustomerWithDebt {
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
  totalSales: number;
  totalPayments: number;
  calculatedDebt: number;
}

export interface CustomerDebtInfo {
  totalDebt: number;
  currentDebt?: number;
  totalSales: number;
  totalPayments: number;
  isOverLimit?: boolean;
  availableCredit?: number;
  history: CustomerDebtHistory[];
}

/**
 * Get customer debt with history
 */
export async function getCustomerDebtWithHistory(
  customerId: string,
  _includeHistory: boolean = true
): Promise<{
  success: boolean;
  debtInfo?: CustomerDebtInfo;
  history?: CustomerDebtHistory[];
  error?: string;
}> {
  try {
    const customer = await apiClient.getCustomer(customerId);
    const customerData = customer as {
      debt?: number;
      totalSales?: number;
      totalPayments?: number;
    };

    const debtInfo: CustomerDebtInfo = {
      totalDebt: customerData.debt || 0,
      totalSales: customerData.totalSales || 0,
      totalPayments: customerData.totalPayments || 0,
      history: [],
    };

    return {
      success: true,
      debtInfo,
      history: [],
    };
  } catch (error: unknown) {
    console.error('Error fetching customer debt with history:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Đã xảy ra lỗi khi lấy công nợ khách hàng',
    };
  }
}
