import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { query, insert } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

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

/**
 * GET /api/stores - Get all stores for the authenticated user
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

    const { userId, role } = authResult.user;

    let stores: StoreRecord[];

    // Admin/Owner can see all their stores, others see assigned stores
    if (role === 'admin') {
      // Admin sees stores they own
      stores = await query<StoreRecord>(
        `SELECT s.* FROM Stores s
         WHERE s.OwnerId = @userId AND s.Status = 'active'
         ORDER BY s.Name`,
        { userId }
      );
    } else {
      // Other users see stores they're assigned to
      stores = await query<StoreRecord>(
        `SELECT s.* FROM Stores s
         INNER JOIN UserStores us ON s.Id = us.StoreId
         WHERE us.UserId = @userId AND s.Status = 'active'
         ORDER BY s.Name`,
        { userId }
      );
    }

    return NextResponse.json({
      success: true,
      stores: stores.map(formatStore),
    });
  } catch (error) {
    console.error('Get stores error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách cửa hàng' },
      { status: 500 }
    );
  }
}


/**
 * POST /api/stores - Create a new store (Owner only)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { userId, role } = authResult.user;

    // Only admin (owner) can create stores
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Chỉ chủ sở hữu mới có thể tạo cửa hàng mới' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, code, address, phone, businessType, logo, settings } = body;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Tên cửa hàng và mã cửa hàng là bắt buộc' },
        { status: 400 }
      );
    }

    // Check if store code already exists
    const existingStore = await query<{ Id: string }>(
      `SELECT Id FROM Stores WHERE Code = @code`,
      { code }
    );

    if (existingStore.length > 0) {
      return NextResponse.json(
        { error: 'Mã cửa hàng đã tồn tại' },
        { status: 400 }
      );
    }

    const storeId = uuidv4();
    const now = new Date();

    // Create the store
    const newStore = await insert<StoreRecord>('Stores', {
      Id: storeId,
      OwnerId: userId,
      Name: name,
      Code: code.toUpperCase(),
      Address: address || null,
      Phone: phone || null,
      BusinessType: businessType || null,
      Logo: logo || null,
      Settings: settings ? JSON.stringify(settings) : null,
      CreatedAt: now,
      UpdatedAt: now,
      Status: 'active',
    });

    if (!newStore) {
      return NextResponse.json(
        { error: 'Không thể tạo cửa hàng' },
        { status: 500 }
      );
    }

    // Assign owner to the store in UserStores
    await insert('UserStores', {
      UserId: userId,
      StoreId: storeId,
      Role: 'admin',
      Permissions: null,
    });

    return NextResponse.json({
      success: true,
      store: formatStore(newStore),
    }, { status: 201 });
  } catch (error) {
    console.error('Create store error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo cửa hàng' },
      { status: 500 }
    );
  }
}
