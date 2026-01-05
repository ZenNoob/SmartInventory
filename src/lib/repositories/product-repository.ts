import {
  BaseRepository,
  QueryOptions,
  PaginationOptions,
  PaginatedResult,
} from './base-repository';
import { query, queryOne } from '../db';

/**
 * Product entity interface (matches actual database schema)
 */
export interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  costPrice: number;
  sku?: string;
  stockQuantity: number;
  images?: string;
  status: 'active' | 'draft' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Product with additional info
 */
export interface ProductWithStock extends Product {
  currentStock: number;
  averageCost: number;
  categoryName?: string;
  unitName?: string;
}

/**
 * Database record interface for Products table (snake_case)
 */
interface ProductRecord {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  sku: string | null;
  stock_quantity: number;
  images: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Product repository for managing products
 */
export class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super('Products', 'id');
  }

  /**
   * Map database record to Product entity
   */
  protected mapToEntity(record: Record<string, unknown>): Product {
    const r = record as ProductRecord;
    return {
      id: r.id,
      storeId: r.store_id,
      categoryId: r.category_id,
      name: r.name,
      description: r.description || undefined,
      price: r.price || 0,
      costPrice: r.cost_price || 0,
      sku: r.sku || undefined,
      stockQuantity: r.stock_quantity || 0,
      images: r.images || undefined,
      status: (r.status as 'active' | 'draft' | 'archived') || 'active',
      createdAt: r.created_at
        ? r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at)
        : undefined,
      updatedAt: r.updated_at
        ? r.updated_at instanceof Date
          ? r.updated_at.toISOString()
          : String(r.updated_at)
        : undefined,
    };
  }

  /**
   * Map Product entity to database record
   */
  protected mapToRecord(entity: Partial<Product>): Record<string, unknown> {
    const record: Record<string, unknown> = {};

    if (entity.id !== undefined) record.id = entity.id;
    if (entity.storeId !== undefined) record.store_id = entity.storeId;
    if (entity.categoryId !== undefined) record.category_id = entity.categoryId;
    if (entity.name !== undefined) record.name = entity.name;
    if (entity.description !== undefined)
      record.description = entity.description || null;
    if (entity.price !== undefined) record.price = entity.price;
    if (entity.costPrice !== undefined) record.cost_price = entity.costPrice;
    if (entity.sku !== undefined) record.sku = entity.sku || null;
    if (entity.stockQuantity !== undefined)
      record.stock_quantity = entity.stockQuantity;
    if (entity.images !== undefined) record.images = entity.images || null;
    if (entity.status !== undefined) record.status = entity.status;

    return record;
  }

  /**
   * Find all products for a store
   */
  async findAll(storeId: string, options?: QueryOptions): Promise<Product[]> {
    let queryString = `SELECT * FROM Products WHERE store_id = @storeId`;

    if (options?.orderBy) {
      const direction = options.orderDirection || 'ASC';
      queryString += ` ORDER BY ${options.orderBy} ${direction}`;
    } else {
      queryString += ` ORDER BY name ASC`;
    }

    const results = await query<ProductRecord>(queryString, { storeId });
    return results.map((r) => this.mapToEntity(r as Record<string, unknown>));
  }

  /**
   * Find product by ID
   */
  async findById(id: string, storeId: string): Promise<Product | null> {
    const result = await queryOne<ProductRecord>(
      `SELECT * FROM Products WHERE id = @id AND store_id = @storeId`,
      { id, storeId }
    );
    return result ? this.mapToEntity(result as Record<string, unknown>) : null;
  }

  /**
   * Find product by SKU within a store
   */
  async findBySku(sku: string, storeId: string): Promise<Product | null> {
    const result = await queryOne<ProductRecord>(
      `SELECT * FROM Products WHERE sku = @sku AND store_id = @storeId`,
      { sku, storeId }
    );
    return result ? this.mapToEntity(result as Record<string, unknown>) : null;
  }

  /**
   * Find products by category within a store
   */
  async findByCategory(
    categoryId: string,
    storeId: string,
    options?: QueryOptions
  ): Promise<Product[]> {
    let queryString = `SELECT * FROM Products WHERE category_id = @categoryId AND store_id = @storeId`;

    if (options?.orderBy) {
      const direction = options.orderDirection || 'ASC';
      queryString += ` ORDER BY ${options.orderBy} ${direction}`;
    } else {
      queryString += ` ORDER BY name ASC`;
    }

    const results = await query<ProductRecord>(queryString, {
      categoryId,
      storeId,
    });
    return results.map((r) => this.mapToEntity(r as Record<string, unknown>));
  }

  /**
   * Create a new product
   */
  async create(
    entity: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
    storeId: string
  ): Promise<Product> {
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO Products (id, store_id, category_id, name, description, price, cost_price, sku, stock_quantity, images, status, created_at, updated_at)
       VALUES (@id, @storeId, @categoryId, @name, @description, @price, @costPrice, @sku, @stockQuantity, @images, @status, GETDATE(), GETDATE())`,
      {
        id,
        storeId,
        categoryId: entity.categoryId,
        name: entity.name,
        description: entity.description || null,
        price: entity.price || 0,
        costPrice: entity.costPrice || 0,
        sku: entity.sku || null,
        stockQuantity: entity.stockQuantity || 0,
        images: entity.images || null,
        status: entity.status || 'active',
      }
    );
    return this.findById(id, storeId) as Promise<Product>;
  }

  /**
   * Update a product
   */
  async update(
    id: string,
    entity: Partial<Product>,
    storeId: string
  ): Promise<Product | null> {
    const existing = await this.findById(id, storeId);
    if (!existing) return null;

    await query(
      `UPDATE Products SET 
        category_id = @categoryId,
        name = @name, 
        description = @description, 
        price = @price,
        cost_price = @costPrice,
        sku = @sku,
        stock_quantity = @stockQuantity,
        images = @images,
        status = @status,
        updated_at = GETDATE()
       WHERE id = @id AND store_id = @storeId`,
      {
        id,
        storeId,
        categoryId: entity.categoryId ?? existing.categoryId,
        name: entity.name ?? existing.name,
        description: entity.description ?? existing.description ?? null,
        price: entity.price ?? existing.price,
        costPrice: entity.costPrice ?? existing.costPrice,
        sku: entity.sku ?? existing.sku ?? null,
        stockQuantity: entity.stockQuantity ?? existing.stockQuantity,
        images: entity.images ?? existing.images ?? null,
        status: entity.status ?? existing.status,
      }
    );

    return this.findById(id, storeId);
  }

  /**
   * Delete a product
   */
  async delete(id: string, storeId: string): Promise<boolean> {
    await query(`DELETE FROM Products WHERE id = @id AND store_id = @storeId`, {
      id,
      storeId,
    });
    return true;
  }

  /**
   * Get current stock for a product
   */
  async getStock(productId: string, storeId: string): Promise<number> {
    const product = await this.findById(productId, storeId);
    return product?.stockQuantity ?? 0;
  }

  /**
   * Update stock quantity
   */
  async updateStock(
    productId: string,
    storeId: string,
    quantity: number
  ): Promise<Product | null> {
    return this.update(productId, { stockQuantity: quantity }, storeId);
  }

  /**
   * Get products with low stock
   */
  async getLowStockProducts(
    storeId: string,
    threshold: number = 10
  ): Promise<Product[]> {
    const results = await query<ProductRecord>(
      `SELECT * FROM Products 
       WHERE store_id = @storeId AND status = 'active' AND stock_quantity <= @threshold
       ORDER BY stock_quantity ASC`,
      { storeId, threshold }
    );
    return results.map((r) => this.mapToEntity(r as Record<string, unknown>));
  }

  /**
   * Search products by name or SKU
   */
  async searchProducts(
    storeId: string,
    searchTerm: string
  ): Promise<Product[]> {
    const results = await query<ProductRecord>(
      `SELECT * FROM Products 
       WHERE store_id = @storeId AND (name LIKE @search OR sku LIKE @search)
       ORDER BY name ASC`,
      { storeId, search: `%${searchTerm}%` }
    );
    return results.map((r) => this.mapToEntity(r as Record<string, unknown>));
  }

  /**
   * Get product count by status
   */
  async getCountByStatus(
    storeId: string
  ): Promise<{ active: number; draft: number; archived: number }> {
    const results = await query<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM Products WHERE store_id = @storeId GROUP BY status`,
      { storeId }
    );

    const counts = { active: 0, draft: 0, archived: 0 };
    results.forEach((r) => {
      if (r.status === 'active') counts.active = r.count;
      else if (r.status === 'draft') counts.draft = r.count;
      else if (r.status === 'archived') counts.archived = r.count;
    });

    return counts;
  }
}

// Export singleton instance
export const productRepository = new ProductRepository();
