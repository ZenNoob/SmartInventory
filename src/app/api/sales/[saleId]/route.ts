import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { salesRepository } from '@/lib/repositories/sales-repository';

interface RouteParams {
  params: Promise<{ saleId: string }>;
}

/**
 * GET /api/sales/[saleId] - Get a specific sale with details
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

    const { saleId } = await params;
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

    const sale = await salesRepository.findByIdWithDetails(saleId, storeId);

    if (!sale) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sale,
    });
  } catch (error) {
    console.error('Get sale error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin đơn hàng' },
      { status: 500 }
    );
  }
}


/**
 * PUT /api/sales/[saleId] - Update a sale
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

    const { saleId } = await params;
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

    // Check if sale exists
    const existingSale = await salesRepository.findById(saleId, storeId);
    if (!existingSale) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { 
      customerId, 
      shiftId,
      transactionDate, 
      status,
      totalAmount,
      vatRate,
      discount,
      discountType,
      discountValue,
      tierDiscountPercentage,
      tierDiscountAmount,
      pointsUsed,
      pointsDiscount,
      customerPayment,
      previousDebt,
      items 
    } = body;

    // Validate required fields
    if (!transactionDate) {
      return NextResponse.json(
        { error: 'Ngày giao dịch là bắt buộc' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Đơn hàng phải có ít nhất một sản phẩm' },
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
      if (typeof item.price !== 'number' || item.price < 0) {
        return NextResponse.json(
          { error: 'Giá bán phải là số không âm' },
          { status: 400 }
        );
      }
    }

    // Calculate VAT amount based on rate
    const calculatedDiscount = discount || 0;
    const calculatedTierDiscount = tierDiscountAmount || 0;
    const calculatedPointsDiscount = pointsDiscount || 0;
    const amountAfterDiscount = (totalAmount || 0) - calculatedDiscount - calculatedTierDiscount - calculatedPointsDiscount;
    const vatAmount = vatRate ? (amountAfterDiscount * vatRate) / 100 : 0;

    // Update sale with items
    const sale = await salesRepository.updateSale(
      saleId,
      {
        customerId: customerId || undefined,
        shiftId: shiftId || undefined,
        transactionDate,
        status: status || 'pending',
        totalAmount: totalAmount || 0,
        vatAmount,
        discount: calculatedDiscount,
        discountType: discountType || undefined,
        discountValue: discountValue ?? undefined,
        tierDiscountPercentage: tierDiscountPercentage ?? undefined,
        tierDiscountAmount: calculatedTierDiscount,
        pointsUsed: pointsUsed || 0,
        pointsDiscount: calculatedPointsDiscount,
        customerPayment: customerPayment ?? undefined,
        previousDebt: previousDebt ?? undefined,
        items: items.map((item: { productId: string; quantity: number; price: number; cost?: number }) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          cost: item.cost,
        })),
      },
      storeId
    );

    return NextResponse.json({
      success: true,
      sale,
    });
  } catch (error) {
    console.error('Update sale error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật đơn hàng';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}


/**
 * PATCH /api/sales/[saleId] - Update sale status only
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { saleId } = await params;
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

    // Check if sale exists
    const existingSale = await salesRepository.findById(saleId, storeId);
    if (!existingSale) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !['pending', 'unprinted', 'printed'].includes(status)) {
      return NextResponse.json(
        { error: 'Trạng thái không hợp lệ' },
        { status: 400 }
      );
    }

    const sale = await salesRepository.updateStatus(saleId, status, storeId);

    return NextResponse.json({
      success: true,
      sale,
    });
  } catch (error) {
    console.error('Update sale status error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật trạng thái đơn hàng';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sales/[saleId] - Delete a sale
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

    const { saleId } = await params;
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

    // Check if sale exists
    const existingSale = await salesRepository.findById(saleId, storeId);
    if (!existingSale) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    await salesRepository.deleteSale(saleId, storeId);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa đơn hàng thành công',
    });
  } catch (error) {
    console.error('Delete sale error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xóa đơn hàng';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
