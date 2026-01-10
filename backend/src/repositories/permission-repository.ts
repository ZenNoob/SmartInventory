/**
 * Permission Repository
 * 
 * Manages custom permissions per user per module with store-specific support.
 * These permissions override the default role-based permissions.
 */

import { query, queryOne } from '../db/index.js';
import type { Module, Permission, Permissions, UserRole } from '../types.js';

/**
 * Permission record from database
 */
export interface PermissionRecord {
  id: string;
  userId: string;
  module: Module;
  actions: Permission[];
  storeId: string | null;  // NULL = applies to all stores
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating/updating a permission
 */
export interface SetPermissionInput {
  userId: string;
  module: Module;
  actions: Permission[];
  storeId?: string | null;  // NULL or undefined = applies to all stores
}

/**
 * Permission repository for managing custom user permissions
 */
export class PermissionRepository {
  /**
   * Get all custom permissions for a user
   */
  async getByUserId(userId: string): Promise<PermissionRecord[]> {
    const results = await query<{
      Id: string;
      UserId: string;
      Module: string;
      Actions: string;
      StoreId: string | null;
      CreatedAt: Date;
      UpdatedAt: Date;
    }>(
      `SELECT Id, UserId, Module, Actions, StoreId, CreatedAt, UpdatedAt
       FROM Permissions
       WHERE UserId = @userId
       ORDER BY Module, StoreId`,
      { userId }
    );

    return results.map(r => ({
      id: r.Id,
      userId: r.UserId,
      module: r.Module as Module,
      actions: JSON.parse(r.Actions) as Permission[],
      storeId: r.StoreId,
      createdAt: r.CreatedAt instanceof Date ? r.CreatedAt.toISOString() : String(r.CreatedAt),
      updatedAt: r.UpdatedAt instanceof Date ? r.UpdatedAt.toISOString() : String(r.UpdatedAt),
    }));
  }

  /**
   * Get custom permissions for a user for a specific store
   * Returns both global permissions (storeId = NULL) and store-specific permissions
   */
  async getByUserAndStore(userId: string, storeId: string): Promise<PermissionRecord[]> {
    const results = await query<{
      Id: string;
      UserId: string;
      Module: string;
      Actions: string;
      StoreId: string | null;
      CreatedAt: Date;
      UpdatedAt: Date;
    }>(
      `SELECT Id, UserId, Module, Actions, StoreId, CreatedAt, UpdatedAt
       FROM Permissions
       WHERE UserId = @userId AND (StoreId IS NULL OR StoreId = @storeId)
       ORDER BY Module, StoreId`,
      { userId, storeId }
    );

    return results.map(r => ({
      id: r.Id,
      userId: r.UserId,
      module: r.Module as Module,
      actions: JSON.parse(r.Actions) as Permission[],
      storeId: r.StoreId,
      createdAt: r.CreatedAt instanceof Date ? r.CreatedAt.toISOString() : String(r.CreatedAt),
      updatedAt: r.UpdatedAt instanceof Date ? r.UpdatedAt.toISOString() : String(r.UpdatedAt),
    }));
  }

  /**
   * Get a specific permission record
   */
  async getByUserModuleStore(
    userId: string, 
    module: Module, 
    storeId: string | null
  ): Promise<PermissionRecord | null> {
    const storeCondition = storeId === null 
      ? 'StoreId IS NULL' 
      : 'StoreId = @storeId';
    
    const result = await queryOne<{
      Id: string;
      UserId: string;
      Module: string;
      Actions: string;
      StoreId: string | null;
      CreatedAt: Date;
      UpdatedAt: Date;
    }>(
      `SELECT Id, UserId, Module, Actions, StoreId, CreatedAt, UpdatedAt
       FROM Permissions
       WHERE UserId = @userId AND Module = @module AND ${storeCondition}`,
      { userId, module, storeId }
    );

    if (!result) return null;

    return {
      id: result.Id,
      userId: result.UserId,
      module: result.Module as Module,
      actions: JSON.parse(result.Actions) as Permission[],
      storeId: result.StoreId,
      createdAt: result.CreatedAt instanceof Date ? result.CreatedAt.toISOString() : String(result.CreatedAt),
      updatedAt: result.UpdatedAt instanceof Date ? result.UpdatedAt.toISOString() : String(result.UpdatedAt),
    };
  }


