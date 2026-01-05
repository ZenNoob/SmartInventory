'use server'

import { cookies } from 'next/headers';
import { PurchaseOrder, PurchaseOrderItem, Supplier } from "@/lib/types";
import * as xlsx from 'xlsx';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

/**
 * Get auth headers for API requests
 */
async function getAuthHeaders(storeId: string): Promise<HeadersInit> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
    'X-Store-Id': storeId,
  };
}

/**
 * Get current store ID from cookies
 */
async function getCurrentStoreId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('current-store-id')?.value || null;
}

/**
 * Create a new purchase order
 */
export async function createPurchaseOrder(
  order: Omit<PurchaseOrder, 'id' | 'orderNumber' | 'createdAt' | 'items'>,
  items: Omit<PurchaseOrderItem, 'id' | 'purchaseOrderId'>[]
): Promise<{ success: boolean; error?: string; purchaseOrderId?: string }> {
  try {
    const storeId = await getCurrentStoreId();
    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng hiện tại' };
    }

    const headers = await getAuthHeaders(storeId);
    
    const response = await fetch(`${getBaseUrl()}/api/purchases`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        supplierId: order.supplierId,
        importDate: order.importDate,
        notes: order.notes,
        totalAmount: order.totalAmount,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          cost: item.cost,
          unitId: item.unitId,
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể tạo đơn nhập hàng' };
    }

    return { success: true, purchaseOrderId: data.purchaseOrder?.id };
  } catch (error: unknown) {
    console.error("Error creating purchase order:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể tạo đơn nhập hàng';
    return { success: false, error: errorMessage };
  }
}


/**
 * Update an existing purchase order
 */
export async function updatePurchaseOrder(
  orderId: string,
  orderUpdate: Omit<PurchaseOrder, 'id' | 'orderNumber' | 'createdAt' | 'items'>,
  itemsUpdate: Omit<PurchaseOrderItem, 'id' | 'purchaseOrderId'>[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const storeId = await getCurrentStoreId();
    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng hiện tại' };
    }

    const headers = await getAuthHeaders(storeId);
    
    const response = await fetch(`${getBaseUrl()}/api/purchases/${orderId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        supplierId: orderUpdate.supplierId,
        importDate: orderUpdate.importDate,
        notes: orderUpdate.notes,
        totalAmount: orderUpdate.totalAmount,
        items: itemsUpdate.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          cost: item.cost,
          unitId: item.unitId,
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể cập nhật đơn nhập hàng' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating purchase order:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể cập nhật đơn nhập hàng';
    return { success: false, error: errorMessage };
  }
}

/**
 * Delete a purchase order
 */
export async function deletePurchaseOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const storeId = await getCurrentStoreId();
    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng hiện tại' };
    }

    const headers = await getAuthHeaders(storeId);
    
    const response = await fetch(`${getBaseUrl()}/api/purchases/${orderId}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể xóa đơn nhập hàng' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting purchase order:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể xóa đơn nhập hàng';
    return { success: false, error: errorMessage };
  }
}


/**
 * Get all purchase orders
 */
export async function getPurchaseOrders(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ 
  success: boolean; 
  error?: string; 
  data?: PurchaseOrder[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}> {
  try {
    const storeId = await getCurrentStoreId();
    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng hiện tại' };
    }

    const headers = await getAuthHeaders(storeId);
    
    const params = new URLSearchParams();
    if (options?.page) params.set('page', options.page.toString());
    if (options?.pageSize) params.set('pageSize', options.pageSize.toString());
    if (options?.search) params.set('search', options.search);
    if (options?.supplierId) params.set('supplierId', options.supplierId);
    if (options?.dateFrom) params.set('dateFrom', options.dateFrom);
    if (options?.dateTo) params.set('dateTo', options.dateTo);

    const response = await fetch(`${getBaseUrl()}/api/purchases?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể lấy danh sách đơn nhập hàng' };
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
    console.error("Error getting purchase orders:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể lấy danh sách đơn nhập hàng';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get a single purchase order with details
 */
export async function getPurchaseOrder(orderId: string): Promise<{ 
  success: boolean; 
  error?: string; 
  purchaseOrder?: PurchaseOrder & { supplierName?: string };
}> {
  try {
    const storeId = await getCurrentStoreId();
    if (!storeId) {
      return { success: false, error: 'Không tìm thấy cửa hàng hiện tại' };
    }

    const headers = await getAuthHeaders(storeId);
    
    const response = await fetch(`${getBaseUrl()}/api/purchases/${orderId}`, {
      method: 'GET',
      headers,
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể lấy thông tin đơn nhập hàng' };
    }

    return { success: true, purchaseOrder: result.purchaseOrder };
  } catch (error: unknown) {
    console.error("Error getting purchase order:", error);
    const errorMessage = error instanceof Error ? error.message : 'Không thể lấy thông tin đơn nhập hàng';
    return { success: false, error: errorMessage };
  }
}


/**
 * Generate Excel export for purchase orders
 */
export async function generatePurchaseOrdersExcel(
  orders: (PurchaseOrder & { supplierName?: string; itemCount?: number })[], 
  suppliers: Supplier[]
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const suppliersMap = new Map(suppliers.map(s => [s.id, s.name]));
    const dataToExport = orders.map((order, index) => ({
      'STT': index + 1,
      'Mã đơn': order.orderNumber,
      'Ngày nhập': new Date(order.importDate).toLocaleDateString('vi-VN'),
      'Nhà cung cấp': order.supplierName || (order.supplierId ? suppliersMap.get(order.supplierId) : 'N/A') || 'N/A',
      'Số SP': order.itemCount ?? order.items?.length ?? 0,
      'Tổng tiền': order.totalAmount,
      'Ghi chú': order.notes || '',
    }));

    const totalAmount = orders.reduce((acc, order) => acc + order.totalAmount, 0);

    const totalRow = {
      'STT': '',
      'Mã đơn': 'Tổng cộng',
      'Ngày nhập': '',
      'Nhà cung cấp': '',
      'Số SP': '',
      'Tổng tiền': totalAmount,
      'Ghi chú': '',
    };
    
    const worksheet = xlsx.utils.json_to_sheet([...dataToExport, totalRow]);

    worksheet['!cols'] = [
      { wch: 5 },  // STT
      { wch: 20 }, // Mã đơn
      { wch: 15 }, // Ngày nhập
      { wch: 25 }, // Nhà cung cấp
      { wch: 10 }, // Số SP
      { wch: 20 }, // Tổng tiền
      { wch: 40 }, // Ghi chú
    ];

    const numberFormat = '#,##0';
    dataToExport.forEach((_, index) => {
        const rowIndex = index + 2; // 1-based index, +1 for header
        if (worksheet[`F${rowIndex}`]) {
          worksheet[`F${rowIndex}`].z = numberFormat;
        }
    });

    const totalRowIndex = dataToExport.length + 2;
    if (worksheet[`F${totalRowIndex}`]) {
      worksheet[`F${totalRowIndex}`].z = numberFormat;
    }

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'DonNhapHang');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return { success: true, data: buffer.toString('base64') };
  } catch (error: unknown) {
    console.error("Error generating purchase orders excel:", error);
    return { success: false, error: 'Không thể tạo file excel.' };
  }
}
