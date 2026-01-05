'use server'

import { cookies } from 'next/headers';
import * as xlsx from 'xlsx';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

interface Product {
  id: string;
  storeId: string;
  name: string;
  barcode?: string;
  description?: string;
  categoryId: string;
  unitId: string;
  sellingPrice?: number;
  status: 'active' | 'draft' | 'archived';
  lowStockThreshold?: number;
  createdAt: string;
  updatedAt: string;
}

interface ProductWithStock extends Product {
  currentStock: number;
  averageCost: number;
  categoryName?: string;
  unitName?: string;
}

interface PurchaseLot {
  id: string;
  productId: string;
  storeId: string;
  importDate: string;
  quantity: number;
  remainingQuantity: number;
  cost: number;
  unitId: string;
  purchaseOrderId?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get auth token from cookies
 */
async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('auth-token')?.value || null;
}

/**
 * Get current store ID from cookies
 */
async function getCurrentStoreId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('current-store-id')?.value || null;
}


/**
 * Fetch all products for the current store with pagination
 */
export async function getProducts(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  status?: string;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}): Promise<{ 
  success: boolean; 
  data?: ProductWithStock[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string 
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

    const url = new URL(`${getBaseUrl()}/api/products`);
    url.searchParams.set('storeId', storeId);
    
    if (options?.page) url.searchParams.set('page', options.page.toString());
    if (options?.pageSize) url.searchParams.set('pageSize', options.pageSize.toString());
    if (options?.search) url.searchParams.set('search', options.search);
    if (options?.categoryId) url.searchParams.set('categoryId', options.categoryId);
    if (options?.status) url.searchParams.set('status', options.status);
    if (options?.orderBy) url.searchParams.set('orderBy', options.orderBy);
    if (options?.orderDirection) url.searchParams.set('orderDirection', options.orderDirection);

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
      return { success: false, error: data.error || 'Không thể lấy danh sách sản phẩm' };
    }

    return { 
      success: true, 
      data: data.data,
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: data.totalPages,
    };
  } catch (error: unknown) {
    console.error('Error fetching products:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy danh sách sản phẩm' };
  }
}

/**
 * Get a single product by ID with stock info
 */
export async function getProduct(productId: string): Promise<{ 
  success: boolean; 
  product?: ProductWithStock;
  purchaseLots?: PurchaseLot[];
  error?: string 
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

    const response = await fetch(`${getBaseUrl()}/api/products/${productId}?storeId=${storeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể lấy thông tin sản phẩm' };
    }

    return { success: true, product: data.product, purchaseLots: data.purchaseLots };
  } catch (error: unknown) {
    console.error('Error fetching product:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy thông tin sản phẩm' };
  }
}


/**
 * Find product by barcode
 */
export async function getProductByBarcode(barcode: string): Promise<{ 
  success: boolean; 
  product?: ProductWithStock;
  error?: string 
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

    const response = await fetch(`${getBaseUrl()}/api/products/barcode/${encodeURIComponent(barcode)}?storeId=${storeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không tìm thấy sản phẩm' };
    }

    return { success: true, product: data.product };
  } catch (error: unknown) {
    console.error('Error fetching product by barcode:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi tìm sản phẩm' };
  }
}

/**
 * Create or update a product
 */
