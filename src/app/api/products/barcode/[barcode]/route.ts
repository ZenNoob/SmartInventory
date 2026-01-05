import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { productRepository } from '@/lib/repositories/product-repository';

interface RouteParams {
  params: Promise<{ barcode: string }>;
}

/**
 * GET /api/products/barcode/[barcode] - Find product by barcode
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

    const { barcode } = await params;
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

    if (!barcode) {
      return NextResponse.json(
        { error: 'Mã vạch là bắt buộc' },
        { status: 400 }
      );
    }

    // Find product by barcode
    const product = await productRepository.findByBarcode(barcode, storeId);

    if (!product) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm với mã vạch này' },
        { status: 404 }
      );
    }

    // Get full product info with stock
    const productWithStock = await productRepository.findByIdWithStock(product.id, storeId);

    return NextResponse.json({
      success: true,
      product: productWithStock,
    });
  } catch (error) {
    console.error('Get product by barcode error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tìm sản phẩm' },
      { status: 500 }
    );
  }
}
