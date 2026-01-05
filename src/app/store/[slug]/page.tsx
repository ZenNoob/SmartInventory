'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStorefront } from './layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, ArrowRight } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  price: number;
  description?: string;
  images: string[];
  categoryName?: string;
  stockQuantity: number;
  inStock: boolean;
}

export default function StorefrontHomePage() {
  const { store, refreshCart } = useStorefront();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    if (!store?.slug) return;

    const fetchProducts = async () => {
      try {
        const res = await fetch(`/api/storefront/${store.slug}/products`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [store?.slug]);

  const handleAddToCart = async (productId: string) => {
    if (!store?.slug) return;
    
    setAddingToCart(productId);
    try {
      const res = await fetch(`/api/storefront/${store.slug}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      
      if (res.ok) {
        await refreshCart();
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAddingToCart(null);
    }
  };

  // Featured products (first 8)
  const featuredProducts = products.slice(0, 8);

  return (
    <div>
      {/* Hero Section */}
      <section 
        className="py-16 px-4"
        style={{ 
          background: `linear-gradient(135deg, ${store?.primaryColor || '#3B82F6'}15, ${store?.secondaryColor || '#10B981'}15)` 
        }}
      >
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Chào mừng đến với {store?.storeName}
          </h1>
          {store?.description && (
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              {store.description}
            </p>
          )}
          <Link href={`/store/${store?.slug}/products`}>
            <Button 
              size="lg"
              style={{ backgroundColor: store?.primaryColor || '#3B82F6' }}
              className="text-white hover:opacity-90"
            >
              Xem sản phẩm
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Sản phẩm nổi bật</h2>
            <Link 
              href={`/store/${store?.slug}/products`}
              className="text-sm font-medium hover:underline"
              style={{ color: store?.primaryColor || '#3B82F6' }}
            >
              Xem tất cả →
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-square bg-gray-200" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Chưa có sản phẩm nào
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.map((product) => (
                <Card key={product.id} className="group overflow-hidden">
                  <Link href={`/store/${store?.slug}/products/${product.slug}`}>
                    <div className="aspect-square relative bg-gray-100 overflow-hidden">
                      {product.images?.[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          Không có ảnh
                        </div>
                      )}
                      {!product.inStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-medium">Hết hàng</span>
                        </div>
                      )}
                    </div>
                  </Link>
                  <CardContent className="p-4">
                    <Link href={`/store/${store?.slug}/products/${product.slug}`}>
                      <h3 className="font-medium text-gray-900 line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    {product.categoryName && (
                      <p className="text-xs text-gray-500 mb-2">{product.categoryName}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span 
                        className="font-bold"
                        style={{ color: store?.primaryColor || '#3B82F6' }}
                      >
                        {formatCurrency(product.price)} {store?.currency || 'VND'}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!product.inStock || addingToCart === product.id}
                        onClick={(e) => {
                          e.preventDefault();
                          handleAddToCart(product.id);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
