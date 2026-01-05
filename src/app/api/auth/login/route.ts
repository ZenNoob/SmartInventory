import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  role: string;
  permissions: string | null;
  status: string;
  failed_login_attempts: number;
  locked_until: Date | null;
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

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await queryOne<UserRecord>(
      `SELECT id, email, password_hash, display_name, role, permissions, 
              status, failed_login_attempts, locked_until
       FROM Users WHERE email = @email`,
      { email: email.toLowerCase() }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.locked_until).getTime() - Date.now()) / 60000
      );
      return NextResponse.json(
        { error: `Tài khoản bị khóa. Vui lòng thử lại sau ${remainingMinutes} phút` },
        { status: 423 }
      );
    }

    // Check if account is inactive
    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Tài khoản đã bị vô hiệu hóa' },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      // Increment failed login attempts
      const newFailedAttempts = user.failed_login_attempts + 1;
      
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        // Lock account
        const lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
        await query(
          `UPDATE Users 
           SET failed_login_attempts = @attempts, locked_until = @lockUntil
           WHERE id = @userId`,
          { attempts: newFailedAttempts, lockUntil, userId: user.id }
        );
        return NextResponse.json(
          { error: `Tài khoản bị khóa ${LOCK_DURATION_MINUTES} phút do đăng nhập sai quá nhiều lần` },
          { status: 423 }
        );
      } else {
        await query(
          `UPDATE Users SET failed_login_attempts = @attempts WHERE id = @userId`,
          { attempts: newFailedAttempts, userId: user.id }
        );
        const remainingAttempts = MAX_FAILED_ATTEMPTS - newFailedAttempts;
        return NextResponse.json(
          { error: `Email hoặc mật khẩu không đúng. Còn ${remainingAttempts} lần thử` },
          { status: 401 }
        );
      }
    }

    // Reset failed login attempts on successful login
    await query(
      `UPDATE Users 
       SET failed_login_attempts = 0, locked_until = NULL 
       WHERE id = @userId`,
      { userId: user.id }
    );

    // Get user's stores
    const stores = await query<StoreRecord>(
      `SELECT s.id, s.owner_id, s.name, s.slug, s.description, s.logo_url, 
              s.domain, s.settings, s.status
       FROM Stores s
       INNER JOIN UserStores us ON s.id = us.store_id
       WHERE us.user_id = @userId AND s.status = 'active'`,
      { userId: user.id }
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

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      displayName: user.display_name || undefined,
      role: user.role,
      permissions,
    });

    // Calculate token expiration (24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store session in database
    const sessionId = uuidv4();
    await query(
      `INSERT INTO Sessions (id, user_id, token, expires_at, created_at)
       VALUES (@id, @userId, @token, @expiresAt, GETDATE())`,
      { id: sessionId, userId: user.id, token, expiresAt }
    );

    // Format stores for response
    const formattedStores = stores.map(store => ({
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

    // Create response with httpOnly cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        permissions,
        stores: formattedStores,
      },
      token,
    });

    // Set httpOnly cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi đăng nhập' },
      { status: 500 }
    );
  }
}
