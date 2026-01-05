import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { purchaseOrderRepository } from '@/lib/repositories/purchase-order-repository';

/**
 * GET /api/purchases - Get all purchase orders for a store
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
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const search = url.searchParams.get('search') || undefined;
    const supplierId = url.searchParams.get('supplierId') || undefined;
    const dateFrom = url.searchParams.get('dateFrom') || undefined;
    const dateTo = url.searchParams.get('dateTo') || undefined;
    const orderBy = url.searchParams.get('orderBy') || 'po.import_date';
    const orderDirection = (url.searchParams.get('orderDirection') || 'DESC') as 'ASC' | 'DESC';

    const result = await purchaseOrderRepository.findAllWithSupplier(storeId, {
      page,
      pageSize,
      search,
      supplierId,
      dateFrom,
      dateTo,
      orderBy,
      orderDirection,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách đơn nhập hàng' },
      { status: 500 }
    );
  }
}


/**
 * POST /api/purchases - Create a new purchase order
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
    const { supplierId, importDate, notes, totalAmount, items } = body;

    // Validate required fields
    if (!importDate) {
      return NextResponse.json(
        { error: 'Ngày nhập hàng là bắt buộc' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Đơn nhập hàng phải có ít nhất một sản phẩm' },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of items) {
      if (!item.productId) {
        return NextResponse.json(
          { error: 'Mỗi sản phẩm phải có productId' },
          { status: 400 }
        );
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Số lượng phải lớn hơn 0' },
          { status: 400 }
        );
      }
      if (typeof item.cost !== 'number' || item.cost < 0) {
        return NextResponse.json(
          { error: 'Giá nhập phải là số không âm' },
          { status: 400 }
        );
      }
      if (!item.unitId) {
        return NextResponse.json(
          { error: 'Mỗi sản phẩm phải có đơn vị tính' },
          { status: 400 }
        );
      }
    }

    // Create purchase order with items
    const purchaseOrder = await purchaseOrderRepository.createWithItems(
      {
        supplierId: supplierId || undefined,
        importDate,
        notes: notes || undefined,
        totalAmount: totalAmount || 0,
        createdBy: authResult.user.userId,
        items: items.map((item: { productId: string; quantity: number; cost: number; unitId: string }) => ({
          productId: item.productId,
          quantity: item.quantity,
          cost: item.cost,
          unitId: item.unitId,
        })),
      },
      storeId
    );

    return NextResponse.json({
      success: true,
      purchaseOrder,
    }, { status: 201 });
  } catch (error) {
    console.error('Create purchase order error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo đơn nhập hàng' },
      { status: 500 }
    );
  }
}
