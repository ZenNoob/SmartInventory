import { query, queryOne, SqlValue, QueryParams } from '../db';

/**
 * Category entity interface
 */
export interface Category {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  parentId?: string;
}

/**
 * Query options
 */
export interface QueryOptions {
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * Category repository for managing product categories
 */
export class CategoryRepository {
  /**
   * Find all categories for a store
   */
  async findAll(storeId: string, options?: QueryOptions): Promise<Category[]> {
    let queryString = `SELECT * FROM Categories WHERE store_id = @storeId`;

    if (options?.orderBy) {
      const direction = options.orderDirection || 'ASC';
      queryString += ` ORDER BY ${options.orderBy} ${direction}`;
    } else {
      queryString += ` ORDER BY name ASC`;
    }

    const results = await query<{
      id: string;
      store_id: string;
      name: string;
      description: string | null;
      parent_id: string | null;
    }>(queryString, { storeId });

    return results.map((r) => ({
      id: r.id,
      storeId: r.store_id,
      name: r.name,
      description: r.description || undefined,
      parentId: r.parent_id || undefined,
    }));
  }

  /**
   * Find category by ID
   */
  async findById(id: string, storeId: string): Promise<Category | null> {
    const result = await queryOne<{
      id: string;
      store_id: string;
      name: string;
      description: string | null;
      parent_id: string | null;
    }>(`SELECT * FROM Categories WHERE id = @id AND store_id = @storeId`, {
      id,
      storeId,
    });

    if (!result) return null;

    return {
      id: result.id,
      storeId: result.store_id,
      name: result.name,
      description: result.description || undefined,
      parentId: result.parent_id || undefined,
    };
  }

  /**
   * Find category by name within a store
   */
  async findByName(name: string, storeId: string): Promise<Category | null> {
    const result = await queryOne<{
      id: string;
      store_id: string;
      name: string;
      description: string | null;
      parent_id: string | null;
    }>(
      `SELECT * FROM Categories WHERE name = @name AND store_id = @storeId`,
      { name, storeId }
    );

    if (!result) return null;

    return {
      id: result.id,
      storeId: result.store_id,
      name: result.name,
      description: result.description || undefined,
      parentId: result.parent_id || undefined,
    };
  }

  /**
   * Check if category name exists (for validation)
   */
  async nameExists(
    name: string,
    storeId: string,
    excludeId?: string
  ): Promise<boolean> {
    let queryString = `SELECT 1 FROM Categories WHERE name = @name AND store_id = @storeId`;
    const params: QueryParams = { name, storeId };

    if (excludeId) {
      queryString += ` AND id != @excludeId`;
      params.excludeId = excludeId;
    }

    const result = await queryOne<{ '': number }>(queryString, params);
    return result !== null;
  }

  /**
   * Check if category is in use by any products
   */
  async isInUse(categoryId: string, storeId: string): Promise<boolean> {
    const result = await queryOne<{ '': number }>(
      `SELECT 1 FROM Products WHERE category_id = @categoryId AND store_id = @storeId`,
      { categoryId, storeId }
    );
    return result !== null;
  }

  /**
   * Create a new category
   */
  async create(
    entity: Omit<Category, 'id'>,
    storeId: string
  ): Promise<Category> {
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO Categories (id, store_id, name, description, parent_id, created_at, updated_at)
       VALUES (@id, @storeId, @name, @description, @parentId, GETDATE(), GETDATE())`,
      {
        id,
        storeId,
        name: entity.name,
        description: entity.description || null,
        parentId: entity.parentId || null,
      }
    );

    const created = await this.findById(id, storeId);
    if (!created) {
      throw new Error('Failed to create category');
    }
    return created;
  }

  /**
   * Update a category
   */
  async update(
    id: string,
    entity: Partial<Category>,
    storeId: string
  ): Promise<Category> {
    const existing = await this.findById(id, storeId);
    if (!existing) {
      throw new Error('Category not found');
    }

    await query(
      `UPDATE Categories SET name = @name, description = @description, updated_at = GETDATE()
       WHERE id = @id AND store_id = @storeId`,
      {
        id,
        storeId,
        name: entity.name ?? existing.name,
        description: entity.description ?? existing.description ?? null,
      }
    );

    const updated = await this.findById(id, storeId);
    if (!updated) {
      throw new Error('Failed to update category');
    }
    return updated;
  }

  /**
   * Delete a category
   */
  async delete(id: string, storeId: string): Promise<boolean> {
    await query(`DELETE FROM Categories WHERE id = @id AND store_id = @storeId`, {
      id,
      storeId,
    });
    return true;
  }

  /**
   * Get all categories with product count
   */
  async findAllWithProductCount(
    storeId: string,
    options?: QueryOptions
  ): Promise<(Category & { productCount: number })[]> {
    let queryString = `
      SELECT c.*, 
             (SELECT COUNT(*) FROM Products p WHERE p.category_id = c.id AND p.store_id = c.store_id) as product_count
      FROM Categories c
      WHERE c.store_id = @storeId
    `;

    if (options?.orderBy) {
      const direction = options.orderDirection || 'ASC';
      queryString += ` ORDER BY ${options.orderBy} ${direction}`;
    } else {
      queryString += ` ORDER BY c.name ASC`;
    }

    const results = await query<{
      id: string;
      store_id: string;
      name: string;
      description: string | null;
      parent_id: string | null;
      product_count: number;
    }>(queryString, { storeId });

    return results.map((r) => ({
      id: r.id,
      storeId: r.store_id,
      name: r.name,
      description: r.description || undefined,
      parentId: r.parent_id || undefined,
      productCount: r.product_count,
    }));
  }
}

// Export singleton instance
export const categoryRepository = new CategoryRepository();
