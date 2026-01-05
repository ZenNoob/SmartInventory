import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, verifyPassword } from '@/lib/auth';
import { query } from '@/lib/db';

interface UserRecord {
  Id: string;
  PasswordHash: string;
}

/**
 * POST /api/auth/verify-password - Verify user's password for re-authentication
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

    const { userId } = authResult.user;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập mật khẩu' },
        { status: 400 }
      );
    }

    // Get user's password hash from database
    const users = await query<UserRecord>(
      `SELECT Id, PasswordHash FROM Users WHERE Id = @userId`,
      { userId }
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy người dùng' },
        { status: 404 }
      );
    }

    const user = users[0];

    // Verify password
    const isValid = await verifyPassword(password, user.PasswordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Xác thực thành công',
    });
  } catch (error) {
    console.error('Verify password error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xác thực' },
      { status: 500 }
    );
  }
}
