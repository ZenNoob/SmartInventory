'use server'

import { cookies } from 'next/headers';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

export interface OnlineStore {
  id: string;
  storeId: string;
  slug: string;
  customDomain?: string;
  isActive: boolean;
  storeName: string;
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
  timezone: string;
  createdAt: string;
  updatedAt: string;
  // Statistics
  productCount?: number;
  orderCount?: number;
  totalRevenue?: number;
}

export interface OnlineProduct {
  id: string;
  onlineStoreId: string;
  productId: string;
  isPublished: boolean;
  onlinePrice?: number;
  onlineDescription?: string;
  displayOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  seoSlug: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
  // Joined fields
  productName?: string;
  productBarcode?: string;
  sellingPrice?: number;
  currentStock?: number;
  categoryName?: string;
}

export interface OnlineOrder {
  id: string;
  orderNumber: string;
  onlineStoreId: string;
  customerId?: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingMethod?: string;
  shippingFee: number;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  customerNote?: string;
  internalNote?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  items?: OnlineOrderItem[];
}

export interface OnlineOrderItem {
  id: string;
  orderId: string;
  onlineProductId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type PaymentMethod = 'cod' | 'bank_transfer' | 'momo' | 'vnpay' | 'zalopay';

export interface ShippingZone {
  id: string;
  onlineStoreId: string;
  name: string;
  provinces: string[];
  flatRate?: number;
  freeShippingThreshold?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('auth-token')?.value || null;
}

async function getCurrentStoreId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('current-store-id')?.value || null;
}


// ============ Online Store Actions ============

export async function getOnlineStores(): Promise<{
  success: boolean;
  data?: OnlineStore[];
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/online-stores?storeId=${storeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy danh sách cửa hàng online' };
    }

    return { success: true, data: data.data || data.onlineStores };
  } catch (error) {
    console.error('Error fetching online stores:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy danh sách cửa hàng online' };
  }
}

export async function getOnlineStore(onlineStoreId: string): Promise<{
  success: boolean;
  data?: OnlineStore;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/online-stores/${onlineStoreId}?storeId=${storeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy thông tin cửa hàng online' };
    }

    return { success: true, data: data.onlineStore };
  } catch (error) {
    console.error('Error fetching online store:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy thông tin cửa hàng online' };
  }
}

export async function createOnlineStore(data: Partial<OnlineStore>): Promise<{
  success: boolean;
  data?: OnlineStore;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/online-stores?storeId=${storeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể tạo cửa hàng online' };
    }

    return { success: true, data: result.onlineStore };
  } catch (error) {
    console.error('Error creating online store:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi tạo cửa hàng online' };
  }
}

export async function updateOnlineStore(onlineStoreId: string, data: Partial<OnlineStore>): Promise<{
  success: boolean;
  data?: OnlineStore;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/online-stores/${onlineStoreId}?storeId=${storeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể cập nhật cửa hàng online' };
    }

    return { success: true, data: result.onlineStore };
  } catch (error) {
    console.error('Error updating online store:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi cập nhật cửa hàng online' };
  }
}

export async function deleteOnlineStore(onlineStoreId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/online-stores/${onlineStoreId}?storeId=${storeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể vô hiệu hóa cửa hàng online' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting online store:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi vô hiệu hóa cửa hàng online' };
  }
}

