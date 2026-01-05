import { NextRequest, NextResponse } from 'next/server';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { onlineProductRepository } from '@/lib/repositories/online-product-repository';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/storefront/[slug]/products - List published products for storefront
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

    // Get published products with details
    const products = await onlineProductRepository.findPublished(onlineStore.id);

    // Map to storefront-friendly format (exclude sensitive data)
    const storefrontProducts = products.map((product) => ({
      id: product.id,
      name: product.productName,
      slug: product.seoSlug,
      sku: product.productSku,
      price: product.onlinePrice ?? product.productPrice,
      description: product.onlineDescription,
      images: product.images ? JSON.parse(product.images) : [],
      categoryName: product.categoryName,
      stockQuantity: product.stockQuantity,
      inStock: product.stockQuantity > 0,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
    }));

    return NextResponse.json({
      success: true,
      products: storefrontProducts,
      store: {
        name: onlineStore.storeName,
        logo: onlineStore.logo,
        currency: onlineStore.currency,
      },
    });
  } catch (error) {
    console.error('Get storefront products error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách sản phẩm' },
      { status: 500 }
    );
  }
}
