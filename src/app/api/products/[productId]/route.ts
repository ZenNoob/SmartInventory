import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { productRepository } from '@/lib/repositories/product-repository';

interface RouteParams {
  params: Promise<{ productId: string }>;
}

/**
 * GET /api/products/[productId] - Get a specific product with stock info
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

    const { productId } = await params;
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

    const product = await productRepository.findByIdWithStock(productId, storeId);

    if (!product) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      );
    }

    // Get purchase lots for this product
    const purchaseLots = await productRepository.getPurchaseLots(productId, storeId);

    return NextResponse.json({
      success: true,
      product,
      purchaseLots,
    });
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin sản phẩm' },
      { status: 500 }
    );
  }
}


/**
 * PUT /api/products/[productId] - Update a product
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

    const { productId } = await params;
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

    // Check if product exists
    const existingProduct = await productRepository.findById(productId, storeId);
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      barcode, 
      description, 
      categoryId, 
      unitId, 
      sellingPrice, 
      status,
      lowStockThreshold 
    } = body;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'Tên sản phẩm không hợp lệ' },
          { status: 400 }
        );
      }
    }

    // Check if barcode already exists (excluding current product)
    if (barcode !== undefined && barcode !== null && barcode !== '') {
      const barcodeExists = await productRepository.barcodeExists(barcode, storeId, productId);
      if (barcodeExists) {
        return NextResponse.json(
          { error: 'Mã vạch đã tồn tại' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (barcode !== undefined) updateData.barcode = barcode?.trim() || undefined;
    if (description !== undefined) updateData.description = description?.trim() || undefined;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (unitId !== undefined) updateData.unitId = unitId;
    if (sellingPrice !== undefined) updateData.sellingPrice = sellingPrice;
    if (status !== undefined) updateData.status = status;
    if (lowStockThreshold !== undefined) updateData.lowStockThreshold = lowStockThreshold;

    const updatedProduct = await productRepository.update(productId, updateData, storeId);

    return NextResponse.json({
      success: true,
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi cập nhật sản phẩm' },
      { status: 500 }
    );
  }
}


/**
 * DELETE /api/products/[productId] - Delete a product
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

    const { productId } = await params;
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

    // Check if product exists
    const existingProduct = await productRepository.findById(productId, storeId);
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      );
    }

    // Check if product is in use by any sales
    const isInUse = await productRepository.isInUse(productId, storeId);
    if (isInUse) {
      return NextResponse.json(
        { error: 'Không thể xóa sản phẩm đã có trong giao dịch bán hàng' },
        { status: 400 }
      );
    }

    await productRepository.delete(productId, storeId);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa sản phẩm thành công',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xóa sản phẩm' },
      { status: 500 }
    );
  }
}
