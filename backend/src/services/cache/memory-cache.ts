/**
 * In-Memory Cache Implementation
 * 
 * A high-performance in-memory cache with TTL support,
 * automatic cleanup, and LRU-like eviction.
 * 
 * Requirements: 6.5
 */

import type { ICache, CacheConfig, CacheEntry, CacheStats } from './cache-interface';
import { DEFAULT_CACHE_CONFIG } from './cache-interface';

/**
 * In-memory cache implementation using Map
 */
export class MemoryCache<T> implements ICache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Statistics
  private hits = 0;
  private misses = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Get a value from cache
   */
  async get(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(fullKey);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value;
  }

  /**
   * Set a value in cache
   */
  async set(key: string, value: T, ttlMs?: number): Promise<void> {
    const fullKey = this.getFullKey(key);
    const ttl = ttlMs ?? this.config.ttlMs;

    // Check max size and evict if necessary
    if (this.config.maxSize && this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(fullKey, {
      value,
      cachedAt: Date.now(),
      ttl,
    });
  }

  /**
   * Delete a specific key from cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    return this.cache.delete(fullKey);
  }

  /**
   * Delete all keys matching a pattern
   * Supports simple wildcard patterns like "tenant:123:*"
   */
  async deletePattern(pattern: string): Promise<number> {
    const fullPattern = this.getFullKey(pattern);
    const regex = this.patternToRegex(fullPattern);
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Clear all entries from cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Check if a key exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(fullKey);
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Reset statistics counters
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Dispose of cache resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }

  /**
   * Get full key with prefix
   */
  private getFullKey(key: string): string {
    return this.config.keyPrefix ? `${this.config.keyPrefix}:${key}` : key;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.cachedAt > entry.ttl;
  }

  /**
   * Convert wildcard pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`);
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.cachedAt < oldestTime) {
        oldestTime = entry.cachedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    if (!this.config.cleanupIntervalMs) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, this.config.cleanupIntervalMs);

    // Don't prevent process from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Remove all expired entries
   */
  private cleanupExpired(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }
}
