'use client';

import { apiClient } from '@/lib/api-client';

interface GetProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  status?: string;
}

interface ProductWithStock {
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
  currentStock: number;
  averageCost: number;
  categoryName?: string;
  unitName?: string;
}

/**
 * Fetch all products for the current store
 */
export async function getProducts(params?: GetProductsParams): Promise<{
  success: boolean;
  data?: ProductWithStock[];
  total?: number;
  totalPages?: number;
  error?: string;
}> {
  try {
    const rawProducts = await apiClient.getProducts() as Array<{
      id: string;
      storeId: string;
      name: string;
      sku?: string;
      description?: string;
      categoryId: string;
      categoryName?: string;
      price?: number;
      costPrice?: number;
      stockQuantity?: number;
      images?: string;
      status: 'active' | 'draft' | 'archived';
      createdAt: string;
      updatedAt: string;
    }>;
    
    // Map API response to ProductWithStock format
    const products: ProductWithStock[] = rawProducts.map(p => ({
      id: p.id,
      storeId: p.storeId,
      name: p.name,
      barcode: p.sku,
      description: p.description,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      unitId: '',
      sellingPrice: p.price || 0,
      status: p.status,
      lowStockThreshold: 10,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      currentStock: p.stockQuantity || 0,
      averageCost: p.costPrice || 0,
    }));
    
    // Apply client-side filtering since backend doesn't support query params yet
    let filtered = [...products];
    
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchLower))
      );
    }
    
    if (params?.categoryId) {
      filtered = filtered.filter(p => p.categoryId === params.categoryId);
    }
    
    if (params?.status) {
      filtered = filtered.filter(p => p.status === params.status);
    }
    
    const total = filtered.length;
    const pageSize = params?.pageSize || 20;
    const totalPages = Math.ceil(total / pageSize);
    const page = params?.page || 1;
    
    // Apply pagination
    const start = (page - 1) * pageSize;
    const paginatedData = filtered.slice(start, start + pageSize);
    
    return { 
      success: true, 
      data: paginatedData,
      total,
      totalPages
    };
  } catch (error: unknown) {
    console.error('Error fetching products:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách sản phẩm' 
    };
  }
}

/**
 * Get a single product by ID
 */
export async function getProduct(productId: string): Promise<{
  success: boolean;
  product?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const product = await apiClient.getProduct(productId);
    return { success: true, product };
  } catch (error: unknown) {
    console.error('Error fetching product:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy thông tin sản phẩm' 
    };
  }
}

/**
 * Create or update a product
 */
export async function upsertProduct(product: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    const id = product.id as string | undefined;
    if (id) {
      await apiClient.updateProduct(id, product);
    } else {
      await apiClient.createProduct(product);
    }
    return { success: true };
  } catch (error: unknown) {
    console.error('Error upserting product:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo hoặc cập nhật sản phẩm' 
    };
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.deleteProduct(productId);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting product:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể xóa sản phẩm' 
    };
  }
}

/**
 * Update product status
 */
export async function updateProductStatus(
  productId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.updateProduct(productId, { status });
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating product status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể cập nhật trạng thái sản phẩm',
    };
  }
}

/**
 * Import products from file
 */
export async function importProducts(
  products: Array<Record<string, unknown>>
): Promise<{ success: boolean; imported?: number; error?: string }> {
  try {
    let imported = 0;
    for (const product of products) {
      await apiClient.createProduct(product);
      imported++;
    }
    return { success: true, imported };
  } catch (error: unknown) {
    console.error('Error importing products:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể import sản phẩm',
    };
  }
}

/**
 * Generate product template for import
 */
export async function generateProductTemplate(): Promise<{
  success: boolean;
  template?: Array<Record<string, unknown>>;
  error?: string;
}> {
  return {
    success: true,
    template: [
      {
        name: 'Tên sản phẩm',
        sku: 'SKU001',
        price: 0,
        costPrice: 0,
        stockQuantity: 0,
        categoryId: '',
        description: '',
      },
    ],
  };
}
