/**
 * Tests for Performance Attachments
 *
 * @group unit
 * @group backend
 * @group attachments
 */

import { describe, it, expect } from 'vitest';
import {
  cdn,
  validateCdnAttachment,
  cache,
  validateCacheAttachment,
  rateLimit,
  validateRateLimitAttachment,
  createPerformanceAttachmentPoints,
} from './performance';
import type { CdnConfig, CacheConfig, RateLimitConfig } from '../defaults/types';

describe('Performance Attachments', () => {
  describe('CDN Attachments', () => {
    describe('CdnAttachmentBuilder', () => {
      it('should build basic CDN configuration', () => {
        const config = cdn().enable(true).profile('Standard_Microsoft').caching('Standard').build();

        expect(config.enabled).toBe(true);
        expect(config.profile).toBe('Standard_Microsoft');
        expect(config.caching).toBe('Standard');
      });

      it('should configure compression', () => {
        const config = cdn()
          .profile('Standard_Microsoft')
          .caching('Standard')
          .compression(true)
          .build();

        expect(config.compression).toBe(true);
      });

      it('should configure query string caching', () => {
        const config = cdn()
          .profile('Premium_Verizon')
          .caching('Override')
          .queryStringCaching('UseQueryString')
          .build();

        expect(config.queryStringCaching).toBe('UseQueryString');
      });

      it('should support method chaining', () => {
        const config = cdn()
          .enable(true)
          .profile('Standard_Akamai')
          .caching('SetIfMissing')
          .compression(true)
          .queryStringCaching('IgnoreQueryString')
          .build();

        expect(config.profile).toBe('Standard_Akamai');
        expect(config.compression).toBe(true);
      });

      it('should throw error when profile is missing', () => {
        const builder = cdn().caching('Standard');

        expect(() => builder.build()).toThrow('CDN profile is required');
      });

      it('should throw error when caching is missing', () => {
        const builder = cdn().profile('Standard_Microsoft');

        expect(() => builder.build()).toThrow('CDN caching behavior is required');
      });
    });

    describe('validateCdnAttachment', () => {
      it('should validate correct CDN configuration', () => {
        const config: CdnConfig = {
          enabled: true,
          profile: 'Standard_Microsoft',
          caching: 'Standard',
          compression: true,
        };

        const validation = validateCdnAttachment(config);

        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should allow disabled CDN', () => {
        const config: CdnConfig = {
          enabled: false,
          profile: 'Standard_Microsoft',
          caching: 'Standard',
        };

        const validation = validateCdnAttachment(config);

        expect(validation.valid).toBe(true);
      });

      it('should warn when compression is disabled', () => {
        const config: CdnConfig = {
          enabled: true,
          profile: 'Standard_Microsoft',
          caching: 'Standard',
          compression: false,
        };

        const validation = validateCdnAttachment(config);

        expect(validation.warnings).toContain(
          'Compression is recommended for better CDN performance'
        );
      });

      it('should warn on Akamai with Override caching', () => {
        const config: CdnConfig = {
          enabled: true,
          profile: 'Standard_Akamai',
          caching: 'Override',
        };

        const validation = validateCdnAttachment(config);

        expect(
          validation.warnings.some((w) =>
            w.includes('Override caching may not be fully supported on Standard_Akamai')
          )
        ).toBe(true);
      });
    });
  });

  describe('Cache Attachments', () => {
    describe('CacheAttachmentBuilder', () => {
      it('should build basic cache configuration', () => {
        const config = cache()
          .enable(true)
          .sku('Standard', 'C', '1')
          .evictionPolicy('allkeys-lru')
          .build();

        expect(config.enabled).toBe(true);
        expect(config.sku.tier).toBe('Standard');
        expect(config.sku.family).toBe('C');
        expect(config.sku.capacity).toBe('1');
        expect(config.evictionPolicy).toBe('allkeys-lru');
      });

      it('should configure Premium cache', () => {
        const config = cache().sku('Premium', 'P', '1').evictionPolicy('allkeys-lfu').build();

        expect(config.sku.tier).toBe('Premium');
        expect(config.sku.family).toBe('P');
      });

      it('should configure security settings', () => {
        const config = cache()
          .sku('Standard', 'C', '2')
          .evictionPolicy('allkeys-lru')
          .enableNonSslPort(false)
          .minimumTlsVersion('1.2')
          .build();

        expect(config.enableNonSslPort).toBe(false);
        expect(config.minimumTlsVersion).toBe('1.2');
      });

      it('should support all eviction policies', () => {
        const policies = [
          'noeviction',
          'allkeys-lru',
          'allkeys-lfu',
          'allkeys-random',
          'volatile-lru',
          'volatile-lfu',
          'volatile-random',
          'volatile-ttl',
        ] as const;

        policies.forEach((policy) => {
          const config = cache().sku('Standard', 'C', '1').evictionPolicy(policy).build();

          expect(config.evictionPolicy).toBe(policy);
        });
      });

      it('should throw error when SKU is missing', () => {
        const builder = cache().evictionPolicy('allkeys-lru');

        expect(() => builder.build()).toThrow('Cache SKU is required');
      });

      it('should throw error when eviction policy is missing', () => {
        const builder = cache().sku('Standard', 'C', '1');

        expect(() => builder.build()).toThrow('Cache eviction policy is required');
      });
    });

    describe('validateCacheAttachment', () => {
      it('should validate correct cache configuration', () => {
        const config: CacheConfig = {
          enabled: true,
          sku: { tier: 'Standard', family: 'C', capacity: '1' },
          evictionPolicy: 'allkeys-lru',
          enableNonSslPort: false,
          minimumTlsVersion: '1.2',
        };

        const validation = validateCacheAttachment(config);

        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should error when Basic/Standard uses P family', () => {
        const config: CacheConfig = {
          enabled: true,
          sku: { tier: 'Standard', family: 'P', capacity: '1' },
          evictionPolicy: 'allkeys-lru',
        };

        const validation = validateCacheAttachment(config);

        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Basic and Standard tiers must use C family');
      });

      it('should error when Premium uses C family', () => {
        const config: CacheConfig = {
          enabled: true,
          sku: { tier: 'Premium', family: 'C', capacity: '1' },
          evictionPolicy: 'allkeys-lru',
        };

        const validation = validateCacheAttachment(config);

        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Premium tier must use P family');
      });

      it('should error on invalid capacity', () => {
        const config: CacheConfig = {
          enabled: true,
          sku: { tier: 'Standard', family: 'C', capacity: '10' as any },
          evictionPolicy: 'allkeys-lru',
        };

        const validation = validateCacheAttachment(config);

        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Cache capacity must be between 0 and 6');
      });

      it('should warn when non-SSL port is enabled', () => {
        const config: CacheConfig = {
          enabled: true,
          sku: { tier: 'Standard', family: 'C', capacity: '1' },
          evictionPolicy: 'allkeys-lru',
          enableNonSslPort: true,
        };

        const validation = validateCacheAttachment(config);

        expect(validation.warnings).toContain(
          'Non-SSL port is enabled. This is not recommended for production'
        );
      });

      it('should warn when TLS version is not 1.2', () => {
        const config: CacheConfig = {
          enabled: true,
          sku: { tier: 'Standard', family: 'C', capacity: '1' },
          evictionPolicy: 'allkeys-lru',
          minimumTlsVersion: '1.0',
        };

        const validation = validateCacheAttachment(config);

        expect(validation.warnings).toContain('TLS 1.2 is recommended for production workloads');
      });

      it('should warn on noeviction policy', () => {
        const config: CacheConfig = {
          enabled: true,
          sku: { tier: 'Standard', family: 'C', capacity: '1' },
          evictionPolicy: 'noeviction',
        };

        const validation = validateCacheAttachment(config);

        expect(validation.warnings).toContain(
          'No eviction policy may cause errors when cache is full'
        );
      });
    });
  });

  describe('Rate Limit Attachments', () => {
    describe('RateLimitAttachmentBuilder', () => {
      it('should build basic rate limit configuration', () => {
        const config = rateLimit().enable(true).requestsPerMinute(1000).burstSize(100).build();

        expect(config.enabled).toBe(true);
        expect(config.requestsPerMinute).toBe(1000);
        expect(config.burstSize).toBe(100);
      });

      it('should configure per-client limits', () => {
        const config = rateLimit()
          .requestsPerMinute(5000)
          .burstSize(500)
          .enablePerClientLimits(true)
          .build();

        expect(config.enablePerClientLimits).toBe(true);
      });

      it('should configure block duration', () => {
        const config = rateLimit()
          .requestsPerMinute(1000)
          .burstSize(100)
          .blockDuration(600)
          .build();

        expect(config.blockDuration).toBe(600);
      });

      it('should support method chaining', () => {
        const config = rateLimit()
          .enable(true)
          .requestsPerMinute(2000)
          .burstSize(200)
          .enablePerClientLimits(true)
          .blockDuration(300)
          .build();

        expect(config.requestsPerMinute).toBe(2000);
        expect(config.burstSize).toBe(200);
        expect(config.blockDuration).toBe(300);
      });

      it('should throw error when requests per minute is missing', () => {
        const builder = rateLimit().burstSize(100);

        expect(() => builder.build()).toThrow('Requests per minute is required');
      });

      it('should throw error when burst size is missing', () => {
        const builder = rateLimit().requestsPerMinute(1000);

        expect(() => builder.build()).toThrow('Burst size is required');
      });
    });

    describe('validateRateLimitAttachment', () => {
      it('should validate correct rate limit configuration', () => {
        const config: RateLimitConfig = {
          enabled: true,
          requestsPerMinute: 1000,
          burstSize: 100,
          enablePerClientLimits: true,
          blockDuration: 300,
        };

        const validation = validateRateLimitAttachment(config);

        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should error on zero requests per minute', () => {
        const config: RateLimitConfig = {
          enabled: true,
          requestsPerMinute: 0,
          burstSize: 100,
        };

        const validation = validateRateLimitAttachment(config);

        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Requests per minute must be greater than 0');
      });

      it('should error on negative requests per minute', () => {
        const config: RateLimitConfig = {
          enabled: true,
          requestsPerMinute: -100,
          burstSize: 100,
        };

        const validation = validateRateLimitAttachment(config);

        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Requests per minute must be greater than 0');
      });

      it('should warn on very low rate limit', () => {
        const config: RateLimitConfig = {
          enabled: true,
          requestsPerMinute: 30,
          burstSize: 10,
        };

        const validation = validateRateLimitAttachment(config);

        expect(validation.warnings).toContain(
          'Very low rate limit (< 1 req/sec). This may block legitimate traffic'
        );
      });

      it('should error on zero burst size', () => {
        const config: RateLimitConfig = {
          enabled: true,
          requestsPerMinute: 1000,
          burstSize: 0,
        };

        const validation = validateRateLimitAttachment(config);

        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Burst size must be greater than 0');
      });

      it('should warn when burst size exceeds rate limit', () => {
        const config: RateLimitConfig = {
          enabled: true,
          requestsPerMinute: 1000,
          burstSize: 2000,
        };

        const validation = validateRateLimitAttachment(config);

        expect(validation.warnings).toContain(
          'Burst size exceeds rate limit. Consider reducing burst size'
        );
      });

      it('should error on negative block duration', () => {
        const config: RateLimitConfig = {
          enabled: true,
          requestsPerMinute: 1000,
          burstSize: 100,
          blockDuration: -60,
        };

        const validation = validateRateLimitAttachment(config);

        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Block duration cannot be negative');
      });

      it('should warn on very long block duration', () => {
        const config: RateLimitConfig = {
          enabled: true,
          requestsPerMinute: 1000,
          burstSize: 100,
          blockDuration: 7200,
        };

        const validation = validateRateLimitAttachment(config);

        expect(validation.warnings).toContain(
          'Block duration exceeds 1 hour. This may be too aggressive'
        );
      });
    });
  });

  describe('Performance Attachment Points', () => {
    it('should create attachment points with no defaults', () => {
      const points = createPerformanceAttachmentPoints();

      expect(points.cdn).toBeDefined();
      expect(points.cache).toBeDefined();
      expect(points.rateLimit).toBeDefined();

      expect(points.cdn.isAttached()).toBe(false);
      expect(points.cache.isAttached()).toBe(false);
      expect(points.rateLimit.isAttached()).toBe(false);

      expect(points.cdn.getConfig()).toBeUndefined();
      expect(points.cache.getConfig()).toBeUndefined();
      expect(points.rateLimit.getConfig()).toBeUndefined();
    });

    it('should create attachment points with defaults', () => {
      const defaults = {
        cdn: {
          enabled: true,
          profile: 'Standard_Microsoft' as const,
          caching: 'Standard' as const,
          compression: true,
        },
        cache: {
          enabled: true,
          sku: { tier: 'Standard' as const, family: 'C' as const, capacity: '1' as const },
          evictionPolicy: 'allkeys-lru' as const,
        },
        rateLimit: {
          enabled: true,
          requestsPerMinute: 1000,
          burstSize: 100,
        },
      };

      const points = createPerformanceAttachmentPoints(defaults);

      expect(points.cdn.getConfig()).toEqual(defaults.cdn);
      expect(points.cache.getConfig()).toEqual(defaults.cache);
      expect(points.rateLimit.getConfig()).toEqual(defaults.rateLimit);
    });

    it('should attach CDN configuration', () => {
      const points = createPerformanceAttachmentPoints();

      const customCdn: CdnConfig = {
        enabled: true,
        profile: 'Premium_Verizon',
        caching: 'Override',
        compression: true,
      };

      points.cdn.attach(customCdn);

      expect(points.cdn.isAttached()).toBe(true);
      expect(points.cdn.getConfig()).toEqual(customCdn);
    });

    it('should attach cache configuration', () => {
      const points = createPerformanceAttachmentPoints();

      const customCache: CacheConfig = {
        enabled: true,
        sku: { tier: 'Premium', family: 'P', capacity: '2' },
        evictionPolicy: 'allkeys-lfu',
      };

      points.cache.attach(customCache);

      expect(points.cache.isAttached()).toBe(true);
      expect(points.cache.getConfig()).toEqual(customCache);
    });

    it('should attach rate limit configuration', () => {
      const points = createPerformanceAttachmentPoints();

      const customRateLimit: RateLimitConfig = {
        enabled: true,
        requestsPerMinute: 5000,
        burstSize: 500,
        enablePerClientLimits: true,
      };

      points.rateLimit.attach(customRateLimit);

      expect(points.rateLimit.isAttached()).toBe(true);
      expect(points.rateLimit.getConfig()).toEqual(customRateLimit);
    });

    it('should throw error on invalid CDN attachment', () => {
      const points = createPerformanceAttachmentPoints();

      const invalidCdn: CdnConfig = {
        enabled: true,
        profile: '' as any,
        caching: 'Standard',
      };

      expect(() => points.cdn.attach(invalidCdn)).toThrow(
        'Performance attachment validation failed'
      );
    });

    it('should reset to default configuration', () => {
      const defaults = {
        cdn: {
          enabled: true,
          profile: 'Standard_Microsoft' as const,
          caching: 'Standard' as const,
        },
      };

      const points = createPerformanceAttachmentPoints(defaults);

      const customCdn: CdnConfig = {
        enabled: true,
        profile: 'Premium_Verizon',
        caching: 'Override',
      };

      points.cdn.attach(customCdn);
      expect(points.cdn.isAttached()).toBe(true);

      points.cdn.reset();
      expect(points.cdn.isAttached()).toBe(false);
      expect(points.cdn.getConfig()).toEqual(defaults.cdn);
    });
  });
});
