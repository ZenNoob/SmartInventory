'use server';

import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface TransferItem {
  productId: string;
  quantity: number;
  unitId: string;
}

interface TransferredItem {
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  unitId: string;
}

interface InventoryTransferResult {
  success: boolean;
  transferId?: string;
  transferNumber?: string;
  message: string;
  transferredItems?: TransferredItem[];
  error?: string;
  code?: string;
  details?: Array<{
    productId: string;
    productName: string;
    requestedQuantity: number;
    availableQuantity: number;
  }>;
}

interface Store {
  id: string;
  name: string;
  code: string;
  address?: string;
  status: string;
}

interface ProductWithStock {
  id: string;
  name: string;
  barcode?: string;
  unitId: string;
  unitName?: string;
  currentStock: number;
  averageCost: number;
}

async function getAuthHeaders(storeId?: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (storeId) {
    headers['X-Store-Id'] = storeId;
  }
  
  return headers;
}

export async function getStoresForTransfer(): Promise<{
  success: boolean;
  stores?: Store[];
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_URL}/stores`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || 'Không thể tải danh sách cửa hàng' };
    }
    
    const stores = await response.json();
    // Filter only active stores
    const activeStores = stores.filter((s: Store) => s.status === 'active');
    return { success: true, stores: activeStores };
  } catch (error) {
    console.error('Error fetching stores:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi tải danh sách cửa hàng' };
  }
}

export async function getProductsWithStock(storeId: string): Promise<{
  success: boolean;
  products?: ProductWithStock[];
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders(storeId);
    
    const response = await fetch(`${API_URL}/products`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || 'Không thể tải danh sách sản phẩm' };
    }
    
    const products = await response.json();
    
    // Map to ProductWithStock format and filter products with stock > 0
    const productsWithStock: ProductWithStock[] = products
      .map((p: Record<string, unknown>) => ({
        id: p.id as string,
        name: p.name as string,
        barcode: p.sku as string | undefined,
        unitId: (p.unitId as string) || '',
        unitName: p.unitName as string | undefined,
        currentStock: (p.stockQuantity as number) || 0,
        averageCost: (p.costPrice as number) || 0,
      }))
      .filter((p: ProductWithStock) => p.currentStock > 0);
    
    return { success: true, products: productsWithStock };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi tải danh sách sản phẩm' };
  }
}

export async function transferInventory(
  sourceStoreId: string,
  destinationStoreId: string,
  items: TransferItem[],
  notes?: string
): Promise<InventoryTransferResult> {
  try {
    const headers = await getAuthHeaders(sourceStoreId);
    
    const response = await fetch(`${API_URL}/sync-data/inventory-transfer`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sourceStoreId,
        destinationStoreId,
        items,
        notes,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        message: data.error || 'Không thể chuyển kho',
        error: data.error,
        code: data.code,
        details: data.details,
      };
    }
    
    return {
      success: true,
      transferId: data.transferId,
      transferNumber: data.transferNumber,
      message: data.message,
      transferredItems: data.transferredItems,
    };
  } catch (error) {
    console.error('Error transferring inventory:', error);
    return {
      success: false,
      message: 'Đã xảy ra lỗi khi chuyển kho',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
