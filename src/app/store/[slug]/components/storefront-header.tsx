'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStorefront } from '../layout';
import { ShoppingCart, Menu, X, User, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function StorefrontHeader() {
  const { store, cart, customer, setCustomer } = useStorefront();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/store/${store?.slug}?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`/api/storefront/${store?.slug}/auth/logout`, {
        method: 'POST',
      });
      setCustomer(null);
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const cartItemCount = cart?.itemCount || 0;

  return (
    <header 
      className="sticky top-0 z-50 bg-white border-b shadow-sm"
      style={{ 
        borderBottomColor: store?.primaryColor || '#3B82F6',
        borderBottomWidth: '2px',
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`/store/${store?.slug}`} className="flex items-center gap-2">
            {store?.logo ? (
              <Image
                src={store.logo}
                alt={store.storeName}
                width={40}
                height={40}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div 
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: store?.primaryColor || '#3B82F6' }}
              >
                {store?.storeName?.charAt(0) || 'S'}
              </div>
            )}
            <span className="font-bold text-lg text-gray-900 hidden sm:block">
              {store?.storeName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href={`/store/${store?.slug}`}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Trang chủ
            </Link>
            <Link 
              href={`/store/${store?.slug}/products`}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sản phẩm
            </Link>
          </nav>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4"
              />
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* User Menu */}
            {customer ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden sm:flex">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm font-medium">
                    {customer.firstName} {customer.lastName}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/store/${store?.slug}/account`}>
                      Tài khoản
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/store/${store?.slug}/account/orders`}>
                      Đơn hàng
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href={`/store/${store?.slug}/login`}>
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}

            {/* Cart */}
            <Link href={`/store/${store?.slug}/cart`}>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs text-white flex items-center justify-center"
                    style={{ backgroundColor: store?.primaryColor || '#3B82F6' }}
                  >
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <div className="flex flex-col gap-4 mt-6">
                  {/* Mobile Search */}
                  <form onSubmit={handleSearch}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="search"
                        placeholder="Tìm kiếm..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </form>

                  {/* Mobile Navigation */}
                  <nav className="flex flex-col gap-2">
                    <Link 
                      href={`/store/${store?.slug}`}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Trang chủ
                    </Link>
                    <Link 
                      href={`/store/${store?.slug}/products`}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sản phẩm
                    </Link>
                  </nav>

                  <div className="border-t pt-4">
                    {customer ? (
                      <>
                        <div className="px-4 py-2 font-medium">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <Link 
                          href={`/store/${store?.slug}/account`}
                          className="block px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Tài khoản
                        </Link>
                        <Link 
                          href={`/store/${store?.slug}/account/orders`}
                          className="block px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Đơn hàng
                        </Link>
                        <button
                          onClick={() => {
                            handleLogout();
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 rounded-md"
                        >
                          Đăng xuất
                        </button>
                      </>
                    ) : (
                      <Link 
                        href={`/store/${store?.slug}/login`}
                        className="block px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Đăng nhập
                      </Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
