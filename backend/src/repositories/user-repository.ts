import { query, queryOne } from '../db/index.js';
import { hashPassword } from '../auth/password.js';
import { invalidateUserPermissionCache } from '../services/permission-service.js';
import type { Permissions, UserRole } from '../types.js';

/**
 * User entity interface
 */
export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
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
 * User-Store assignment with RBAC support
 */
export interface UserStoreAssignment {
  storeId: string;
  storeName: string;
  storeCode: string;
  roleOverride?: UserRole;  // Custom role for this specific store
  permissionsOverride?: Permissions;  // Custom permissions for this specific store
}

/**
 * Input for assigning a store to a user with optional role override
 */
export interface AssignStoreInput {
  storeId: string;
  roleOverride?: UserRole;
  permissionsOverride?: Permissions;
}

/**
 * Create user input
 */
export interface CreateUserInput {
  email: string;
  password: string;
  displayName?: string;
  role: UserRole;
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
  role?: UserRole;
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
   * Get stores assigned to a user with role/permission overrides
   */
  async getUserStores(userId: string): Promise<UserStoreAssignment[]> {
    const results = await query<{
      user_id: string;
      store_id: string;
      store_name: string;
      store_slug: string;
      role_override: string | null;
      permissions_override: string | null;
    }>(
      `SELECT us.UserId as user_id, us.StoreId as store_id, 
              s.Name as store_name, s.Slug as store_slug,
              us.RoleOverride as role_override, us.PermissionsOverride as permissions_override
       FROM UserStores us
       INNER JOIN Stores s ON us.StoreId = s.Id
       WHERE us.UserId = @userId AND s.Status = 'active'
       ORDER BY s.Name`,
      { userId }
    );
    return results.map(r => ({
      storeId: r.store_id,
      storeName: r.store_name,
      storeCode: r.store_slug,
      roleOverride: r.role_override as UserRole | undefined,
      permissionsOverride: r.permissions_override ? JSON.parse(r.permissions_override) : undefined,
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

    // Check if role or permissions changed - need to invalidate cache
    const roleChanged = input.role && input.role !== existing.role;
    const permissionsChanged = input.permissions !== undefined;

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

    // Invalidate permission cache if role or permissions changed
    // Requirements: 6.5
    if (roleChanged || permissionsChanged) {
      invalidateUserPermissionCache(id);
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

    await query(`DELETE FROM UserStores WHERE UserId = @userId`, { userId: id });
    await query(`DELETE FROM Sessions WHERE UserId = @userId`, { userId: id });
    await query(`DELETE FROM Users WHERE Id = @id`, { id });
    return true;
  }

  /**
   * Assign stores to a user with optional role/permission overrides
   */
  async assignStores(userId: string, storeIds: string[]): Promise<void> {
    for (const storeId of storeIds) {
      const existing = await queryOne<{ UserId: string }>(
        `SELECT UserId FROM UserStores WHERE UserId = @userId AND StoreId = @storeId`,
        { userId, storeId }
      );

      if (!existing) {
        const id = crypto.randomUUID();
        await query(
          `INSERT INTO UserStores (Id, UserId, StoreId, CreatedAt, UpdatedAt) 
           VALUES (@id, @userId, @storeId, GETDATE(), GETDATE())`,
          { id, userId, storeId }
        );
      }
    }
  }

  /**
   * Assign a store to a user with role/permission overrides
   */
  async assignStoreWithOverrides(
    userId: string, 
    input: AssignStoreInput
  ): Promise<void> {
    const existing = await queryOne<{ UserId: string }>(
      `SELECT UserId FROM UserStores WHERE UserId = @userId AND StoreId = @storeId`,
      { userId, storeId: input.storeId }
    );

    if (existing) {
      // Update existing assignment
      await query(
        `UPDATE UserStores SET 
          RoleOverride = @roleOverride,
          PermissionsOverride = @permissionsOverride,
          UpdatedAt = GETDATE()
         WHERE UserId = @userId AND StoreId = @storeId`,
        {
          userId,
          storeId: input.storeId,
          roleOverride: input.roleOverride || null,
          permissionsOverride: input.permissionsOverride 
            ? JSON.stringify(input.permissionsOverride) 
            : null,
        }
      );
    } else {
      // Create new assignment
      const id = crypto.randomUUID();
      await query(
        `INSERT INTO UserStores (Id, UserId, StoreId, RoleOverride, PermissionsOverride, CreatedAt, UpdatedAt) 
         VALUES (@id, @userId, @storeId, @roleOverride, @permissionsOverride, GETDATE(), GETDATE())`,
        {
          id,
          userId,
          storeId: input.storeId,
          roleOverride: input.roleOverride || null,
          permissionsOverride: input.permissionsOverride 
            ? JSON.stringify(input.permissionsOverride) 
            : null,
        }
      );
    }

    // Invalidate permission cache when store assignments change
    // Requirements: 6.5
    invalidateUserPermissionCache(userId);
  }

  /**
   * Get user's effective role for a specific store
   * Returns roleOverride if set, otherwise returns user's base role
   */
  async getEffectiveRoleForStore(userId: string, storeId: string): Promise<UserRole | null> {
    const result = await queryOne<{ 
      base_role: string; 
      role_override: string | null;
    }>(
      `SELECT u.Role as base_role, us.RoleOverride as role_override
       FROM Users u
       LEFT JOIN UserStores us ON u.Id = us.UserId AND us.StoreId = @storeId
       WHERE u.Id = @userId`,
      { userId, storeId }
    );

    if (!result) return null;
    
    return (result.role_override || result.base_role) as UserRole;
  }

  /**
   * Update store assignments (replace all)
   */
  async updateStoreAssignments(userId: string, storeIds: string[]): Promise<void> {
    await query(`DELETE FROM UserStores WHERE UserId = @userId`, { userId });
    if (storeIds.length > 0) {
      await this.assignStores(userId, storeIds);
    }
    
    // Invalidate permission cache when store assignments change
    // Requirements: 6.5
    invalidateUserPermissionCache(userId);
  }

  /**
   * Check if user has access to a store
   */
  async hasStoreAccess(userId: string, storeId: string): Promise<boolean> {
    const result = await queryOne<{ UserId: string }>(
      `SELECT UserId FROM UserStores WHERE UserId = @userId AND StoreId = @storeId`,
      { userId, storeId }
    );
    return result !== null;
  }

  /**
   * Count users assigned to a store
   */
  async countByStore(storeId: string): Promise<number> {
    const result = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM UserStores WHERE StoreId = @storeId`,
      { storeId }
    );
    return result?.total ?? 0;
  }

  /**
   * Remove a user's access to a specific store
   */
  async removeStoreAccess(userId: string, storeId: string): Promise<boolean> {
    await query(
      `DELETE FROM UserStores WHERE UserId = @userId AND StoreId = @storeId`,
      { userId, storeId }
    );
    return true;
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
