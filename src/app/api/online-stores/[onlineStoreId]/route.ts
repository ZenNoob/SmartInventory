import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';

interface RouteParams {
  params: Promise<{ onlineStoreId: string }>;
}

/**
 * GET /api/online-stores/[onlineStoreId] - Get store config
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

    const onlineStore = await onlineStoreRepository.findById(onlineStoreId, storeId);

    if (!onlineStore) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng online' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      onlineStore,
    });
  } catch (error) {
    console.error('Get online store error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin cửa hàng online' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/online-stores/[onlineStoreId] - Update store settings
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

    // Check if online store exists
    const existingStore = await onlineStoreRepository.findById(onlineStoreId, storeId);
    if (!existingStore) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng online' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      slug,
      storeName,
      contactEmail,
      isActive,
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

    // Validate slug if provided
    if (slug !== undefined) {
      if (typeof slug !== 'string' || slug.trim() === '') {
        return NextResponse.json(
          { error: 'Slug không hợp lệ' },
          { status: 400 }
        );
      }

      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(slug.trim())) {
        return NextResponse.json(
          { error: 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang' },
          { status: 400 }
        );
      }

      // Check if slug is available (excluding current store)
      const isSlugAvailable = await onlineStoreRepository.isSlugAvailable(slug.trim(), onlineStoreId);
      if (!isSlugAvailable) {
        return NextResponse.json(
          { error: 'Slug đã được sử dụng' },
          { status: 400 }
        );
      }
    }

    // Validate storeName if provided
    if (storeName !== undefined) {
      if (typeof storeName !== 'string' || storeName.trim() === '') {
        return NextResponse.json(
          { error: 'Tên cửa hàng không hợp lệ' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (slug !== undefined) updateData.slug = slug.trim();
    if (storeName !== undefined) updateData.storeName = storeName.trim();
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (customDomain !== undefined) updateData.customDomain = customDomain?.trim() || undefined;
    if (logo !== undefined) updateData.logo = logo?.trim() || undefined;
    if (favicon !== undefined) updateData.favicon = favicon?.trim() || undefined;
    if (description !== undefined) updateData.description = description?.trim() || undefined;
    if (themeId !== undefined) updateData.themeId = themeId;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (fontFamily !== undefined) updateData.fontFamily = fontFamily;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone?.trim() || undefined;
    if (address !== undefined) updateData.address = address?.trim() || undefined;
    if (facebookUrl !== undefined) updateData.facebookUrl = facebookUrl?.trim() || undefined;
    if (instagramUrl !== undefined) updateData.instagramUrl = instagramUrl?.trim() || undefined;
    if (currency !== undefined) updateData.currency = currency;
    if (timezone !== undefined) updateData.timezone = timezone;

    const updatedStore = await onlineStoreRepository.update(onlineStoreId, updateData, storeId);

    return NextResponse.json({
      success: true,
      onlineStore: updatedStore,
    });
  } catch (error) {
    console.error('Update online store error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi cập nhật cửa hàng online' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/online-stores/[onlineStoreId] - Deactivate or permanently delete store
 * Query params:
 * - permanent=true: Permanently delete the store and all related data
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

    const { onlineStoreId } = await params;
    const storeId = getStoreIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const isPermanent = searchParams.get('permanent') === 'true';

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

    // Check if online store exists
    const existingStore = await onlineStoreRepository.findById(onlineStoreId, storeId);
    if (!existingStore) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng online' },
        { status: 404 }
      );
    }

    if (isPermanent) {
      // Permanently delete the store and all related data
      await onlineStoreRepository.permanentDelete(onlineStoreId, storeId);
      
      return NextResponse.json({
        success: true,
        message: 'Đã xóa vĩnh viễn cửa hàng online thành công',
      });
    } else {
      // Deactivate the store (soft delete - preserves data)
      await onlineStoreRepository.deactivate(onlineStoreId, storeId);

      return NextResponse.json({
        success: true,
        message: 'Đã vô hiệu hóa cửa hàng online thành công',
      });
    }
  } catch (error) {
    console.error('Delete online store error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xóa cửa hàng online' },
      { status: 500 }
    );
  }
}
