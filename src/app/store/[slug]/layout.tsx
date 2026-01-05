'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { StorefrontHeader } from './components/storefront-header';
import { StorefrontFooter } from './components/storefront-footer';
import { Toaster } from '@/components/ui/toaster';

/**
 * Store configuration interface for storefront theming
 */
export interface StoreConfig {
  id: string;
  storeName: string;
  slug: string;
  logo?: string;
  favicon?: string;
  description?: string;
  themeId: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  currency: string;
}

/**
 * Cart item interface
 */
export interface CartItem {
  id: string;
  onlineProductId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  images?: string[];
}

/**
 * Cart interface
 */
export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
  itemCount: number;
}

/**
 * Customer interface
 */
export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

/**
 * Storefront context interface
 */
interface StorefrontContextType {
  store: StoreConfig | null;
  cart: Cart | null;
  customer: Customer | null;
  isLoading: boolean;
  refreshCart: () => Promise<void>;
  setCustomer: (customer: Customer | null) => void;
}

const StorefrontContext = createContext<StorefrontContextType | undefined>(undefined);

/**
 * Hook to access storefront context
 */
export function useStorefront() {
  const context = useContext(StorefrontContext);
  if (!context) {
    throw new Error('useStorefront must be used within StorefrontProvider');
  }
  return context;
}

interface StorefrontLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default function StorefrontLayout({ children, params }: StorefrontLayoutProps) {
  const [slug, setSlug] = useState<string>('');
  const [store, setStore] = useState<StoreConfig | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve params
  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);

  // Fetch store config and cart
  useEffect(() => {
    if (!slug) return;

    const fetchStoreData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch store config via products API (includes store info)
        const productsRes = await fetch(`/api/storefront/${slug}/products`);
        if (!productsRes.ok) {
          if (productsRes.status === 404) {
            setError('Cửa hàng không tồn tại hoặc đang tạm ngưng hoạt động');
          } else {
            setError('Không thể tải thông tin cửa hàng');
          }
          return;
        }
        
        const productsData = await productsRes.json();
        
        // Fetch full store config
        const storeRes = await fetch(`/api/storefront/${slug}/config`);
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          setStore(storeData.store);
        } else {
          // Fallback to basic store info from products
          setStore({
            id: '',
            storeName: productsData.store?.name || 'Store',
            slug,
            logo: productsData.store?.logo,
            primaryColor: '#3B82F6',
            secondaryColor: '#10B981',
            fontFamily: 'Inter',
            themeId: 'default',
            contactEmail: '',
            currency: productsData.store?.currency || 'VND',
          });
        }

        // Fetch cart
        await refreshCart();
        
      } catch (err) {
        console.error('Error fetching store data:', err);
        setError('Đã xảy ra lỗi khi tải dữ liệu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStoreData();
  }, [slug]);

  const refreshCart = async () => {
    if (!slug) return;
    
    try {
      const cartRes = await fetch(`/api/storefront/${slug}/cart`);
      if (cartRes.ok) {
        const cartData = await cartRes.json();
        setCart(cartData.cart);
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
    }
  };

  // Apply theme CSS variables
  useEffect(() => {
    if (store) {
      document.documentElement.style.setProperty('--storefront-primary', store.primaryColor);
      document.documentElement.style.setProperty('--storefront-secondary', store.secondaryColor);
      document.documentElement.style.setProperty('--storefront-font', store.fontFamily);
    }
  }, [store]);

  if (error) {
    return (
      <html lang="vi">
        <body className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy cửa hàng</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="vi">
      <head>
        {store?.favicon && <link rel="icon" href={store.favicon} />}
        <title>{store?.storeName || 'Cửa hàng'}</title>
        <meta name="description" content={store?.description || ''} />
      </head>
      <body 
        className="min-h-screen bg-gray-50"
        style={{
          fontFamily: store?.fontFamily || 'Inter, sans-serif',
        }}
      >
        <StorefrontContext.Provider 
          value={{ 
            store, 
            cart, 
            customer, 
            isLoading, 
            refreshCart,
            setCustomer,
          }}
        >
          <div className="flex flex-col min-h-screen">
            <StorefrontHeader />
            <main className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                children
              )}
            </main>
            <StorefrontFooter />
          </div>
        </StorefrontContext.Provider>
        <Toaster />
      </body>
    </html>
  );
}
