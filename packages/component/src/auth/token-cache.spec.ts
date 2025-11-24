/**
 * Tests for Token Cache System
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TokenCache, createTokenCache, type TokenCacheOptions } from './token-cache';
import type { TokenValidationResult } from './types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock validation result
 */
function createMockResult(valid: boolean, claims?: Record<string, any>): TokenValidationResult {
  return {
    valid,
    claims,
    userId: claims?.sub || 'user-123',
    email: claims?.email || 'user@example.com',
  };
}

/**
 * Create a test token
 */
function createTestToken(id: string): string {
  return `test-token-${id}`;
}

// ============================================================================
// TokenCache Tests
// ============================================================================

describe('TokenCache', () => {
  let cache: TokenCache;

  beforeEach(() => {
    cache = new TokenCache({ debug: false });
  });

  describe('Basic Operations', () => {
    it('should cache valid tokens', () => {
      const token = createTestToken('1');
      const result = createMockResult(true);

      cache.set(token, result);
      const cached = cache.get(token);

      expect(cached).toEqual(result);
    });

    it('should not cache invalid tokens', () => {
      const token = createTestToken('2');
      const result = createMockResult(false);

      cache.set(token, result);
      const cached = cache.get(token);

      expect(cached).toBeNull();
    });

    it('should return null for non-existent tokens', () => {
      const cached = cache.get('non-existent-token');
      expect(cached).toBeNull();
    });

    it('should handle null/undefined tokens gracefully', () => {
      expect(cache.get(null as any)).toBeNull();
      expect(cache.get(undefined as any)).toBeNull();
      expect(cache.get('')).toBeNull();

      cache.set(null as any, createMockResult(true));
      cache.set(undefined as any, createMockResult(true));
    });

    it('should invalidate specific tokens', () => {
      const token = createTestToken('3');
      const result = createMockResult(true);

      cache.set(token, result);
      expect(cache.get(token)).toEqual(result);

      const wasInvalidated = cache.invalidate(token);
      expect(wasInvalidated).toBe(true);
      expect(cache.get(token)).toBeNull();
    });

    it('should return false when invalidating non-existent token', () => {
      const wasInvalidated = cache.invalidate('non-existent');
      expect(wasInvalidated).toBe(false);
    });

    it('should clear all cached tokens', () => {
      cache.set(createTestToken('1'), createMockResult(true));
      cache.set(createTestToken('2'), createMockResult(true));
      cache.set(createTestToken('3'), createMockResult(true));

      expect(cache.getStats().size).toBe(3);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
      expect(cache.get(createTestToken('1'))).toBeNull();
    });
  });

  describe('TTL Expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should expire entries after TTL', () => {
      cache = new TokenCache({ ttlMs: 60000 }); // 1 minute TTL
      const token = createTestToken('ttl-1');
      const result = createMockResult(true);

      cache.set(token, result);
      expect(cache.get(token)).toEqual(result);

      // Advance time by 30 seconds - should still be valid
      vi.advanceTimersByTime(30000);
      expect(cache.get(token)).toEqual(result);

      // Advance time by another 31 seconds - should be expired
      vi.advanceTimersByTime(31000);
      expect(cache.get(token)).toBeNull();

      const stats = cache.getStats();
      expect(stats.expirations).toBe(1);
    });

    it('should respect token exp claim', () => {
      cache = new TokenCache({ ttlMs: 3600000 }); // 1 hour cache TTL
      const now = Math.floor(Date.now() / 1000);
      const token = createTestToken('exp-1');

      // Token expires in 5 minutes
      const result = createMockResult(true, {
        exp: now + 300, // 5 minutes from now
        sub: 'user-123',
      });

      cache.set(token, result);
      expect(cache.get(token)).toEqual(result);

      // Advance time by 4 minutes - should still be valid
      vi.advanceTimersByTime(240000);
      expect(cache.get(token)).toEqual(result);

      // Advance time by 2 more minutes - should be expired (respects token exp)
      vi.advanceTimersByTime(120000);
      expect(cache.get(token)).toBeNull();
    });

    it('should not cache already-expired tokens', () => {
      const now = Math.floor(Date.now() / 1000);
      const token = createTestToken('exp-2');

      // Token already expired
      const result = createMockResult(true, {
        exp: now - 100, // Expired 100 seconds ago
        sub: 'user-123',
      });

      cache.set(token, result);
      expect(cache.get(token)).toBeNull();
    });
  });

  describe('LRU Eviction', () => {
    it('should evict LRU entries when max entries reached', () => {
      cache = new TokenCache({ maxEntries: 3 });

      const token1 = createTestToken('lru-1');
      const token2 = createTestToken('lru-2');
      const token3 = createTestToken('lru-3');
      const token4 = createTestToken('lru-4');

      cache.set(token1, createMockResult(true));
      cache.set(token2, createMockResult(true));
      cache.set(token3, createMockResult(true));

      expect(cache.getStats().size).toBe(3);

      // Access token1 and token2 to make them recently used
      cache.get(token1);
      cache.get(token2);

      // Adding token4 should evict token3 (least recently used)
      cache.set(token4, createMockResult(true));

      expect(cache.getStats().size).toBe(3);
      expect(cache.get(token1)).not.toBeNull(); // Still cached
      expect(cache.get(token2)).not.toBeNull(); // Still cached
      expect(cache.get(token3)).toBeNull(); // Evicted
      expect(cache.get(token4)).not.toBeNull(); // Newly added

      const stats = cache.getStats();
      expect(stats.evictions).toBe(1);
    });

    it('should update access time on cache hits', () => {
      cache = new TokenCache({ maxEntries: 2 });

      const token1 = createTestToken('access-1');
      const token2 = createTestToken('access-2');
      const token3 = createTestToken('access-3');

      cache.set(token1, createMockResult(true));
      cache.set(token2, createMockResult(true));

      // Access token1 multiple times
      cache.get(token1);
      cache.get(token1);
      cache.get(token1);

      // Add token3 - should evict token2 (least recently used)
      cache.set(token3, createMockResult(true));

      expect(cache.get(token1)).not.toBeNull();
      expect(cache.get(token2)).toBeNull(); // Evicted
      expect(cache.get(token3)).not.toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should track cache hits and misses', () => {
      const token = createTestToken('stats-1');
      const result = createMockResult(true);

      cache.set(token, result);

      // Cache hit
      cache.get(token);
      cache.get(token);

      // Cache miss
      cache.get('non-existent-1');
      cache.get('non-existent-2');
      cache.get('non-existent-3');

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(3);
      expect(stats.hitRate).toBeCloseTo(0.4); // 2 / 5 = 0.4
    });

    it('should calculate hit rate correctly', () => {
      expect(cache.getStats().hitRate).toBe(0); // No accesses yet

      const token = createTestToken('hitrate-1');
      cache.set(token, createMockResult(true));

      cache.get(token); // Hit
      cache.get(token); // Hit
      cache.get('non-existent'); // Miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(0.6667); // 2 / 3
    });

    it('should track evictions and expirations separately', () => {
      vi.useFakeTimers();
      cache = new TokenCache({ maxEntries: 2, ttlMs: 60000 });

      const token1 = createTestToken('ev-1');
      const token2 = createTestToken('ev-2');
      const token3 = createTestToken('ev-3');
      const token4 = createTestToken('ev-4');

      // Fill cache
      cache.set(token1, createMockResult(true));
      cache.set(token2, createMockResult(true));

      // Cause eviction
      cache.set(token3, createMockResult(true));
      expect(cache.getStats().evictions).toBe(1);
      expect(cache.getStats().expirations).toBe(0);

      // Cause expiration
      vi.advanceTimersByTime(61000);
      cache.get(token2); // Should expire
      cache.get(token3); // Should expire

      const stats = cache.getStats();
      expect(stats.evictions).toBe(1); // Still just 1 eviction
      expect(stats.expirations).toBe(2); // Now 2 expirations

      vi.useRealTimers();
    });

    it('should reset statistics', () => {
      const token = createTestToken('reset-1');
      cache.set(token, createMockResult(true));
      cache.get(token);
      cache.get('non-existent');

      let stats = cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);

      cache.resetStats();

      stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.evictions).toBe(0);
      expect(stats.expirations).toBe(0);
    });

    it('should estimate memory usage', () => {
      const stats1 = cache.getStats();
      expect(stats1.memoryUsage).toBe(0);

      cache.set(createTestToken('mem-1'), createMockResult(true));
      cache.set(createTestToken('mem-2'), createMockResult(true));
      cache.set(createTestToken('mem-3'), createMockResult(true));

      const stats2 = cache.getStats();
      expect(stats2.memoryUsage).toBeGreaterThan(0);
      expect(stats2.size).toBe(3);
    });
  });

  describe('Cleanup Operations', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should cleanup expired entries', () => {
      cache = new TokenCache({ ttlMs: 60000 });

      cache.set(createTestToken('cleanup-1'), createMockResult(true));
      cache.set(createTestToken('cleanup-2'), createMockResult(true));
      cache.set(createTestToken('cleanup-3'), createMockResult(true));

      expect(cache.getStats().size).toBe(3);

      // Advance time past TTL
      vi.advanceTimersByTime(61000);

      const removed = cache.cleanup();

      expect(removed).toBe(3);
      expect(cache.getStats().size).toBe(0);
      expect(cache.getStats().expirations).toBe(3);
    });

    it('should only cleanup expired entries, not valid ones', () => {
      cache = new TokenCache({ ttlMs: 60000 });

      cache.set(createTestToken('cleanup-4'), createMockResult(true));
      cache.set(createTestToken('cleanup-5'), createMockResult(true));

      // Advance time by 30 seconds (halfway to expiration)
      vi.advanceTimersByTime(30000);

      // Add a new entry (will have fresh TTL)
      cache.set(createTestToken('cleanup-6'), createMockResult(true));

      // Advance time by another 35 seconds
      // First two entries should be expired (65 seconds old)
      // Third entry should still be valid (35 seconds old)
      vi.advanceTimersByTime(35000);

      const removed = cache.cleanup();

      expect(removed).toBe(2);
      expect(cache.getStats().size).toBe(1);
      expect(cache.get(createTestToken('cleanup-6'))).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero max entries gracefully', () => {
      cache = new TokenCache({ maxEntries: 0 });

      cache.set(createTestToken('edge-1'), createMockResult(true));

      // Should evict immediately
      expect(cache.getStats().size).toBe(0);
    });

    it('should handle very short TTL', () => {
      vi.useFakeTimers();
      cache = new TokenCache({ ttlMs: 1 });

      const token = createTestToken('edge-2');
      cache.set(token, createMockResult(true));

      // Even 1ms should work
      expect(cache.get(token)).not.toBeNull();

      // Advance time
      vi.advanceTimersByTime(2);
      expect(cache.get(token)).toBeNull();

      vi.useRealTimers();
    });

    it('should handle very large cache', () => {
      cache = new TokenCache({ maxEntries: 10000 });

      for (let i = 0; i < 1000; i++) {
        cache.set(createTestToken(`large-${i}`), createMockResult(true));
      }

      expect(cache.getStats().size).toBe(1000);

      // Should be able to retrieve any cached token
      expect(cache.get(createTestToken('large-500'))).not.toBeNull();
    });

    it('should handle tokens with identical prefixes', () => {
      const token1 = 'prefix-token-1';
      const token2 = 'prefix-token-10';
      const token3 = 'prefix-token-100';

      cache.set(token1, createMockResult(true, { sub: '1' }));
      cache.set(token2, createMockResult(true, { sub: '10' }));
      cache.set(token3, createMockResult(true, { sub: '100' }));

      expect(cache.get(token1)?.userId).toBe('1');
      expect(cache.get(token2)?.userId).toBe('10');
      expect(cache.get(token3)?.userId).toBe('100');
    });

    it('should handle unicode tokens', () => {
      const token = 'token-with-unicode-🔐-✓-日本語';
      const result = createMockResult(true);

      cache.set(token, result);
      expect(cache.get(token)).toEqual(result);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration when not specified', () => {
      const defaultCache = new TokenCache();
      const stats = defaultCache.getStats();

      expect(stats.size).toBe(0);

      // Fill cache beyond default max (1000)
      for (let i = 0; i < 1001; i++) {
        defaultCache.set(createTestToken(`default-${i}`), createMockResult(true));
      }

      // Should have evicted one
      expect(defaultCache.getStats().size).toBe(1000);
      expect(defaultCache.getStats().evictions).toBe(1);
    });

    it('should respect custom configuration', () => {
      const customCache = new TokenCache({
        maxEntries: 5,
        ttlMs: 1000,
        maxMemoryBytes: 10240, // 10 KB to avoid memory-based eviction
        debug: false,
      });

      for (let i = 0; i < 6; i++) {
        customCache.set(createTestToken(`custom-${i}`), createMockResult(true));
      }

      expect(customCache.getStats().size).toBe(5);
      expect(customCache.getStats().evictions).toBe(1);
    });
  });
});

// ============================================================================
// createTokenCache Tests
// ============================================================================

describe('createTokenCache', () => {
  it('should create a new cache instance', () => {
    const cache = createTokenCache();
    expect(cache).toBeInstanceOf(TokenCache);
  });

  it('should accept configuration options', () => {
    const options: TokenCacheOptions = {
      maxEntries: 100,
      ttlMs: 30000,
      debug: true,
    };

    const cache = createTokenCache(options);
    expect(cache).toBeInstanceOf(TokenCache);

    // Test that options were applied
    for (let i = 0; i < 101; i++) {
      cache.set(createTestToken(`factory-${i}`), createMockResult(true));
    }

    expect(cache.getStats().size).toBe(100);
    expect(cache.getStats().evictions).toBe(1);
  });

  it('should create independent instances', () => {
    const cache1 = createTokenCache();
    const cache2 = createTokenCache();

    cache1.set('token-1', createMockResult(true));
    cache2.set('token-2', createMockResult(true));

    expect(cache1.get('token-1')).not.toBeNull();
    expect(cache1.get('token-2')).toBeNull();

    expect(cache2.get('token-2')).not.toBeNull();
    expect(cache2.get('token-1')).toBeNull();
  });
});
