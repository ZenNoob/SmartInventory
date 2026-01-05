import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { shiftRepository } from '@/lib/repositories/shift-repository';

/**
 * GET /api/shifts - Get all shifts for a store
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
    const userId = url.searchParams.get('userId') || undefined;
    const status = url.searchParams.get('status') as 'active' | 'closed' | undefined;
    const dateFrom = url.searchParams.get('dateFrom') || undefined;
    const dateTo = url.searchParams.get('dateTo') || undefined;
    const orderBy = url.searchParams.get('orderBy') || 'StartTime';
    const orderDirection = (url.searchParams.get('orderDirection') || 'DESC') as 'ASC' | 'DESC';

    // Check if requesting active shift only
    const activeOnly = url.searchParams.get('activeOnly') === 'true';
    
    if (activeOnly) {
      // Get active shift for current user or any active shift
      const activeShift = userId 
        ? await shiftRepository.getActiveShift(userId, storeId)
        : await shiftRepository.getAnyActiveShift(storeId);
      
      return NextResponse.json({
        success: true,
        shift: activeShift,
      });
    }

    const result = await shiftRepository.findAllShifts(storeId, {
      page,
      pageSize,
      userId,
      status,
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
    console.error('Get shifts error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách ca làm việc' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shifts - Start a new shift
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
    const { userId, userName, startingCash } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID là bắt buộc' },
        { status: 400 }
      );
    }

    if (!userName) {
      return NextResponse.json(
        { error: 'Tên người dùng là bắt buộc' },
        { status: 400 }
      );
    }

    if (typeof startingCash !== 'number' || startingCash < 0) {
      return NextResponse.json(
        { error: 'Tiền đầu ca phải là số không âm' },
        { status: 400 }
      );
    }

    // Start the shift
    const shift = await shiftRepository.startShift(
      {
        userId,
        userName,
        startingCash,
      },
      storeId
    );

    return NextResponse.json({
      success: true,
      shift,
    }, { status: 201 });
  } catch (error) {
    console.error('Start shift error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi bắt đầu ca làm việc';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
