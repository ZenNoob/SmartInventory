import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { onlineProductRepository } from '@/lib/repositories/online-product-repository';
import { onlineOrderRepository } from '@/lib/repositories/online-order-repository';

const MAX_STORES_PER_OWNER = 10;

/**
 * GET /api/online-stores - List all online stores for owner
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

    const onlineStores = await onlineStoreRepository.findByStoreId(storeId);

    // Get product and order counts for each store
    const storesWithStats = await Promise.all(
      onlineStores.map(async (store) => {
        const productCount = await onlineProductRepository.count(store.id);
        const orderCount = await onlineOrderRepository.count(store.id);
        return {
          ...store,
          productCount,
          orderCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      onlineStores: storesWithStats,
      data: storesWithStats,
    });
  } catch (error) {
    console.error('Get online stores error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách cửa hàng online' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/online-stores - Create new online store
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

    // Check store limit
    const storeCount = await onlineStoreRepository.count(storeId);
    if (storeCount >= MAX_STORES_PER_OWNER) {
      return NextResponse.json(
        { error: `Bạn đã đạt giới hạn ${MAX_STORES_PER_OWNER} cửa hàng online. Vui lòng nâng cấp gói để tạo thêm.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      slug,
      storeName,
      contactEmail,
      customDomain,
      logo,
      favicon,
      description,
      themeId,
      primaryColor,
      secondaryColor,
      fontFamily,
      contactPhone,
      address,
      facebookUrl,
      instagramUrl,
      currency,
      timezone,
    } = body;

    // Validate required fields
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      return NextResponse.json(
        { error: 'Slug là bắt buộc' },
        { status: 400 }
      );
    }

    if (!storeName || typeof storeName !== 'string' || storeName.trim() === '') {
      return NextResponse.json(
        { error: 'Tên cửa hàng là bắt buộc' },
        { status: 400 }
      );
    }

    if (!contactEmail || typeof contactEmail !== 'string' || contactEmail.trim() === '') {
      return NextResponse.json(
        { error: 'Email liên hệ là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug.trim())) {
      return NextResponse.json(
        { error: 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang' },
        { status: 400 }
      );
    }

    // Check if slug is available
    const isSlugAvailable = await onlineStoreRepository.isSlugAvailable(slug.trim());
    if (!isSlugAvailable) {
      return NextResponse.json(
        { error: 'Slug đã được sử dụng' },
        { status: 400 }
      );
    }

    // Create the online store
    const onlineStore = await onlineStoreRepository.create({
      storeId,
      slug: slug.trim(),
      storeName: storeName.trim(),
      contactEmail: contactEmail.trim(),
      isActive: true,
      customDomain: customDomain?.trim() || undefined,
      logo: logo?.trim() || undefined,
      favicon: favicon?.trim() || undefined,
      description: description?.trim() || undefined,
      themeId: themeId || 'default',
      primaryColor: primaryColor || '#3B82F6',
      secondaryColor: secondaryColor || '#10B981',
      fontFamily: fontFamily || 'Inter',
      contactPhone: contactPhone?.trim() || undefined,
      address: address?.trim() || undefined,
      facebookUrl: facebookUrl?.trim() || undefined,
      instagramUrl: instagramUrl?.trim() || undefined,
      currency: currency || 'VND',
      timezone: timezone || 'Asia/Ho_Chi_Minh',
    });

    return NextResponse.json({
      success: true,
      onlineStore,
    }, { status: 201 });
  } catch (error) {
    console.error('Create online store error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo cửa hàng online' },
      { status: 500 }
    );
  }
}
