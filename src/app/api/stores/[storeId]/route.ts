import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, verifyStoreAccess } from '@/lib/auth';
import { query, update, remove } from '@/lib/db';

interface StoreRecord {
  Id: string;
  OwnerId: string;
  Name: string;
  Code: string;
  Address: string | null;
  Phone: string | null;
  BusinessType: string | null;
  Logo: string | null;
  Settings: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
  Status: string;
}

function formatStore(store: StoreRecord) {
  return {
    id: store.Id,
    ownerId: store.OwnerId,
    name: store.Name,
    code: store.Code,
    address: store.Address,
    phone: store.Phone,
    businessType: store.BusinessType,
    logo: store.Logo,
    settings: store.Settings ? JSON.parse(store.Settings) : null,
    createdAt: store.CreatedAt,
    updatedAt: store.UpdatedAt,
    status: store.Status,
  };
}

interface RouteParams {
  params: Promise<{ storeId: string }>;
}

/**
 * GET /api/stores/[storeId] - Get a specific store
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { storeId } = await params;
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
      `SELECT * FROM Stores WHERE Id = @storeId`,
      { storeId }
    );

    if (stores.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      store: formatStore(stores[0]),
    });
  } catch (error) {
    console.error('Get store error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin cửa hàng' },
      { status: 500 }
    );
  }
}


/**
 * PUT /api/stores/[storeId] - Update a store (Owner only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { storeId } = await params;
    const { userId } = authResult.user;

    // Check if user is the owner of this store
    const stores = await query<StoreRecord>(
      `SELECT * FROM Stores WHERE Id = @storeId`,
      { storeId }
    );

    if (stores.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng' },
        { status: 404 }
      );
    }

    const store = stores[0];

    // Only owner can update store
    if (store.OwnerId !== userId) {
      return NextResponse.json(
        { error: 'Chỉ chủ sở hữu mới có thể cập nhật cửa hàng' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, code, address, phone, businessType, logo, settings, status } = body;

    // If code is being changed, check for duplicates
    if (code && code.toUpperCase() !== store.Code) {
      const existingStore = await query<{ Id: string }>(
        `SELECT Id FROM Stores WHERE Code = @code AND Id != @storeId`,
        { code: code.toUpperCase(), storeId }
      );

      if (existingStore.length > 0) {
        return NextResponse.json(
          { error: 'Mã cửa hàng đã tồn tại' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      UpdatedAt: new Date(),
    };

    if (name !== undefined) updateData.Name = name;
    if (code !== undefined) updateData.Code = code.toUpperCase();
    if (address !== undefined) updateData.Address = address || null;
    if (phone !== undefined) updateData.Phone = phone || null;
    if (businessType !== undefined) updateData.BusinessType = businessType || null;
    if (logo !== undefined) updateData.Logo = logo || null;
    if (settings !== undefined) updateData.Settings = settings ? JSON.stringify(settings) : null;
    if (status !== undefined) updateData.Status = status;

    const updatedStore = await update<StoreRecord>('Stores', storeId, updateData);

    if (!updatedStore) {
      return NextResponse.json(
        { error: 'Không thể cập nhật cửa hàng' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      store: formatStore(updatedStore),
    });
  } catch (error) {
    console.error('Update store error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi cập nhật cửa hàng' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stores/[storeId] - Delete a store (Owner only, soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { storeId } = await params;
    const { userId } = authResult.user;

    // Check if user is the owner of this store
    const stores = await query<StoreRecord>(
      `SELECT * FROM Stores WHERE Id = @storeId`,
      { storeId }
    );

    if (stores.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng' },
        { status: 404 }
      );
    }

    const store = stores[0];

    // Only owner can delete store
    if (store.OwnerId !== userId) {
      return NextResponse.json(
        { error: 'Chỉ chủ sở hữu mới có thể xóa cửa hàng' },
        { status: 403 }
      );
    }

    // Soft delete - set status to inactive
    await update('Stores', storeId, {
      Status: 'inactive',
      UpdatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Đã xóa cửa hàng thành công',
    });
  } catch (error) {
    console.error('Delete store error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xóa cửa hàng' },
      { status: 500 }
    );
  }
}
