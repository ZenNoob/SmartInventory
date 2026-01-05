import { NextRequest, NextResponse } from 'next/server';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { onlineCustomerRepository } from '@/lib/repositories/online-customer-repository';
import { shoppingCartRepository } from '@/lib/repositories/shopping-cart-repository';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

const CUSTOMER_AUTH_COOKIE = 'customer_token';
const CART_SESSION_COOKIE = 'cart_session_id';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

/**
 * POST /api/storefront/[slug]/auth/login - Customer login
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // Find online store by slug
    const onlineStore = await onlineStoreRepository.findBySlug(slug);
    if (!onlineStore) {
      return NextResponse.json(
        { error: 'Cửa hàng không tồn tại hoặc đang tạm ngưng hoạt động' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập email và mật khẩu' },
        { status: 400 }
      );
    }

    // Find customer by email
    const customer = await onlineCustomerRepository.findByEmail(email, onlineStore.id);
    if (!customer) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Check if account is active
    if (!customer.isActive) {
      return NextResponse.json(
        { error: 'Tài khoản đã bị vô hiệu hóa' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, customer.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Update last login
    await onlineCustomerRepository.updateLastLogin(customer.id, onlineStore.id);

    // Generate JWT token
    const token = await new SignJWT({
      customerId: customer.id,
      onlineStoreId: onlineStore.id,
      email: customer.email,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Merge guest cart with customer cart if exists
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(CART_SESSION_COOKIE)?.value;
    if (sessionId) {
      await shoppingCartRepository.mergeCart(sessionId, customer.id, onlineStore.id);
    }

    const response = NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
      },
      message: 'Đăng nhập thành công',
    });

    // Set auth cookie
    response.cookies.set(CUSTOMER_AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Clear session cookie after merge
    response.cookies.delete(CART_SESSION_COOKIE);

    return response;
  } catch (error) {
    console.error('Customer login error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi đăng nhập' },
      { status: 500 }
    );
  }
}
