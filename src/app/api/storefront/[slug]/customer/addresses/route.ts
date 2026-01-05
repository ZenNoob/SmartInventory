import { NextRequest, NextResponse } from 'next/server';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { onlineCustomerRepository } from '@/lib/repositories/online-customer-repository';
import { authenticateCustomer } from '@/lib/auth/customer-auth';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/storefront/[slug]/customer/addresses - Get customer addresses
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Authenticate customer
    const authResult = await authenticateCustomer(request);
    if (!authResult.success || !authResult.customer) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    // Verify customer belongs to this store
    if (authResult.customer.onlineStoreId !== onlineStore.id) {
      return NextResponse.json(
        { error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    // Get customer addresses
    const addresses = await onlineCustomerRepository.getAddresses(authResult.customer.customerId);

    return NextResponse.json({
      success: true,
      addresses,
    });
  } catch (error) {
    console.error('Get customer addresses error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách địa chỉ' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/storefront/[slug]/customer/addresses - Create new address
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

    // Authenticate customer
    const authResult = await authenticateCustomer(request);
    if (!authResult.success || !authResult.customer) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    // Verify customer belongs to this store
    if (authResult.customer.onlineStoreId !== onlineStore.id) {
      return NextResponse.json(
        { error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { label, fullName, phone, province, district, ward, addressLine, isDefault } = body;

    // Validate required fields
    if (!label || !fullName || !phone || !province || !district || !ward || !addressLine) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ thông tin địa chỉ' },
        { status: 400 }
      );
    }

    // Create address
    const address = await onlineCustomerRepository.createAddress({
      customerId: authResult.customer.customerId,
      label,
      fullName,
      phone,
      province,
      district,
      ward,
      addressLine,
      isDefault: isDefault ?? false,
    });

    return NextResponse.json({
      success: true,
      address,
    }, { status: 201 });
  } catch (error) {
    console.error('Create customer address error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo địa chỉ' },
      { status: 500 }
    );
  }
}
