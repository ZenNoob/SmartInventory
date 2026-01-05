import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { salesRepository } from '@/lib/repositories/sales-repository';

/**
 * GET /api/sales - Get all sales for a store
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
    const customerId = url.searchParams.get('customerId') || undefined;
    const status = url.searchParams.get('status') as
      | 'pending'
      | 'unprinted'
      | 'printed'
      | undefined;
    const dateFrom = url.searchParams.get('dateFrom') || undefined;
    const dateTo = url.searchParams.get('dateTo') || undefined;

    let sales = await salesRepository.findAll(storeId);

    // Filter by customer
    if (customerId) {
      sales = sales.filter((s) => s.customerId === customerId);
    }

    // Filter by status
    if (status) {
      sales = sales.filter((s) => s.status === status);
    }

    // Filter by date range
    if (dateFrom) {
      const from = new Date(dateFrom);
      sales = sales.filter((s) => new Date(s.transactionDate) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      sales = sales.filter((s) => new Date(s.transactionDate) <= to);
    }

    return NextResponse.json({
      success: true,
      sales,
      data: sales,
    });
  } catch (error) {
    console.error('Get sales error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách đơn hàng' },
      { status: 500 }
    );
  }
}


/**
 * POST /api/sales - Create a new sale
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

    // Create sale with items
    const sale = await salesRepository.createSale(
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
        createdBy: authResult.user.userId,
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
    }, { status: 201 });
  } catch (error) {
    console.error('Create sale error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tạo đơn hàng';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
