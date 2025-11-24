/**
 * Unit tests for datetime field builder
 *
 * Tests datetime-specific functionality:
 * - Basic datetime field creation
 * - Date constraints (min, max, future, past)
 * - ISO 8601 format handling
 * - Edge cases (invalid dates, timezones)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateTimeFieldBuilder } from './datetime';

describe('DateTimeFieldBuilder', () => {
  describe('constructor', () => {
    it('should create datetime field with correct type', () => {
      const field = new DateTimeFieldBuilder();
      const config = field._build();

      expect(config.type).toBe('datetime');
    });

    it('should initialize with empty validations', () => {
      const field = new DateTimeFieldBuilder();
      const config = field._build();

      expect(config.validations).toEqual([]);
    });
  });

  describe('min()', () => {
    it('should set minimum date from Date object', () => {
      const minDate = new Date('2024-01-01');
      const field = new DateTimeFieldBuilder().min(minDate);
      const config = field._build();

      expect(config.min).toBe(minDate);
    });

    it('should set minimum date from ISO string', () => {
      const minDate = '2024-01-01T00:00:00Z';
      const field = new DateTimeFieldBuilder().min(minDate);
      const config = field._build();

      expect(config.min).toBe(minDate);
    });

    it('should add min validation rule with Date object', () => {
      const minDate = new Date('2024-01-01');
      const field = new DateTimeFieldBuilder().min(minDate);
      const config = field._build();

      const minRule = config.validations.find((v) => v.type === 'min');
      expect(minRule).toBeDefined();
      expect(minRule?.value).toBe(minDate.getTime());
      expect(minRule?.message).toContain(minDate.toISOString());
    });

    it('should add min validation rule with ISO string', () => {
      const minDate = '2024-01-01T00:00:00Z';
      const field = new DateTimeFieldBuilder().min(minDate);
      const config = field._build();

      const minRule = config.validations.find((v) => v.type === 'min');
      expect(minRule).toBeDefined();
      expect(minRule?.value).toBe(new Date(minDate).getTime());
    });

    it('should support method chaining', () => {
      const field = new DateTimeFieldBuilder().min(new Date());

      expect(field).toBeInstanceOf(DateTimeFieldBuilder);
    });
  });

  describe('max()', () => {
    it('should set maximum date from Date object', () => {
      const maxDate = new Date('2024-12-31');
      const field = new DateTimeFieldBuilder().max(maxDate);
      const config = field._build();

      expect(config.max).toBe(maxDate);
    });

    it('should set maximum date from ISO string', () => {
      const maxDate = '2024-12-31T23:59:59Z';
      const field = new DateTimeFieldBuilder().max(maxDate);
      const config = field._build();

      expect(config.max).toBe(maxDate);
    });

    it('should add max validation rule with Date object', () => {
      const maxDate = new Date('2024-12-31');
      const field = new DateTimeFieldBuilder().max(maxDate);
      const config = field._build();

      const maxRule = config.validations.find((v) => v.type === 'max');
      expect(maxRule).toBeDefined();
      expect(maxRule?.value).toBe(maxDate.getTime());
    });

    it('should add max validation rule with ISO string', () => {
      const maxDate = '2024-12-31T23:59:59Z';
      const field = new DateTimeFieldBuilder().max(maxDate);
      const config = field._build();

      const maxRule = config.validations.find((v) => v.type === 'max');
      expect(maxRule).toBeDefined();
      expect(maxRule?.value).toBe(new Date(maxDate).getTime());
    });

    it('should support method chaining', () => {
      const field = new DateTimeFieldBuilder().max(new Date());

      expect(field).toBeInstanceOf(DateTimeFieldBuilder);
    });
  });

  describe('min() and max() combined', () => {
    it('should support both min and max', () => {
      const minDate = new Date('2024-01-01');
      const maxDate = new Date('2024-12-31');
      const field = new DateTimeFieldBuilder().min(minDate).max(maxDate);
      const config = field._build();

      expect(config.min).toBe(minDate);
      expect(config.max).toBe(maxDate);
    });

    it('should add both validation rules', () => {
      const minDate = new Date('2024-01-01');
      const maxDate = new Date('2024-12-31');
      const field = new DateTimeFieldBuilder().min(minDate).max(maxDate);
      const config = field._build();

      const minRule = config.validations.find((v) => v.type === 'min');
      const maxRule = config.validations.find((v) => v.type === 'max');

      expect(minRule).toBeDefined();
      expect(maxRule).toBeDefined();
    });
  });

  describe('future()', () => {
    beforeEach(() => {
      // Mock Date.now() for consistent testing
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    it('should set isFuture flag', () => {
      const field = new DateTimeFieldBuilder().future();
      const config = field._build();

      expect(config.isFuture).toBe(true);
    });

    it('should add custom validation rule', () => {
      const field = new DateTimeFieldBuilder().future();
      const config = field._build();

      const futureRule = config.validations.find((v) => v.type === 'custom');
      expect(futureRule).toBeDefined();
      expect(futureRule?.message).toBe('Must be a future date/time');
    });

    it('should validate future dates correctly', () => {
      const field = new DateTimeFieldBuilder().future();
      const config = field._build();

      const futureRule: any = config.validations.find((v) => v.type === 'custom');
      const futureDate = '2024-12-31T00:00:00Z';
      const pastDate = '2024-01-01T00:00:00Z';

      expect(futureRule.validator(futureDate)).toBe(true);
      expect(futureRule.validator(pastDate)).toBe(false);
    });

    it('should support method chaining', () => {
      const field = new DateTimeFieldBuilder().future();

      expect(field).toBeInstanceOf(DateTimeFieldBuilder);
    });

    afterEach(() => {
      vi.useRealTimers();
    });
  });

  describe('past()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    it('should set isPast flag', () => {
      const field = new DateTimeFieldBuilder().past();
      const config = field._build();

      expect(config.isPast).toBe(true);
    });

    it('should add custom validation rule', () => {
      const field = new DateTimeFieldBuilder().past();
      const config = field._build();

      const pastRule = config.validations.find((v) => v.type === 'custom');
      expect(pastRule).toBeDefined();
      expect(pastRule?.message).toBe('Must be a past date/time');
    });

    it('should validate past dates correctly', () => {
      const field = new DateTimeFieldBuilder().past();
      const config = field._build();

      const pastRule: any = config.validations.find((v) => v.type === 'custom');
      const futureDate = '2024-12-31T00:00:00Z';
      const pastDate = '2024-01-01T00:00:00Z';

      expect(pastRule.validator(futureDate)).toBe(false);
      expect(pastRule.validator(pastDate)).toBe(true);
    });

    it('should support method chaining', () => {
      const field = new DateTimeFieldBuilder().past();

      expect(field).toBeInstanceOf(DateTimeFieldBuilder);
    });

    afterEach(() => {
      vi.useRealTimers();
    });
  });

  describe('beforeNow() alias', () => {
    it('should be alias for past()', () => {
      const field = new DateTimeFieldBuilder().beforeNow();
      const config = field._build();

      expect(config.isPast).toBe(true);
    });

    it('should add past validation', () => {
      const field = new DateTimeFieldBuilder().beforeNow();
      const config = field._build();

      const pastRule = config.validations.find((v) => v.type === 'custom');
      expect(pastRule?.message).toBe('Must be a past date/time');
    });
  });

  describe('afterNow() alias', () => {
    it('should be alias for future()', () => {
      const field = new DateTimeFieldBuilder().afterNow();
      const config = field._build();

      expect(config.isFuture).toBe(true);
    });

    it('should add future validation', () => {
      const field = new DateTimeFieldBuilder().afterNow();
      const config = field._build();

      const futureRule = config.validations.find((v) => v.type === 'custom');
      expect(futureRule?.message).toBe('Must be a future date/time');
    });
  });

  describe('default values', () => {
    it('should support ISO string as default', () => {
      const defaultDate = '2024-06-15T12:00:00Z';
      const field = new DateTimeFieldBuilder().default(defaultDate);
      const config = field._build();

      expect(config.defaultValue).toBe(defaultDate);
    });

    it('should work with Date.now() output', () => {
      const now = new Date().toISOString();
      const field = new DateTimeFieldBuilder().default(now);
      const config = field._build();

      expect(config.defaultValue).toBe(now);
    });
  });

  describe('combined validations', () => {
    it('should support min/max with required', () => {
      const field = new DateTimeFieldBuilder()
        .min(new Date('2024-01-01'))
        .max(new Date('2024-12-31'))
        .required();
      const config = field._build();

      expect(config.min).toBeDefined();
      expect(config.max).toBeDefined();
      expect(config.isRequired).toBe(true);
    });

    it('should support future with required', () => {
      const field = new DateTimeFieldBuilder().future().required();
      const config = field._build();

      expect(config.isFuture).toBe(true);
      expect(config.isRequired).toBe(true);
    });

    it('should support past with optional', () => {
      const field = new DateTimeFieldBuilder().past().optional();
      const config = field._build();

      expect(config.isPast).toBe(true);
      expect(config.isOptional).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle very old dates', () => {
      const oldDate = new Date('1900-01-01');
      const field = new DateTimeFieldBuilder().min(oldDate);
      const config = field._build();

      expect(config.min).toBe(oldDate);
    });

    it('should handle far future dates', () => {
      const futureDate = new Date('2100-12-31');
      const field = new DateTimeFieldBuilder().max(futureDate);
      const config = field._build();

      expect(config.max).toBe(futureDate);
    });

    it('should handle epoch time', () => {
      const epoch = new Date('1970-01-01T00:00:00Z');
      const field = new DateTimeFieldBuilder().min(epoch);
      const config = field._build();

      expect(config.min).toBe(epoch);
    });

    it('should handle dates with milliseconds', () => {
      const date = '2024-06-15T12:34:56.789Z';
      const field = new DateTimeFieldBuilder().default(date);
      const config = field._build();

      expect(config.defaultValue).toBe(date);
    });

    it('should handle dates with timezone offsets', () => {
      const date = new Date('2024-06-15T12:00:00+05:00');
      const field = new DateTimeFieldBuilder().min(date);
      const config = field._build();

      // Converts to UTC internally
      expect(config.min).toBe(date);
    });
  });

  describe('inheritance from BaseFieldBuilder', () => {
    it('should inherit required() method', () => {
      const field = new DateTimeFieldBuilder().required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
    });

    it('should inherit optional() method', () => {
      const field = new DateTimeFieldBuilder().optional();
      const config = field._build();

      expect(config.isOptional).toBe(true);
    });

    it('should inherit nullable() method', () => {
      const field = new DateTimeFieldBuilder().nullable();
      const config = field._build();

      expect(config.isNullable).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should configure createdAt field', () => {
      const field = new DateTimeFieldBuilder().required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
    });

    it('should configure scheduledFor field', () => {
      const field = new DateTimeFieldBuilder().future().required();
      const config = field._build();

      expect(config.isFuture).toBe(true);
      expect(config.isRequired).toBe(true);
    });

    it('should configure birthDate field', () => {
      const field = new DateTimeFieldBuilder().past().required();
      const config = field._build();

      expect(config.isPast).toBe(true);
      expect(config.isRequired).toBe(true);
    });

    it('should configure event date range', () => {
      const field = new DateTimeFieldBuilder()
        .min(new Date('2024-01-01'))
        .max(new Date('2024-12-31'))
        .required();
      const config = field._build();

      expect(config.min).toBeDefined();
      expect(config.max).toBeDefined();
      expect(config.isRequired).toBe(true);
    });

    it('should configure optional deletedAt field', () => {
      const field = new DateTimeFieldBuilder().optional().nullable();
      const config = field._build();

      expect(config.isOptional).toBe(true);
      expect(config.isNullable).toBe(true);
    });
  });
});
