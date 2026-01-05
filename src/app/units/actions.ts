'use server';

import { cookies } from 'next/headers';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

interface Unit {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  baseUnitId?: string;
  conversionFactor: number;
}

interface UnitWithBaseUnit extends Unit {
  baseUnitName?: string;
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
 * Fetch all units for the current store
 */
export async function getUnits(options?: {
  includeBaseUnit?: boolean;
  baseUnitsOnly?: boolean;
}): Promise<{
  success: boolean;
  units?: UnitWithBaseUnit[];
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

    const baseUrl = getBaseUrl();
    const url = new URL(`${baseUrl}/api/units`);
    url.searchParams.set('storeId', storeId);
    if (options?.includeBaseUnit) {
      url.searchParams.set('includeBaseUnit', 'true');
    }
    if (options?.baseUnitsOnly) {
      url.searchParams.set('baseUnitsOnly', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy danh sách đơn vị tính' };
    }

    return { success: true, units: data.units };
  } catch (error: unknown) {
    console.error('Error fetching units:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy danh sách đơn vị tính' };
  }
}

/**
 * Create or update a unit
 */
export async function upsertUnit(unit: Partial<Unit>): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const baseUrl = getBaseUrl();
    const isUpdate = !!unit.id;
    const url = isUpdate
      ? `${baseUrl}/api/units/${unit.id}?storeId=${storeId}`
      : `${baseUrl}/api/units?storeId=${storeId}`;

    const response = await fetch(url, {
      method: isUpdate ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify({
        name: unit.name,
        description: unit.description,
        baseUnitId: unit.baseUnitId,
        conversionFactor: unit.conversionFactor,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể tạo hoặc cập nhật đơn vị tính' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error upserting unit:', error);
    return { success: false, error: 'Không thể tạo hoặc cập nhật đơn vị tính' };
  }
}

/**
 * Delete a unit
 */
export async function deleteUnit(unitId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/units/${unitId}?storeId=${storeId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể xóa đơn vị tính' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting unit:', error);
    return { success: false, error: 'Không thể xóa đơn vị tính' };
  }
}

/**
 * Convert quantity between units
 */
export async function convertUnitQuantity(
  quantity: number,
  fromUnitId: string,
  toUnitId: string
): Promise<{ success: boolean; convertedQuantity?: number; error?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const baseUrl = getBaseUrl();
    const url = new URL(`${baseUrl}/api/units/convert`);
    url.searchParams.set('storeId', storeId);
    url.searchParams.set('quantity', quantity.toString());
    url.searchParams.set('fromUnitId', fromUnitId);
    url.searchParams.set('toUnitId', toUnitId);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể quy đổi đơn vị' };
    }

    return { success: true, convertedQuantity: data.convertedQuantity };
  } catch (error: unknown) {
    console.error('Error converting unit:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi quy đổi đơn vị' };
  }
}
