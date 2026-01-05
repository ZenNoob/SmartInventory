import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { customerRepository } from '@/lib/repositories/customer-repository';

interface RouteParams {
  params: Promise<{ customerId: string }>;
}

/**
 * GET /api/customers/[customerId]/debt - Get customer debt information
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

    const { customerId } = await params;
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

    // Check if customer exists
    const customer = await customerRepository.findById(customerId, storeId);
    if (!customer) {
      return NextResponse.json(
        { error: 'Không tìm thấy khách hàng' },
        { status: 404 }
      );
    }

    // Get debt info
    const debtInfo = await customerRepository.getDebtInfo(customerId, storeId);
    
    // Check if we should include history
    const url = new URL(request.url);
    const includeHistory = url.searchParams.get('includeHistory') === 'true';

    const response: Record<string, unknown> = {
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        creditLimit: customer.creditLimit,
      },
      debtInfo,
    };

    if (includeHistory) {
      const history = await customerRepository.getDebtHistory(customerId, storeId);
      response.history = history;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get customer debt error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin công nợ' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers/[customerId]/debt - Check credit limit before sale
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

    const { customerId } = await params;
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
    const { additionalDebt } = body;

    if (additionalDebt === undefined || typeof additionalDebt !== 'number') {
      return NextResponse.json(
        { error: 'Số tiền nợ thêm là bắt buộc' },
        { status: 400 }
      );
    }

    // Check credit limit
    const creditCheck = await customerRepository.checkCreditLimit(customerId, storeId, additionalDebt);

    return NextResponse.json({
      success: true,
      ...creditCheck,
      warning: !creditCheck.withinLimit 
        ? `Khách hàng sẽ vượt hạn mức tín dụng. Nợ dự kiến: ${creditCheck.projectedDebt.toLocaleString()}đ, Hạn mức: ${creditCheck.creditLimit.toLocaleString()}đ`
        : null,
    });
  } catch (error) {
    console.error('Check credit limit error:', error);
    
    if (error instanceof Error && error.message === 'Customer not found') {
      return NextResponse.json(
        { error: 'Không tìm thấy khách hàng' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi kiểm tra hạn mức tín dụng' },
      { status: 500 }
    );
  }
}
