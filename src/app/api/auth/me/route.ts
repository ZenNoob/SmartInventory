import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { query } from '@/lib/db';

interface UserRecord {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  permissions: string | null;
  status: string;
}

interface StoreRecord {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  domain: string | null;
  settings: string | null;
  status: string;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { userId } = authResult.user;

    // Get fresh user data from database
    const users = await query<UserRecord>(
      `SELECT id, email, display_name, role, permissions, status
       FROM Users WHERE id = @userId`,
      { userId }
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy người dùng' },
        { status: 404 }
      );
    }

    const user = users[0];

    // Check if user is still active
    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Tài khoản đã bị vô hiệu hóa' },
        { status: 403 }
      );
    }

    // Get user's stores
    const stores = await query<StoreRecord>(
      `SELECT s.id, s.owner_id, s.name, s.slug, s.description, 
              s.logo_url, s.domain, s.settings, s.status
       FROM Stores s
       INNER JOIN UserStores us ON s.id = us.store_id
       WHERE us.user_id = @userId AND s.status = 'active'`,
      { userId }
    );

    // Parse permissions
    let permissions = {};
    if (user.permissions) {
      try {
        permissions = JSON.parse(user.permissions);
      } catch {
        permissions = {};
      }
    }

    // Format stores for response
    const formattedStores = stores.map((store) => ({
      id: store.id,
      ownerId: store.owner_id,
      name: store.name,
      code: store.slug,
      address: store.description,
      phone: null,
      businessType: null,
      logo: store.logo_url,
      settings: store.settings ? JSON.parse(store.settings) : null,
      status: store.status,
    }));

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        permissions,
        stores: formattedStores,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin người dùng' },
      { status: 500 }
    );
  }
}
