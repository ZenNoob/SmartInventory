import { NextRequest, NextResponse } from 'next/server';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/storefront/[slug]/config - Get store configuration for storefront
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // Find online store by slug
    const onlineStore = await onlineStoreRepository.findBySlug(slug);
    if (!onlineStore) {
      return NextResponse.json(
        { error: 'Cửa hàng không tồn tại hoặc đang tạm ngưng hoạt động' },
        { status: 404 }
      );
    }

    // Return store config (exclude sensitive data)
    return NextResponse.json({
      success: true,
      store: {
        id: onlineStore.id,
        storeName: onlineStore.storeName,
        slug: onlineStore.slug,
        logo: onlineStore.logo,
        favicon: onlineStore.favicon,
        description: onlineStore.description,
        themeId: onlineStore.themeId,
        primaryColor: onlineStore.primaryColor,
        secondaryColor: onlineStore.secondaryColor,
        fontFamily: onlineStore.fontFamily,
        contactEmail: onlineStore.contactEmail,
        contactPhone: onlineStore.contactPhone,
        address: onlineStore.address,
        facebookUrl: onlineStore.facebookUrl,
        instagramUrl: onlineStore.instagramUrl,
        currency: onlineStore.currency,
      },
    });
  } catch (error) {
    console.error('Get store config error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin cửa hàng' },
      { status: 500 }
    );
  }
}
