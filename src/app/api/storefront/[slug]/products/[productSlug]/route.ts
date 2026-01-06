import { NextRequest, NextResponse } from 'next/server';
import { onlineStoreRepository } from '@/lib/repositories/online-store-repository';
import { onlineProductRepository } from '@/lib/repositories/online-product-repository';

interface RouteParams {
  params: Promise<{ slug: string; productSlug: string }>;
}

/**
 * GET /api/storefront/[slug]/products/[productSlug] - Get product details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug, productSlug } = await params;

    // Find online store by slug
    const onlineStore = await onlineStoreRepository.findBySlug(slug);
    if (!onlineStore) {
      return NextResponse.json(
        { error: 'Cửa hàng không tồn tại hoặc đang tạm ngưng hoạt động' },
        { status: 404 }
      );
    }

    // Find product by SEO slug
    const product = await onlineProductRepository.findBySlug(productSlug, onlineStore.id);
    if (!product) {
      return NextResponse.json(
        { error: 'Sản phẩm không tồn tại' },
        { status: 404 }
      );
    }

    // Handle images - could be JSON array or single URL string
    let images: string[] = [];
    if (product.images) {
      try {
        const parsed = JSON.parse(product.images);
        images = Array.isArray(parsed) ? parsed : [product.images];
      } catch {
        // If not valid JSON, treat as single URL
        images = [product.images];
      }
    }

    // Map to storefront-friendly format
    const storefrontProduct = {
      id: product.id,
      name: product.productName,
      slug: product.seoSlug,
      sku: product.productSku,
      price: product.onlinePrice ?? product.productPrice,
      description: product.onlineDescription,
      images,
      categoryName: product.categoryName,
      stockQuantity: product.stockQuantity,
      inStock: product.stockQuantity > 0,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
    };

    return NextResponse.json({
      success: true,
      product: storefrontProduct,
      store: {
        name: onlineStore.storeName,
        logo: onlineStore.logo,
        currency: onlineStore.currency,
      },
    });
  } catch (error) {
    console.error('Get storefront product detail error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin sản phẩm' },
      { status: 500 }
    );
  }
}
