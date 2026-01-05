'use server'

import { cookies } from 'next/headers';
import * as xlsx from 'xlsx';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

/**
 * CashTransaction entity interface
 */
export interface CashTransaction {
  id: string;
  storeId: string;
  type: 'thu' | 'chi';
  transactionDate: string;
  amount: number;
  reason: string;
  category?: string;
  relatedInvoiceId?: string;
  createdBy?: string;
  createdAt: string;
}

/**
 * Cash flow summary interface
 */
export interface CashFlowSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
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
 * Fetch all cash transactions for the current store
 */
export async function getCashTransactions(options?: {
  page?: number;
  pageSize?: number;
  type?: 'thu' | 'chi';
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  includeSummary?: boolean;
}): Promise<{
  success: boolean;
  transactions?: CashTransaction[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  summary?: CashFlowSummary;
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

    const url = new URL(`${getBaseUrl()}/api/cash-flow`);
    url.searchParams.set('storeId', storeId);
    
    if (options?.page) {
      url.searchParams.set('page', options.page.toString());
    }
    if (options?.pageSize) {
      url.searchParams.set('pageSize', options.pageSize.toString());
    }
    if (options?.type) {
      url.searchParams.set('type', options.type);
    }
    if (options?.category) {
      url.searchParams.set('category', options.category);
    }
    if (options?.dateFrom) {
      url.searchParams.set('dateFrom', options.dateFrom);
    }
    if (options?.dateTo) {
      url.searchParams.set('dateTo', options.dateTo);
    }
    if (options?.includeSummary) {
      url.searchParams.set('includeSummary', 'true');
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
      return { success: false, error: data.error || 'Không thể lấy danh sách phiếu thu chi' };
    }

    return {
      success: true,
      transactions: data.data,
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: data.totalPages,
      summary: data.summary,
    };
  } catch (error: unknown) {
    console.error('Error fetching cash transactions:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy danh sách phiếu thu chi' };
  }
}

/**
 * Create or update a cash transaction
 */
export async function upsertCashTransaction(transaction: Partial<CashTransaction>): Promise<{ 
  success: boolean; 
  error?: string;
  transaction?: CashTransaction;
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

    const isUpdate = !!transaction.id;
    const method = isUpdate ? 'PUT' : 'POST';

    const response = await fetch(`${getBaseUrl()}/api/cash-flow?storeId=${storeId}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify({
        id: transaction.id,
        type: transaction.type,
        transactionDate: transaction.transactionDate,
        amount: transaction.amount,
        reason: transaction.reason,
        category: transaction.category,
        relatedInvoiceId: transaction.relatedInvoiceId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể tạo hoặc cập nhật phiếu' };
    }

    return { success: true, transaction: data.transaction };
  } catch (error: unknown) {
    console.error('Error upserting cash transaction:', error);
    return { success: false, error: 'Không thể tạo hoặc cập nhật phiếu' };
  }
}

/**
 * Delete a cash transaction
 */
export async function deleteCashTransaction(transactionId: string): Promise<{ 
  success: boolean; 
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

    const response = await fetch(`${getBaseUrl()}/api/cash-flow?storeId=${storeId}&id=${transactionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể xóa phiếu' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting cash transaction:', error);
    return { success: false, error: 'Không thể xóa phiếu' };
  }
}

/**
 * Generate Excel file for cash transactions
 */
export async function generateCashTransactionsExcel(transactions: CashTransaction[]): Promise<{ 
  success: boolean; 
  data?: string; 
  error?: string 
}> {
  try {
    const dataToExport = transactions.map((t, index) => ({
      'STT': index + 1,
      'Ngày': new Date(t.transactionDate).toLocaleDateString('vi-VN'),
      'Loại': t.type === 'thu' ? 'Thu' : 'Chi',
      'Số tiền': t.amount,
      'Lý do': t.reason,
      'Danh mục': t.category || '',
    }));
    
    const totalThu = transactions.filter(t => t.type === 'thu').reduce((acc, t) => acc + t.amount, 0);
    const totalChi = transactions.filter(t => t.type === 'chi').reduce((acc, t) => acc + t.amount, 0);

    const worksheet = xlsx.utils.json_to_sheet(dataToExport);

    // Add total rows
    xlsx.utils.sheet_add_aoa(worksheet, [
        [], // empty row
        ['Tổng thu', totalThu],
        ['Tổng chi', totalChi],
        ['Tồn quỹ', totalThu - totalChi]
    ], { origin: -1 });

    worksheet['!cols'] = [
      { wch: 5 },  // STT
      { wch: 15 }, // Ngày
      { wch: 10 }, // Loại
      { wch: 20 }, // Số tiền
      { wch: 40 }, // Lý do
      { wch: 20 }, // Danh mục
    ];

    const numberFormat = '#,##0';
    const lastDataRow = dataToExport.length + 1;
    for(let i = 2; i <= lastDataRow; i++) {
        if (worksheet[`D${i}`]) {
          worksheet[`D${i}`].z = numberFormat;
        }
    }
    if (worksheet[`B${lastDataRow + 2}`]) worksheet[`B${lastDataRow + 2}`].z = numberFormat;
    if (worksheet[`B${lastDataRow + 3}`]) worksheet[`B${lastDataRow + 3}`].z = numberFormat;
    if (worksheet[`B${lastDataRow + 4}`]) worksheet[`B${lastDataRow + 4}`].z = numberFormat;

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'SoQuy');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return { success: true, data: buffer.toString('base64') };
  } catch (error: unknown) {
    console.error("Error generating cash transactions excel:", error);
    return { success: false, error: 'Không thể tạo file excel.' };
  }
}
