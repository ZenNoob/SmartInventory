import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (token) {
      // Invalidate session in database
      await query(
        `DELETE FROM Sessions WHERE Token = @token`,
        { token }
      );
    }

    // Create response and clear cookie
    const response = NextResponse.json({
      success: true,
      message: 'Đăng xuất thành công',
    });

    // Clear the auth cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi đăng xuất' },
      { status: 500 }
    );
  }
}
