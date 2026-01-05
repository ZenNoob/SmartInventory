import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateRequest,
  getStoreIdFromRequest,
  verifyStoreAccess,
} from '@/lib/auth';
import { query } from '@/lib/db';
import type { ThemeSettings } from '@/lib/types';

interface StoreRecord {
  id: string;
  owner_id: string;
  settings: string | null;
}

/**
 * GET /api/settings - Get settings for the current store
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const storeId = getStoreIdFromRequest(request);
    if (!storeId) {
      return NextResponse.json(
        { error: 'Vui lòng chọn cửa hàng' },
        { status: 400 }
      );
    }

    const { userId } = authResult.user;

    // Verify user has access to this store
    const hasAccess = await verifyStoreAccess(userId, storeId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Bạn không có quyền truy cập cửa hàng này' },
        { status: 403 }
      );
    }

    const stores = await query<StoreRecord>(
      `SELECT id, owner_id, settings FROM Stores WHERE id = @storeId`,
      { storeId }
    );

    if (stores.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng' },
        { status: 404 }
      );
    }

    const store = stores[0];
    const settings: ThemeSettings | null = store.settings
      ? JSON.parse(store.settings)
      : null;

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy cài đặt' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings - Update settings for the current store
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const storeId = getStoreIdFromRequest(request);
    if (!storeId) {
      return NextResponse.json(
        { error: 'Vui lòng chọn cửa hàng' },
        { status: 400 }
      );
    }

    const { userId, role } = authResult.user;

    // Check if user is the owner of this store or admin
    const stores = await query<StoreRecord>(
      `SELECT id, owner_id, settings FROM Stores WHERE id = @storeId`,
      { storeId }
    );

    if (stores.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng' },
        { status: 404 }
      );
    }

    const store = stores[0];

    // Only owner or admin can update settings
    if (store.owner_id !== userId && role !== 'admin') {
      return NextResponse.json(
        { error: 'Chỉ chủ sở hữu mới có thể cập nhật cài đặt' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const settings: Partial<ThemeSettings> = body;

    // Merge with existing settings
    const existingSettings: ThemeSettings | null = store.settings
      ? JSON.parse(store.settings)
      : null;

    const mergedSettings = {
      ...existingSettings,
      ...settings,
    };

    // Update the store with new settings
    await query(
      `UPDATE Stores SET settings = @settings, updated_at = GETDATE() WHERE id = @storeId`,
      { storeId, settings: JSON.stringify(mergedSettings) }
    );

    return NextResponse.json({
      success: true,
      settings: mergedSettings,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi cập nhật cài đặt' },
      { status: 500 }
    );
  }
}
