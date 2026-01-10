/**
 * Tenant Repository
 * 
 * Repository for managing Tenant records in the Master Database.
 * Handles CRUD operations for tenants.
 * 
 * Requirements: 1.1, 5.1
 */

import sql from 'mssql';
import { tenantRouter } from '../db/tenant-router';

/**
 * Tenant entity interface
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  status: 'active' | 'suspended' | 'deleted';
  subscriptionPlan: string;
  databaseName: string;
  databaseServer: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a new tenant
 */
export interface CreateTenantInput {
  name: string;
  slug: string;
  email: string;
  phone?: string;
  subscriptionPlan?: string;
  databaseName: string;
  databaseServer: string;
}

/**
 * Input for updating a tenant
 */
export interface UpdateTenantInput {
  name?: string;
  slug?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'suspended' | 'deleted';
  subscriptionPlan?: string;
}

/**
 * Tenant Repository class for Master Database operations
 */
export class TenantRepository {
  /**
   * Get the master database connection
   */
  private getPool(): sql.ConnectionPool {
    return tenantRouter.getMasterConnection();
  }

  /**
   * Map database record to Tenant entity
   */
  private mapToEntity(record: Record<string, unknown>): Tenant {
    return {
      id: record.id as string,
      name: record.name as string,
      slug: record.slug as string,
      email: record.email as string,
      phone: record.phone as string | undefined,
      status: record.status as Tenant['status'],
      subscriptionPlan: record.subscription_plan as string,
      databaseName: record.database_name as string,
      databaseServer: record.database_server as string,
      createdAt: record.created_at as Date,
      updatedAt: record.updated_at as Date,
    };
  }

  /**
   * Find all tenants
   */
  async findAll(includeInactive = false): Promise<Tenant[]> {
    const pool = this.getPool();
    
    let query = `SELECT * FROM Tenants`;
    if (!includeInactive) {
      query += ` WHERE status = 'active'`;
    }
    query += ` ORDER BY name`;

    const result = await pool.request().query(query);
    return result.recordset.map(row => this.mapToEntity(row));
  }

  /**
   * Find tenant by ID
   */
  async findById(id: string): Promise<Tenant | null> {
    const pool = this.getPool();
    
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`SELECT * FROM Tenants WHERE id = @id`);

    if (result.recordset.length === 0) {
      return null;
    }

