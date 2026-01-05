import { NextRequest, NextResponse } from 'next/server';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { onlineCustomerRepository } from '@/lib/repositories/online-customer-repository';
import { authenticateCustomer } from '@/lib/auth/customer-auth';

interface RouteParams {
  params: Promise<{ slug: string; addressId: string }>;
}

/**
 * GET /api/storefront/[slug]/customer/addresses/[addressId] - Get address by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug, addressId } = await params;

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

    // Get address
    const address = await onlineCustomerRepository.getAddressById(
      addressId,
      authResult.customer.customerId
    );

    if (!address) {
      return NextResponse.json(
        { error: 'Địa chỉ không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      address,
    });
  } catch (error) {
    console.error('Get customer address error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin địa chỉ' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/storefront/[slug]/customer/addresses/[addressId] - Update address
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug, addressId } = await params;

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

    // Check if address exists
    const existingAddress = await onlineCustomerRepository.getAddressById(
      addressId,
      authResult.customer.customerId
    );

    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Địa chỉ không tồn tại' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { label, fullName, phone, province, district, ward, addressLine, isDefault } = body;

    // Update address
    const address = await onlineCustomerRepository.updateAddress(
      addressId,
      authResult.customer.customerId,
      {
        label,
        fullName,
        phone,
        province,
        district,
        ward,
        addressLine,
        isDefault,
      }
    );

    return NextResponse.json({
      success: true,
      address,
    });
  } catch (error) {
    console.error('Update customer address error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi cập nhật địa chỉ' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storefront/[slug]/customer/addresses/[addressId] - Delete address
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug, addressId } = await params;

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

    // Check if address exists
    const existingAddress = await onlineCustomerRepository.getAddressById(
      addressId,
      authResult.customer.customerId
    );

    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Địa chỉ không tồn tại' },
        { status: 404 }
      );
    }

    // Delete address
    await onlineCustomerRepository.deleteAddress(addressId, authResult.customer.customerId);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa địa chỉ',
    });
  } catch (error) {
    console.error('Delete customer address error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xóa địa chỉ' },
      { status: 500 }
    );
  }
}
