import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { onlineProductRepository } from '@/lib/repositories/online-product-repository';
import { productRepository } from '@/lib/repositories/product-repository';

interface RouteParams {
  params: Promise<{ onlineStoreId: string }>;
}

/**
 * GET /api/online-stores/[onlineStoreId]/products - List products with publish status
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

    // Parse query parameters
    const url = new URL(request.url);
    const publishedOnly = url.searchParams.get('publishedOnly') === 'true';

    let products;
    if (publishedOnly) {
      products = await onlineProductRepository.findPublished(onlineStoreId);
    } else {
      products = await onlineProductRepository.findAllWithDetails(onlineStoreId);
    }

    return NextResponse.json({
      success: true,
      products,
      data: products,
    });
  } catch (error) {
    console.error('Get online products error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách sản phẩm online' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/online-stores/[onlineStoreId]/products - Add product to online catalog
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

    const body = await request.json();
    const {
      productId,
      seoSlug,
      isPublished,
      onlinePrice,
      onlineDescription,
      displayOrder,
      seoTitle,
      seoDescription,
      images,
    } = body;

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID là bắt buộc' },
        { status: 400 }
      );
    }

    if (!seoSlug || typeof seoSlug !== 'string' || seoSlug.trim() === '') {
      return NextResponse.json(
        { error: 'SEO slug là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate seoSlug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(seoSlug.trim())) {
      return NextResponse.json(
        { error: 'SEO slug chỉ được chứa chữ thường, số và dấu gạch ngang' },
        { status: 400 }
      );
    }

    // Verify product exists in inventory
    const inventoryProduct = await productRepository.findById(productId, storeId);
    if (!inventoryProduct) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm trong kho' },
        { status: 404 }
      );
    }

    // Check if product is already in online catalog
    const existingOnlineProduct = await onlineProductRepository.findByProductId(productId, onlineStoreId);
    if (existingOnlineProduct) {
      return NextResponse.json(
        { error: 'Sản phẩm đã có trong danh mục online' },
        { status: 400 }
      );
    }

    // Check if seoSlug is available
    const isSlugAvailable = await onlineProductRepository.isSlugAvailable(seoSlug.trim(), onlineStoreId);
    if (!isSlugAvailable) {
      return NextResponse.json(
        { error: 'SEO slug đã được sử dụng' },
        { status: 400 }
      );
    }

    // Create online product
    const onlineProduct = await onlineProductRepository.create({
      onlineStoreId,
      productId,
      seoSlug: seoSlug.trim(),
      isPublished: isPublished ?? false,
      onlinePrice: onlinePrice ?? undefined,
      onlineDescription: onlineDescription?.trim() || undefined,
      displayOrder: displayOrder ?? 0,
      seoTitle: seoTitle?.trim() || undefined,
      seoDescription: seoDescription?.trim() || undefined,
      images: images || undefined,
    });

    return NextResponse.json({
      success: true,
      onlineProduct,
    }, { status: 201 });
  } catch (error) {
    console.error('Create online product error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi thêm sản phẩm vào danh mục online' },
      { status: 500 }
    );
  }
}
