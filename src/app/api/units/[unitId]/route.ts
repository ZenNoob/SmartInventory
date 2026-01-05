import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { unitRepository } from '@/lib/repositories/unit-repository';

interface RouteParams {
  params: Promise<{ unitId: string }>;
}

/**
 * GET /api/units/[unitId] - Get a specific unit
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

    const { unitId } = await params;
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

    const unit = await unitRepository.findById(unitId, storeId);

    if (!unit) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn vị tính' },
        { status: 404 }
      );
    }

    // Get base unit name if exists
    let baseUnitName: string | undefined;
    if (unit.baseUnitId) {
      const baseUnit = await unitRepository.findById(unit.baseUnitId, storeId);
      baseUnitName = baseUnit?.name;
    }

    return NextResponse.json({
      success: true,
      unit: {
        ...unit,
        baseUnitName,
      },
    });
  } catch (error) {
    console.error('Get unit error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin đơn vị tính' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/units/[unitId] - Update a unit
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

    const { unitId } = await params;
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

    // Check if unit exists
    const existingUnit = await unitRepository.findById(unitId, storeId);
    if (!existingUnit) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn vị tính' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, baseUnitId, conversionFactor } = body;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'Tên đơn vị tính không hợp lệ' },
          { status: 400 }
        );
      }

      // Check if new name already exists (excluding current unit)
      const nameExists = await unitRepository.nameExists(name.trim(), storeId, unitId);
      if (nameExists) {
        return NextResponse.json(
          { error: 'Tên đơn vị tính đã tồn tại' },
          { status: 400 }
        );
      }
    }

    // Validate base unit if being changed
    if (baseUnitId !== undefined && baseUnitId !== null) {
      // Check for circular reference
      const canSet = await unitRepository.canSetAsBaseUnit(unitId, baseUnitId, storeId);
      if (!canSet) {
        return NextResponse.json(
          { error: 'Không thể đặt đơn vị cơ sở này (tham chiếu vòng)' },
          { status: 400 }
        );
      }

      const baseUnit = await unitRepository.findById(baseUnitId, storeId);
      if (!baseUnit) {
        return NextResponse.json(
          { error: 'Đơn vị cơ sở không tồn tại' },
          { status: 400 }
        );
      }

      // Validate conversion factor when base unit is set
      const factor = conversionFactor ?? existingUnit.conversionFactor;
      if (factor <= 0) {
        return NextResponse.json(
          { error: 'Hệ số quy đổi phải lớn hơn 0' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || undefined;
    if (baseUnitId !== undefined) updateData.baseUnitId = baseUnitId || undefined;
    if (conversionFactor !== undefined) updateData.conversionFactor = conversionFactor;

    const updatedUnit = await unitRepository.update(unitId, updateData, storeId);

    return NextResponse.json({
      success: true,
      unit: updatedUnit,
    });
  } catch (error) {
    console.error('Update unit error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi cập nhật đơn vị tính' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/units/[unitId] - Delete a unit
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

    const { unitId } = await params;
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

    // Check if unit exists
    const existingUnit = await unitRepository.findById(unitId, storeId);
    if (!existingUnit) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn vị tính' },
        { status: 404 }
      );
    }

    // Check if unit is in use by any products
    const isInUse = await unitRepository.isInUse(unitId, storeId);
    if (isInUse) {
      return NextResponse.json(
        { error: 'Không thể xóa đơn vị tính đang được sử dụng bởi sản phẩm' },
        { status: 400 }
      );
    }

    // Check if unit is used as base unit by other units
    const isBaseForOthers = await unitRepository.isBaseUnitForOthers(unitId, storeId);
    if (isBaseForOthers) {
      return NextResponse.json(
        { error: 'Không thể xóa đơn vị tính đang được sử dụng làm đơn vị cơ sở' },
        { status: 400 }
      );
    }

    await unitRepository.delete(unitId, storeId);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa đơn vị tính thành công',
    });
  } catch (error) {
    console.error('Delete unit error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xóa đơn vị tính' },
      { status: 500 }
    );
  }
}
