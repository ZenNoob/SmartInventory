import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { shiftRepository } from '@/lib/repositories/shift-repository';

interface RouteParams {
  params: Promise<{ shiftId: string }>;
}

/**
 * GET /api/shifts/[shiftId] - Get a specific shift
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

    const { shiftId } = await params;

    // Check if requesting with summary
    const url = new URL(request.url);
    const withSummary = url.searchParams.get('withSummary') === 'true';

    if (withSummary) {
      const shift = await shiftRepository.getShiftWithSummary(shiftId, storeId);
      if (!shift) {
        return NextResponse.json(
          { error: 'Không tìm thấy ca làm việc' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        shift,
      });
    }

    const shift = await shiftRepository.findById(shiftId, storeId);
    if (!shift) {
      return NextResponse.json(
        { error: 'Không tìm thấy ca làm việc' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      shift,
    });
  } catch (error) {
    console.error('Get shift error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin ca làm việc' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/shifts/[shiftId] - Update or close a shift
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

    const { shiftId } = await params;
    const body = await request.json();
    const { action, endingCash, startingCash } = body;

    // Handle close shift action
    if (action === 'close') {
      if (typeof endingCash !== 'number' || endingCash < 0) {
        return NextResponse.json(
          { error: 'Tiền cuối ca phải là số không âm' },
          { status: 400 }
        );
      }

      const shift = await shiftRepository.closeShift(
        shiftId,
        { endingCash },
        storeId
      );

      return NextResponse.json({
        success: true,
        shift,
      });
    }

    // Handle update cash values
    if (startingCash !== undefined || endingCash !== undefined) {
      // Get current shift to use existing values if not provided
      const currentShift = await shiftRepository.findById(shiftId, storeId);
      if (!currentShift) {
        return NextResponse.json(
          { error: 'Không tìm thấy ca làm việc' },
          { status: 404 }
        );
      }

      const newStartingCash = startingCash !== undefined ? startingCash : currentShift.startingCash;
      const newEndingCash = endingCash !== undefined ? endingCash : currentShift.endingCash;

      if (typeof newStartingCash !== 'number' || newStartingCash < 0) {
        return NextResponse.json(
          { error: 'Tiền đầu ca phải là số không âm' },
          { status: 400 }
        );
      }

      const shift = await shiftRepository.updateShiftCash(
        shiftId,
        storeId,
        newStartingCash,
        newEndingCash
      );

      return NextResponse.json({
        success: true,
        shift,
      });
    }

    return NextResponse.json(
      { error: 'Không có hành động hợp lệ được chỉ định' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Update shift error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật ca làm việc';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
