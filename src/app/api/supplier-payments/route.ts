import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { supplierPaymentRepository } from '@/lib/repositories/supplier-payment-repository';
import { supplierRepository } from '@/lib/repositories/supplier-repository';

/**
 * GET /api/supplier-payments - Get all supplier payments for a store
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

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const supplierId = url.searchParams.get('supplierId') || undefined;
    const dateFrom = url.searchParams.get('dateFrom') || undefined;
    const dateTo = url.searchParams.get('dateTo') || undefined;
    const orderBy = url.searchParams.get('orderBy') || 'sp.PaymentDate';
    const orderDirection = (url.searchParams.get('orderDirection') || 'DESC') as 'ASC' | 'DESC';

    const result = await supplierPaymentRepository.findAllWithSupplier(storeId, {
      page,
      pageSize,
      supplierId,
      dateFrom,
      dateTo,
      orderBy,
      orderDirection,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Get supplier payments error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách thanh toán nhà cung cấp' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/supplier-payments - Create a new supplier payment
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
    const { supplierId, paymentDate, amount, notes } = body;

    // Validate required fields
    if (!supplierId) {
      return NextResponse.json(
        { error: 'Nhà cung cấp là bắt buộc' },
        { status: 400 }
      );
    }

    if (!paymentDate) {
      return NextResponse.json(
        { error: 'Ngày thanh toán là bắt buộc' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Số tiền thanh toán phải lớn hơn 0' },
        { status: 400 }
      );
    }

    // Verify supplier exists
    const supplier = await supplierRepository.findById(supplierId, storeId);
    if (!supplier) {
      return NextResponse.json(
        { error: 'Nhà cung cấp không tồn tại' },
        { status: 404 }
      );
    }

    // Create supplier payment
    const payment = await supplierPaymentRepository.create(
      {
        supplierId,
        paymentDate,
        amount,
        notes: notes?.trim() || undefined,
        createdBy: authResult.user.userId,
      },
      storeId
    );

    return NextResponse.json({
      success: true,
      payment,
    }, { status: 201 });
  } catch (error) {
    console.error('Create supplier payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tạo thanh toán nhà cung cấp';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
