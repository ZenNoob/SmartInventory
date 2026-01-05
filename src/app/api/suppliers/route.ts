import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { supplierRepository } from '@/lib/repositories/supplier-repository';

/**
 * GET /api/suppliers - Get all suppliers for a store
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

    let suppliers;
    if (includeDebt) {
      suppliers = await supplierRepository.findAllWithDebt(storeId);
    } else {
      suppliers = await supplierRepository.findAll(storeId, { orderBy: 'name', orderDirection: 'ASC' });
    }

    return NextResponse.json({
      success: true,
      suppliers,
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách nhà cung cấp' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/suppliers - Create a new supplier
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
    const { name, contactPerson, email, phone, address, taxCode, notes } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Tên nhà cung cấp là bắt buộc' },
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

    // Check if supplier name already exists
    const nameExists = await supplierRepository.nameExists(name.trim(), storeId);
    if (nameExists) {
      return NextResponse.json(
        { error: 'Tên nhà cung cấp đã tồn tại' },
        { status: 400 }
      );
    }

    // Create the supplier
    const supplier = await supplierRepository.create(
      {
        name: name.trim(),
        contactPerson: contactPerson?.trim() || undefined,
        email: email?.trim() || undefined,
        phone: phone?.trim() || undefined,
        address: address?.trim() || undefined,
        taxCode: taxCode?.trim() || undefined,
        notes: notes?.trim() || undefined,
      },
      storeId
    );

    return NextResponse.json({
      success: true,
      supplier,
    }, { status: 201 });
  } catch (error) {
    console.error('Create supplier error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo nhà cung cấp' },
      { status: 500 }
    );
  }
}