    return this.mapToEntity(result.recordset[0]);
  }

  /**
   * Find tenant by slug
   */
  async findBySlug(slug: string): Promise<Tenant | null> {
    const pool = this.getPool();
    
    const result = await pool.request()
      .input('slug', sql.NVarChar, slug)
      .query(`SELECT * FROM Tenants WHERE slug = @slug`);

    if (result.recordset.length === 0) {
      return null;
    }

    return this.mapToEntity(result.recordset[0]);
  }

  /**
   * Find tenant by email
   */
  async findByEmail(email: string): Promise<Tenant | null> {
    const pool = this.getPool();
    
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`SELECT * FROM Tenants WHERE email = @email`);

    if (result.recordset.length === 0) {
      return null;
    }

    return this.mapToEntity(result.recordset[0]);
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const pool = this.getPool();
    
    const request = pool.request().input('slug', sql.NVarChar, slug);
    
    let query = `SELECT 1 FROM Tenants WHERE slug = @slug`;
    if (excludeId) {
      query += ` AND id != @excludeId`;
      request.input('excludeId', sql.UniqueIdentifier, excludeId);
    }

    const result = await request.query(query);
    return result.recordset.length > 0;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const pool = this.getPool();
    
    const request = pool.request().input('email', sql.NVarChar, email);
    
    let query = `SELECT 1 FROM Tenants WHERE email = @email`;
    if (excludeId) {
      query += ` AND id != @excludeId`;
      request.input('excludeId', sql.UniqueIdentifier, excludeId);
    }

    const result = await request.query(query);
    return result.recordset.length > 0;
  }

  /**
   * Check if database name exists
   */
  async databaseNameExists(databaseName: string, excludeId?: string): Promise<boolean> {
    const pool = this.getPool();
    
    const request = pool.request().input('databaseName', sql.NVarChar, databaseName);
    
    let query = `SELECT 1 FROM Tenants WHERE database_name = @databaseName`;
    if (excludeId) {
      query += ` AND id != @excludeId`;
      request.input('excludeId', sql.UniqueIdentifier, excludeId);
    }

    const result = await request.query(query);
    return result.recordset.length > 0;
  }

  /**
   * Create a new tenant
   */
  async create(input: CreateTenantInput): Promise<Tenant> {
    const pool = this.getPool();

    // Validate uniqueness
    if (await this.slugExists(input.slug)) {
      throw new Error('Slug đã được sử dụng');
    }
    if (await this.emailExists(input.email)) {
      throw new Error('Email đã được sử dụng');
    }
    if (await this.databaseNameExists(input.databaseName)) {
      throw new Error('Tên database đã được sử dụng');
    }

    const id = crypto.randomUUID();

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.NVarChar, input.name)
      .input('slug', sql.NVarChar, input.slug)
      .input('email', sql.NVarChar, input.email)
      .input('phone', sql.NVarChar, input.phone || null)
      .input('subscriptionPlan', sql.NVarChar, input.subscriptionPlan || 'basic')
      .input('databaseName', sql.NVarChar, input.databaseName)
      .input('databaseServer', sql.NVarChar, input.databaseServer)
      .query(`
        INSERT INTO Tenants (id, name, slug, email, phone, subscription_plan, database_name, database_server, status, created_at, updated_at)
        VALUES (@id, @name, @slug, @email, @phone, @subscriptionPlan, @databaseName, @databaseServer, 'active', GETDATE(), GETDATE())
      `);

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Không thể tạo tenant');
    }

    return created;
  }

  /**
   * Update a tenant
   */
  async update(id: string, input: UpdateTenantInput): Promise<Tenant> {
    const pool = this.getPool();

    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Không tìm thấy tenant');
    }

    // Validate uniqueness if changing slug or email
    if (input.slug && input.slug !== existing.slug) {
      if (await this.slugExists(input.slug, id)) {
        throw new Error('Slug đã được sử dụng');
      }
    }
    if (input.email && input.email !== existing.email) {
      if (await this.emailExists(input.email, id)) {
        throw new Error('Email đã được sử dụng');
      }
    }

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.NVarChar, input.name ?? existing.name)
      .input('slug', sql.NVarChar, input.slug ?? existing.slug)
      .input('email', sql.NVarChar, input.email ?? existing.email)
      .input('phone', sql.NVarChar, input.phone ?? existing.phone ?? null)
      .input('status', sql.NVarChar, input.status ?? existing.status)
      .input('subscriptionPlan', sql.NVarChar, input.subscriptionPlan ?? existing.subscriptionPlan)
      .query(`
        UPDATE Tenants SET
          name = @name,
          slug = @slug,
          email = @email,
          phone = @phone,
          status = @status,
          subscription_plan = @subscriptionPlan,
          updated_at = GETDATE()
        WHERE id = @id
      `);

    // Invalidate cache in tenant router
    tenantRouter.invalidateTenantCache(id);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Không thể cập nhật tenant');
    }

    return updated;
  }

  /**
   * Suspend a tenant
   */
  async suspend(id: string): Promise<Tenant> {
    return this.update(id, { status: 'suspended' });
  }

  /**
   * Activate a tenant
   */
  async activate(id: string): Promise<Tenant> {
    return this.update(id, { status: 'active' });
  }

  /**
   * Soft delete a tenant (mark as deleted)
   */
  async softDelete(id: string): Promise<Tenant> {
    return this.update(id, { status: 'deleted' });
  }

  /**
   * Count total tenants
   */
  async count(includeInactive = false): Promise<number> {
    const pool = this.getPool();
    
    let query = `SELECT COUNT(*) as total FROM Tenants`;
    if (!includeInactive) {
      query += ` WHERE status = 'active'`;
    }

    const result = await pool.request().query(query);
    return result.recordset[0].total;
  }

  /**
   * Count tenants by status
   */
  async countByStatus(): Promise<{ active: number; suspended: number; deleted: number }> {
    const pool = this.getPool();
    
    const result = await pool.request().query(`
      SELECT status, COUNT(*) as count
      FROM Tenants
      GROUP BY status
    `);

    const counts = { active: 0, suspended: 0, deleted: 0 };
    for (const row of result.recordset) {
      counts[row.status as keyof typeof counts] = row.count;
    }

    return counts;
  }
}

// Export singleton instance
export const tenantRepository = new TenantRepository();
