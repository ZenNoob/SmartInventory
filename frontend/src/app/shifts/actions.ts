'use client';

import { apiClient } from '@/lib/api-client';

/**
 * Fetch all shifts for the current store
 */
export async function getShifts(params?: {
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  success: boolean;
  data?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const shifts = await apiClient.getShifts();
    
    // Client-side filtering by date if needed
    let filteredShifts = shifts;
    if (params?.dateFrom || params?.dateTo) {
      filteredShifts = shifts.filter((shift: Record<string, unknown>) => {
        const shiftDate = new Date(shift.startTime as string);
        if (params.dateFrom && shiftDate < new Date(params.dateFrom)) return false;
        if (params.dateTo && shiftDate > new Date(params.dateTo)) return false;
        return true;
      });
    }
    
    return { success: true, data: filteredShifts };
  } catch (error: unknown) {
    console.error('Error fetching shifts:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách ca làm việc' 
    };
  }
}

/**
 * Get active shift
 */
export async function getActiveShift(): Promise<{
  success: boolean;
  shift?: Record<string, unknown> | null;
  error?: string;
}> {
  try {
    const shift = await apiClient.getActiveShift();
    return { success: true, shift };
  } catch (error: unknown) {
    console.error('Error fetching active shift:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy ca làm việc hiện tại' 
    };
  }
}

/**
 * Start a new shift
 */
export async function startShift(startingCash: number): Promise<{ 
  success: boolean; 
  shift?: Record<string, unknown>;
  error?: string 
}> {
  try {
    const result = await apiClient.startShift({ startingCash });
    return { success: true, shift: result as Record<string, unknown> };
  } catch (error: unknown) {
    console.error('Error starting shift:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể mở ca làm việc' 
    };
  }
}

/**
 * Close a shift
 */
export async function closeShift(shiftId: string, data: { endingCash: number }): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.closeShift(shiftId, data);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error closing shift:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể đóng ca làm việc' 
    };
  }
}


// Shift types
export interface Shift {
  id: string;
  storeId: string;
  userId: string;
  userName?: string;
  startTime: string;
  endTime?: string;
  startingCash: number;
  endingCash?: number;
  expectedCash?: number;
  cashDifference?: number;
  status: 'open' | 'closed';
  totalSales?: number;
  totalTransactions?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ShiftWithSummary extends Shift {
  salesCount: number;
  totalRevenue: number;
  cashPayments: number;
  cardPayments: number;
  otherPayments: number;
}

/**
 * Get a single shift by ID
 */
export async function getShift(shiftId: string): Promise<{
  success: boolean;
  shift?: Shift;
  error?: string;
}> {
  try {
    const shifts = await apiClient.getShifts();
    const shift = shifts.find(
      (s: Record<string, unknown>) => s.id === shiftId
    ) as Shift | undefined;
    if (!shift) {
      return { success: false, error: 'Không tìm thấy ca làm việc' };
    }
    return { success: true, shift };
  } catch (error: unknown) {
    console.error('Error fetching shift:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Đã xảy ra lỗi khi lấy thông tin ca làm việc',
    };
  }
}

/**
 * Get sales for a shift
 */
export async function getShiftSales(
  shiftId: string,
  _options?: { includeItems?: boolean }
): Promise<{
  success: boolean;
  sales?: Array<Record<string, unknown>>;
  data?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const sales = await apiClient.getSales();
    const shiftSales = sales.filter(
      (s: Record<string, unknown>) => s.shiftId === shiftId
    );
    return { success: true, sales: shiftSales, data: shiftSales };
  } catch (error: unknown) {
    console.error('Error fetching shift sales:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Đã xảy ra lỗi khi lấy danh sách bán hàng của ca',
    };
  }
}

/**
 * Update a shift
 */
export async function updateShift(
  shiftId: string,
  data: Partial<Shift>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Note: This would need a backend endpoint
    console.log('Updating shift:', shiftId, data);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating shift:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật ca làm việc',
    };
  }
}
