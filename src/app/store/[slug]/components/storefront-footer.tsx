'use client';

import Link from 'next/link';
import { useStorefront } from '../layout';
import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';

export function StorefrontFooter() {
  const { store } = useStorefront();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Store Info */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">
              {store?.storeName}
            </h3>
            {store?.description && (
              <p className="text-sm text-gray-400 mb-4">
                {store.description}
              </p>
            )}
            {/* Social Links */}
            <div className="flex gap-4">
              {store?.facebookUrl && (
                <a
                  href={store.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {store?.instagramUrl && (
                <a
                  href={store.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Liên kết</h3>
            <nav className="flex flex-col gap-2">
              <Link 
                href={`/store/${store?.slug}`}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Trang chủ
              </Link>
              <Link 
                href={`/store/${store?.slug}/products`}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Sản phẩm
              </Link>
              <Link 
                href={`/store/${store?.slug}/cart`}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Giỏ hàng
              </Link>
              <Link 
                href={`/store/${store?.slug}/account`}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Tài khoản
              </Link>
            </nav>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Liên hệ</h3>
            <div className="flex flex-col gap-3">
              {store?.contactEmail && (
                <a 
                  href={`mailto:${store.contactEmail}`}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {store.contactEmail}
                </a>
              )}
              {store?.contactPhone && (
                <a 
                  href={`tel:${store.contactPhone}`}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {store.contactPhone}
                </a>
              )}
              {store?.address && (
                <div className="flex items-start gap-2 text-sm text-gray-400">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{store.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          <p>
            © {new Date().getFullYear()} {store?.storeName}. Tất cả quyền được bảo lưu.
          </p>
          <p className="mt-1">
            Powered by SmartInventory
          </p>
        </div>
      </div>
    </footer>
  );
}
