import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { onlineOrderRepository, OrderStatus, PaymentStatus } from '@/lib/repositories/online-order-repository';
import { orderStatusService, InvalidStatusTransitionError, OrderNotFoundError } from '@/lib/services/order-status-service';
import { emailNotificationService } from '@/lib/services/email-notification-service';

interface RouteParams {
  params: Promise<{ onlineStoreId: string; orderId: string }>;
}

/**
 * GET /api/online-stores/[onlineStoreId]/orders/[orderId] - Get order details with items
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

    const { onlineStoreId, orderId } = await params;
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

    // Verify online store exists
    const onlineStore = await onlineStoreRepository.findById(onlineStoreId, storeId);
    if (!onlineStore) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng online' },
        { status: 404 }
      );
    }

    const order = await onlineOrderRepository.getOrderWithItems(orderId, onlineStoreId);
    if (!order) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Get online order error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin đơn hàng' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/online-stores/[onlineStoreId]/orders/[orderId] - Update order status
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

    const { onlineStoreId, orderId } = await params;
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

    // Verify online store exists
    const onlineStore = await onlineStoreRepository.findById(onlineStoreId, storeId);
    if (!onlineStore) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng online' },
        { status: 404 }
      );
    }

    // Check if order exists
    const existingOrder = await onlineOrderRepository.findById(orderId, onlineStoreId);
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      status,
      paymentStatus,
      trackingNumber,
      carrier,
      estimatedDelivery,
      internalNote,
    } = body;

    let updatedOrder = existingOrder;

    // Update order status if provided
    if (status !== undefined) {
      const validStatuses: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Trạng thái đơn hàng không hợp lệ' },
          { status: 400 }
        );
      }

      try {
        // Use order status service for status transitions with inventory handling
        const result = await orderStatusService.updateStatus(
          orderId, 
          status, 
          onlineStoreId,
          {
            internalNote,
            trackingNumber,
            carrier,
            estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
          }
        );
        updatedOrder = result.order;

        // Send status update notification to customer (non-blocking)
        const orderWithItemsForEmail = await onlineOrderRepository.getOrderWithItems(orderId, onlineStoreId);
        if (orderWithItemsForEmail) {
          emailNotificationService.sendStatusUpdateNotification({
            order: orderWithItemsForEmail,
            store: onlineStore,
            previousStatus: result.previousStatus,
            newStatus: result.newStatus,
          }).catch(err => console.error('Failed to send status update email:', err));
        }
      } catch (error) {
        if (error instanceof InvalidStatusTransitionError) {
          return NextResponse.json(
            { error: `Không thể chuyển trạng thái đơn hàng từ '${error.currentStatus}' sang '${error.targetStatus}'` },
            { status: 400 }
          );
        }
        if (error instanceof OrderNotFoundError) {
          return NextResponse.json(
            { error: 'Không tìm thấy đơn hàng' },
            { status: 404 }
          );
        }
        throw error;
      }
    }

    // Update payment status if provided
    if (paymentStatus !== undefined) {
      const validPaymentStatuses: PaymentStatus[] = ['pending', 'paid', 'refunded', 'failed'];
      if (!validPaymentStatuses.includes(paymentStatus)) {
        return NextResponse.json(
          { error: 'Trạng thái thanh toán không hợp lệ' },
          { status: 400 }
        );
      }

      updatedOrder = await onlineOrderRepository.updatePaymentStatus(orderId, paymentStatus, onlineStoreId);
    }

    // Update shipping info if provided
    if (trackingNumber !== undefined || carrier !== undefined || estimatedDelivery !== undefined) {
      updatedOrder = await onlineOrderRepository.updateShippingInfo(
        orderId,
        onlineStoreId,
        trackingNumber,
        carrier,
        estimatedDelivery ? new Date(estimatedDelivery) : undefined
      );
    }

    // Update internal note if provided
    if (internalNote !== undefined) {
      updatedOrder = await onlineOrderRepository.addInternalNote(orderId, internalNote, onlineStoreId);
    }

    // Get updated order with items
    const orderWithItems = await onlineOrderRepository.getOrderWithItems(orderId, onlineStoreId);

    return NextResponse.json({
      success: true,
      order: orderWithItems,
    });
  } catch (error) {
    console.error('Update online order error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi cập nhật đơn hàng' },
      { status: 500 }
    );
  }
}
