'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useStorefront } from '../../layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingCart, 
  Minus, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Check,
  X
} from 'lucide-react';

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
  seoTitle?: string;
  seoDescription?: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { store, refreshCart } = useStorefront();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const productSlug = params.productSlug as string;

  useEffect(() => {
    if (!store?.slug || !productSlug) return;

    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/storefront/${store.slug}/products/${productSlug}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data.product);
        } else if (res.status === 404) {
          router.push(`/store/${store.slug}/products`);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [store?.slug, productSlug, router]);

  const handleQuantityChange = (value: number) => {
    if (value < 1) return;
    if (product && value > product.stockQuantity) {
      setQuantity(product.stockQuantity);
      return;
    }
    setQuantity(value);
  };

  const handleAddToCart = async () => {
    if (!store?.slug || !product) return;
    
    setIsAddingToCart(true);
    try {
      const res = await fetch(`/api/storefront/${store.slug}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      
      if (res.ok) {
        await refreshCart();
        toast({
          title: 'Đã thêm vào giỏ hàng',
          description: `${product.name} x ${quantity}`,
        });
      } else {
        const data = await res.json();
        toast({
          title: 'Lỗi',
          description: data.error || 'Không thể thêm vào giỏ hàng',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Lỗi',
        description: 'Đã xảy ra lỗi khi thêm vào giỏ hàng',
        variant: 'destructive',
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const nextImage = () => {
    if (product?.images) {
      setSelectedImageIndex((prev) => 
        prev === product.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (product?.images) {
      setSelectedImageIndex((prev) => 
        prev === 0 ? product.images.length - 1 : prev - 1
      );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-200 animate-pulse rounded-lg" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 animate-pulse rounded w-3/4" />
            <div className="h-6 bg-gray-200 animate-pulse rounded w-1/4" />
            <div className="h-24 bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Không tìm thấy sản phẩm</p>
        <Link href={`/store/${store?.slug}/products`}>
          <Button variant="outline" className="mt-4">
            Quay lại danh sách sản phẩm
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href={`/store/${store?.slug}`} className="hover:text-gray-900">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href={`/store/${store?.slug}/products`} className="hover:text-gray-900">
          Sản phẩm
        </Link>
        <span>/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Images */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
            {product.images?.length > 0 ? (
              <>
                <Image
                  src={product.images[selectedImageIndex]}
                  alt={product.name}
                  fill
                  className="object-contain"
                  priority
                />
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                Không có ảnh
              </div>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {product.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-colors ${
                    index === selectedImageIndex 
                      ? 'border-blue-500' 
                      : 'border-transparent hover:border-gray-300'
                  }`}
                  style={index === selectedImageIndex ? { borderColor: store?.primaryColor } : {}}
                >
                  <Image
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Category */}
          {product.categoryName && (
            <p className="text-sm text-gray-500">{product.categoryName}</p>
          )}

          {/* Name */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {product.name}
          </h1>

          {/* SKU */}
          {product.sku && (
            <p className="text-sm text-gray-500">SKU: {product.sku}</p>
          )}

          {/* Price */}
          <div 
            className="text-3xl font-bold"
            style={{ color: store?.primaryColor || '#3B82F6' }}
          >
            {formatCurrency(product.price)} {store?.currency || 'VND'}
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            {product.inStock ? (
              <>
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-green-600">
                  Còn hàng ({product.stockQuantity} sản phẩm)
                </span>
              </>
            ) : (
              <>
                <X className="h-5 w-5 text-red-500" />
                <span className="text-red-600">Hết hàng</span>
              </>
            )}
          </div>

          {/* Quantity & Add to Cart */}
          {product.inStock && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Số lượng:</span>
                <div className="flex items-center border rounded-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={product.stockQuantity}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    className="w-16 h-10 text-center border-0 focus-visible:ring-0"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= product.stockQuantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full text-white"
                style={{ backgroundColor: store?.primaryColor || '#3B82F6' }}
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {isAddingToCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
              </Button>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-3">Mô tả sản phẩm</h2>
              <div 
                className="text-gray-600 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
