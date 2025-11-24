/**
 * Unit tests for binary field builder
 *
 * Tests binary-specific functionality:
 * - Binary field creation
 * - Size limits (maxSize)
 * - MIME type restrictions
 * - File upload scenarios
 */

import { describe, it, expect } from 'vitest';
import { BinaryFieldBuilder } from './binary';

describe('BinaryFieldBuilder', () => {
  describe('constructor', () => {
    it('should create binary field with correct type', () => {
      const field = new BinaryFieldBuilder();
      const config = field._build();

      expect(config.type).toBe('binary');
    });

    it('should initialize with empty validations', () => {
      const field = new BinaryFieldBuilder();
      const config = field._build();

      expect(config.validations).toEqual([]);
    });
  });

  describe('maxSize()', () => {
    it('should set maximum size in bytes', () => {
      const field = new BinaryFieldBuilder().maxSize(1024);
      const config = field._build();

      expect(config.maxSize).toBe(1024);
    });

    it('should add maxSize validation rule', () => {
      const field = new BinaryFieldBuilder().maxSize(1024);
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule).toBeDefined();
      expect(customRule?.message).toContain('1.00 KB');
    });

    it('should format bytes correctly', () => {
      const field1 = new BinaryFieldBuilder().maxSize(500);
      const config1 = field1._build();
      const rule1 = config1.validations.find((v) => v.type === 'custom');
      expect(rule1?.message).toContain('500 bytes');

      const field2 = new BinaryFieldBuilder().maxSize(1024);
      const config2 = field2._build();
      const rule2 = config2.validations.find((v) => v.type === 'custom');
      expect(rule2?.message).toContain('1.00 KB');

      const field3 = new BinaryFieldBuilder().maxSize(1024 * 1024);
      const config3 = field3._build();
      const rule3 = config3.validations.find((v) => v.type === 'custom');
      expect(rule3?.message).toContain('1.00 MB');

      const field4 = new BinaryFieldBuilder().maxSize(1024 * 1024 * 1024);
      const config4 = field4._build();
      const rule4 = config4.validations.find((v) => v.type === 'custom');
      expect(rule4?.message).toContain('1.00 GB');
    });

    it('should validate buffer size correctly', () => {
      const field = new BinaryFieldBuilder().maxSize(100);
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      const smallBuffer = Buffer.alloc(50);
      const exactBuffer = Buffer.alloc(100);
      const largeBuffer = Buffer.alloc(150);

      expect(customRule.validator(smallBuffer)).toBe(true);
      expect(customRule.validator(exactBuffer)).toBe(true);
      expect(customRule.validator(largeBuffer)).toBe(false);
    });

    it('should validate Uint8Array size correctly', () => {
      const field = new BinaryFieldBuilder().maxSize(100);
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      const smallArray = new Uint8Array(50);
      const exactArray = new Uint8Array(100);
      const largeArray = new Uint8Array(150);

      expect(customRule.validator(smallArray)).toBe(true);
      expect(customRule.validator(exactArray)).toBe(true);
      expect(customRule.validator(largeArray)).toBe(false);
    });

    it('should support method chaining', () => {
      const field = new BinaryFieldBuilder().maxSize(1024);

      expect(field).toBeInstanceOf(BinaryFieldBuilder);
    });

    it('should handle very large sizes', () => {
      const field = new BinaryFieldBuilder().maxSize(10 * 1024 * 1024 * 1024); // 10GB
      const config = field._build();

      expect(config.maxSize).toBe(10 * 1024 * 1024 * 1024);
    });
  });

  describe('mimeTypes()', () => {
    it('should set allowed MIME types', () => {
      const types = ['image/png', 'image/jpeg'];
      const field = new BinaryFieldBuilder().mimeTypes(types);
      const config = field._build();

      expect(config.allowedMimeTypes).toEqual(types);
    });

    it('should support single MIME type', () => {
      const field = new BinaryFieldBuilder().mimeTypes(['application/pdf']);
      const config = field._build();

      expect(config.allowedMimeTypes).toEqual(['application/pdf']);
    });

    it('should support multiple MIME types', () => {
      const types = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
      const field = new BinaryFieldBuilder().mimeTypes(types);
      const config = field._build();

      expect(config.allowedMimeTypes).toEqual(types);
    });

    it('should support method chaining', () => {
      const field = new BinaryFieldBuilder().mimeTypes(['image/png']);

      expect(field).toBeInstanceOf(BinaryFieldBuilder);
    });

    it('should allow overriding MIME types', () => {
      const field = new BinaryFieldBuilder()
        .mimeTypes(['image/png'])
        .mimeTypes(['application/pdf']);
      const config = field._build();

      expect(config.allowedMimeTypes).toEqual(['application/pdf']);
    });
  });

  describe('contentTypes() alias', () => {
    it('should be alias for mimeTypes()', () => {
      const types = ['image/png', 'image/jpeg'];
      const field = new BinaryFieldBuilder().contentTypes(types);
      const config = field._build();

      expect(config.allowedMimeTypes).toEqual(types);
    });

    it('should work same as mimeTypes', () => {
      const field1 = new BinaryFieldBuilder().mimeTypes(['application/pdf']);
      const field2 = new BinaryFieldBuilder().contentTypes(['application/pdf']);

      const config1 = field1._build();
      const config2 = field2._build();

      expect(config1.allowedMimeTypes).toEqual(config2.allowedMimeTypes);
    });
  });

  describe('combined constraints', () => {
    it('should support both maxSize and mimeTypes', () => {
      const field = new BinaryFieldBuilder()
        .maxSize(10 * 1024 * 1024)
        .mimeTypes(['image/png', 'image/jpeg']);
      const config = field._build();

      expect(config.maxSize).toBe(10 * 1024 * 1024);
      expect(config.allowedMimeTypes).toEqual(['image/png', 'image/jpeg']);
    });

    it('should support all modifiers', () => {
      const field = new BinaryFieldBuilder()
        .maxSize(5 * 1024 * 1024)
        .mimeTypes(['application/pdf'])
        .required();
      const config = field._build();

      expect(config.maxSize).toBe(5 * 1024 * 1024);
      expect(config.allowedMimeTypes).toEqual(['application/pdf']);
      expect(config.isRequired).toBe(true);
    });
  });

  describe('inheritance from BaseFieldBuilder', () => {
    it('should inherit required() method', () => {
      const field = new BinaryFieldBuilder().required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
    });

    it('should inherit optional() method', () => {
      const field = new BinaryFieldBuilder().optional();
      const config = field._build();

      expect(config.isOptional).toBe(true);
    });

    it('should inherit nullable() method', () => {
      const field = new BinaryFieldBuilder().nullable();
      const config = field._build();

      expect(config.isNullable).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle zero size limit', () => {
      const field = new BinaryFieldBuilder().maxSize(0);
      const config = field._build();

      expect(config.maxSize).toBe(0);
    });

    it('should handle empty MIME types array', () => {
      const field = new BinaryFieldBuilder().mimeTypes([]);
      const config = field._build();

      expect(config.allowedMimeTypes).toEqual([]);
    });

    it('should handle wildcard MIME types', () => {
      const field = new BinaryFieldBuilder().mimeTypes(['image/*', 'video/*']);
      const config = field._build();

      expect(config.allowedMimeTypes).toEqual(['image/*', 'video/*']);
    });

    it('should handle custom MIME types', () => {
      const field = new BinaryFieldBuilder().mimeTypes(['application/x-custom']);
      const config = field._build();

      expect(config.allowedMimeTypes).toEqual(['application/x-custom']);
    });
  });

  describe('real-world scenarios', () => {
    it('should configure basic file upload', () => {
      const field = new BinaryFieldBuilder().required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
    });

    it('should configure image upload (10MB limit)', () => {
      const field = new BinaryFieldBuilder()
        .maxSize(10 * 1024 * 1024)
        .mimeTypes(['image/png', 'image/jpeg', 'image/gif']);
      const config = field._build();

      expect(config.maxSize).toBe(10 * 1024 * 1024);
      expect(config.allowedMimeTypes).toHaveLength(3);
    });

    it('should configure PDF document upload', () => {
      const field = new BinaryFieldBuilder()
        .mimeTypes(['application/pdf'])
        .maxSize(5 * 1024 * 1024) // 5MB
        .required();
      const config = field._build();

      expect(config.allowedMimeTypes).toEqual(['application/pdf']);
      expect(config.maxSize).toBe(5 * 1024 * 1024);
      expect(config.isRequired).toBe(true);
    });

    it('should configure avatar/thumbnail upload', () => {
      const field = new BinaryFieldBuilder()
        .maxSize(100 * 1024) // 100KB
        .mimeTypes(['image/png', 'image/jpeg'])
        .optional();
      const config = field._build();

      expect(config.maxSize).toBe(100 * 1024);
      expect(config.isOptional).toBe(true);
    });

    it('should configure video upload', () => {
      const field = new BinaryFieldBuilder()
        .maxSize(100 * 1024 * 1024) // 100MB
        .mimeTypes(['video/mp4', 'video/webm'])
        .required();
      const config = field._build();

      expect(config.maxSize).toBe(100 * 1024 * 1024);
      expect(config.allowedMimeTypes).toEqual(['video/mp4', 'video/webm']);
    });

    it('should configure general document upload', () => {
      const field = new BinaryFieldBuilder()
        .maxSize(20 * 1024 * 1024) // 20MB
        .mimeTypes([
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]);
      const config = field._build();

      expect(config.maxSize).toBe(20 * 1024 * 1024);
      expect(config.allowedMimeTypes).toHaveLength(3);
    });

    it('should configure optional attachment', () => {
      const field = new BinaryFieldBuilder().maxSize(10 * 1024 * 1024).optional();
      const config = field._build();

      expect(config.maxSize).toBe(10 * 1024 * 1024);
      expect(config.isOptional).toBe(true);
    });
  });

  describe('size formatting', () => {
    it('should format bytes correctly (< 1KB)', () => {
      const field = new BinaryFieldBuilder().maxSize(512);
      const config = field._build();
      const rule = config.validations.find((v) => v.type === 'custom');

      expect(rule?.message).toBe('File size must not exceed 512 bytes');
    });

    it('should format KB correctly', () => {
      const field = new BinaryFieldBuilder().maxSize(2.5 * 1024);
      const config = field._build();
      const rule = config.validations.find((v) => v.type === 'custom');

      expect(rule?.message).toBe('File size must not exceed 2.50 KB');
    });

    it('should format MB correctly', () => {
      const field = new BinaryFieldBuilder().maxSize(10.75 * 1024 * 1024);
      const config = field._build();
      const rule = config.validations.find((v) => v.type === 'custom');

      expect(rule?.message).toBe('File size must not exceed 10.75 MB');
    });

    it('should format GB correctly', () => {
      const field = new BinaryFieldBuilder().maxSize(1.5 * 1024 * 1024 * 1024);
      const config = field._build();
      const rule = config.validations.find((v) => v.type === 'custom');

      expect(rule?.message).toBe('File size must not exceed 1.50 GB');
    });
  });
});
