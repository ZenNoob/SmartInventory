/**
 * Tenant User Repository
 * 
 * Repository for managing TenantUser records in the Master Database.
 * Handles authentication lookup and user-tenant mapping.
 * 
 * Requirements: 1.1, 5.1
 */

import sql from 'mssql';
import { tenantRouter } from '../db/tenant-router';
import { hashPassword, verifyPassword } from '../auth/password';

/**
 * TenantUser entity interface
 */
export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  isOwner: boolean;
  status: 'active' | 'inactive' | 'locked';
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TenantUser with tenant info for authentication
 */
export interface TenantUserWithTenant extends TenantUser {
  tenantName: string;
  tenantSlug: string;
  tenantStatus: string;
  databaseName: string;
  databaseServer: string;
}

/**
 * Input for creating a new tenant user
 */
export interface CreateTenantUserInput {
  tenantId: string;
  email: string;
  password: string;
  isOwner?: boolean;
}

/**
 * Input for updating a tenant user
 */
export interface UpdateTenantUserInput {
  email?: string;
  password?: string;
  status?: 'active' | 'inactive' | 'locked';
}

/**
 * Login result
 */
export interface LoginResult {
  success: boolean;
  user?: TenantUserWithTenant;
  error?: string;
  isLocked?: boolean;
  lockRemainingMinutes?: number;
}

// Account lockout settings
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Tenant User Repository class for Master Database operations
 */
export class TenantUserRepository {
  /**
   * Get the master database connection
   */
  private getPool(): sql.ConnectionPool {
    return tenantRouter.getMasterConnection();
  }

  /**
   * Map database record to TenantUser entity
   */
  private mapToEntity(record: Record<string, unknown>): TenantUser {
    return {
      id: record.id as string,
      tenantId: record.tenant_id as string,
      email: record.email as string,
      isOwner: record.is_owner as boolean,
      status: record.status as TenantUser['status'],
      failedLoginAttempts: (record.failed_login_attempts as number) || 0,
      lockedUntil: record.locked_until as Date | undefined,
      lastLogin: record.last_login as Date | undefined,
      createdAt: record.created_at as Date,
      updatedAt: record.updated_at as Date,
    };
  }

  /**
   * Map database record to TenantUserWithTenant entity
   */
  private mapToEntityWithTenant(record: Record<string, unknown>): TenantUserWithTenant {
    return {
      ...this.mapToEntity(record),
      tenantName: record.tenant_name as string,
      tenantSlug: record.tenant_slug as string,
      tenantStatus: record.tenant_status as string,
      databaseName: record.database_name as string,
      databaseServer: record.database_server as string,
    };
  }

  /**
   * Find all users for a tenant
   */
  async findByTenant(tenantId: string): Promise<TenantUser[]> {
    const pool = this.getPool();
    
    const result = await pool.request()
      .input('tenantId', sql.UniqueIdentifier, tenantId)
      .query(`
        SELECT * FROM TenantUsers 
        WHERE tenant_id = @tenantId 
        ORDER BY email
      `);

    return result.recordset.map(row => this.mapToEntity(row));
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<TenantUser | null> {
    const pool = this.getPool();
    
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`SELECT * FROM TenantUsers WHERE id = @id`);

    if (result.recordset.length === 0) {
      return null;
    }

    return this.mapToEntity(result.recordset[0]);
  }

  /**
   * Find user by email (across all tenants)
   */
  async findByEmail(email: string): Promise<TenantUserWithTenant | null> {
    const pool = this.getPool();
    
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT 
          tu.*,
          t.name as tenant_name,
          t.slug as tenant_slug,
          t.status as tenant_status,
          t.database_name,
          t.database_server
        FROM TenantUsers tu
        INNER JOIN Tenants t ON tu.tenant_id = t.id
        WHERE tu.email = @email
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return this.mapToEntityWithTenant(result.recordset[0]);
  }

