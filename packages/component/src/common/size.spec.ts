/**
 * Unit tests for Size utilities
 *
 * @remarks
 * Tests size creation, conversions between units, and formatting.
 */

import { describe, it, expect } from 'vitest';
import { bytes, kilobytes, megabytes, gigabytes, terabytes, type Size } from './size';

describe('Size', () => {
  describe('bytes()', () => {
    it('should create size in bytes', () => {
      const size = bytes(1024);

      expect(size.value).toBe(1024);
      expect(size.unit).toBe('B');
    });

    it('should convert to different units', () => {
      const size = bytes(1048576); // 1 MB

      expect(size.toBytes()).toBe(1048576);
      expect(size.toKilobytes()).toBe(1024);
      expect(size.toMegabytes()).toBe(1);
      expect(size.toGigabytes()).toBe(1 / 1024);
    });

    it('should handle small values', () => {
      const size = bytes(512);

      expect(size.toBytes()).toBe(512);
      expect(size.toKilobytes()).toBe(0.5);
    });

    it('should return string representation', () => {
      expect(bytes(1024).toString()).toBe('1024 B');
      expect(bytes(0).toString()).toBe('0 B');
    });
  });

  describe('kilobytes()', () => {
    it('should create size in kilobytes', () => {
      const size = kilobytes(64);

      expect(size.value).toBe(64);
      expect(size.unit).toBe('KB');
    });

    it('should convert to bytes', () => {
      const size = kilobytes(1);

      expect(size.toBytes()).toBe(1024);
    });

    it('should convert to other units', () => {
      const size = kilobytes(2048); // 2 MB

      expect(size.toBytes()).toBe(2097152);
      expect(size.toKilobytes()).toBe(2048);
      expect(size.toMegabytes()).toBe(2);
      expect(size.toGigabytes()).toBe(2 / 1024);
    });

    it('should handle fractional values', () => {
      const size = kilobytes(0.5);

      expect(size.toBytes()).toBe(512);
      expect(size.toKilobytes()).toBe(0.5);
    });

    it('should return string representation', () => {
      expect(kilobytes(64).toString()).toBe('64 KB');
    });
  });

  describe('megabytes()', () => {
    it('should create size in megabytes', () => {
      const size = megabytes(256);

      expect(size.value).toBe(256);
      expect(size.unit).toBe('MB');
    });

    it('should convert to bytes', () => {
      const size = megabytes(1);

      expect(size.toBytes()).toBe(1048576);
    });

    it('should convert to kilobytes', () => {
      const size = megabytes(1);

      expect(size.toKilobytes()).toBe(1024);
    });

    it('should convert to other units', () => {
      const size = megabytes(1024); // 1 GB

      expect(size.toBytes()).toBe(1073741824);
      expect(size.toKilobytes()).toBe(1048576);
      expect(size.toMegabytes()).toBe(1024);
      expect(size.toGigabytes()).toBe(1);
    });

    it('should handle decimal values', () => {
      const size = megabytes(1.5);

      expect(size.toKilobytes()).toBe(1536);
      expect(size.toBytes()).toBe(1572864);
    });

    it('should return string representation', () => {
      expect(megabytes(256).toString()).toBe('256 MB');
    });
  });

  describe('gigabytes()', () => {
    it('should create size in gigabytes', () => {
      const size = gigabytes(100);

      expect(size.value).toBe(100);
      expect(size.unit).toBe('GB');
    });

    it('should convert to bytes', () => {
      const size = gigabytes(1);

      expect(size.toBytes()).toBe(1073741824);
    });

    it('should convert to other units', () => {
      const size = gigabytes(2);

      expect(size.toBytes()).toBe(2147483648);
      expect(size.toKilobytes()).toBe(2097152);
      expect(size.toMegabytes()).toBe(2048);
      expect(size.toGigabytes()).toBe(2);
    });

    it('should handle large values', () => {
      const size = gigabytes(1000);

      expect(size.toGigabytes()).toBe(1000);
      expect(size.toMegabytes()).toBe(1024000);
    });

    it('should return string representation', () => {
      expect(gigabytes(100).toString()).toBe('100 GB');
    });
  });

  describe('terabytes()', () => {
    it('should create size in terabytes', () => {
      const size = terabytes(5);

      expect(size.value).toBe(5);
      expect(size.unit).toBe('TB');
    });

    it('should convert to bytes', () => {
      const size = terabytes(1);

      expect(size.toBytes()).toBe(1099511627776);
    });

    it('should convert to other units', () => {
      const size = terabytes(1);

      expect(size.toKilobytes()).toBe(1073741824);
      expect(size.toMegabytes()).toBe(1048576);
      expect(size.toGigabytes()).toBe(1024);
    });

    it('should handle large values', () => {
      const size = terabytes(10);

      expect(size.toGigabytes()).toBe(10240);
    });

    it('should return string representation', () => {
      expect(terabytes(5).toString()).toBe('5 TB');
    });
  });

  describe('conversion accuracy', () => {
    it('should maintain precision in conversions', () => {
      const kb1 = kilobytes(1).toBytes();
      const mb1 = megabytes(1).toKilobytes();
      const gb1 = gigabytes(1).toMegabytes();

      expect(kb1).toBe(1024);
      expect(mb1).toBe(1024);
      expect(gb1).toBe(1024);
    });

    it('should handle bidirectional conversions', () => {
      const original = megabytes(100);

      const toBytes = original.toBytes();
      const backToMb = bytes(toBytes).toMegabytes();

      expect(backToMb).toBe(100);
    });

    it('should handle fractional conversions', () => {
      const size = bytes(1536);

      expect(size.toKilobytes()).toBe(1.5);
    });

    it('should use binary (1024) not decimal (1000) units', () => {
      const kb = kilobytes(1);

      expect(kb.toBytes()).toBe(1024); // Not 1000
    });
  });

  describe('edge cases', () => {
    it('should handle zero size', () => {
      const size = bytes(0);

      expect(size.toBytes()).toBe(0);
      expect(size.toKilobytes()).toBe(0);
      expect(size.toMegabytes()).toBe(0);
      expect(size.toGigabytes()).toBe(0);
      expect(size.toString()).toBe('0 B');
    });

    it('should handle very small sizes', () => {
      const size = bytes(1);

      expect(size.toBytes()).toBe(1);
      expect(size.toKilobytes()).toBe(1 / 1024);
    });

    it('should handle very large sizes', () => {
      const size = terabytes(1000);

      expect(size.toGigabytes()).toBe(1024000);
      expect(size.toTerabytes()).toBe(1000);
    });

    it('should handle negative values', () => {
      const size = bytes(-1024);

      expect(size.toBytes()).toBe(-1024);
      expect(size.toKilobytes()).toBe(-1);
    });

    it('should handle decimal input', () => {
      const size = megabytes(1.5);

      expect(size.value).toBe(1.5);
      expect(size.toMegabytes()).toBe(1.5);
    });

    it('should handle very small decimal values', () => {
      const size = megabytes(0.001);

      expect(size.toKilobytes()).toBeCloseTo(1.024, 3);
      expect(size.toBytes()).toBeCloseTo(1048.576, 3);
    });
  });

  describe('common use cases', () => {
    it('should support cache size configurations', () => {
      const smallCache = megabytes(64);
      const mediumCache = megabytes(256);
      const largeCache = gigabytes(1);

      expect(smallCache.toMegabytes()).toBe(64);
      expect(mediumCache.toMegabytes()).toBe(256);
      expect(largeCache.toMegabytes()).toBe(1024);
    });

    it('should support file size limits', () => {
      const maxUpload = megabytes(10);
      const maxAttachment = megabytes(25);

      expect(maxUpload.toBytes()).toBe(10485760);
      expect(maxAttachment.toBytes()).toBe(26214400);
    });

    it('should support storage capacity planning', () => {
      const diskSpace = gigabytes(500);
      const backupSpace = terabytes(2);

      expect(diskSpace.toGigabytes()).toBe(500);
      expect(backupSpace.toGigabytes()).toBe(2048);
    });

    it('should support memory configurations', () => {
      const containerMemory = megabytes(512);
      const vmMemory = gigabytes(16);

      expect(containerMemory.toMegabytes()).toBe(512);
      expect(vmMemory.toMegabytes()).toBe(16384);
    });

    it('should support bandwidth calculations', () => {
      const monthlyBandwidth = terabytes(1);
      const dailyAverage = monthlyBandwidth.toGigabytes() / 30;

      expect(dailyAverage).toBeCloseTo(34.133, 2);
    });
  });

  describe('Size interface', () => {
    it('should have all required properties', () => {
      const size: Size = megabytes(100);

      expect(size).toHaveProperty('value');
      expect(size).toHaveProperty('unit');
      expect(size).toHaveProperty('toBytes');
      expect(size).toHaveProperty('toKilobytes');
      expect(size).toHaveProperty('toMegabytes');
      expect(size).toHaveProperty('toGigabytes');
      expect(size).toHaveProperty('toString');
    });

    it('should have readonly properties', () => {
      const size = megabytes(100);

      expect(Object.getOwnPropertyDescriptor(size, 'value')?.writable).toBe(false);
      expect(Object.getOwnPropertyDescriptor(size, 'unit')?.writable).toBe(false);
    });

    it('should support all unit types', () => {
      const units: Array<'B' | 'KB' | 'MB' | 'GB' | 'TB'> = ['B', 'KB', 'MB', 'GB', 'TB'];

      const sizes = [bytes(1), kilobytes(1), megabytes(1), gigabytes(1), terabytes(1)];

      sizes.forEach((size, index) => {
        expect(size.unit).toBe(units[index]);
      });
    });
  });

  describe('toString formatting', () => {
    it('should format bytes', () => {
      expect(bytes(0).toString()).toBe('0 B');
      expect(bytes(1024).toString()).toBe('1024 B');
    });

    it('should format kilobytes', () => {
      expect(kilobytes(64).toString()).toBe('64 KB');
      expect(kilobytes(1024).toString()).toBe('1024 KB');
    });

    it('should format megabytes', () => {
      expect(megabytes(256).toString()).toBe('256 MB');
      expect(megabytes(1.5).toString()).toBe('1.5 MB');
    });

    it('should format gigabytes', () => {
      expect(gigabytes(100).toString()).toBe('100 GB');
      expect(gigabytes(0.5).toString()).toBe('0.5 GB');
    });

    it('should format terabytes', () => {
      expect(terabytes(5).toString()).toBe('5 TB');
      expect(terabytes(10.5).toString()).toBe('10.5 TB');
    });

    it('should preserve decimal values in string', () => {
      expect(megabytes(1.25).toString()).toBe('1.25 MB');
      expect(gigabytes(2.75).toString()).toBe('2.75 GB');
    });
  });

  describe('comparison scenarios', () => {
    it('should allow comparing sizes via conversion', () => {
      const size1 = megabytes(1024);
      const size2 = gigabytes(1);

      expect(size1.toBytes()).toBe(size2.toBytes());
    });

    it('should handle size arithmetic via conversion', () => {
      const cache1 = megabytes(256);
      const cache2 = megabytes(512);

      const total = cache1.toBytes() + cache2.toBytes();
      const totalMb = total / 1048576;

      expect(totalMb).toBe(768);
    });

    it('should determine if size exceeds limit', () => {
      const fileSize = megabytes(15);
      const limit = megabytes(10);

      const exceedsLimit = fileSize.toBytes() > limit.toBytes();

      expect(exceedsLimit).toBe(true);
    });
  });

  describe('performance', () => {
    it('should create sizes quickly', () => {
      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        bytes(i);
        kilobytes(i);
        megabytes(i);
        gigabytes(i);
        terabytes(i);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50); // Should complete in < 50ms
    });

    it('should convert values quickly', () => {
      const size = gigabytes(100);
      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        size.toBytes();
        size.toKilobytes();
        size.toMegabytes();
        size.toGigabytes();
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50); // Should complete in < 50ms
    });
  });

  describe('binary vs decimal units', () => {
    it('should use binary (IEC) units (1 KB = 1024 bytes)', () => {
      // This is the IEC binary standard (KiB, MiB, GiB)
      // vs SI decimal standard (KB = 1000 bytes)

      expect(kilobytes(1).toBytes()).toBe(1024);
      expect(megabytes(1).toBytes()).toBe(1048576); // 1024 * 1024
      expect(gigabytes(1).toBytes()).toBe(1073741824); // 1024 * 1024 * 1024
    });

    it('should NOT use decimal units (1 KB = 1000 bytes)', () => {
      // Ensuring we're NOT using SI decimal units
      expect(kilobytes(1).toBytes()).not.toBe(1000);
      expect(megabytes(1).toBytes()).not.toBe(1000000);
      expect(gigabytes(1).toBytes()).not.toBe(1000000000);
    });

    it('should maintain consistency across all conversions', () => {
      const base = 1024;

      expect(kilobytes(1).toBytes()).toBe(base);
      expect(megabytes(1).toKilobytes()).toBe(base);
      expect(gigabytes(1).toMegabytes()).toBe(base);
      expect(terabytes(1).toGigabytes()).toBe(base);
    });
  });
});
