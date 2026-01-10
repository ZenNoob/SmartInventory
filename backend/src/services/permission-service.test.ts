/**
 * Unit Tests for PermissionService
 * 
 * Tests permission checking logic, role-based access, and caching.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PermissionService, UserPermissionContext } from './permission-service';
import type { UserRole, Permissions } from '../types';

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    service = new PermissionService({
      cacheEnabled: false, // Disable cache for unit tests
      cacheTtlMs: 1000,
      cacheMaxSize: 100,
    });
  });

  afterEach(() => {
    service.dispose();
  });

  describe('Permission Checking with Context', () => {
    it('should allow owner to access any module', async () => {
      const context: UserPermissionContext = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'owner',
      };

      const result = await service.checkPermission(
        'user-1',
        'products',
        'delete',
        undefined,
        context
      );

      expect(result.allowed).toBe(true);
    });

    it('should allow company_manager to view products', async () => {
      const context: UserPermissionContext = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'company_manager',
      };

      const result = await service.checkPermission(
        'user-1',
        'products',
        'view',
        undefined,
        context
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny salesperson from deleting products', async () => {
      const context: UserPermissionContext = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'salesperson',
      };

      const result = await service.checkPermission(
        'user-1',
        'products',
        'delete',
        undefined,
        context
      );

      expect(result.allowed).toBe(false);
      expect(result.errorCode).toBe('PERM001');
    });

    it('should deny salesperson from accessing users module', async () => {
      const context: UserPermissionContext = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'salesperson',
      };

      const result = await service.checkPermission(
        'user-1',
        'users',
        'view',
        undefined,
        context
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('Custom Permissions Override', () => {
    it('should apply custom permissions over default role permissions', async () => {
      const customPermissions: Permissions = {
        products: ['view', 'add', 'edit', 'delete'],
      };

      const context: UserPermissionContext = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'salesperson',
        customPermissions,
      };

      const result = await service.checkPermission(
        'user-1',
        'products',
        'delete',
        undefined,
        context
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('Store-Specific Permissions', () => {
    it('should apply store-specific permissions when storeId provided', async () => {
      const storePermissions = new Map<string, Permissions>();
      storePermissions.set('store-1', {
        products: ['view', 'add', 'edit', 'delete'],
      });

      const context: UserPermissionContext = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'salesperson',
        storePermissions,
      };

      const result = await service.checkPermission(
        'user-1',
        'products',
        'delete',
        'store-1',
        context
      );

      expect(result.allowed).toBe(true);
    });

    it('should use default permissions when store has no specific permissions', async () => {
      const storePermissions = new Map<string, Permissions>();
      storePermissions.set('store-1', {
        products: ['view', 'add', 'edit', 'delete'],
      });

      const context: UserPermissionContext = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'salesperson',
        storePermissions,
      };

      // Check for store-2 which has no specific permissions
      const result = await service.checkPermission(
        'user-1',
        'products',
        'delete',
        'store-2',
        context
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('Cache Operations', () => {
    it('should not throw when invalidating cache for non-existent user', () => {
      expect(() => service.invalidateCache('non-existent-user')).not.toThrow();
    });

    it('should not throw when invalidating tenant cache', () => {
      expect(() => service.invalidateTenantCache('tenant-1')).not.toThrow();
    });

    it('should not throw when invalidating role cache', () => {
      expect(() => service.invalidateRoleCache('owner')).not.toThrow();
    });

    it('should not throw when invalidating store cache', () => {
      expect(() => service.invalidateStoreCache('store-1')).not.toThrow();
    });

    it('should not throw when clearing cache', () => {
      expect(() => service.clearCache()).not.toThrow();
    });
  });

  describe('getUserPermissions', () => {
    it('should return empty object when context not found', async () => {
      // Without DB connection, this will return empty
      const perms = await service.getUserPermissions('non-existent', 'tenant-1');
      expect(perms).toEqual({});
    });
  });

  describe('checkMultiplePermissions', () => {
    it('should check multiple permissions at once', async () => {
      const context: UserPermissionContext = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'owner',
      };

      // Mock getPermissionContext to return our context
      const originalGetContext = service.getPermissionContext.bind(service);
      service.getPermissionContext = async () => context;

      const results = await service.checkMultiplePermissions(
        'user-1',
        [
          { module: 'products', action: 'view' },
          { module: 'products', action: 'delete' },
          { module: 'users', action: 'add' },
        ],
        'tenant-1'
      );

      expect(results.size).toBe(3);
      expect(results.get('products:view:all')?.allowed).toBe(true);
      expect(results.get('products:delete:all')?.allowed).toBe(true);
      expect(results.get('users:add:all')?.allowed).toBe(true);

      // Restore original method
      service.getPermissionContext = originalGetContext;
    });
  });
});

describe('PermissionService - Role Hierarchy', () => {
  let service: PermissionService;

  beforeEach(() => {
    service = new PermissionService({ cacheEnabled: false });
  });

  afterEach(() => {
    service.dispose();
  });

  const roles: UserRole[] = ['owner', 'company_manager', 'store_manager', 'salesperson'];

  it('should grant owner full access to all modules', async () => {
    const context: UserPermissionContext = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'owner',
    };

    const modules = ['products', 'users', 'stores', 'settings'] as const;
    const actions = ['view', 'add', 'edit', 'delete'] as const;

    for (const module of modules) {
      for (const action of actions) {
        const result = await service.checkPermission(
          'user-1',
          module,
          action,
          undefined,
          context
        );
        expect(result.allowed).toBe(true);
      }
    }
  });

  it('should restrict salesperson to POS and basic sales', async () => {
    const context: UserPermissionContext = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'salesperson',
    };

    // Should have access to POS
    const posResult = await service.checkPermission(
      'user-1',
      'pos',
      'add',
      undefined,
      context
    );
    expect(posResult.allowed).toBe(true);

    // Should have access to view products
    const productsViewResult = await service.checkPermission(
      'user-1',
      'products',
      'view',
      undefined,
      context
    );
    expect(productsViewResult.allowed).toBe(true);

    // Should NOT have access to edit products
    const productsEditResult = await service.checkPermission(
      'user-1',
      'products',
      'edit',
      undefined,
      context
    );
    expect(productsEditResult.allowed).toBe(false);
  });
});
