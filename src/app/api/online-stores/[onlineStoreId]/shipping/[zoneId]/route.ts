import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { shippingZoneRepository } from '@/lib/repositories/shipping-zone-repository';

interface RouteParams {
  params: Promise<{ onlineStoreId: string; zoneId: string }>;
}

/**
 * GET /api/online-stores/[onlineStoreId]/shipping/[zoneId] - Get shipping zone details
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

    const { onlineStoreId, zoneId } = await params;
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

    // Verify online store exists
    const onlineStore = await onlineStoreRepository.findById(onlineStoreId, storeId);
    if (!onlineStore) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng online' },
        { status: 404 }
      );
    }

    const shippingZone = await shippingZoneRepository.findById(zoneId, onlineStoreId);
    if (!shippingZone) {
      return NextResponse.json(
        { error: 'Không tìm thấy vùng giao hàng' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      shippingZone,
    });
  } catch (error) {
    console.error('Get shipping zone error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin vùng giao hàng' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/online-stores/[onlineStoreId]/shipping/[zoneId] - Update shipping zone
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

    const { onlineStoreId, zoneId } = await params;
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

    // Verify online store exists
    const onlineStore = await onlineStoreRepository.findById(onlineStoreId, storeId);
    if (!onlineStore) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng online' },
        { status: 404 }
      );
    }

    // Check if shipping zone exists
    const existingZone = await shippingZoneRepository.findById(zoneId, onlineStoreId);
    if (!existingZone) {
      return NextResponse.json(
        { error: 'Không tìm thấy vùng giao hàng' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      provinces,
      flatRate,
      freeShippingThreshold,
      isActive,
    } = body;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'Tên vùng giao hàng không hợp lệ' },
          { status: 400 }
        );
      }
    }

    // Validate provinces if provided
    if (provinces !== undefined) {
      if (!Array.isArray(provinces) || provinces.length === 0) {
        return NextResponse.json(
          { error: 'Danh sách tỉnh/thành phố không hợp lệ' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (provinces !== undefined) updateData.provinces = provinces;
    if (flatRate !== undefined) updateData.flatRate = flatRate;
    if (freeShippingThreshold !== undefined) updateData.freeShippingThreshold = freeShippingThreshold;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedZone = await shippingZoneRepository.update(zoneId, updateData, onlineStoreId);

    return NextResponse.json({
      success: true,
      shippingZone: updatedZone,
    });
  } catch (error) {
    console.error('Update shipping zone error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi cập nhật vùng giao hàng' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/online-stores/[onlineStoreId]/shipping/[zoneId] - Delete shipping zone
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

    const { onlineStoreId, zoneId } = await params;
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

    // Verify online store exists
    const onlineStore = await onlineStoreRepository.findById(onlineStoreId, storeId);
    if (!onlineStore) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng online' },
        { status: 404 }
      );
    }

    // Check if shipping zone exists
    const existingZone = await shippingZoneRepository.findById(zoneId, onlineStoreId);
    if (!existingZone) {
      return NextResponse.json(
        { error: 'Không tìm thấy vùng giao hàng' },
        { status: 404 }
      );
    }

    await shippingZoneRepository.delete(zoneId, onlineStoreId);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa vùng giao hàng thành công',
    });
  } catch (error) {
    console.error('Delete shipping zone error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xóa vùng giao hàng' },
      { status: 500 }
    );
  }
}
