'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStorefront } from '../layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, MapPin, User, LogOut } from 'lucide-react';

export default function AccountPage() {
  const router = useRouter();
  const { store, customer, setCustomer } = useStorefront();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!customer && store?.slug) {
      router.push(`/store/${store.slug}/login`);
    }
  }, [customer, store?.slug, router]);

  const handleLogout = async () => {
    try {
      await fetch(`/api/storefront/${store?.slug}/auth/logout`, {
        method: 'POST',
      });
      setCustomer(null);
      router.push(`/store/${store?.slug}`);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Tài khoản của tôi</h1>
          <p className="text-gray-600 mt-1">
            Xin chào, {customer.firstName} {customer.lastName}!
          </p>
        </div>

        {/* Account Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Thông tin tài khoản
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Họ tên</p>
                <p className="font-medium">{customer.firstName} {customer.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{customer.email}</p>
              </div>
              {customer.phone && (
                <div>
                  <p className="text-sm text-gray-500">Số điện thoại</p>
                  <p className="font-medium">{customer.phone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <Link href={`/store/${store?.slug}/account/orders`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" style={{ color: store?.primaryColor }} />
                  Đơn hàng của tôi
                </CardTitle>
                <CardDescription>
                  Xem lịch sử và theo dõi đơn hàng
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/store/${store?.slug}/account/addresses`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" style={{ color: store?.primaryColor }} />
                  Địa chỉ giao hàng
                </CardTitle>
                <CardDescription>
                  Quản lý địa chỉ giao hàng của bạn
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Đăng xuất
        </Button>
      </div>
    </div>
  );
}
