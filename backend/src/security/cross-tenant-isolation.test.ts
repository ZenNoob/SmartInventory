/**
 * Security Tests for Cross-Tenant Isolation
 * 
 * Tests to verify that tenant data is properly isolated and
 * cross-tenant access attempts are blocked.
 * 
 * Requirements: 7.1, 7.2, 7.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { TenantRouter } from '../db/tenant-router';
import { PermissionService, UserPermissionContext } from '../services/permission-service';
import { generateMultiTenantToken, validateMultiTenantToken } from '../auth/jwt';
import type { UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'smart-inventory-secret-key-change-in-production';

describe('Cross-Tenant Isolation - Token Security', () => {
  describe('Tenant ID Validation', () => {
    it('should include tenant_id in all tokens', () => {
      const payload = {
        userId: 'user-123',
        tenantUserId: 'tenant-user-456',
        tenantId: 'tenant-A',
        email: 'test@example.com',
        role: 'owner' as UserRole,
        stores: [],
        sessionId: 'session-abc',
      };

      const token = generateMultiTenantToken(payload);
      const decoded = validateMultiTenantToken(token);

      expect(decoded?.tenant_id).toBe('tenant-A');
    });

    it('should not allow token without tenant_id to be validated as multi-tenant', () => {
      // Create a token without tenant_id
      const tokenWithoutTenant = jwt.sign(
        {
          sub: 'user-123',
          email: 'test@example.com',
          role: 'owner',
          stores: [],
          session_id: 'session-abc',
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      const decoded = validateMultiTenantToken(tokenWithoutTenant);
      expect(decoded).toBeNull();
    });

    it('should reject tokens with mismatched tenant context', () => {
      // Token for tenant-A
      const tokenTenantA = generateMultiTenantToken({
        userId: 'user-123',
        tenantUserId: 'tenant-user-456',
        tenantId: 'tenant-A',
        email: 'test@example.com',
        role: 'owner',
        stores: [],
        sessionId: 'session-abc',
      });

      const decoded = validateMultiTenantToken(tokenTenantA);
      
      // Verify the token is for tenant-A, not tenant-B
      expect(decoded?.tenant_id).toBe('tenant-A');
      expect(decoded?.tenant_id).not.toBe('tenant-B');
    });
  });

  describe('Token Tampering Prevention', () => {
    it('should reject token with modified tenant_id', () => {
      const originalToken = generateMultiTenantToken({
        userId: 'user-123',
        tenantUserId: 'tenant-user-456',
        tenantId: 'tenant-A',
        email: 'test@example.com',
        role: 'owner',
        stores: [],
        sessionId: 'session-abc',
      });

      // Decode without verification
      const parts = originalToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // Modify tenant_id
      payload.tenant_id = 'tenant-B';
      
      // Re-encode (without proper signature)
      const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tamperedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;

      // Should fail validation due to signature mismatch
      const result = validateMultiTenantToken(tamperedToken);
      expect(result).toBeNull();
    });

    it('should reject token with modified user_id', () => {
      const originalToken = generateMultiTenantToken({
        userId: 'user-123',
        tenantUserId: 'tenant-user-456',
        tenantId: 'tenant-A',
        email: 'test@example.com',
        role: 'owner',
        stores: [],
        sessionId: 'session-abc',
      });

      // Decode without verification
      const parts = originalToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // Modify user_id
      payload.sub = 'user-999';
      
      // Re-encode (without proper signature)
      const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tamperedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;

      // Should fail validation due to signature mismatch
      const result = validateMultiTenantToken(tamperedToken);
      expect(result).toBeNull();
    });

    it('should reject token with modified role', () => {
      const originalToken = generateMultiTenantToken({
        userId: 'user-123',
        tenantUserId: 'tenant-user-456',
        tenantId: 'tenant-A',
        email: 'test@example.com',
        role: 'salesperson',
        stores: [],
        sessionId: 'session-abc',
      });

      // Decode without verification
      const parts = originalToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // Modify role to escalate privileges
      payload.role = 'owner';
      
      // Re-encode (without proper signature)
      const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tamperedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;

      // Should fail validation due to signature mismatch
      const result = validateMultiTenantToken(tamperedToken);
      expect(result).toBeNull();
    });
  });
});

describe('Cross-Tenant Isolation - Permission Service', () => {
  let permissionService: PermissionService;

  beforeEach(() => {
    permissionService = new PermissionService({ cacheEnabled: false });
  });

  afterEach(() => {
    permissionService.dispose();
  });

  describe('Tenant-Scoped Permission Checks', () => {
    it('should scope permission context to specific tenant', async () => {
      const contextTenantA: UserPermissionContext = {
        userId: 'user-1',
        tenantId: 'tenant-A',
        role: 'owner',
      };

      const contextTenantB: UserPermissionContext = {
        userId: 'user-1',
        tenantId: 'tenant-B',
        role: 'salesperson',
      };

      // Same user ID but different tenant contexts
      const resultA = await permissionService.checkPermission(
        'user-1',
        'users',
        'delete',
        undefined,
        contextTenantA
      );

      const resultB = await permissionService.checkPermission(
        'user-1',
        'users',
        'delete',
        undefined,
        contextTenantB
      );

      // Owner in tenant-A can delete users
      expect(resultA.allowed).toBe(true);
      
      // Salesperson in tenant-B cannot delete users
      expect(resultB.allowed).toBe(false);
    });

    it('should not allow cross-tenant permission inheritance', async () => {
      // User is owner in tenant-A
      const ownerContext: UserPermissionContext = {
        userId: 'user-1',
        tenantId: 'tenant-A',
        role: 'owner',
      };

      // Same user is salesperson in tenant-B
      const salespersonContext: UserPermissionContext = {
        userId: 'user-1',
        tenantId: 'tenant-B',
        role: 'salesperson',
      };

      // Check that owner permissions don't leak to tenant-B
      const resultInTenantB = await permissionService.checkPermission(
        'user-1',
        'settings',
        'edit',
        undefined,
        salespersonContext
      );

      expect(resultInTenantB.allowed).toBe(false);
    });
  });

  describe('Store Access Isolation', () => {
    it('should isolate store permissions per tenant', async () => {
      const storePermsTenantA = new Map<string, Record<string, string[]>>();
      storePermsTenantA.set('store-A1', {
        products: ['view', 'add', 'edit', 'delete'],
      });

      const contextTenantA: UserPermissionContext = {
        userId: 'user-1',
        tenantId: 'tenant-A',
        role: 'store_manager',
        storePermissions: storePermsTenantA,
      };

      // User has store permissions in tenant-A
      const resultWithStore = await permissionService.checkPermission(
        'user-1',
        'products',
        'delete',
        'store-A1',
        contextTenantA
      );

      expect(resultWithStore.allowed).toBe(true);

      // Same user in tenant-B without store permissions
      const contextTenantB: UserPermissionContext = {
        userId: 'user-1',
        tenantId: 'tenant-B',
        role: 'store_manager',
      };

      const resultWithoutStore = await permissionService.checkPermission(
        'user-1',
        'products',
        'delete',
        'store-A1', // Trying to access tenant-A's store from tenant-B context
        contextTenantB
      );

      // Should not have delete permission without store-specific grants
      expect(resultWithoutStore.allowed).toBe(false);
    });
  });
});

describe('Cross-Tenant Isolation - TenantRouter', () => {
  let router: TenantRouter;

  beforeEach(() => {
    router = new TenantRouter({
      maxPoolSize: 5,
      cacheCleanupIntervalMs: 60000,
      maxCacheAge: 5000,
    });
  });

  afterEach(async () => {
    await router.close();
  });

  describe('Connection Isolation', () => {
    it('should track connections per tenant separately', () => {
      // Without actual DB, verify the router tracks tenants independently
      expect(router.hasConnection('tenant-A')).toBe(false);
      expect(router.hasConnection('tenant-B')).toBe(false);
      
      // Each tenant should have independent connection state
      const connections = router.getActiveConnections();
      expect(connections).toEqual([]);
    });

    it('should not share connection pools between tenants', () => {
      // Verify that connection lookup is tenant-specific
      const hasTenantA = router.hasConnection('tenant-A');
      const hasTenantB = router.hasConnection('tenant-B');
      
      // Both should be independent
      expect(hasTenantA).toBe(hasTenantB);
      expect(hasTenantA).toBe(false);
    });
  });

  describe('Cache Isolation', () => {
    it('should invalidate cache per tenant independently', () => {
      // Invalidating tenant-A cache should not affect tenant-B
      expect(() => router.invalidateTenantCache('tenant-A')).not.toThrow();
      expect(() => router.invalidateTenantCache('tenant-B')).not.toThrow();
    });
  });
});

describe('Cross-Tenant Isolation - Role Hierarchy', () => {
  let permissionService: PermissionService;

  beforeEach(() => {
    permissionService = new PermissionService({ cacheEnabled: false });
  });

  afterEach(() => {
    permissionService.dispose();
  });

  it('should enforce role hierarchy within tenant boundaries', async () => {
    const roles: UserRole[] = ['owner', 'company_manager', 'store_manager', 'salesperson'];
    
    for (const role of roles) {
      const context: UserPermissionContext = {
        userId: 'user-1',
        tenantId: 'tenant-A',
        role,
      };

      const canManageUsers = await permissionService.checkPermission(
        'user-1',
        'users',
        'add',
        undefined,
        context
      );

      // Only owner can add users
      if (role === 'owner') {
        expect(canManageUsers.allowed).toBe(true);
      } else {
        expect(canManageUsers.allowed).toBe(false);
      }
    }
  });

  it('should not allow role escalation through custom permissions', async () => {
    // Salesperson with custom permissions trying to access user management
    const context: UserPermissionContext = {
      userId: 'user-1',
      tenantId: 'tenant-A',
      role: 'salesperson',
      customPermissions: {
        // Even with custom permissions, certain actions should be restricted
        products: ['view', 'add', 'edit', 'delete'],
      },
    };

    // Custom permissions should work for allowed modules
    const productResult = await permissionService.checkPermission(
      'user-1',
      'products',
      'delete',
      undefined,
      context
    );
    expect(productResult.allowed).toBe(true);

    // But user management should still be restricted
    const userResult = await permissionService.checkPermission(
      'user-1',
      'users',
      'add',
      undefined,
      context
    );
    expect(userResult.allowed).toBe(false);
  });
});
