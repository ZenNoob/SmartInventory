'use server'

import { cookies } from 'next/headers';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
  cost?: number;
}

interface SaleData {
  id?: string;
  customerId?: string;
  shiftId?: string;
  transactionDate: string;
  status?: 'pending' | 'unprinted' | 'printed';
  totalAmount: number;
  vatRate?: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  discountValue?: number;
  tierDiscountPercentage?: number;
  tierDiscountAmount?: number;
  pointsUsed?: number;
  pointsDiscount?: number;
  customerPayment?: number;
  previousDebt?: number;
  isChangeReturned?: boolean;
}

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  const storeId = cookieStore.get('store-id')?.value;
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(storeId && { 'X-Store-Id': storeId }),
  };
}

export async function getSales(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  status?: 'pending' | 'unprinted' | 'printed';
  dateFrom?: string;
  dateTo?: string;
  shiftId?: string;
}) {
  try {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    
    if (options?.page) params.set('page', options.page.toString());
    if (options?.pageSize) params.set('pageSize', options.pageSize.toString());
    if (options?.search) params.set('search', options.search);
    if (options?.customerId) params.set('customerId', options.customerId);
    if (options?.status) params.set('status', options.status);
    if (options?.dateFrom) params.set('dateFrom', options.dateFrom);
    if (options?.dateTo) params.set('dateTo', options.dateTo);
    if (options?.shiftId) params.set('shiftId', options.shiftId);

    const response = await fetch(`${getBaseUrl()}/api/sales?${params.toString()}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy danh sách đơn hàng' };
    }

    return { success: true, ...data };
  } catch (error) {
    console.error('Get sales error:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy danh sách đơn hàng' };
  }
}

export async function getSaleById(saleId: string) {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${getBaseUrl()}/api/sales/${saleId}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy thông tin đơn hàng' };
    }

    return { success: true, sale: data.sale };
  } catch (error) {
    console.error('Get sale error:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy thông tin đơn hàng' };
  }
}


export async function upsertSaleTransaction(
  sale: SaleData,
  items: SaleItem[]
): Promise<{ success: boolean; error?: string; saleData?: any }> {
  try {
    const headers = await getAuthHeaders();
    const isUpdate = !!sale.id;

    const body = {
      customerId: sale.customerId,
      shiftId: sale.shiftId,
      transactionDate: sale.transactionDate,
      status: sale.status || 'pending',
      totalAmount: sale.totalAmount,
      vatRate: sale.vatRate,
      discount: sale.discount,
      discountType: sale.discountType,
      discountValue: sale.discountValue,
      tierDiscountPercentage: sale.tierDiscountPercentage,
      tierDiscountAmount: sale.tierDiscountAmount,
      pointsUsed: sale.pointsUsed,
      pointsDiscount: sale.pointsDiscount,
      customerPayment: sale.customerPayment,
      previousDebt: sale.previousDebt,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        cost: item.cost,
      })),
    };

    const url = isUpdate 
      ? `${getBaseUrl()}/api/sales/${sale.id}`
      : `${getBaseUrl()}/api/sales`;

    const response = await fetch(url, {
      method: isUpdate ? 'PUT' : 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || `Không thể ${isUpdate ? 'cập nhật' : 'tạo'} đơn hàng` };
    }

    return { success: true, saleData: data.sale };
  } catch (error: any) {
    console.error(`Error ${sale.id ? 'updating' : 'creating'} sale transaction:`, error);
    return { success: false, error: error.message || `Không thể ${sale.id ? 'cập nhật' : 'tạo'} đơn hàng.` };
  }
}

export async function deleteSaleTransaction(saleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${getBaseUrl()}/api/sales/${saleId}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể xóa đơn hàng' };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting sale transaction:", error);
    return { success: false, error: error.message || 'Không thể xóa đơn hàng.' };
  }
}

export async function updateSaleStatus(
  saleId: string, 
  status: 'pending' | 'unprinted' | 'printed'
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${getBaseUrl()}/api/sales/${saleId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể cập nhật trạng thái đơn hàng' };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating sale status:", error);
    return { success: false, error: 'Không thể cập nhật trạng thái đơn hàng.' };
  }
}
