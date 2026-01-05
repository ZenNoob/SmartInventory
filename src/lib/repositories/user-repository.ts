import { query, queryOne } from '../db';
import { hashPassword } from '../auth/password';
import type { Permissions } from '../types';

/**
 * User entity interface
 */
export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'accountant' | 'inventory_manager' | 'salesperson' | 'custom';
  permissions?: Permissions;
  status: 'active' | 'inactive';
  failedLoginAttempts: number;
  lockedUntil?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * User with assigned stores
 */
export interface UserWithStores extends User {
  stores: UserStoreAssignment[];
}

/**
 * User-Store assignment
 */
export interface UserStoreAssignment {
  storeId: string;
  storeName: string;
  storeCode: string;
  role?: string;
  permissions?: Permissions;
}

/**
 * Create user input
 */
export interface CreateUserInput {
  email: string;
  password: string;
  displayName?: string;
  role: 'admin' | 'accountant' | 'inventory_manager' | 'salesperson' | 'custom';
  permissions?: Permissions;
  storeIds?: string[];
}

/**
 * Update user input
 */
export interface UpdateUserInput {
  email?: string;
  password?: string;
  displayName?: string;
  role?: 'admin' | 'accountant' | 'inventory_manager' | 'salesperson' | 'custom';
  permissions?: Permissions;
  status?: 'active' | 'inactive';
  storeIds?: string[];
}

/**
 * User repository for managing users and user-store assignments
 */
