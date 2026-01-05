import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { userRepository } from '@/lib/repositories/user-repository';

/**
 * GET /api/users - Get all users for a store
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

    // Only admin can view users
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Chỉ quản trị viên mới có quyền xem danh sách người dùng' },
        { status: 403 }
      );
    }

    const storeId = getStoreIdFromRequest(request);
    
    let users;
    if (storeId) {
      // Verify user has access to this store
      const hasAccess = await verifyStoreAccess(authResult.user.userId, storeId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Bạn không có quyền truy cập cửa hàng này' },
          { status: 403 }
        );
      }
      // Get users for specific store
      users = await userRepository.findByStore(storeId);
    } else {
      // Get all users (admin only)
      const allUsers = await userRepository.findAll();
      // Get stores for each user
      users = await Promise.all(
        allUsers.map(async (user) => {
          const stores = await userRepository.getUserStores(user.id);
          return { ...user, stores };
        })
      );
    }

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách người dùng' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users - Create a new user
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

    // Only admin can create users
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Chỉ quản trị viên mới có quyền tạo người dùng' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      email,
      password,
      displayName,
      role,
      permissions,
      storeIds,
    } = body;

    // Validate required fields
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { error: 'Email là bắt buộc' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    if (!role || !['admin', 'accountant', 'inventory_manager', 'salesperson', 'custom'].includes(role)) {
      return NextResponse.json(
        { error: 'Vai trò không hợp lệ' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Email không hợp lệ' },
        { status: 400 }
      );
    }

    // Verify admin has access to all specified stores
    if (storeIds && storeIds.length > 0) {
      for (const storeId of storeIds) {
        const hasAccess = await verifyStoreAccess(authResult.user.userId, storeId);
        if (!hasAccess) {
          return NextResponse.json(
            { error: `Bạn không có quyền gán người dùng vào cửa hàng ${storeId}` },
            { status: 403 }
          );
        }
      }
    }

    // Create the user
    const user = await userRepository.create({
      email: email.trim(),
      password,
      displayName: displayName?.trim() || undefined,
      role,
      permissions: permissions || undefined,
      storeIds: storeIds || [],
    });

    // Get user with stores
    const userWithStores = await userRepository.findByIdWithStores(user.id);

    return NextResponse.json({
      success: true,
      user: userWithStores,
    }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tạo người dùng';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
