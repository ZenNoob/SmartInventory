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
export async function closeShift(shiftId: string, endingCash: number): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.closeShift(shiftId, { endingCash });
    return { success: true };
  } catch (error: unknown) {
    console.error('Error closing shift:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể đóng ca làm việc' 
    };
  }
}
