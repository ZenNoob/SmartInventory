import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { unitRepository } from '@/lib/repositories/unit-repository';

/**
 * GET /api/units - Get all units for a store
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

    const url = new URL(request.url);
    const includeBaseUnit = url.searchParams.get('includeBaseUnit') === 'true';
    const baseUnitsOnly = url.searchParams.get('baseUnitsOnly') === 'true';

    let units;
    if (baseUnitsOnly) {
      units = await unitRepository.findBaseUnits(storeId);
    } else if (includeBaseUnit) {
      units = await unitRepository.findAllWithBaseUnit(storeId);
    } else {
      units = await unitRepository.findAll(storeId, { orderBy: 'Name', orderDirection: 'ASC' });
    }

    return NextResponse.json({
      success: true,
      units,
    });
  } catch (error) {
    console.error('Get units error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách đơn vị tính' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/units - Create a new unit
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
    const { name, description, baseUnitId, conversionFactor } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Tên đơn vị tính là bắt buộc' },
        { status: 400 }
      );
    }

    // Check if unit name already exists
    const nameExists = await unitRepository.nameExists(name.trim(), storeId);
    if (nameExists) {
      return NextResponse.json(
        { error: 'Tên đơn vị tính đã tồn tại' },
        { status: 400 }
      );
    }

    // Validate base unit if provided
    if (baseUnitId) {
      const baseUnit = await unitRepository.findById(baseUnitId, storeId);
      if (!baseUnit) {
        return NextResponse.json(
          { error: 'Đơn vị cơ sở không tồn tại' },
          { status: 400 }
        );
      }

      // Validate conversion factor
      if (conversionFactor === undefined || conversionFactor <= 0) {
        return NextResponse.json(
          { error: 'Hệ số quy đổi phải lớn hơn 0' },
          { status: 400 }
        );
      }
    }

    // Create the unit
    const unit = await unitRepository.create(
      {
        name: name.trim(),
        description: description?.trim() || undefined,
        baseUnitId: baseUnitId || undefined,
        conversionFactor: baseUnitId ? conversionFactor : 1,
      },
      storeId
    );

    return NextResponse.json({
      success: true,
      unit,
    }, { status: 201 });
  } catch (error) {
    console.error('Create unit error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo đơn vị tính' },
      { status: 500 }
    );
  }
}