export async function upsertProduct(product: Partial<Product>): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const isUpdate = !!product.id;
    const url = isUpdate 
      ? `${getBaseUrl()}/api/products/${product.id}?storeId=${storeId}`
      : `${getBaseUrl()}/api/products?storeId=${storeId}`;

    const response = await fetch(url, {
      method: isUpdate ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify({
        name: product.name,
        barcode: product.barcode,
        description: product.description,
        categoryId: product.categoryId,
        unitId: product.unitId,
        sellingPrice: product.sellingPrice,
        status: product.status,
        lowStockThreshold: product.lowStockThreshold,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể tạo hoặc cập nhật sản phẩm' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error upserting product:', error);
    return { success: false, error: 'Không thể tạo hoặc cập nhật sản phẩm' };
  }
}


/**
 * Update product status
 */
export async function updateProductStatus(
  productId: string, 
  status: 'active' | 'draft' | 'archived'
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/products/${productId}?storeId=${storeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể cập nhật trạng thái sản phẩm' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating product status:', error);
    return { success: false, error: 'Không thể cập nhật trạng thái sản phẩm' };
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const response = await fetch(`${getBaseUrl()}/api/products/${productId}?storeId=${storeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': storeId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Không thể xóa sản phẩm' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting product:', error);
    return { success: false, error: 'Không thể xóa sản phẩm' };
  }
}


/**
 * Get low stock products
 */
export async function getLowStockProducts(): Promise<{ 
  success: boolean; 
  products?: ProductWithStock[];
  error?: string 
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

    // Use the products API with status filter for active products
    // The low stock filtering will be done on the client side based on threshold
    const url = new URL(`${getBaseUrl()}/api/products`);
    url.searchParams.set('storeId', storeId);
    url.searchParams.set('status', 'active');
    url.searchParams.set('pageSize', '1000'); // Get all active products

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
      return { success: false, error: data.error || 'Không thể lấy danh sách sản phẩm' };
    }

    // Filter products with low stock
    const lowStockProducts = (data.data as ProductWithStock[]).filter(product => {
      const threshold = product.lowStockThreshold ?? 10;
      return product.currentStock <= threshold;
    });

    return { success: true, products: lowStockProducts };
  } catch (error: unknown) {
    console.error('Error fetching low stock products:', error);
    return { success: false, error: 'Đã xảy ra lỗi khi lấy danh sách sản phẩm tồn kho thấp' };
  }
}

/**
 * Generate product template for import
 */
export async function generateProductTemplate(): Promise<{ success: boolean; error?: string; data?: string }> {
  try {
    const headers = [
      "name", "barcode", "categoryId", "unitId", "sellingPrice", "status", "lowStockThreshold"
    ];
    const ws = xlsx.utils.aoa_to_sheet([headers]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Products");
    const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
    
    return { success: true, data: buffer.toString('base64') };
  } catch (error: unknown) {
    console.error("Error generating product template:", error);
    return { success: false, error: 'Không thể tạo file mẫu.' };
  }
}


/**
 * Import products from Excel file
 */
export async function importProducts(base64Data: string): Promise<{ success: boolean; error?: string; createdCount?: number }> {
  try {
    const token = await getAuthToken();
    const storeId = await getCurrentStoreId();

    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    if (!storeId) {
      return { success: false, error: 'Chưa chọn cửa hàng' };
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const productsData = xlsx.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

    if (productsData.length === 0) {
      return { success: false, error: "File không có dữ liệu." };
    }

    let createdCount = 0;
    const errors: string[] = [];

    for (const row of productsData) {
      const name = row.name as string;
      const categoryId = row.categoryId as string;
      const unitId = row.unitId as string;

      // Basic validation
      if (!name || !categoryId || !unitId) {
        errors.push(`Bỏ qua dòng do thiếu trường bắt buộc (name, categoryId, unitId)`);
        continue;
      }

      const response = await fetch(`${getBaseUrl()}/api/products?storeId=${storeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Store-Id': storeId,
        },
        body: JSON.stringify({
          name,
          barcode: row.barcode || undefined,
          categoryId,
          unitId,
          sellingPrice: row.sellingPrice ? parseFloat(row.sellingPrice as string) : undefined,
          status: ['active', 'draft', 'archived'].includes(row.status as string) ? row.status : 'draft',
          lowStockThreshold: row.lowStockThreshold ? parseFloat(row.lowStockThreshold as string) : undefined,
        }),
      });

      if (response.ok) {
        createdCount++;
      } else {
        const data = await response.json();
        errors.push(`Lỗi tạo sản phẩm "${name}": ${data.error}`);
      }
    }

    if (errors.length > 0 && createdCount === 0) {
      return { success: false, error: errors.join('; ') };
    }

    return { success: true, createdCount };
  } catch (error: unknown) {
    console.error("Error importing products:", error);
    return { success: false, error: 'Không thể nhập file sản phẩm.' };
  }
}
