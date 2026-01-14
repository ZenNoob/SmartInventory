'use client';

import { apiClient } from '@/lib/api-client';

// Types
export interface CashTransaction {
  id: string;
  type: 'thu' | 'chi';
  amount: number;
  category: string;
  reason?: string;
  description?: string;
  date: string;
  transactionDate?: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown; // Allow indexing by string
}

export interface CashFlowSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeByCategory?: Record<string, number>;
  expenseByCategory?: Record<string, number>;
}

/**
 * Fetch all cash transactions for the current store
 */
export async function getCashFlow(): Promise<{
  success: boolean;
  transactions?: CashTransaction[];
  summary?: CashFlowSummary | null;
  error?: string;
}> {
  try {
    const result = await apiClient.getCashFlow({ includeSummary: true, pageSize: 1000 }) as {
      data?: Array<Record<string, unknown>>;
      summary?: Record<string, unknown>;
    };
    // API returns { data: [...], summary: {...} }
    return { 
      success: true, 
      transactions: (result.data || []) as CashTransaction[],
      summary: (result.summary as unknown as CashFlowSummary) || null
    };
  } catch (error: unknown) {
    console.error('Error fetching cash flow:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách thu chi' 
    };
  }
}

/**
 * Create a new cash transaction
 */
export async function createCashTransaction(transaction: Record<string, unknown>): Promise<{ 
  success: boolean; 
  transaction?: Record<string, unknown>;
  error?: string 
}> {
  try {
    const result = await apiClient.createCashTransaction(transaction);
    return { success: true, transaction: result as Record<string, unknown> };
  } catch (error: unknown) {
    console.error('Error creating cash transaction:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo phiếu thu chi' 
    };
  }
}


/**
 * Get cash transactions (alias for getCashFlow)
 */
export async function getCashTransactions(params?: {
  pageSize?: number;
  includeSummary?: boolean;
  type?: 'thu' | 'chi';
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{
  success: boolean;
  transactions?: CashTransaction[];
  summary?: CashFlowSummary | null;
  error?: string;
}> {
  try {
    const result = await apiClient.getCashFlow({ 
      includeSummary: params?.includeSummary ?? true, 
      pageSize: params?.pageSize ?? 1000,
      type: params?.type,
      category: params?.category,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    }) as {
      data?: Array<Record<string, unknown>>;
      summary?: Record<string, unknown>;
    };
    return { 
      success: true, 
      transactions: (result.data || []) as CashTransaction[],
      summary: (result.summary as unknown as CashFlowSummary) || null
    };
  } catch (error: unknown) {
    console.error('Error fetching cash transactions:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách thu chi' 
    };
  }
}

/**
 * Upsert cash transaction (create or update)
 */
export async function upsertCashTransaction(transaction: Record<string, unknown>): Promise<{ 
  success: boolean; 
  transaction?: Record<string, unknown>;
  error?: string 
}> {
  // Cash transactions typically don't have update - just create new ones
  return createCashTransaction(transaction);
}

/**
 * Delete a cash transaction
 */
export async function deleteCashTransaction(transactionId: string): Promise<{ success: boolean; error?: string }> {
  // Note: This would need a backend endpoint to be implemented
  console.warn('deleteCashTransaction: Backend endpoint not implemented');
  return { success: false, error: 'Chức năng xóa phiếu thu chi chưa được triển khai' };
}

/**
 * Generate cash transactions Excel
 */
export async function generateCashTransactionsExcel(
  _transactions?: Array<Record<string, unknown>>
): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  return {
    success: true,
    data: '', // Base64 encoded Excel data would go here
  };
}
