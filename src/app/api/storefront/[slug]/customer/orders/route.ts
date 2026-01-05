import { NextRequest, NextResponse } from 'next/server';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { onlineOrderRepository } from '@/lib/repositories/online-order-repository';
import { authenticateCustomer } from '@/lib/auth/customer-auth';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/storefront/[slug]/customer/orders - Get customer order history
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

    // Get customer orders
    const orders = await onlineOrderRepository.findByCustomer(
      authResult.customer.customerId,
      onlineStore.id
    );

    // Map to customer-friendly format
    const customerOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      discountAmount: order.discountAmount,
      total: order.total,
      createdAt: order.createdAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
    }));

    return NextResponse.json({
      success: true,
      orders: customerOrders,
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy lịch sử đơn hàng' },
      { status: 500 }
    );
  }
}
