import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { supplierRepository } from '@/lib/repositories/supplier-repository';

interface RouteParams {
  params: Promise<{ supplierId: string }>;
}

/**
 * GET /api/suppliers/[supplierId] - Get a specific supplier
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

    const { supplierId } = await params;
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

    const supplier = await supplierRepository.findById(supplierId, storeId);

    if (!supplier) {
      return NextResponse.json(
        { error: 'Không tìm thấy nhà cung cấp' },
        { status: 404 }
      );
    }

    // Check if we should include debt information
    const url = new URL(request.url);
    const includeDebt = url.searchParams.get('includeDebt') === 'true';

    let response: Record<string, unknown> = { success: true, supplier };

    if (includeDebt) {
      const debtInfo = await supplierRepository.getDebtInfo(supplierId, storeId);
      response.debtInfo = debtInfo;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get supplier error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin nhà cung cấp' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/suppliers/[supplierId] - Update a supplier
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

    const { supplierId } = await params;
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

    // Check if supplier exists
    const existingSupplier = await supplierRepository.findById(supplierId, storeId);
    if (!existingSupplier) {
      return NextResponse.json(
        { error: 'Không tìm thấy nhà cung cấp' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, contactPerson, email, phone, address, taxCode, notes } = body;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'Tên nhà cung cấp không hợp lệ' },
          { status: 400 }
        );
      }

      // Check if new name already exists (excluding current supplier)
      const nameExists = await supplierRepository.nameExists(name.trim(), storeId, supplierId);
      if (nameExists) {
        return NextResponse.json(
          { error: 'Tên nhà cung cấp đã tồn tại' },
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

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson?.trim() || undefined;
    if (email !== undefined) updateData.email = email?.trim() || undefined;
    if (phone !== undefined) updateData.phone = phone?.trim() || undefined;
    if (address !== undefined) updateData.address = address?.trim() || undefined;
    if (taxCode !== undefined) updateData.taxCode = taxCode?.trim() || undefined;
    if (notes !== undefined) updateData.notes = notes?.trim() || undefined;

    const updatedSupplier = await supplierRepository.update(supplierId, updateData, storeId);

    return NextResponse.json({
      success: true,
      supplier: updatedSupplier,
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi cập nhật nhà cung cấp' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/suppliers/[supplierId] - Delete a supplier
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

    const { supplierId } = await params;
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

    // Check if supplier exists
    const existingSupplier = await supplierRepository.findById(supplierId, storeId);
    if (!existingSupplier) {
      return NextResponse.json(
        { error: 'Không tìm thấy nhà cung cấp' },
        { status: 404 }
      );
    }

    // Check if supplier is in use by any purchase orders
    const isInUse = await supplierRepository.isInUse(supplierId, storeId);
    if (isInUse) {
      return NextResponse.json(
        { error: 'Không thể xóa nhà cung cấp đã có đơn nhập hàng' },
        { status: 400 }
      );
    }

    await supplierRepository.delete(supplierId, storeId);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa nhà cung cấp thành công',
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xóa nhà cung cấp' },
      { status: 500 }
    );
  }
}
