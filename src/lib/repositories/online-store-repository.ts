import { query, queryOne } from '../db';

/**
 * Online Store entity interface
 */
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
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Database record interface for OnlineStores table (snake_case)
 */
interface OnlineStoreRecord {
  id: string;
  store_id: string;
  slug: string;
  custom_domain: string | null;
  is_active: boolean;
  store_name: string;
  logo: string | null;
  favicon: string | null;
  description: string | null;
  theme_id: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  currency: string;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create online store input
 */
export type CreateOnlineStoreInput = Omit<OnlineStore, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Update online store input
 */
export type UpdateOnlineStoreInput = Partial<Omit<OnlineStore, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>>;


/**
 * Online Store repository for managing online store configurations
 */
export class OnlineStoreRepository {
  /**
   * Map database record to OnlineStore entity
   */
  private mapToEntity(record: OnlineStoreRecord): OnlineStore {
    return {
      id: record.id,
      storeId: record.store_id,
      slug: record.slug,
      customDomain: record.custom_domain || undefined,
      isActive: record.is_active,
      storeName: record.store_name,
      logo: record.logo || undefined,
      favicon: record.favicon || undefined,
      description: record.description || undefined,
      themeId: record.theme_id,
      primaryColor: record.primary_color,
      secondaryColor: record.secondary_color,
      fontFamily: record.font_family,
      contactEmail: record.contact_email,
      contactPhone: record.contact_phone || undefined,
      address: record.address || undefined,
      facebookUrl: record.facebook_url || undefined,
      instagramUrl: record.instagram_url || undefined,
      currency: record.currency,
      timezone: record.timezone,
      createdAt: record.created_at instanceof Date
        ? record.created_at.toISOString()
        : String(record.created_at),
      updatedAt: record.updated_at instanceof Date
        ? record.updated_at.toISOString()
        : String(record.updated_at),
    };
  }

  /**
   * Find all online stores for a store owner
   */
  async findAll(storeId: string): Promise<OnlineStore[]> {
    const results = await query<OnlineStoreRecord>(
      `SELECT * FROM OnlineStores WHERE store_id = @storeId ORDER BY created_at DESC`,
      { storeId }
    );
    return results.map((r) => this.mapToEntity(r));
  }

  /**
   * Find online store by ID
   */
  async findById(id: string, storeId: string): Promise<OnlineStore | null> {
    const result = await queryOne<OnlineStoreRecord>(
      `SELECT * FROM OnlineStores WHERE id = @id AND store_id = @storeId`,
      { id, storeId }
    );
    return result ? this.mapToEntity(result) : null;
  }

  /**
   * Find online store by slug (for storefront routing)
   */
  async findBySlug(slug: string): Promise<OnlineStore | null> {
    const result = await queryOne<OnlineStoreRecord>(
      `SELECT * FROM OnlineStores WHERE slug = @slug AND is_active = 1`,
      { slug }
    );
    return result ? this.mapToEntity(result) : null;
  }

  /**
   * Find online store by storeId (for admin management)
   */
  async findByStoreId(storeId: string): Promise<OnlineStore[]> {
    const results = await query<OnlineStoreRecord>(
      `SELECT * FROM OnlineStores WHERE store_id = @storeId ORDER BY created_at DESC`,
      { storeId }
    );
    return results.map((r) => this.mapToEntity(r));
  }

  /**
   * Check if slug is available
   */
  async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    let queryString = `SELECT 1 FROM OnlineStores WHERE slug = @slug`;
    const params: Record<string, unknown> = { slug };

    if (excludeId) {
      queryString += ` AND id != @excludeId`;
      params.excludeId = excludeId;
    }

    const result = await queryOne<{ '': number }>(queryString, params);
    return result === null;
  }

  /**
   * Create a new online store
   */
  async create(data: CreateOnlineStoreInput): Promise<OnlineStore> {
    const id = crypto.randomUUID();
    
    await query(
      `INSERT INTO OnlineStores (
        id, store_id, slug, custom_domain, is_active, store_name, logo, favicon,
        description, theme_id, primary_color, secondary_color, font_family,
        contact_email, contact_phone, address, facebook_url, instagram_url,
        currency, timezone, created_at, updated_at
      ) VALUES (
        @id, @storeId, @slug, @customDomain, @isActive, @storeName, @logo, @favicon,
        @description, @themeId, @primaryColor, @secondaryColor, @fontFamily,
        @contactEmail, @contactPhone, @address, @facebookUrl, @instagramUrl,
        @currency, @timezone, GETDATE(), GETDATE()
      )`,
      {
        id,
        storeId: data.storeId,
        slug: data.slug,
        customDomain: data.customDomain || null,
        isActive: data.isActive ?? true,
        storeName: data.storeName,
        logo: data.logo || null,
        favicon: data.favicon || null,
        description: data.description || null,
        themeId: data.themeId || 'default',
        primaryColor: data.primaryColor || '#3B82F6',
        secondaryColor: data.secondaryColor || '#10B981',
        fontFamily: data.fontFamily || 'Inter',
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || null,
        address: data.address || null,
        facebookUrl: data.facebookUrl || null,
        instagramUrl: data.instagramUrl || null,
        currency: data.currency || 'VND',
        timezone: data.timezone || 'Asia/Ho_Chi_Minh',
      }
    );

    const created = await this.findById(id, data.storeId);
    if (!created) {
      throw new Error('Failed to create online store');
    }
    return created;
  }