  /**
   * Set permission for a user on a module (create or update)
   */
  async setPermission(input: SetPermissionInput): Promise<PermissionRecord> {
    const { userId, module, actions, storeId = null } = input;
    
    // Check if permission already exists
    const existing = await this.getByUserModuleStore(userId, module, storeId);
    
    if (existing) {
      // Update existing permission
      await query(
        `UPDATE Permissions 
         SET Actions = @actions, UpdatedAt = GETDATE()
         WHERE Id = @id`,
        { 
          id: existing.id, 
          actions: JSON.stringify(actions) 
        }
      );
      
      return {
        ...existing,
        actions,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Create new permission
      const id = crypto.randomUUID();
      
      await query(
        `INSERT INTO Permissions (Id, UserId, Module, Actions, StoreId, CreatedAt, UpdatedAt)
         VALUES (@id, @userId, @module, @actions, @storeId, GETDATE(), GETDATE())`,
        {
          id,
          userId,
          module,
          actions: JSON.stringify(actions),
          storeId,
        }
      );
      
      const created = await this.getByUserModuleStore(userId, module, storeId);
      if (!created) {
        throw new Error('Failed to create permission');
      }
      return created;
    }
  }

  /**
   * Set multiple permissions for a user at once
   */
  async setPermissions(userId: string, permissions: Permissions, storeId?: string | null): Promise<void> {
    for (const [module, actions] of Object.entries(permissions)) {
      if (actions && actions.length > 0) {
        await this.setPermission({
          userId,
          module: module as Module,
          actions,
          storeId: storeId ?? null,
        });
      } else {
        // Remove permission if actions is empty
        await this.deletePermission(userId, module as Module, storeId ?? null);
      }
    }
  }

  /**
   * Delete a specific permission
   */
  async deletePermission(userId: string, module: Module, storeId: string | null): Promise<boolean> {
    const storeCondition = storeId === null 
      ? 'StoreId IS NULL' 
      : 'StoreId = @storeId';
    
    await query(
      `DELETE FROM Permissions 
       WHERE UserId = @userId AND Module = @module AND ${storeCondition}`,
      { userId, module, storeId }
    );
    
    return true;
  }

  /**
   * Delete all permissions for a user
   */
  async deleteAllForUser(userId: string): Promise<boolean> {
    await query(
      `DELETE FROM Permissions WHERE UserId = @userId`,
      { userId }
    );
    return true;
  }

  /**
   * Delete all permissions for a specific store
   */
  async deleteAllForStore(storeId: string): Promise<boolean> {
    await query(
      `DELETE FROM Permissions WHERE StoreId = @storeId`,
      { storeId }
    );
    return true;
  }

  /**
   * Get effective permissions for a user for a specific store
   * Merges global permissions with store-specific permissions
   * Store-specific permissions take precedence
   */
  async getEffectivePermissions(userId: string, storeId: string): Promise<Permissions> {
    const records = await this.getByUserAndStore(userId, storeId);
    
    const permissions: Permissions = {};
    
    // First, apply global permissions (storeId = NULL)
    for (const record of records.filter(r => r.storeId === null)) {
      permissions[record.module] = record.actions;
    }
    
    // Then, override with store-specific permissions
    for (const record of records.filter(r => r.storeId === storeId)) {
      permissions[record.module] = record.actions;
    }
    
    return permissions;
  }

  /**
   * Convert user's custom permissions to Permissions object
   */
  async toPermissionsObject(userId: string): Promise<Permissions> {
    const records = await this.getByUserId(userId);
    
    const permissions: Permissions = {};
    for (const record of records.filter(r => r.storeId === null)) {
      permissions[record.module] = record.actions;
    }
    
    return permissions;
  }

  /**
   * Check if user has a specific permission for a module in a store
   */
  async hasPermission(
    userId: string, 
    module: Module, 
    action: Permission, 
    storeId?: string
  ): Promise<boolean> {
    // Get store-specific permission first
    if (storeId) {
      const storePermission = await this.getByUserModuleStore(userId, module, storeId);
      if (storePermission) {
        return storePermission.actions.includes(action);
      }
    }
    
    // Fall back to global permission
    const globalPermission = await this.getByUserModuleStore(userId, module, null);
    if (globalPermission) {
      return globalPermission.actions.includes(action);
    }
    
    return false;
  }
}

// Export singleton instance
export const permissionRepository = new PermissionRepository();
