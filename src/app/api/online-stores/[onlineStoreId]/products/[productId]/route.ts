import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { onlineProductRepository } from '@/lib/repositories/online-product-repository';

interface RouteParams {
  params: Promise<{ onlineStoreId: string; productId: string }>;
}

/**
 * GET /api/online-stores/[onlineStoreId]/products/[productId] - Get online product details
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

    const { onlineStoreId, productId } = await params;
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

    const onlineProduct = await onlineProductRepository.findById(productId, onlineStoreId);
    if (!onlineProduct) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm online' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      onlineProduct,
    });
  } catch (error) {
    console.error('Get online product error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin sản phẩm online' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/online-stores/[onlineStoreId]/products/[productId] - Update online product settings
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

    const { onlineStoreId, productId } = await params;
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

    // Check if online product exists
    const existingProduct = await onlineProductRepository.findById(productId, onlineStoreId);
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm online' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      seoSlug,
      isPublished,
      onlinePrice,
      onlineDescription,
      displayOrder,
      seoTitle,
      seoDescription,
      images,
    } = body;

    // Validate seoSlug if provided
    if (seoSlug !== undefined) {
      if (typeof seoSlug !== 'string' || seoSlug.trim() === '') {
        return NextResponse.json(
          { error: 'SEO slug không hợp lệ' },
          { status: 400 }
        );
      }

      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(seoSlug.trim())) {
        return NextResponse.json(
          { error: 'SEO slug chỉ được chứa chữ thường, số và dấu gạch ngang' },
          { status: 400 }
        );
      }

      // Check if seoSlug is available (excluding current product)
      const isSlugAvailable = await onlineProductRepository.isSlugAvailable(seoSlug.trim(), onlineStoreId, productId);
      if (!isSlugAvailable) {
        return NextResponse.json(
          { error: 'SEO slug đã được sử dụng' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (seoSlug !== undefined) updateData.seoSlug = seoSlug.trim();
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (onlinePrice !== undefined) updateData.onlinePrice = onlinePrice;
    if (onlineDescription !== undefined) updateData.onlineDescription = onlineDescription?.trim() || undefined;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle?.trim() || undefined;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription?.trim() || undefined;
    if (images !== undefined) updateData.images = images;

    const updatedProduct = await onlineProductRepository.update(productId, updateData, onlineStoreId);

    return NextResponse.json({
      success: true,
      onlineProduct: updatedProduct,
    });
  } catch (error) {
    console.error('Update online product error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi cập nhật sản phẩm online' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/online-stores/[onlineStoreId]/products/[productId] - Remove from online catalog
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { onlineStoreId, productId } = await params;
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

    // Check if online product exists
    const existingProduct = await onlineProductRepository.findById(productId, onlineStoreId);
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm online' },
        { status: 404 }
      );
    }

    await onlineProductRepository.delete(productId, onlineStoreId);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa sản phẩm khỏi danh mục online thành công',
    });
  } catch (error) {
    console.error('Delete online product error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xóa sản phẩm khỏi danh mục online' },
      { status: 500 }
    );
  }
}