  /**
   * Update an online store
   */
  async update(id: string, data: UpdateOnlineStoreInput, storeId: string): Promise<OnlineStore> {
    const existing = await this.findById(id, storeId);
    if (!existing) {
      throw new Error('Online store not found');
    }

    await query(
      `UPDATE OnlineStores SET
        slug = @slug,
        custom_domain = @customDomain,
        is_active = @isActive,
        store_name = @storeName,
        logo = @logo,
        favicon = @favicon,
        description = @description,
        theme_id = @themeId,
        primary_color = @primaryColor,
        secondary_color = @secondaryColor,
        font_family = @fontFamily,
        contact_email = @contactEmail,
        contact_phone = @contactPhone,
        address = @address,
        facebook_url = @facebookUrl,
        instagram_url = @instagramUrl,
        currency = @currency,
        timezone = @timezone,
        updated_at = GETDATE()
      WHERE id = @id AND store_id = @storeId`,
      {
        id,
        storeId,
        slug: data.slug ?? existing.slug,
        customDomain: data.customDomain ?? existing.customDomain ?? null,
        isActive: data.isActive ?? existing.isActive,
        storeName: data.storeName ?? existing.storeName,
        logo: data.logo ?? existing.logo ?? null,
        favicon: data.favicon ?? existing.favicon ?? null,
        description: data.description ?? existing.description ?? null,
        themeId: data.themeId ?? existing.themeId,
        primaryColor: data.primaryColor ?? existing.primaryColor,
        secondaryColor: data.secondaryColor ?? existing.secondaryColor,
        fontFamily: data.fontFamily ?? existing.fontFamily,
        contactEmail: data.contactEmail ?? existing.contactEmail,
        contactPhone: data.contactPhone ?? existing.contactPhone ?? null,
        address: data.address ?? existing.address ?? null,
        facebookUrl: data.facebookUrl ?? existing.facebookUrl ?? null,
        instagramUrl: data.instagramUrl ?? existing.instagramUrl ?? null,
        currency: data.currency ?? existing.currency,
        timezone: data.timezone ?? existing.timezone,
      }
    );

    const updated = await this.findById(id, storeId);
    if (!updated) {
      throw new Error('Failed to update online store');
    }
    return updated;
  }

  /**
   * Deactivate an online store (soft delete)
   */
  async deactivate(id: string, storeId: string): Promise<boolean> {
    const existing = await this.findById(id, storeId);
    if (!existing) {
      throw new Error('Online store not found');
    }

    await query(
      `UPDATE OnlineStores SET is_active = 0, updated_at = GETDATE() WHERE id = @id AND store_id = @storeId`,
      { id, storeId }
    );
    return true;
  }

  /**
   * Delete an online store
   */
  async delete(id: string, storeId: string): Promise<boolean> {
    const existing = await this.findById(id, storeId);
    if (!existing) {
      throw new Error('Online store not found');
    }

    await query(
      `DELETE FROM OnlineStores WHERE id = @id AND store_id = @storeId`,
      { id, storeId }
    );
    return true;
  }

  /**
   * Permanently delete an online store and all related data
   */
  async permanentDelete(id: string, storeId: string): Promise<boolean> {
    const existing = await this.findById(id, storeId);
    if (!existing) {
      throw new Error('Online store not found');
    }

    // Delete related data in order (respecting foreign key constraints)
    // 1. Delete order items
    await query(
      `DELETE FROM OnlineOrderItems WHERE order_id IN (SELECT id FROM OnlineOrders WHERE online_store_id = @id)`,
      { id }
    );

    // 2. Delete orders
    await query(
      `DELETE FROM OnlineOrders WHERE online_store_id = @id`,
      { id }
    );

    // 3. Delete cart items (table name is CartItems)
    await query(
      `DELETE FROM CartItems WHERE cart_id IN (SELECT id FROM ShoppingCarts WHERE online_store_id = @id)`,
      { id }
    );

    // 4. Delete carts (table name is ShoppingCarts)
    await query(
      `DELETE FROM ShoppingCarts WHERE online_store_id = @id`,
      { id }
    );

    // 5. Delete online products
    await query(
      `DELETE FROM OnlineProducts WHERE online_store_id = @id`,
      { id }
    );

    // 6. Delete shipping zones
    await query(
      `DELETE FROM ShippingZones WHERE online_store_id = @id`,
      { id }
    );

    // 7. Delete online customers
    await query(
      `DELETE FROM OnlineCustomers WHERE online_store_id = @id`,
      { id }
    );

    // 8. Finally delete the online store
    await query(
      `DELETE FROM OnlineStores WHERE id = @id AND store_id = @storeId`,
      { id, storeId }
    );

    return true;
  }

  /**
   * Count online stores for a store owner
   */
  async count(storeId: string): Promise<number> {
    const result = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM OnlineStores WHERE store_id = @storeId`,
      { storeId }
    );
    return result?.total ?? 0;
  }
}

// Export singleton instance
export const onlineStoreRepository = new OnlineStoreRepository();