export class UserRepository {
  /**
   * Find all users (for admin)
   */
  async findAll(): Promise<User[]> {
    const results = await query<{
      id: string;
      email: string;
      display_name: string | null;
      role: string;
      permissions: string | null;
      status: string;
      failed_login_attempts: number | null;
      locked_until: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(`SELECT * FROM Users ORDER BY display_name, email`);

    return results.map(r => ({
      id: r.id,
      email: r.email,
      displayName: r.display_name || undefined,
      role: r.role as User['role'],
      permissions: r.permissions ? JSON.parse(r.permissions) : undefined,
      status: (r.status as 'active' | 'inactive') || 'active',
      failedLoginAttempts: r.failed_login_attempts || 0,
      lockedUntil: r.locked_until
        ? (r.locked_until instanceof Date ? r.locked_until.toISOString() : String(r.locked_until))
        : undefined,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
    }));
  }

  /**
   * Find all users assigned to a specific store
   */
  async findByStore(storeId: string): Promise<UserWithStores[]> {
    const results = await query<{
      id: string;
      email: string;
      display_name: string | null;
      role: string;
      permissions: string | null;
      status: string;
      failed_login_attempts: number | null;
      locked_until: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT u.*
       FROM Users u
       INNER JOIN UserStores us ON u.id = us.user_id
       WHERE us.store_id = @storeId
       ORDER BY u.display_name, u.email`,
      { storeId }
    );

    const users: UserWithStores[] = [];
    for (const r of results) {
      const user: User = {
        id: r.id,
        email: r.email,
        displayName: r.display_name || undefined,
        role: r.role as User['role'],
        permissions: r.permissions ? JSON.parse(r.permissions) : undefined,
        status: (r.status as 'active' | 'inactive') || 'active',
        failedLoginAttempts: r.failed_login_attempts || 0,
        lockedUntil: r.locked_until
          ? (r.locked_until instanceof Date ? r.locked_until.toISOString() : String(r.locked_until))
          : undefined,
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
      };
      const stores = await this.getUserStores(user.id);
      users.push({ ...user, stores });
    }
    return users;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await queryOne<{
      id: string;
      email: string;
      display_name: string | null;
      role: string;
      permissions: string | null;
      status: string;
      failed_login_attempts: number | null;
      locked_until: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(`SELECT * FROM Users WHERE id = @id`, { id });

    if (!result) return null;

    return {
      id: result.id,
      email: result.email,
      displayName: result.display_name || undefined,
      role: result.role as User['role'],
      permissions: result.permissions ? JSON.parse(result.permissions) : undefined,
      status: (result.status as 'active' | 'inactive') || 'active',
      failedLoginAttempts: result.failed_login_attempts || 0,
      lockedUntil: result.locked_until
        ? (result.locked_until instanceof Date ? result.locked_until.toISOString() : String(result.locked_until))
        : undefined,
      createdAt: result.created_at instanceof Date ? result.created_at.toISOString() : String(result.created_at),
      updatedAt: result.updated_at instanceof Date ? result.updated_at.toISOString() : String(result.updated_at),
    };
  }

  /**
   * Find user by ID with stores
   */
  async findByIdWithStores(id: string): Promise<UserWithStores | null> {
    const user = await this.findById(id);
    if (!user) return null;

    const stores = await this.getUserStores(id);
    return { ...user, stores };
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await queryOne<{
      id: string;
      email: string;
      display_name: string | null;
      role: string;
      permissions: string | null;
      status: string;
      failed_login_attempts: number | null;
      locked_until: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(`SELECT * FROM Users WHERE email = @email`, { email });

    if (!result) return null;

    return {
      id: result.id,
      email: result.email,
      displayName: result.display_name || undefined,
      role: result.role as User['role'],
      permissions: result.permissions ? JSON.parse(result.permissions) : undefined,
      status: (result.status as 'active' | 'inactive') || 'active',
      failedLoginAttempts: result.failed_login_attempts || 0,
      lockedUntil: result.locked_until
        ? (result.locked_until instanceof Date ? result.locked_until.toISOString() : String(result.locked_until))
        : undefined,
      createdAt: result.created_at instanceof Date ? result.created_at.toISOString() : String(result.created_at),
      updatedAt: result.updated_at instanceof Date ? result.updated_at.toISOString() : String(result.updated_at),
    };
  }

  /**
   * Check if email exists (for validation)
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    let queryString = `SELECT 1 FROM Users WHERE email = @email`;
    const params: Record<string, unknown> = { email };

    if (excludeId) {
      queryString += ` AND id != @excludeId`;
      params.excludeId = excludeId;
    }

    const result = await queryOne<{ '': number }>(queryString, params);
    return result !== null;
  }

  /**
   * Get stores assigned to a user
   */
  async getUserStores(userId: string): Promise<UserStoreAssignment[]> {
    const results = await query<{
      user_id: string;
      store_id: string;
      store_name: string;
      store_slug: string;
    }>(
      `SELECT us.user_id, us.store_id, s.name as store_name, s.slug as store_slug
       FROM UserStores us
       INNER JOIN Stores s ON us.store_id = s.id
       WHERE us.user_id = @userId AND s.status = 'active'
       ORDER BY s.name`,
      { userId }
    );
    return results.map(r => ({
      storeId: r.store_id,
      storeName: r.store_name,
      storeCode: r.store_slug,
    }));
  }

  /**
   * Create a new user
   */
  async create(input: CreateUserInput): Promise<User> {
    const emailExists = await this.emailExists(input.email);
    if (emailExists) {
      throw new Error('Email đã được sử dụng');
    }

    const passwordHash = await hashPassword(input.password);
    const id = crypto.randomUUID();

    await query(
      `INSERT INTO Users (id, email, password_hash, display_name, role, permissions, status, failed_login_attempts, created_at, updated_at)
       VALUES (@id, @email, @passwordHash, @displayName, @role, @permissions, 'active', 0, GETDATE(), GETDATE())`,
      {
        id,
        email: input.email,
        passwordHash,
        displayName: input.displayName || null,
        role: input.role,
        permissions: input.permissions ? JSON.stringify(input.permissions) : null,
      }
    );

    if (input.storeIds && input.storeIds.length > 0) {
      await this.assignStores(id, input.storeIds);
    }

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Không thể tạo người dùng');
    }
    return created;
  }

  /**
   * Update an existing user
   */
  async update(id: string, input: UpdateUserInput): Promise<User> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Không tìm thấy người dùng');
    }

    if (input.email && input.email !== existing.email) {
      const emailExists = await this.emailExists(input.email, id);
      if (emailExists) {
        throw new Error('Email đã được sử dụng');
      }
    }

    let passwordHash = undefined;
    if (input.password) {
      passwordHash = await hashPassword(input.password);
    }

    await query(
      `UPDATE Users SET 
        email = @email,
        display_name = @displayName,
        role = @role,
        permissions = @permissions,
        status = @status,
        ${passwordHash ? 'password_hash = @passwordHash,' : ''}
        updated_at = GETDATE()
       WHERE id = @id`,
      {
        id,
        email: input.email ?? existing.email,
        displayName: input.displayName ?? existing.displayName ?? null,
        role: input.role ?? existing.role,
        permissions: input.permissions ? JSON.stringify(input.permissions) : (existing.permissions ? JSON.stringify(existing.permissions) : null),
        status: input.status ?? existing.status,
        ...(passwordHash && { passwordHash }),
      }
    );

    if (input.storeIds !== undefined) {
      await this.updateStoreAssignments(id, input.storeIds);
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Không thể cập nhật người dùng');
    }
    return updated;
  }

  /**
   * Delete a user
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Không tìm thấy người dùng');
    }

    await query(`DELETE FROM UserStores WHERE user_id = @userId`, { userId: id });
    await query(`DELETE FROM Sessions WHERE user_id = @userId`, { userId: id });
    await query(`DELETE FROM Users WHERE id = @id`, { id });
    return true;
  }

  /**
   * Assign stores to a user
   */
  async assignStores(userId: string, storeIds: string[]): Promise<void> {
    for (const storeId of storeIds) {
      const existing = await queryOne<{ user_id: string }>(
        `SELECT user_id FROM UserStores WHERE user_id = @userId AND store_id = @storeId`,
        { userId, storeId }
      );

      if (!existing) {
        await query(
          `INSERT INTO UserStores (user_id, store_id, created_at) VALUES (@userId, @storeId, GETDATE())`,
          { userId, storeId }
        );
      }
    }
  }

  /**
   * Update store assignments (replace all)
   */
  async updateStoreAssignments(userId: string, storeIds: string[]): Promise<void> {
    await query(`DELETE FROM UserStores WHERE user_id = @userId`, { userId });
    if (storeIds.length > 0) {
      await this.assignStores(userId, storeIds);
    }
  }

  /**
   * Check if user has access to a store
   */
  async hasStoreAccess(userId: string, storeId: string): Promise<boolean> {
    const result = await queryOne<{ user_id: string }>(
      `SELECT user_id FROM UserStores WHERE user_id = @userId AND store_id = @storeId`,
      { userId, storeId }
    );
    return result !== null;
  }

  /**
   * Count users assigned to a store
   */
  async countByStore(storeId: string): Promise<number> {
    const result = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM UserStores WHERE store_id = @storeId`,
      { storeId }
    );
    return result?.total ?? 0;
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
