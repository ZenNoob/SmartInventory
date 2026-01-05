import { NextRequest, NextResponse } from 'next/server';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { onlineCustomerRepository } from '@/lib/repositories/online-customer-repository';
import bcrypt from 'bcryptjs';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/storefront/[slug]/auth/register - Customer registration
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
    const { email, password, firstName, lastName, phone } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email không hợp lệ' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingCustomer = await onlineCustomerRepository.findByEmail(email, onlineStore.id);
    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Email đã được sử dụng' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create customer
    const customer = await onlineCustomerRepository.create({
      onlineStoreId: onlineStore.id,
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
      },
      message: 'Đăng ký thành công',
    }, { status: 201 });
  } catch (error) {
    console.error('Customer registration error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi đăng ký' },
      { status: 500 }
    );
  }
}
