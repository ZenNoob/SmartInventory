/**
 * Permission Cache
 * 
 * Specialized cache for user permissions with tenant-aware key management
 * and automatic invalidation support.
 * 
 * Requirements: 6.5
 */

import { MemoryCache } from './memory-cache';
import type { CacheStats } from './cache-interface';
import type { Permissions, UserRole } from '../../types';

/**
 * Cached permission context for a user
 */
export interface CachedPermissionContext {
  userId: string;
  tenantId: string;
  role: UserRole;
  customPermissions?: Permissions;
  storePermissions?: Record<string, Permissions>;
  accessibleStores?: string[];
}

/**
 * Permission cache configuration
 */
export interface PermissionCacheConfig {
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttlMs?: number;
  /** Maximum number of cached users (default: 10000) */
  maxSize?: number;
  /** Enable/disable caching (default: true) */
  enabled?: boolean;
}

const DEFAULT_PERMISSION_CACHE_CONFIG: Required<PermissionCacheConfig> = {
  ttlMs: 5 * 60 * 1000, // 5 minutes
  maxSize: 10000,
  enabled: true,
};

/**
 * Permission Cache class
 * 
 * Provides tenant-aware caching for user permissions with
 * efficient invalidation patterns.
 */
export class PermissionCache {
  private cache: MemoryCache<CachedPermissionContext>;
  private config: Required<PermissionCacheConfig>;
  private enabled: boolean;

  constructor(config: PermissionCacheConfig = {}) {
    this.config = { ...DEFAULT_PERMISSION_CACHE_CONFIG, ...config };
    this.enabled = this.config.enabled;
    
    this.cache = new MemoryCache<CachedPermissionContext>({
      ttlMs: this.config.ttlMs,
      maxSize: this.config.maxSize,
      keyPrefix: 'perm',
      cleanupIntervalMs: 60 * 1000,
    });
  }

  /**
   * Generate cache key for user permissions
   */
  private getCacheKey(userId: string, tenantId?: string): string {
    return tenantId ? `${tenantId}:${userId}` : `default:${userId}`;
  }

  /**
   * Get cached permission context for a user
   */
  async get(userId: string, tenantId?: string): Promise<CachedPermissionContext | null> {
    if (!this.enabled) {
      return null;
    }

    const key = this.getCacheKey(userId, tenantId);
    return this.cache.get(key);
  }

  /**
   * Cache permission context for a user
   */
  async set(
    userId: string, 
    context: CachedPermissionContext, 
    tenantId?: string
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const key = this.getCacheKey(userId, tenantId);
    await this.cache.set(key, context);
  }

  /**
   * Invalidate cache for a specific user
   * Call this when user's role or permissions change
   */
  async invalidateUser(userId: string, tenantId?: string): Promise<void> {
    const key = this.getCacheKey(userId, tenantId);
    await this.cache.delete(key);
  }

  /**
   * Invalidate cache for all users in a tenant
   * Call this when tenant-wide permission changes occur
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    await this.cache.deletePattern(`${tenantId}:*`);
  }

  /**
   * Invalidate cache for users with a specific role in a tenant
   * Useful when default role permissions are changed
   */
  async invalidateByRole(role: UserRole, tenantId?: string): Promise<void> {
    // For memory cache, we need to iterate and check role
    // This is a limitation of the simple pattern matching
    // A Redis implementation could use secondary indexes
    const pattern = tenantId ? `${tenantId}:*` : '*';
    await this.cache.deletePattern(pattern);
  }

  /**
   * Invalidate cache for users with access to a specific store
   * Call this when store-level permissions change
   */
  async invalidateByStore(storeId: string, tenantId?: string): Promise<void> {
    // Similar limitation as invalidateByRole
    // Clear all tenant cache as a safe fallback
    if (tenantId) {
      await this.invalidateTenant(tenantId);
    } else {
      await this.clear();
    }
  }

  /**
   * Clear all cached permissions
   */
  async clear(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Check if caching is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable caching
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { enabled: boolean; ttlMs: number } {
    return {
      ...this.cache.getStats(),
      enabled: this.enabled,
      ttlMs: this.config.ttlMs,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.cache.resetStats();
  }

  /**
   * Dispose of cache resources
   */
  dispose(): void {
    this.cache.dispose();
  }
}

// Export singleton instance
export const permissionCache = new PermissionCache();
