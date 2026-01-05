import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { customerRepository } from '@/lib/repositories/customer-repository';

/**
 * GET /api/customers - Get all customers for a store
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

    const storeId = getStoreIdFromRequest(request);
    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this store
    const hasAccess = await verifyStoreAccess(authResult.user.userId, storeId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Bạn không có quyền truy cập cửa hàng này' },
        { status: 403 }
      );
    }

    // Check if we should include debt information
    const url = new URL(request.url);
    const includeDebt = url.searchParams.get('includeDebt') === 'true';
    const status = url.searchParams.get('status');

    let customers;
    if (includeDebt) {
      customers = await customerRepository.findAllWithDebt(storeId);
    } else {
      customers = await customerRepository.findAll(storeId);
    }

    return NextResponse.json({
      success: true,
      customers,
      data: customers,
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách khách hàng' },
      { status: 500 }
    );
  }
}


/**
 * POST /api/customers - Create a new customer
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

    const storeId = getStoreIdFromRequest(request);
    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this store
    const hasAccess = await verifyStoreAccess(authResult.user.userId, storeId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Bạn không có quyền truy cập cửa hàng này' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      address,
      customerType,
      customerGroup,
      gender,
      birthday,
      zalo,
      bankName,
      bankAccountNumber,
      bankBranch,
      creditLimit,
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Tên khách hàng là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && typeof email === 'string' && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { error: 'Email không hợp lệ' },
          { status: 400 }
        );
      }
    }

    // Check if phone already exists (if provided)
    if (phone && phone.trim() !== '') {
      const phoneExists = await customerRepository.phoneExists(phone.trim(), storeId);
      if (phoneExists) {
        return NextResponse.json(
          { error: 'Số điện thoại đã được sử dụng bởi khách hàng khác' },
          { status: 400 }
        );
      }
    }

    // Create the customer
    const customer = await customerRepository.create(
      {
        name: name.trim(),
        email: email?.trim() || undefined,
        phone: phone?.trim() || undefined,
        address: address?.trim() || undefined,
      },
      storeId
    );

    return NextResponse.json({
      success: true,
      customer,
    }, { status: 201 });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo khách hàng' },
      { status: 500 }
    );
  }
}
