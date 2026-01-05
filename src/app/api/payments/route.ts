import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { paymentRepository } from '@/lib/repositories/payment-repository';
import { customerRepository } from '@/lib/repositories/customer-repository';

/**
 * GET /api/payments - Get all customer payments for a store
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
    const customerId = url.searchParams.get('customerId') || undefined;
    const dateFrom = url.searchParams.get('dateFrom') || undefined;
    const dateTo = url.searchParams.get('dateTo') || undefined;

    let payments = await paymentRepository.findAll(storeId);

    // Filter by customer
    if (customerId) {
      payments = payments.filter((p) => p.customerId === customerId);
    }

    // Filter by date range
    if (dateFrom) {
      const from = new Date(dateFrom);
      payments = payments.filter((p) => new Date(p.paymentDate) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      payments = payments.filter((p) => new Date(p.paymentDate) <= to);
    }

    return NextResponse.json({
      success: true,
      payments,
      data: payments,
    });
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách thanh toán' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments - Create a new customer payment
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
    const { customerId, paymentDate, amount, notes } = body;

    // Validate required fields
    if (!customerId) {
      return NextResponse.json(
        { error: 'Khách hàng là bắt buộc' },
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

    // Verify customer exists
    const customer = await customerRepository.findById(customerId, storeId);
    if (!customer) {
      return NextResponse.json(
        { error: 'Khách hàng không tồn tại' },
        { status: 404 }
      );
    }

    // Create payment
    const payment = await paymentRepository.create(
      {
        customerId,
        paymentDate,
        amount,
        notes: notes?.trim() || undefined,
      },
      storeId
    );

    return NextResponse.json({
      success: true,
      payment,
    }, { status: 201 });
  } catch (error) {
    console.error('Create payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tạo thanh toán';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
