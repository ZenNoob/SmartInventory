'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStorefront } from '../../layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Package, ChevronLeft, ShoppingBag } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  total: number;
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

const statusLabels: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const paymentStatusLabels: Record<string, string> = {
  pending: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền',
  failed: 'Thanh toán thất bại',
};

export default function OrdersPage() {
  const router = useRouter();
  const { store, customer } = useStorefront();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!customer && store?.slug) {
      router.push(`/store/${store.slug}/login`);
    }
  }, [customer, store?.slug, router]);

  // Fetch orders
  useEffect(() => {
    if (!store?.slug || !customer) return;

    const fetchOrders = async () => {
      try {
        const res = await fetch(`/api/storefront/${store.slug}/customer/orders`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [store?.slug, customer]);

  if (!customer) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/store/${store?.slug}/account`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Quay lại tài khoản
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Đơn hàng của tôi</h1>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Chưa có đơn hàng</h2>
            <p className="text-gray-500 mb-6">
              Bạn chưa có đơn hàng nào. Hãy bắt đầu mua sắm!
            </p>
            <Link href={`/store/${store?.slug}/products`}>
              <Button style={{ backgroundColor: store?.primaryColor }} className="text-white">
                Mua sắm ngay
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-gray-400" />
                      <div>
                        <CardTitle className="text-base">
                          Đơn hàng #{order.orderNumber}
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[order.status] || 'bg-gray-100 text-gray-800'}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t">
                    <div className="space-y-1">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">Thanh toán:</span>
                        <span className={order.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}>
                          {paymentStatusLabels[order.paymentStatus] || order.paymentStatus}
                        </span>
                      </div>
                      {order.shippedAt && (
                        <p className="text-sm text-gray-500">
                          Đã giao cho vận chuyển: {new Date(order.shippedAt).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                      {order.deliveredAt && (
                        <p className="text-sm text-green-600">
                          Đã giao: {new Date(order.deliveredAt).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Tổng cộng</p>
                      <p 
                        className="text-lg font-bold"
                        style={{ color: store?.primaryColor }}
                      >
                        {formatCurrency(order.total)} {store?.currency}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