  /**
   * Find user by email within a specific tenant
   */
  async findByEmailAndTenant(email: string, tenantId: string): Promise<TenantUser | null> {
    const pool = this.getPool();
    
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('tenantId', sql.UniqueIdentifier, tenantId)
      .query(`
        SELECT * FROM TenantUsers 
        WHERE email = @email AND tenant_id = @tenantId
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return this.mapToEntity(result.recordset[0]);
  }

  /**
   * Check if email exists within a tenant
   */
  async emailExistsInTenant(email: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const pool = this.getPool();
    
    const request = pool.request()
      .input('email', sql.NVarChar, email)
      .input('tenantId', sql.UniqueIdentifier, tenantId);
    
    let query = `SELECT 1 FROM TenantUsers WHERE email = @email AND tenant_id = @tenantId`;
    if (excludeId) {
      query += ` AND id != @excludeId`;
      request.input('excludeId', sql.UniqueIdentifier, excludeId);
    }

    const result = await request.query(query);
    return result.recordset.length > 0;
  }

  /**
   * Create a new tenant user
   */
  async create(input: CreateTenantUserInput): Promise<TenantUser> {
    const pool = this.getPool();

    // Validate email uniqueness within tenant
    if (await this.emailExistsInTenant(input.email, input.tenantId)) {
      throw new Error('Email đã được sử dụng trong tenant này');
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(input.password);

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('tenantId', sql.UniqueIdentifier, input.tenantId)
      .input('email', sql.NVarChar, input.email)
      .input('passwordHash', sql.NVarChar, passwordHash)
      .input('isOwner', sql.Bit, input.isOwner ?? false)
      .query(`
        INSERT INTO TenantUsers (id, tenant_id, email, password_hash, is_owner, status, failed_login_attempts, created_at, updated_at)
        VALUES (@id, @tenantId, @email, @passwordHash, @isOwner, 'active', 0, GETDATE(), GETDATE())
      `);

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Không thể tạo tenant user');
    }

    return created;
  }

  /**
   * Update a tenant user
   */
  async update(id: string, input: UpdateTenantUserInput): Promise<TenantUser> {
    const pool = this.getPool();

    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Không tìm thấy tenant user');
    }

    // Validate email uniqueness if changing
    if (input.email && input.email !== existing.email) {
      if (await this.emailExistsInTenant(input.email, existing.tenantId, id)) {
        throw new Error('Email đã được sử dụng trong tenant này');
      }
    }

    let passwordHash: string | undefined;
    if (input.password) {
      passwordHash = await hashPassword(input.password);
    }

    const request = pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('email', sql.NVarChar, input.email ?? existing.email)
      .input('status', sql.NVarChar, input.status ?? existing.status);

    let query = `
      UPDATE TenantUsers SET
        email = @email,
        status = @status,
        updated_at = GETDATE()
    `;

    if (passwordHash) {
      request.input('passwordHash', sql.NVarChar, passwordHash);
      query = `
        UPDATE TenantUsers SET
          email = @email,
          status = @status,
          password_hash = @passwordHash,
          updated_at = GETDATE()
      `;
    }

    query += ` WHERE id = @id`;

    await request.query(query);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Không thể cập nhật tenant user');
    }

    return updated;
  }

  /**
   * Delete a tenant user
   */
  async delete(id: string): Promise<boolean> {
    const pool = this.getPool();

    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Không tìm thấy tenant user');
    }

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`DELETE FROM TenantUsers WHERE id = @id`);

    return true;
  }

  /**
   * Authenticate user by email and password
   * Implements account lockout after failed attempts
   */
  async authenticate(email: string, password: string): Promise<LoginResult> {
    const pool = this.getPool();

    // Find user with tenant info
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT 
          tu.*,
          t.name as tenant_name,
          t.slug as tenant_slug,
          t.status as tenant_status,
          t.database_name,
          t.database_server
        FROM TenantUsers tu
        INNER JOIN Tenants t ON tu.tenant_id = t.id
        WHERE tu.email = @email
      `);

    if (result.recordset.length === 0) {
      return { success: false, error: 'Email hoặc mật khẩu không đúng' };
    }

    const record = result.recordset[0];

    // Check if tenant is active
    if (record.tenant_status !== 'active') {
      return { success: false, error: 'Tài khoản tenant đã bị tạm ngưng' };
    }

    // Check if user is active
    if (record.status === 'inactive') {
      return { success: false, error: 'Tài khoản đã bị vô hiệu hóa' };
    }

    // Check if account is locked
    if (record.status === 'locked' || record.locked_until) {
      const lockedUntil = record.locked_until as Date;
      if (lockedUntil && lockedUntil > new Date()) {
        const remainingMs = lockedUntil.getTime() - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        return { 
          success: false, 
          error: `Tài khoản đã bị khóa. Vui lòng thử lại sau ${remainingMinutes} phút.`,
          isLocked: true,
          lockRemainingMinutes: remainingMinutes,
        };
      } else {
        // Lock expired, reset
        await this.resetLockout(record.id);
      }
    }

    // Verify password
    const isValid = await verifyPassword(password, record.password_hash);

    if (!isValid) {
      // Increment failed attempts
      await this.incrementFailedAttempts(record.id);
      
      const newAttempts = (record.failed_login_attempts || 0) + 1;
      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        await this.lockAccount(record.id);
        return { 
          success: false, 
          error: `Tài khoản đã bị khóa do nhập sai mật khẩu ${MAX_FAILED_ATTEMPTS} lần. Vui lòng thử lại sau ${LOCKOUT_DURATION_MINUTES} phút.`,
          isLocked: true,
          lockRemainingMinutes: LOCKOUT_DURATION_MINUTES,
        };
      }

      return { 
        success: false, 
        error: `Email hoặc mật khẩu không đúng. Còn ${MAX_FAILED_ATTEMPTS - newAttempts} lần thử.` 
      };
    }

