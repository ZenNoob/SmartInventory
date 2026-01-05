import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { customerRepository } from '@/lib/repositories/customer-repository';

interface RouteParams {
  params: Promise<{ customerId: string }>;
}

/**
 * GET /api/customers/[customerId] - Get a specific customer
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

    const { customerId } = await params;
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

    const customer = await customerRepository.findById(customerId, storeId);

    if (!customer) {
      return NextResponse.json(
        { error: 'Không tìm thấy khách hàng' },
        { status: 404 }
      );
    }

    // Check if we should include debt information
    const url = new URL(request.url);
    const includeDebt = url.searchParams.get('includeDebt') === 'true';
    const includeLoyalty = url.searchParams.get('includeLoyalty') === 'true';

    const response: Record<string, unknown> = { success: true, customer };

    if (includeDebt) {
      const debtInfo = await customerRepository.getDebtInfo(customerId, storeId);
      response.debtInfo = debtInfo;
    }

    if (includeLoyalty) {
      const loyaltyInfo = await customerRepository.getLoyaltyInfo(customerId, storeId);
      response.loyaltyInfo = loyaltyInfo;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get customer error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin khách hàng' },
      { status: 500 }
    );
  }
}


/**
 * PUT /api/customers/[customerId] - Update a customer
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

    const { customerId } = await params;
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

    // Check if customer exists
    const existingCustomer = await customerRepository.findById(customerId, storeId);
    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Không tìm thấy khách hàng' },
        { status: 404 }
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
      status,
      loyaltyPoints,
      lifetimePoints,
    } = body;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'Tên khách hàng không hợp lệ' },
          { status: 400 }
        );
      }
    }

    // Validate email format if provided
    if (email !== undefined && email !== null && email !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { error: 'Email không hợp lệ' },
          { status: 400 }
        );
      }
    }

    // Check if phone already exists (excluding current customer)
    if (phone !== undefined && phone !== null && phone !== '') {
      const phoneExists = await customerRepository.phoneExists(phone.trim(), storeId, customerId);
      if (phoneExists) {
        return NextResponse.json(
          { error: 'Số điện thoại đã được sử dụng bởi khách hàng khác' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email?.trim() || undefined;
    if (phone !== undefined) updateData.phone = phone?.trim() || undefined;
    if (address !== undefined) updateData.address = address?.trim() || undefined;
    if (customerType !== undefined) updateData.customerType = customerType;
    if (customerGroup !== undefined) updateData.customerGroup = customerGroup?.trim() || undefined;
    if (gender !== undefined) updateData.gender = gender || undefined;
    if (birthday !== undefined) updateData.birthday = birthday || undefined;
    if (zalo !== undefined) updateData.zalo = zalo?.trim() || undefined;
    if (bankName !== undefined) updateData.bankName = bankName?.trim() || undefined;
    if (bankAccountNumber !== undefined) updateData.bankAccountNumber = bankAccountNumber?.trim() || undefined;
    if (bankBranch !== undefined) updateData.bankBranch = bankBranch?.trim() || undefined;
    if (creditLimit !== undefined) updateData.creditLimit = creditLimit;
    if (status !== undefined) updateData.status = status;
    if (loyaltyPoints !== undefined) updateData.loyaltyPoints = loyaltyPoints;
    if (lifetimePoints !== undefined) {
      updateData.lifetimePoints = lifetimePoints;
      // Recalculate tier when lifetime points change
      updateData.loyaltyTier = customerRepository.calculateTier(lifetimePoints);
    }

    const updatedCustomer = await customerRepository.update(customerId, updateData, storeId);

    return NextResponse.json({
      success: true,
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi cập nhật khách hàng' },
      { status: 500 }
    );
  }
}


/**
 * DELETE /api/customers/[customerId] - Delete a customer
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

    const { customerId } = await params;
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

    // Check if customer exists
    const existingCustomer = await customerRepository.findById(customerId, storeId);
    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Không tìm thấy khách hàng' },
        { status: 404 }
      );
    }

    // Check if customer is in use by any sales
    const isInUse = await customerRepository.isInUse(customerId, storeId);
    if (isInUse) {
      return NextResponse.json(
        { error: 'Không thể xóa khách hàng đã có giao dịch bán hàng' },
        { status: 400 }
      );
    }

    // Check if customer has outstanding debt
    if (existingCustomer.currentDebt > 0) {
      return NextResponse.json(
        { error: 'Không thể xóa khách hàng còn nợ' },
        { status: 400 }
      );
    }

    await customerRepository.delete(customerId, storeId);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa khách hàng thành công',
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xóa khách hàng' },
      { status: 500 }
    );
  }
}
