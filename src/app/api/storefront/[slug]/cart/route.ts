import { NextRequest, NextResponse } from 'next/server';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { onlineProductRepository } from '@/lib/repositories/online-product-repository';
import { shoppingCartRepository } from '@/lib/repositories/shopping-cart-repository';
import { cookies } from 'next/headers';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

const CART_SESSION_COOKIE = 'cart_session_id';

/**
 * Get or create session ID for cart
 */
async function getSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(CART_SESSION_COOKIE)?.value;
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }
  
  return sessionId;
}

/**
 * GET /api/storefront/[slug]/cart - Get current cart
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

    const sessionId = await getSessionId();
    
    // Get or create cart
    const cart = await shoppingCartRepository.getOrCreateCart(onlineStore.id, sessionId);
    const cartWithItems = await shoppingCartRepository.getCartWithItems(cart.id, onlineStore.id);

    const response = NextResponse.json({
      success: true,
      cart: cartWithItems,
    });

    // Set session cookie if new
    response.cookies.set(CART_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Get cart error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy giỏ hàng' },
      { status: 500 }
    );
  }
}


/**
 * POST /api/storefront/[slug]/cart - Add item to cart
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

    const body = await request.json();
    const { productId, quantity = 1 } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID là bắt buộc' },
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: 'Số lượng phải lớn hơn 0' },
        { status: 400 }
      );
    }

    // Find product and verify it's published
    const product = await onlineProductRepository.findById(productId, onlineStore.id);
    if (!product || !product.isPublished) {
      return NextResponse.json(
        { error: 'Sản phẩm không tồn tại hoặc không khả dụng' },
        { status: 404 }
      );
    }

    // Get product details for price
    const productDetails = await onlineProductRepository.findAllWithDetails(onlineStore.id);
    const productWithDetails = productDetails.find(p => p.id === productId);
    
    if (!productWithDetails) {
      return NextResponse.json(
        { error: 'Không thể lấy thông tin sản phẩm' },
        { status: 500 }
      );
    }

    // Check stock
    if (productWithDetails.stockQuantity < quantity) {
      return NextResponse.json(
        { error: 'Sản phẩm không đủ số lượng trong kho' },
        { status: 400 }
      );
    }

    const sessionId = await getSessionId();
    const unitPrice = productWithDetails.onlinePrice ?? productWithDetails.productPrice;

    // Get or create cart
    const cart = await shoppingCartRepository.getOrCreateCart(onlineStore.id, sessionId);
    
    // Add item to cart
    await shoppingCartRepository.addItem(cart.id, productId, quantity, unitPrice);
    
    // Get updated cart
    const updatedCart = await shoppingCartRepository.getCartWithItems(cart.id, onlineStore.id);

    const response = NextResponse.json({
      success: true,
      cart: updatedCart,
    });

    response.cookies.set(CART_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi thêm sản phẩm vào giỏ hàng' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/storefront/[slug]/cart - Update item quantity
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const { itemId, quantity } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID là bắt buộc' },
        { status: 400 }
      );
    }

    if (typeof quantity !== 'number' || quantity < 0) {
      return NextResponse.json(
        { error: 'Số lượng không hợp lệ' },
        { status: 400 }
      );
    }

    const sessionId = await getSessionId();
    const cart = await shoppingCartRepository.findBySessionId(sessionId, onlineStore.id);

    if (!cart) {
      return NextResponse.json(
        { error: 'Giỏ hàng không tồn tại' },
        { status: 404 }
      );
    }

    if (quantity === 0) {
      // Remove item
      await shoppingCartRepository.removeItem(itemId, cart.id);
    } else {
      // Update quantity
      await shoppingCartRepository.updateItemQuantity(itemId, cart.id, quantity);
    }

    const updatedCart = await shoppingCartRepository.getCartWithItems(cart.id, onlineStore.id);

    return NextResponse.json({
      success: true,
      cart: updatedCart,
    });
  } catch (error) {
    console.error('Update cart error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi cập nhật giỏ hàng' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storefront/[slug]/cart - Remove item from cart
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const url = new URL(request.url);
    const itemId = url.searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID là bắt buộc' },
        { status: 400 }
      );
    }

    const sessionId = await getSessionId();
    const cart = await shoppingCartRepository.findBySessionId(sessionId, onlineStore.id);

    if (!cart) {
      return NextResponse.json(
        { error: 'Giỏ hàng không tồn tại' },
        { status: 404 }
      );
    }

    await shoppingCartRepository.removeItem(itemId, cart.id);
    const updatedCart = await shoppingCartRepository.getCartWithItems(cart.id, onlineStore.id);

    return NextResponse.json({
      success: true,
      cart: updatedCart,
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xóa sản phẩm khỏi giỏ hàng' },
      { status: 500 }
    );
  }
}
