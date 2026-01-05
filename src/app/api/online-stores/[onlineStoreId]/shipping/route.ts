import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { shippingZoneRepository } from '@/lib/repositories/shipping-zone-repository';

interface RouteParams {
  params: Promise<{ onlineStoreId: string }>;
}

/**
 * GET /api/online-stores/[onlineStoreId]/shipping - List shipping zones
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

    const { onlineStoreId } = await params;
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

    // Verify online store exists and belongs to this store
    const onlineStore = await onlineStoreRepository.findById(onlineStoreId, storeId);
    if (!onlineStore) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng online' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('activeOnly') === 'true';

    let shippingZones;
    if (activeOnly) {
      shippingZones = await shippingZoneRepository.findActive(onlineStoreId);
    } else {
      shippingZones = await shippingZoneRepository.findAll(onlineStoreId);
    }

    return NextResponse.json({
      success: true,
      shippingZones,
      data: shippingZones,
    });
  } catch (error) {
    console.error('Get shipping zones error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách vùng giao hàng' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/online-stores/[onlineStoreId]/shipping - Create shipping zone
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

    const { onlineStoreId } = await params;
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

    // Verify online store exists and belongs to this store
    const onlineStore = await onlineStoreRepository.findById(onlineStoreId, storeId);
    if (!onlineStore) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng online' },
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

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Tên vùng giao hàng là bắt buộc' },
        { status: 400 }
      );
    }

    if (!provinces || !Array.isArray(provinces) || provinces.length === 0) {
      return NextResponse.json(
        { error: 'Danh sách tỉnh/thành phố là bắt buộc' },
        { status: 400 }
      );
    }

    // Create shipping zone
    const shippingZone = await shippingZoneRepository.create({
      onlineStoreId,
      name: name.trim(),
      provinces,
      flatRate: flatRate ?? undefined,
      freeShippingThreshold: freeShippingThreshold ?? undefined,
      isActive: isActive ?? true,
    });

    return NextResponse.json({
      success: true,
      shippingZone,
    }, { status: 201 });
  } catch (error) {
    console.error('Create shipping zone error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo vùng giao hàng' },
      { status: 500 }
    );
  }
}
