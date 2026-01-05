import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { purchaseOrderRepository } from '@/lib/repositories/purchase-order-repository';

interface RouteParams {
  params: Promise<{ purchaseId: string }>;
}

/**
 * GET /api/purchases/[purchaseId] - Get a specific purchase order with details
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

    const { purchaseId } = await params;
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

    const purchaseOrder = await purchaseOrderRepository.findByIdWithDetails(purchaseId, storeId);

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn nhập hàng' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      purchaseOrder,
    });
  } catch (error) {
    console.error('Get purchase order error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin đơn nhập hàng' },
      { status: 500 }
    );
  }
}


/**
 * PUT /api/purchases/[purchaseId] - Update a purchase order
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

    const { purchaseId } = await params;
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

    // Check if purchase order exists
    const existingOrder = await purchaseOrderRepository.findById(purchaseId, storeId);
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn nhập hàng' },
        { status: 404 }
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

    // Update purchase order with items
    const purchaseOrder = await purchaseOrderRepository.updateWithItems(
      purchaseId,
      {
        supplierId: supplierId || undefined,
        importDate,
        notes: notes || undefined,
        totalAmount: totalAmount || 0,
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
    });
  } catch (error) {
    console.error('Update purchase order error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật đơn nhập hàng';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}


/**
 * DELETE /api/purchases/[purchaseId] - Delete a purchase order
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

    const { purchaseId } = await params;
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

    // Check if purchase order exists
    const existingOrder = await purchaseOrderRepository.findById(purchaseId, storeId);
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn nhập hàng' },
        { status: 404 }
      );
    }

    // Check if purchase order can be deleted (no used inventory)
    const canDelete = await purchaseOrderRepository.canDelete(purchaseId, storeId);
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Không thể xóa đơn nhập hàng đã có hàng được bán ra' },
        { status: 400 }
      );
    }

    await purchaseOrderRepository.deleteWithItems(purchaseId, storeId);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa đơn nhập hàng thành công',
    });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xóa đơn nhập hàng';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