export async function permanentDeleteOnlineStore(onlineStoreId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/online-stores/${onlineStoreId}?storeId=${storeId}&permanent=true`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể xóa cửa hàng online' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error permanently deleting online store:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi xóa cửa hàng online' };
  }
}


// ============ Online Product Actions ============

export async function getOnlineProducts(onlineStoreId: string, publishedOnly?: boolean): Promise<{
  success: boolean;
  data?: OnlineProduct[];
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const url = new URL(`${getBaseUrl()}/api/online-stores/${onlineStoreId}/products`);
    url.searchParams.set('storeId', storeId);
    if (publishedOnly) {
      url.searchParams.set('publishedOnly', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy danh sách sản phẩm online' };
    }

    return { success: true, data: data.data || data.products };
  } catch (error) {
    console.error('Error fetching online products:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy danh sách sản phẩm online' };
  }
}

export async function createOnlineProduct(onlineStoreId: string, data: Partial<OnlineProduct>): Promise<{
  success: boolean;
  data?: OnlineProduct;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/online-stores/${onlineStoreId}/products?storeId=${storeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể thêm sản phẩm vào danh mục online' };
    }

    return { success: true, data: result.onlineProduct };
  } catch (error) {
    console.error('Error creating online product:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi thêm sản phẩm vào danh mục online' };
  }
}

export async function updateOnlineProduct(onlineStoreId: string, productId: string, data: Partial<OnlineProduct>): Promise<{
  success: boolean;
  data?: OnlineProduct;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/online-stores/${onlineStoreId}/products/${productId}?storeId=${storeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể cập nhật sản phẩm online' };
    }

    return { success: true, data: result.onlineProduct };
  } catch (error) {
    console.error('Error updating online product:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi cập nhật sản phẩm online' };
  }
}

export async function deleteOnlineProduct(onlineStoreId: string, productId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/online-stores/${onlineStoreId}/products/${productId}?storeId=${storeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể xóa sản phẩm khỏi danh mục online' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting online product:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi xóa sản phẩm khỏi danh mục online' };
  }
}


// ============ Online Order Actions ============

export async function getOnlineOrders(onlineStoreId: string, filters?: {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{
  success: boolean;
  data?: OnlineOrder[];
  statistics?: {
    statusCounts: Record<string, number>;
    total: number;
  };
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const url = new URL(`${getBaseUrl()}/api/online-stores/${onlineStoreId}/orders`);
    url.searchParams.set('storeId', storeId);
    if (filters?.status) url.searchParams.set('status', filters.status);
    if (filters?.paymentStatus) url.searchParams.set('paymentStatus', filters.paymentStatus);
    if (filters?.customerId) url.searchParams.set('customerId', filters.customerId);
    if (filters?.search) url.searchParams.set('search', filters.search);
    if (filters?.startDate) url.searchParams.set('startDate', filters.startDate);
    if (filters?.endDate) url.searchParams.set('endDate', filters.endDate);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy danh sách đơn hàng' };
    }

    return { 
      success: true, 
      data: data.data || data.orders,
      statistics: data.statistics,
    };
  } catch (error) {
    console.error('Error fetching online orders:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy danh sách đơn hàng' };
  }
}

export async function getOnlineOrder(onlineStoreId: string, orderId: string): Promise<{
  success: boolean;
  data?: OnlineOrder;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/online-stores/${onlineStoreId}/orders/${orderId}?storeId=${storeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy thông tin đơn hàng' };
    }

    return { success: true, data: data.order };
  } catch (error) {
    console.error('Error fetching online order:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy thông tin đơn hàng' };
  }
}

export async function updateOnlineOrderStatus(onlineStoreId: string, orderId: string, status: OrderStatus): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/online-stores/${onlineStoreId}/orders/${orderId}?storeId=${storeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify({ status }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể cập nhật trạng thái đơn hàng' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi cập nhật trạng thái đơn hàng' };
  }
}


// ============ Shipping Zone Actions ============

export async function getShippingZones(onlineStoreId: string, activeOnly?: boolean): Promise<{
  success: boolean;
  data?: ShippingZone[];
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const url = new URL(`${getBaseUrl()}/api/online-stores/${onlineStoreId}/shipping`);
    url.searchParams.set('storeId', storeId);
    if (activeOnly) {
      url.searchParams.set('activeOnly', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy danh sách vùng giao hàng' };
    }

    return { success: true, data: data.data || data.shippingZones };
  } catch (error) {
    console.error('Error fetching shipping zones:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy danh sách vùng giao hàng' };
  }
}

export async function createShippingZone(onlineStoreId: string, data: Partial<ShippingZone>): Promise<{
  success: boolean;
  data?: ShippingZone;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/online-stores/${onlineStoreId}/shipping?storeId=${storeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể tạo vùng giao hàng' };
    }

    return { success: true, data: result.shippingZone };
  } catch (error) {
    console.error('Error creating shipping zone:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi tạo vùng giao hàng' };
  }
}

export async function updateShippingZone(onlineStoreId: string, zoneId: string, data: Partial<ShippingZone>): Promise<{
  success: boolean;
  data?: ShippingZone;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/online-stores/${onlineStoreId}/shipping/${zoneId}?storeId=${storeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể cập nhật vùng giao hàng' };
    }

    return { success: true, data: result.shippingZone };
  } catch (error) {
    console.error('Error updating shipping zone:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi cập nhật vùng giao hàng' };
  }
}

export async function deleteShippingZone(onlineStoreId: string, zoneId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/online-stores/${onlineStoreId}/shipping/${zoneId}?storeId=${storeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Không thể xóa vùng giao hàng' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting shipping zone:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi xóa vùng giao hàng' };
  }
}
