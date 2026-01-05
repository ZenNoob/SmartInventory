'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useStorefront } from '../layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

export default function ShoppingCartPage() {
  const router = useRouter();
  const { store, cart, refreshCart } = useStorefront();
  const { toast } = useToast();
  
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (!store?.slug || newQuantity < 0) return;
    
    setUpdatingItems(prev => new Set(prev).add(itemId));
    try {
      const res = await fetch(`/api/storefront/${store.slug}/cart`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity: newQuantity }),
      });
      
      if (res.ok) {
        await refreshCart();
      } else {
        const data = await res.json();
        toast({
          title: 'Lỗi',
          description: data.error || 'Không thể cập nhật số lượng',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating cart:', error);
      toast({
        title: 'Lỗi',
        description: 'Đã xảy ra lỗi khi cập nhật giỏ hàng',
        variant: 'destructive',
      });
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!store?.slug) return;
    
    setRemovingItems(prev => new Set(prev).add(itemId));
    try {
      const res = await fetch(`/api/storefront/${store.slug}/cart?itemId=${itemId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        await refreshCart();
        toast({
          title: 'Đã xóa',
          description: 'Sản phẩm đã được xóa khỏi giỏ hàng',
        });
      } else {
        const data = await res.json();
        toast({
          title: 'Lỗi',
          description: data.error || 'Không thể xóa sản phẩm',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error removing item:', error);
      toast({
        title: 'Lỗi',
        description: 'Đã xảy ra lỗi khi xóa sản phẩm',
        variant: 'destructive',
      });
    } finally {
      setRemovingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleProceedToCheckout = () => {
    router.push(`/store/${store?.slug}/checkout`);
  };

  // Empty cart state
  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h1>
          <p className="text-gray-500 mb-6">
            Bạn chưa có sản phẩm nào trong giỏ hàng
          </p>
          <Link href={`/store/${store?.slug}/products`}>
            <Button 
              style={{ backgroundColor: store?.primaryColor }}
              className="text-white"
            >
              Tiếp tục mua sắm
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
        Giỏ hàng ({cart.itemCount} sản phẩm)
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <Card key={item.id} className={removingItems.has(item.id) ? 'opacity-50' : ''}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                    {item.images?.[0] ? (
                      <Image
                        src={item.images[0]}
                        alt={item.productName}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        Không có ảnh
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 line-clamp-2">
                      {item.productName}
                    </h3>
                    {item.productSku && (
                      <p className="text-sm text-gray-500">SKU: {item.productSku}</p>
                    )}
                    <p 
                      className="font-semibold mt-1"
                      style={{ color: store?.primaryColor }}
                    >
                      {formatCurrency(item.unitPrice)} {store?.currency || 'VND'}
                    </p>
                  </div>

                  {/* Quantity & Actions */}
                  <div className="flex flex-col items-end gap-2">
                    {/* Quantity Controls */}
                    <div className="flex items-center border rounded-md">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={updatingItems.has(item.id) || item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val > 0) handleUpdateQuantity(item.id, val);
                        }}
                        className="w-12 h-8 text-center border-0 focus-visible:ring-0 text-sm"
                        disabled={updatingItems.has(item.id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={updatingItems.has(item.id)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Item Total */}
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(item.totalPrice)} {store?.currency || 'VND'}
                    </p>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={removingItems.has(item.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Xóa
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Continue Shopping */}
          <div className="pt-4">
            <Link href={`/store/${store?.slug}/products`}>
              <Button variant="outline">
                ← Tiếp tục mua sắm
              </Button>
            </Link>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Tóm tắt đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tạm tính</span>
                <span>{formatCurrency(cart.subtotal)} {store?.currency || 'VND'}</span>
              </div>
              
              {cart.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Giảm giá</span>
                  <span>-{formatCurrency(cart.discountAmount)} {store?.currency || 'VND'}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Phí vận chuyển</span>
                <span className="text-gray-500">Tính khi thanh toán</span>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Tổng cộng</span>
                  <span style={{ color: store?.primaryColor }}>
                    {formatCurrency(cart.subtotal - cart.discountAmount)} {store?.currency || 'VND'}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full text-white"
                size="lg"
                style={{ backgroundColor: store?.primaryColor }}
                onClick={handleProceedToCheckout}
              >
                Tiến hành thanh toán
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
