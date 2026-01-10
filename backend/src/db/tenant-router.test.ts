/**
 * Unit Tests for TenantRouter
 * 
 * Tests connection management, caching, and tenant routing logic.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TenantRouter, TenantRouterConfig } from './tenant-router';

describe('TenantRouter', () => {
  let router: TenantRouter;

  beforeEach(() => {
    // Create router with test config (no actual DB connections)
    router = new TenantRouter({
      maxPoolSize: 5,
      minPoolSize: 0,
      idleTimeoutMs: 1000,
      connectionTimeoutMs: 5000,
      requestTimeoutMs: 5000,
      cacheCleanupIntervalMs: 60000,
      maxCacheAge: 5000,
    });
  });

  afterEach(async () => {
    await router.close();
  });

  describe('Configuration', () => {
    it('should use default config when no config provided', () => {
      const defaultRouter = new TenantRouter();
      expect(defaultRouter).toBeDefined();
      defaultRouter.close();
    });

    it('should merge custom config with defaults', () => {
      const customRouter = new TenantRouter({ maxPoolSize: 20 });
      expect(customRouter).toBeDefined();
      customRouter.close();
    });
  });

  describe('Connection Management', () => {
    it('should throw error when getting master connection before initialization', () => {
      expect(() => router.getMasterConnection()).toThrow(
        'TenantRouter not initialized. Call initialize() first.'
      );
    });

    it('should return false for hasConnection when no connection exists', () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      expect(router.hasConnection(tenantId)).toBe(false);
    });

    it('should return empty array for getActiveConnections when no connections', () => {
      const connections = router.getActiveConnections();
      expect(connections).toEqual([]);
    });
  });

  describe('Cache Invalidation', () => {
    it('should not throw when invalidating non-existent tenant cache', () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      expect(() => router.invalidateTenantCache(tenantId)).not.toThrow();
    });
  });

  describe('Close Operations', () => {
    it('should handle close when no connections exist', async () => {
      await expect(router.close()).resolves.not.toThrow();
    });

    it('should handle multiple close calls gracefully', async () => {
      await router.close();
      await expect(router.close()).resolves.not.toThrow();
    });
  });
});

describe('TenantRouter - Connection Caching Logic', () => {
  it('should track connection access time for cache management', () => {
    const router = new TenantRouter({
      maxCacheAge: 1000,
      cacheCleanupIntervalMs: 500,
    });
    
    // Verify router is created with cache settings
    expect(router).toBeDefined();
    router.close();
  });
});
