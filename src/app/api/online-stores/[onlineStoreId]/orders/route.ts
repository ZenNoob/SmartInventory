import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { onlineOrderRepository, OrderStatus, PaymentStatus } from '@/lib/repositories/online-order-repository';

interface RouteParams {
  params: Promise<{ onlineStoreId: string }>;
}

/**
 * GET /api/online-stores/[onlineStoreId]/orders - List orders with filters
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

    const { onlineStoreId } = await params;
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

    // Verify online store exists and belongs to this store
    const onlineStore = await onlineStoreRepository.findById(onlineStoreId, storeId);
    if (!onlineStore) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng online' },
        { status: 404 }
      );
    }

    // Parse query parameters for filters
    const url = new URL(request.url);
    const status = url.searchParams.get('status') as OrderStatus | null;
    const paymentStatus = url.searchParams.get('paymentStatus') as PaymentStatus | null;
    const customerId = url.searchParams.get('customerId') || undefined;
    const searchTerm = url.searchParams.get('search') || undefined;
    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');

    const filters: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      customerId?: string;
      searchTerm?: string;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (status) filters.status = status;
    if (paymentStatus) filters.paymentStatus = paymentStatus;
    if (customerId) filters.customerId = customerId;
    if (searchTerm) filters.searchTerm = searchTerm;
    if (startDateStr) filters.startDate = new Date(startDateStr);
    if (endDateStr) filters.endDate = new Date(endDateStr);

    const orders = await onlineOrderRepository.findByStore(onlineStoreId, filters);

    // Get order statistics
    const statusCounts = await onlineOrderRepository.countByStatus(onlineStoreId);

    return NextResponse.json({
      success: true,
      orders,
      data: orders,
      statistics: {
        statusCounts,
        total: orders.length,
      },
    });
  } catch (error) {
    console.error('Get online orders error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách đơn hàng' },
      { status: 500 }
    );
  }
}
