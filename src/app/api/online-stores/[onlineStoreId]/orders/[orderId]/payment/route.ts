import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { onlineOrderRepository } from '@/lib/repositories/online-order-repository';
import { paymentService, PaymentStatusError } from '@/lib/services/payment-service';

interface RouteParams {
  params: Promise<{ onlineStoreId: string; orderId: string }>;
}

/**
 * GET /api/online-stores/[onlineStoreId]/orders/[orderId]/payment
 * Get payment info (bank transfer instructions)
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

    // Get order
    const order = await onlineOrderRepository.findById(orderId, onlineStoreId);
    if (!order) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    // Get bank transfer instructions if applicable
    if (order.paymentMethod === 'bank_transfer') {
      const instructions = await paymentService.getBankTransferInstructions(orderId, onlineStoreId);
      const isExpired = await paymentService.isPaymentExpired(orderId, onlineStoreId);

      return NextResponse.json({
        success: true,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        instructions,
        isExpired,
      });
    }

    // For COD orders
    if (order.paymentMethod === 'cod') {
      return NextResponse.json({
        success: true,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        total: order.total,
        message: 'Thanh toán khi nhận hàng',
      });
    }

    return NextResponse.json({
      success: true,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    });
  } catch (error) {
    console.error('Get payment info error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin thanh toán' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/online-stores/[onlineStoreId]/orders/[orderId]/payment
 * Process payment action (confirm bank transfer, complete COD, etc.)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Get order
    const order = await onlineOrderRepository.findById(orderId, onlineStoreId);
    if (!order) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action, transactionReference, collectedAmount, reason, refundAmount, note } = body;

    try {
      let result;

      switch (action) {
        case 'confirm_bank_transfer':
          if (order.paymentMethod !== 'bank_transfer') {
            return NextResponse.json(
              { error: 'Đơn hàng này không sử dụng phương thức chuyển khoản' },
              { status: 400 }
            );
          }
          result = await paymentService.confirmBankTransfer({
            orderId,
            onlineStoreId,
            transactionReference,
            confirmedBy: authResult.user.email,
            note,
          });
          break;

        case 'complete_cod':
          if (order.paymentMethod !== 'cod') {
            return NextResponse.json(
              { error: 'Đơn hàng này không sử dụng phương thức COD' },
              { status: 400 }
            );
          }
          if (collectedAmount === undefined) {
            return NextResponse.json(
              { error: 'Vui lòng nhập số tiền thu được' },
              { status: 400 }
            );
          }
          result = await paymentService.completeCODPayment({
            orderId,
            onlineStoreId,
            collectedAmount,
            collectedBy: authResult.user.email,
            note,
          });
          break;

        case 'mark_failed':
          result = await paymentService.markPaymentFailed(orderId, onlineStoreId, reason);
          break;

        case 'refund':
          if (refundAmount === undefined) {
            return NextResponse.json(
              { error: 'Vui lòng nhập số tiền hoàn trả' },
              { status: 400 }
            );
          }
          result = await paymentService.processRefund(orderId, onlineStoreId, refundAmount, reason);
          break;

        default:
          return NextResponse.json(
            { error: 'Hành động không hợp lệ' },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        ...result,
      });
    } catch (error) {
      if (error instanceof PaymentStatusError) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Process payment error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xử lý thanh toán' },
      { status: 500 }
    );
  }
}
