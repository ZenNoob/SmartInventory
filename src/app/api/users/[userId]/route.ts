import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { userRepository } from '@/lib/repositories/user-repository';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/users/[userId] - Get a specific user
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

    const { userId } = await params;

    // Users can view their own profile, admins can view any user
    if (authResult.user.userId !== userId && authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Bạn không có quyền xem thông tin người dùng này' },
        { status: 403 }
      );
    }

    const user = await userRepository.findByIdWithStores(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'Không tìm thấy người dùng' },
        { status: 404 }
      );
    }

    // If admin is viewing, check store access
    if (authResult.user.role === 'admin' && authResult.user.userId !== userId) {
      const storeId = getStoreIdFromRequest(request);
      if (storeId) {
        const hasAccess = await userRepository.hasStoreAccess(userId, storeId);
        if (!hasAccess) {
          return NextResponse.json(
            { error: 'Người dùng không thuộc cửa hàng này' },
            { status: 404 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin người dùng' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/[userId] - Update a user
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

    const { userId } = await params;

    // Users can update their own profile (limited), admins can update any user
    const isSelf = authResult.user.userId === userId;
    const isAdmin = authResult.user.role === 'admin';

    if (!isSelf && !isAdmin) {
      return NextResponse.json(
        { error: 'Bạn không có quyền cập nhật người dùng này' },
        { status: 403 }
      );
    }

    // Check if user exists
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Không tìm thấy người dùng' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      email,
      password,
      displayName,
      role,
      permissions,
      status,
      storeIds,
    } = body;

    // Non-admin users can only update limited fields
    if (!isAdmin) {
      if (role !== undefined || permissions !== undefined || status !== undefined || storeIds !== undefined) {
        return NextResponse.json(
          { error: 'Bạn không có quyền thay đổi vai trò, quyền hạn hoặc trạng thái' },
          { status: 403 }
        );
      }
    }

    // Validate email if provided
    if (email !== undefined) {
      if (typeof email !== 'string' || email.trim() === '') {
        return NextResponse.json(
          { error: 'Email không hợp lệ' },
          { status: 400 }
        );
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { error: 'Email không hợp lệ' },
          { status: 400 }
        );
      }
    }

    // Validate password if provided
    if (password !== undefined && password !== '') {
      if (typeof password !== 'string' || password.length < 6) {
        return NextResponse.json(
          { error: 'Mật khẩu phải có ít nhất 6 ký tự' },
          { status: 400 }
        );
      }
    }

    // Validate role if provided
    if (role !== undefined) {
      if (!['admin', 'accountant', 'inventory_manager', 'salesperson', 'custom'].includes(role)) {
        return NextResponse.json(
          { error: 'Vai trò không hợp lệ' },
          { status: 400 }
        );
      }
    }

    // Verify admin has access to all specified stores
    if (storeIds !== undefined && storeIds.length > 0) {
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

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (email !== undefined) updateData.email = email.trim();
    if (password !== undefined && password !== '') updateData.password = password;
    if (displayName !== undefined) updateData.displayName = displayName?.trim() || undefined;
    if (role !== undefined) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (status !== undefined) updateData.status = status;
    if (storeIds !== undefined) updateData.storeIds = storeIds;

    const updatedUser = await userRepository.update(userId, updateData);

    // Get user with stores
    const userWithStores = await userRepository.findByIdWithStores(updatedUser.id);

    return NextResponse.json({
      success: true,
      user: userWithStores,
    });
  } catch (error) {
    console.error('Update user error:', error);
    const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật người dùng';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[userId] - Delete a user
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

    // Only admin can delete users
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Chỉ quản trị viên mới có quyền xóa người dùng' },
        { status: 403 }
      );
    }

    const { userId } = await params;

    // Prevent self-deletion
    if (authResult.user.userId === userId) {
      return NextResponse.json(
        { error: 'Bạn không thể xóa tài khoản của chính mình' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Không tìm thấy người dùng' },
        { status: 404 }
      );
    }

    await userRepository.delete(userId);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa người dùng thành công',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xóa người dùng';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
