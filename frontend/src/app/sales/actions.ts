'use client';

import { apiClient } from '@/lib/api-client';

/**
 * Fetch all sales for the current store
 */
export async function getSales(): Promise<{
  success: boolean;
  sales?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const sales = await apiClient.getSales();
    return { success: true, sales };
  } catch (error: unknown) {
    console.error('Error fetching sales:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách bán hàng' 
    };
  }
}

/**
 * Get a single sale by ID
 */
export async function getSale(saleId: string): Promise<{
  success: boolean;
  sale?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const sale = await apiClient.getSale(saleId);
    return { success: true, sale };
  } catch (error: unknown) {
    console.error('Error fetching sale:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy thông tin đơn hàng' 
    };
  }
}

/**
 * Create a new sale
 */
export async function createSale(sale: Record<string, unknown>): Promise<{ 
  success: boolean; 
  sale?: Record<string, unknown>;
  error?: string 
}> {
  try {
    const result = await apiClient.createSale(sale);
    return { success: true, sale: result as Record<string, unknown> };
  } catch (error: unknown) {
    console.error('Error creating sale:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo đơn hàng' 
    };
  }
}

/**
 * Update a sale
 */
export async function updateSale(saleId: string, data: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.updateSale(saleId, data);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating sale:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể cập nhật đơn hàng' 
    };
  }
}

/**
 * Delete a sale
 */
export async function deleteSale(saleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.deleteSale(saleId);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting sale:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể xóa đơn hàng' 
    };
  }
}


/**
 * Delete a sale transaction (alias for deleteSale)
 */
export async function deleteSaleTransaction(saleId: string): Promise<{ success: boolean; error?: string }> {
  return deleteSale(saleId);
}

/**
 * Update sale status
 */
export async function updateSaleStatus(
  saleId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.updateSale(saleId, { status });
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating sale status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể cập nhật trạng thái đơn hàng',
    };
  }
}

/**
 * Upsert sale transaction (create or update)
 */
export async function upsertSaleTransaction(sale: Record<string, unknown>): Promise<{ 
  success: boolean; 
  sale?: Record<string, unknown>;
  saleData?: Record<string, unknown>;
  error?: string 
}> {
  try {
    const id = sale.id as string | undefined;
    if (id) {
      await apiClient.updateSale(id, sale);
      return { success: true, sale, saleData: sale };
    } else {
      const result = await apiClient.createSale(sale) as Record<string, unknown>;
      return { success: true, sale: result, saleData: result };
    }
  } catch (error: unknown) {
    console.error('Error upserting sale:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo hoặc cập nhật đơn hàng' 
    };
  }
}
