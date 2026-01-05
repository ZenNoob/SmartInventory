'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useStorefront } from '../layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Search, Filter, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

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

type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'newest';

export default function ProductCatalogPage() {
  const { store, refreshCart } = useStorefront();
  const searchParams = useSearchParams();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Fetch products
  useEffect(() => {
    if (!store?.slug) return;

    const fetchProducts = async () => {
      try {
        const res = await fetch(`/api/storefront/${store.slug}/products`);
        if (res.ok) {
          const data = await res.json();
          const productList = data.products || [];
          setProducts(productList);
          
          // Extract unique categories
          const uniqueCategories = [...new Set(
            productList
              .map((p: Product) => p.categoryName)
              .filter(Boolean)
          )] as string[];
          setCategories(uniqueCategories);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [store?.slug]);

  // Apply filters and sorting
  const applyFilters = useCallback(() => {
    let result = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter(p => p.categoryName === selectedCategory);
    }

    // In stock filter
    if (showInStockOnly) {
      result = result.filter(p => p.inStock);
    }

    // Sorting
    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
      default:
        // Keep original order (newest first from API)
        break;
    }

    setFilteredProducts(result);
  }, [products, searchQuery, selectedCategory, sortBy, showInStockOnly]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

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

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('newest');
    setShowInStockOnly(false);
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || showInStockOnly;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sản phẩm</h1>
        <p className="text-gray-600">
          {filteredProducts.length} sản phẩm
          {hasActiveFilters && ' (đã lọc)'}
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Tìm kiếm sản phẩm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:flex items-center gap-4">
          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Danh mục" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả danh mục</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sắp xếp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mới nhất</SelectItem>
              <SelectItem value="name-asc">Tên A-Z</SelectItem>
              <SelectItem value="name-desc">Tên Z-A</SelectItem>
              <SelectItem value="price-asc">Giá thấp đến cao</SelectItem>
              <SelectItem value="price-desc">Giá cao đến thấp</SelectItem>
            </SelectContent>
          </Select>

          {/* In Stock Toggle */}
          <Button
            variant={showInStockOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowInStockOnly(!showInStockOnly)}
            style={showInStockOnly ? { backgroundColor: store?.primaryColor } : {}}
          >
            Còn hàng
          </Button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {/* Mobile Filter Button */}
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="md:hidden">
              <Filter className="h-4 w-4 mr-2" />
              Bộ lọc
              {hasActiveFilters && (
                <span 
                  className="ml-2 h-5 w-5 rounded-full text-xs text-white flex items-center justify-center"
                  style={{ backgroundColor: store?.primaryColor }}
                >
                  !
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Bộ lọc</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 mt-6">
              {/* Category */}
              <div>
                <label className="text-sm font-medium mb-2 block">Danh mục</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả danh mục</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div>
                <label className="text-sm font-medium mb-2 block">Sắp xếp</label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sắp xếp theo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Mới nhất</SelectItem>
                    <SelectItem value="name-asc">Tên A-Z</SelectItem>
                    <SelectItem value="name-desc">Tên Z-A</SelectItem>
                    <SelectItem value="price-asc">Giá thấp đến cao</SelectItem>
                    <SelectItem value="price-desc">Giá cao đến thấp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* In Stock */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={showInStockOnly}
                  onChange={(e) => setShowInStockOnly(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="inStock" className="text-sm">Chỉ hiện sản phẩm còn hàng</label>
              </div>

              <div className="flex gap-2 mt-4">
                <Button 
                  className="flex-1"
                  onClick={() => setFilterOpen(false)}
                  style={{ backgroundColor: store?.primaryColor }}
                >
                  Áp dụng
                </Button>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Xóa bộ lọc
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(12)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">
            {hasActiveFilters 
              ? 'Không tìm thấy sản phẩm phù hợp với bộ lọc'
              : 'Chưa có sản phẩm nào'
            }
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Xóa bộ lọc
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map((product) => (
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
  );
}
