import { NextRequest, NextResponse } from 'next/server';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { onlineProductRepository } from '@/lib/repositories/online-product-repository';
import { shoppingCartRepository } from '@/lib/repositories/shopping-cart-repository';
import { type PaymentMethod, type ShippingAddress } from '@/lib/repositories/online-order-repository';
import { shippingZoneRepository } from '@/lib/repositories/shipping-zone-repository';
import { orderProcessingService, InsufficientStockError } from '@/lib/services/order-processing-service';
import { emailNotificationService } from '@/lib/services/email-notification-service';
import { cookies } from 'next/headers';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

const CART_SESSION_COOKIE = 'cart_session_id';

/**
 * Get session ID from cookie
 */
async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CART_SESSION_COOKIE)?.value || null;
}

/**
 * POST /api/storefront/[slug]/checkout - Create order from cart
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const sessionId = await getSessionId();
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Giỏ hàng không tồn tại' },
        { status: 400 }
      );
    }

    // Get cart with items
    const cart = await shoppingCartRepository.findBySessionId(sessionId, onlineStore.id);
    if (!cart) {
      return NextResponse.json(
        { error: 'Giỏ hàng không tồn tại' },
        { status: 400 }
      );
    }

    const cartWithItems = await shoppingCartRepository.getCartWithItems(cart.id, onlineStore.id);
    if (!cartWithItems || cartWithItems.items.length === 0) {
      return NextResponse.json(
        { error: 'Giỏ hàng trống' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      customerEmail,
      customerName,
      customerPhone,
      shippingAddress,
      paymentMethod,
      customerNote,
    } = body;

    // Validate required fields
    if (!customerEmail || !customerName || !customerPhone) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ thông tin khách hàng' },
        { status: 400 }
      );
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone ||
        !shippingAddress.province || !shippingAddress.district || 
        !shippingAddress.ward || !shippingAddress.addressLine) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ địa chỉ giao hàng' },
        { status: 400 }
      );
    }

    const validPaymentMethods: PaymentMethod[] = ['cod', 'bank_transfer', 'momo', 'vnpay', 'zalopay'];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Phương thức thanh toán không hợp lệ' },
        { status: 400 }
      );
    }

    // Validate stock availability for all items
    const productDetails = await onlineProductRepository.findAllWithDetails(onlineStore.id);
    
    // Prepare order items
    const orderItems = cartWithItems.items.map(item => {
      const product = productDetails.find(p => p.id === item.onlineProductId);
      return {
        onlineProductId: item.onlineProductId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      };
    });

    // Check stock availability using the order processing service
    const insufficientItems = await orderProcessingService.checkStockAvailability(
      onlineStore.id,
      orderItems
    );

    if (insufficientItems.length > 0) {
      return NextResponse.json(
        { 
          error: 'Một số sản phẩm không đủ số lượng trong kho',
          unavailableItems: insufficientItems.map(item => 
            `${item.productName} (còn ${item.available}, cần ${item.requested})`
          ),
        },
        { status: 400 }
      );
    }

    // Calculate shipping fee
    const shippingResult = await shippingZoneRepository.calculateShippingFee(
      shippingAddress.province,
      cartWithItems.subtotal,
      onlineStore.id
    );

    const shippingFee = shippingResult?.fee ?? 0;

    // Calculate total
    const total = cartWithItems.subtotal - cartWithItems.discountAmount + shippingFee;

    // Create order with inventory deduction in a single transaction
    const order = await orderProcessingService.createOrderWithInventoryDeduction({
      onlineStoreId: onlineStore.id,
      customerEmail,
      customerName,
      customerPhone,
      shippingAddress: shippingAddress as ShippingAddress,
      shippingFee,
      subtotal: cartWithItems.subtotal,
      discountAmount: cartWithItems.discountAmount,
      total,
      paymentMethod,
      customerNote,
      items: orderItems,
    });

    // Clear the cart after successful order
    await shoppingCartRepository.deleteCart(cart.id, onlineStore.id);

    // Send email notifications (non-blocking)
    // Order confirmation to customer
    emailNotificationService.sendOrderConfirmation({
      order,
      store: onlineStore,
    }).catch(err => console.error('Failed to send order confirmation email:', err));

    // New order alert to store owner
    emailNotificationService.sendNewOrderAlert({
      order,
      store: onlineStore,
    }).catch(err => console.error('Failed to send new order alert email:', err));

    // Clear session cookie
    const response = NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      },
      message: 'Đặt hàng thành công',
    });

    response.cookies.delete(CART_SESSION_COOKIE);

    return response;
  } catch (error) {
    console.error('Checkout error:', error);
    
    // Handle insufficient stock error
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        { 
          error: 'Một số sản phẩm không đủ số lượng trong kho',
          unavailableItems: error.items.map(item => 
            `${item.productName} (còn ${item.available}, cần ${item.requested})`
          ),
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi đặt hàng' },
      { status: 500 }
    );
  }
}
