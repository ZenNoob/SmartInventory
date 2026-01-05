import { NextRequest, NextResponse } from 'next/server';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

const CUSTOMER_AUTH_COOKIE = 'customer_token';

/**
 * POST /api/storefront/[slug]/auth/logout - Customer logout
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // Find online store by slug (optional validation)
    const onlineStore = await onlineStoreRepository.findBySlug(slug);
    if (!onlineStore) {
      return NextResponse.json(
        { error: 'Cửa hàng không tồn tại hoặc đang tạm ngưng hoạt động' },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Đăng xuất thành công',
    });

    // Clear auth cookie
    response.cookies.delete(CUSTOMER_AUTH_COOKIE);

    return response;
  } catch (error) {
    console.error('Customer logout error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi đăng xuất' },
      { status: 500 }
    );
  }
}
