import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { productRepository } from '@/lib/repositories/product-repository';

/**
 * GET /api/products - Get all products for a store with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

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

    // Parse query parameters
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || undefined;
    const categoryId = url.searchParams.get('categoryId') || undefined;
    const status = url.searchParams.get('status') || undefined;

    let products = await productRepository.findAll(storeId);

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          (p.sku && p.sku.toLowerCase().includes(searchLower))
      );
    }

    // Filter by category
    if (categoryId) {
      products = products.filter((p) => p.categoryId === categoryId);
    }

    // Filter by status
    if (status) {
      products = products.filter((p) => p.status === status);
    }

    return NextResponse.json({
      success: true,
      products,
      data: products,
    });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách sản phẩm' },
      { status: 500 }
    );
  }
}


/**
 * POST /api/products - Create a new product
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

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

    const body = await request.json();
    const { 
      name, 
      barcode, 
      description, 
      categoryId, 
      unitId, 
      sellingPrice, 
      status = 'active',
      lowStockThreshold 
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Tên sản phẩm là bắt buộc' },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Danh mục sản phẩm là bắt buộc' },
        { status: 400 }
      );
    }

    if (!unitId) {
      return NextResponse.json(
        { error: 'Đơn vị tính là bắt buộc' },
        { status: 400 }
      );
    }

    // Check if barcode already exists (if provided)
    if (barcode) {
      const barcodeExists = await productRepository.barcodeExists(barcode, storeId);
      if (barcodeExists) {
        return NextResponse.json(
          { error: 'Mã vạch đã tồn tại' },
          { status: 400 }
        );
      }
    }

    // Create the product
    const product = await productRepository.create(
      {
        name: name.trim(),
        barcode: barcode?.trim() || undefined,
        description: description?.trim() || undefined,
        categoryId,
        unitId,
        sellingPrice: sellingPrice ?? undefined,
        status: status || 'active',
        lowStockThreshold: lowStockThreshold ?? undefined,
      },
      storeId
    );

    return NextResponse.json({
      success: true,
      product,
    }, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo sản phẩm' },
      { status: 500 }
    );
  }
}