    // Successful login - reset failed attempts and update last login
    await this.recordSuccessfulLogin(record.id);

    return {
      success: true,
      user: this.mapToEntityWithTenant(record),
    };
  }

  /**
   * Increment failed login attempts
   */
  private async incrementFailedAttempts(userId: string): Promise<void> {
    const pool = this.getPool();
    
    await pool.request()
      .input('id', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE TenantUsers SET
          failed_login_attempts = failed_login_attempts + 1,
          updated_at = GETDATE()
        WHERE id = @id
      `);
  }

  /**
   * Lock account after too many failed attempts
   */
  private async lockAccount(userId: string): Promise<void> {
    const pool = this.getPool();
    
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    
    await pool.request()
      .input('id', sql.UniqueIdentifier, userId)
      .input('lockedUntil', sql.DateTime2, lockedUntil)
      .query(`
        UPDATE TenantUsers SET
          status = 'locked',
          locked_until = @lockedUntil,
          updated_at = GETDATE()
        WHERE id = @id
      `);
  }

  /**
   * Reset lockout after lock expires
   */
  private async resetLockout(userId: string): Promise<void> {
    const pool = this.getPool();
    
    await pool.request()
      .input('id', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE TenantUsers SET
          status = 'active',
          failed_login_attempts = 0,
          locked_until = NULL,
          updated_at = GETDATE()
        WHERE id = @id
      `);
  }

  /**
   * Record successful login
   */
  private async recordSuccessfulLogin(userId: string): Promise<void> {
    const pool = this.getPool();
    
    await pool.request()
      .input('id', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE TenantUsers SET
          failed_login_attempts = 0,
          locked_until = NULL,
          status = 'active',
          last_login = GETDATE(),
          updated_at = GETDATE()
        WHERE id = @id
      `);
  }

  /**
   * Update password
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const pool = this.getPool();
    
    const passwordHash = await hashPassword(newPassword);
    
    await pool.request()
      .input('id', sql.UniqueIdentifier, userId)
      .input('passwordHash', sql.NVarChar, passwordHash)
      .query(`
        UPDATE TenantUsers SET
          password_hash = @passwordHash,
          updated_at = GETDATE()
        WHERE id = @id
      `);
  }

  /**
   * Count users for a tenant
   */
  async countByTenant(tenantId: string): Promise<number> {
    const pool = this.getPool();
    
    const result = await pool.request()
      .input('tenantId', sql.UniqueIdentifier, tenantId)
      .query(`
        SELECT COUNT(*) as total FROM TenantUsers 
        WHERE tenant_id = @tenantId
      `);

    return result.recordset[0].total;
  }

  /**
   * Get owner user for a tenant
   */
  async getOwner(tenantId: string): Promise<TenantUser | null> {
    const pool = this.getPool();
    
    const result = await pool.request()
      .input('tenantId', sql.UniqueIdentifier, tenantId)
      .query(`
        SELECT * FROM TenantUsers 
        WHERE tenant_id = @tenantId AND is_owner = 1
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return this.mapToEntity(result.recordset[0]);
  }
}

// Export singleton instance
export const tenantUserRepository = new TenantUserRepository();
