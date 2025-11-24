/**
 * Tests for validation rules
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  stringRules,
  numberRules,
  dateRules,
  arrayRules,
  objectRules,
  customRule,
  combine,
  type CustomValidator,
} from './rules';

describe('stringRules', () => {
  describe('email', () => {
    it('should validate correct email format', () => {
      const rule = stringRules.email();
      expect(rule.refinement('test@example.com')).toBe(true);
      expect(rule.refinement('user.name@domain.co.uk')).toBe(true);
      expect(rule.refinement('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email format', () => {
      const rule = stringRules.email();
      expect(rule.refinement('not-an-email')).toBe(false);
      expect(rule.refinement('@example.com')).toBe(false);
      expect(rule.refinement('user@')).toBe(false);
      expect(rule.refinement('user@domain')).toBe(false);
      expect(rule.refinement('')).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = stringRules.email();
      expect(rule.message).toBe('Must be a valid email address');
    });
  });

  describe('url', () => {
    it('should validate correct URL format', () => {
      const rule = stringRules.url();
      expect(rule.refinement('https://example.com')).toBe(true);
      expect(rule.refinement('http://localhost:3000')).toBe(true);
      expect(rule.refinement('ftp://files.example.com')).toBe(true);
      expect(rule.refinement('https://example.com/path?query=value')).toBe(true);
    });

    it('should reject invalid URL format', () => {
      const rule = stringRules.url();
      expect(rule.refinement('not-a-url')).toBe(false);
      expect(rule.refinement('example.com')).toBe(false);
      expect(rule.refinement('//example.com')).toBe(false);
      expect(rule.refinement('')).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = stringRules.url();
      expect(rule.message).toBe('Must be a valid URL');
    });
  });

  describe('regex', () => {
    it('should validate against pattern', () => {
      const rule = stringRules.regex(/^[A-Z]+$/);
      expect(rule.refinement('ABC')).toBe(true);
      expect(rule.refinement('HELLO')).toBe(true);
    });

    it('should reject non-matching pattern', () => {
      const rule = stringRules.regex(/^[A-Z]+$/);
      expect(rule.refinement('abc')).toBe(false);
      expect(rule.refinement('123')).toBe(false);
      expect(rule.refinement('Hello')).toBe(false);
    });

    it('should use custom message if provided', () => {
      const rule = stringRules.regex(/^[0-9]+$/, 'Must be digits only');
      expect(rule.message).toBe('Must be digits only');
    });

    it('should use default message if not provided', () => {
      const pattern = /^[0-9]+$/;
      const rule = stringRules.regex(pattern);
      expect(rule.message).toBe(`Must match pattern ${pattern}`);
    });

    it('should handle complex regex patterns', () => {
      const rule = stringRules.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/);
      expect(rule.refinement('Password123')).toBe(true);
      expect(rule.refinement('password')).toBe(false);
    });
  });

  describe('minLength', () => {
    it('should validate minimum length', () => {
      const rule = stringRules.minLength(5);
      const schema = rule.check!(z.string());

      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse('hello world').success).toBe(true);
    });

    it('should reject strings below minimum', () => {
      const rule = stringRules.minLength(5);
      const schema = rule.check!(z.string());

      expect(schema.safeParse('hi').success).toBe(false);
      expect(schema.safeParse('').success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = stringRules.minLength(10);
      expect(rule.message).toBe('Must be at least 10 character(s)');
    });
  });

  describe('maxLength', () => {
    it('should validate maximum length', () => {
      const rule = stringRules.maxLength(10);
      const schema = rule.check!(z.string());

      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse('1234567890').success).toBe(true);
    });

    it('should reject strings above maximum', () => {
      const rule = stringRules.maxLength(5);
      const schema = rule.check!(z.string());

      expect(schema.safeParse('hello world').success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = stringRules.maxLength(100);
      expect(rule.message).toBe('Must be at most 100 character(s)');
    });
  });

  describe('length', () => {
    it('should validate exact length', () => {
      const rule = stringRules.length(5);
      const schema = rule.check!(z.string());

      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse('12345').success).toBe(true);
    });

    it('should reject incorrect length', () => {
      const rule = stringRules.length(5);
      const schema = rule.check!(z.string());

      expect(schema.safeParse('hi').success).toBe(false);
      expect(schema.safeParse('hello world').success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = stringRules.length(8);
      expect(rule.message).toBe('Must be exactly 8 character(s)');
    });
  });

  describe('nonEmpty', () => {
    it('should validate non-empty strings', () => {
      const rule = stringRules.nonEmpty();
      const schema = rule.check!(z.string());

      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse(' ').success).toBe(true);
    });

    it('should reject empty strings', () => {
      const rule = stringRules.nonEmpty();
      const schema = rule.check!(z.string());

      expect(schema.safeParse('').success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = stringRules.nonEmpty();
      expect(rule.message).toBe('Cannot be empty');
    });
  });

  describe('uuid', () => {
    it('should validate UUID format', () => {
      const rule = stringRules.uuid();
      const schema = rule.check!(z.string());

      expect(schema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const rule = stringRules.uuid();
      const schema = rule.check!(z.string());

      expect(schema.safeParse('not-a-uuid').success).toBe(false);
      expect(schema.safeParse('550e8400-e29b-41d4').success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = stringRules.uuid();
      expect(rule.message).toBe('Must be a valid UUID');
    });
  });

  describe('cuid', () => {
    it('should validate CUID format', () => {
      const rule = stringRules.cuid();
      const schema = rule.check!(z.string());

      expect(schema.safeParse('ckopqwooh000001l08x2q8f9a').success).toBe(true);
    });

    it('should reject invalid CUID format', () => {
      const rule = stringRules.cuid();
      const schema = rule.check!(z.string());

      expect(schema.safeParse('not-a-cuid').success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = stringRules.cuid();
      expect(rule.message).toBe('Must be a valid CUID');
    });
  });

  describe('trim', () => {
    it('should trim whitespace', () => {
      const rule = stringRules.trim();
      const schema = rule.check!(z.string());

      const result = schema.parse('  hello  ');
      expect(result).toBe('hello');
    });

    it('should not have error message (transformation)', () => {
      const rule = stringRules.trim();
      expect(rule.message).toBeUndefined();
    });
  });

  describe('lowercase', () => {
    it('should convert to lowercase', () => {
      const rule = stringRules.lowercase();
      const schema = rule.check!(z.string());

      const result = schema.parse('HELLO');
      expect(result).toBe('hello');
    });

    it('should not have error message (transformation)', () => {
      const rule = stringRules.lowercase();
      expect(rule.message).toBeUndefined();
    });
  });

  describe('uppercase', () => {
    it('should convert to uppercase', () => {
      const rule = stringRules.uppercase();
      const schema = rule.check!(z.string());

      const result = schema.parse('hello');
      expect(result).toBe('HELLO');
    });

    it('should not have error message (transformation)', () => {
      const rule = stringRules.uppercase();
      expect(rule.message).toBeUndefined();
    });
  });
});

describe('numberRules', () => {
  describe('min', () => {
    it('should validate minimum value', () => {
      const rule = numberRules.min(10);
      const schema = rule.check!(z.number());

      expect(schema.safeParse(10).success).toBe(true);
      expect(schema.safeParse(20).success).toBe(true);
    });

    it('should reject below minimum', () => {
      const rule = numberRules.min(10);
      const schema = rule.check!(z.number());

      expect(schema.safeParse(5).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = numberRules.min(100);
      expect(rule.message).toBe('Must be at least 100');
    });
  });

  describe('max', () => {
    it('should validate maximum value', () => {
      const rule = numberRules.max(100);
      const schema = rule.check!(z.number());

      expect(schema.safeParse(100).success).toBe(true);
      expect(schema.safeParse(50).success).toBe(true);
    });

    it('should reject above maximum', () => {
      const rule = numberRules.max(100);
      const schema = rule.check!(z.number());

      expect(schema.safeParse(150).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = numberRules.max(50);
      expect(rule.message).toBe('Must be at most 50');
    });
  });

  describe('greaterThan', () => {
    it('should validate greater than value', () => {
      const rule = numberRules.greaterThan(10);
      const schema = rule.check!(z.number());

      expect(schema.safeParse(11).success).toBe(true);
      expect(schema.safeParse(100).success).toBe(true);
    });

    it('should reject equal or less values', () => {
      const rule = numberRules.greaterThan(10);
      const schema = rule.check!(z.number());

      expect(schema.safeParse(10).success).toBe(false);
      expect(schema.safeParse(5).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = numberRules.greaterThan(0);
      expect(rule.message).toBe('Must be greater than 0');
    });
  });

  describe('lessThan', () => {
    it('should validate less than value', () => {
      const rule = numberRules.lessThan(100);
      const schema = rule.check!(z.number());

      expect(schema.safeParse(99).success).toBe(true);
      expect(schema.safeParse(50).success).toBe(true);
    });

    it('should reject equal or greater values', () => {
      const rule = numberRules.lessThan(100);
      const schema = rule.check!(z.number());

      expect(schema.safeParse(100).success).toBe(false);
      expect(schema.safeParse(150).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = numberRules.lessThan(10);
      expect(rule.message).toBe('Must be less than 10');
    });
  });

  describe('integer', () => {
    it('should validate integers', () => {
      const rule = numberRules.integer();
      const schema = rule.check!(z.number());

      expect(schema.safeParse(10).success).toBe(true);
      expect(schema.safeParse(-5).success).toBe(true);
      expect(schema.safeParse(0).success).toBe(true);
    });

    it('should reject decimals', () => {
      const rule = numberRules.integer();
      const schema = rule.check!(z.number());

      expect(schema.safeParse(10.5).success).toBe(false);
      expect(schema.safeParse(-5.1).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = numberRules.integer();
      expect(rule.message).toBe('Must be an integer');
    });
  });

  describe('positive', () => {
    it('should validate positive numbers', () => {
      const rule = numberRules.positive();
      const schema = rule.check!(z.number());

      expect(schema.safeParse(1).success).toBe(true);
      expect(schema.safeParse(100).success).toBe(true);
      expect(schema.safeParse(0.1).success).toBe(true);
    });

    it('should reject zero and negative numbers', () => {
      const rule = numberRules.positive();
      const schema = rule.check!(z.number());

      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(-1).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = numberRules.positive();
      expect(rule.message).toBe('Must be positive');
    });
  });

  describe('negative', () => {
    it('should validate negative numbers', () => {
      const rule = numberRules.negative();
      const schema = rule.check!(z.number());

      expect(schema.safeParse(-1).success).toBe(true);
      expect(schema.safeParse(-100).success).toBe(true);
      expect(schema.safeParse(-0.1).success).toBe(true);
    });

    it('should reject zero and positive numbers', () => {
      const rule = numberRules.negative();
      const schema = rule.check!(z.number());

      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(1).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = numberRules.negative();
      expect(rule.message).toBe('Must be negative');
    });
  });

  describe('nonNegative', () => {
    it('should validate non-negative numbers', () => {
      const rule = numberRules.nonNegative();
      const schema = rule.check!(z.number());

      expect(schema.safeParse(0).success).toBe(true);
      expect(schema.safeParse(100).success).toBe(true);
    });

    it('should reject negative numbers', () => {
      const rule = numberRules.nonNegative();
      const schema = rule.check!(z.number());

      expect(schema.safeParse(-1).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = numberRules.nonNegative();
      expect(rule.message).toBe('Cannot be negative');
    });
  });

  describe('nonPositive', () => {
    it('should validate non-positive numbers', () => {
      const rule = numberRules.nonPositive();
      const schema = rule.check!(z.number());

      expect(schema.safeParse(0).success).toBe(true);
      expect(schema.safeParse(-100).success).toBe(true);
    });

    it('should reject positive numbers', () => {
      const rule = numberRules.nonPositive();
      const schema = rule.check!(z.number());

      expect(schema.safeParse(1).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = numberRules.nonPositive();
      expect(rule.message).toBe('Cannot be positive');
    });
  });

  describe('multipleOf', () => {
    it('should validate multiples', () => {
      const rule = numberRules.multipleOf(5);
      const schema = rule.check!(z.number());

      expect(schema.safeParse(0).success).toBe(true);
      expect(schema.safeParse(5).success).toBe(true);
      expect(schema.safeParse(10).success).toBe(true);
      expect(schema.safeParse(-15).success).toBe(true);
    });

    it('should reject non-multiples', () => {
      const rule = numberRules.multipleOf(5);
      const schema = rule.check!(z.number());

      expect(schema.safeParse(3).success).toBe(false);
      expect(schema.safeParse(7).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = numberRules.multipleOf(10);
      expect(rule.message).toBe('Must be a multiple of 10');
    });

    it('should work with decimal values', () => {
      const rule = numberRules.multipleOf(0.5);
      const schema = rule.check!(z.number());

      expect(schema.safeParse(1.5).success).toBe(true);
      expect(schema.safeParse(2.0).success).toBe(true);
    });
  });

  describe('finite', () => {
    it('should validate finite numbers', () => {
      const rule = numberRules.finite();
      const schema = rule.check!(z.number());

      expect(schema.safeParse(100).success).toBe(true);
      expect(schema.safeParse(-100).success).toBe(true);
      expect(schema.safeParse(0).success).toBe(true);
    });

    it('should reject Infinity and NaN', () => {
      const rule = numberRules.finite();
      const schema = rule.check!(z.number());

      expect(schema.safeParse(Infinity).success).toBe(false);
      expect(schema.safeParse(-Infinity).success).toBe(false);
      expect(schema.safeParse(NaN).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = numberRules.finite();
      expect(rule.message).toBe('Must be a finite number');
    });
  });

  describe('safe', () => {
    it('should validate safe integers', () => {
      const rule = numberRules.safe();
      const schema = rule.check!(z.number());

      expect(schema.safeParse(100).success).toBe(true);
      expect(schema.safeParse(Number.MAX_SAFE_INTEGER).success).toBe(true);
      expect(schema.safeParse(Number.MIN_SAFE_INTEGER).success).toBe(true);
    });

    it('should reject unsafe integers', () => {
      const rule = numberRules.safe();
      const schema = rule.check!(z.number());

      expect(schema.safeParse(Number.MAX_SAFE_INTEGER + 1).success).toBe(false);
      expect(schema.safeParse(Number.MIN_SAFE_INTEGER - 1).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = numberRules.safe();
      expect(rule.message).toBe('Must be a safe integer');
    });
  });
});

describe('dateRules', () => {
  describe('min', () => {
    it('should validate minimum date', () => {
      const minDate = new Date('2020-01-01');
      const rule = dateRules.min(minDate);
      const schema = rule.check!(z.date());

      expect(schema.safeParse(new Date('2020-01-01')).success).toBe(true);
      expect(schema.safeParse(new Date('2021-01-01')).success).toBe(true);
    });

    it('should reject dates before minimum', () => {
      const minDate = new Date('2020-01-01');
      const rule = dateRules.min(minDate);
      const schema = rule.check!(z.date());

      expect(schema.safeParse(new Date('2019-12-31')).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const minDate = new Date('2020-01-01');
      const rule = dateRules.min(minDate);
      expect(rule.message).toContain('Must be on or after');
    });
  });

  describe('max', () => {
    it('should validate maximum date', () => {
      const maxDate = new Date('2025-12-31');
      const rule = dateRules.max(maxDate);
      const schema = rule.check!(z.date());

      expect(schema.safeParse(new Date('2025-12-31')).success).toBe(true);
      expect(schema.safeParse(new Date('2024-01-01')).success).toBe(true);
    });

    it('should reject dates after maximum', () => {
      const maxDate = new Date('2025-12-31');
      const rule = dateRules.max(maxDate);
      const schema = rule.check!(z.date());

      expect(schema.safeParse(new Date('2026-01-01')).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const maxDate = new Date('2025-12-31');
      const rule = dateRules.max(maxDate);
      expect(rule.message).toContain('Must be on or before');
    });
  });

  describe('future', () => {
    it('should validate future dates', () => {
      const rule = dateRules.future();
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow

      expect(rule.refinement(futureDate)).toBe(true);
    });

    it('should reject past and current dates', () => {
      const rule = dateRules.future();
      const pastDate = new Date(Date.now() - 86400000); // Yesterday

      expect(rule.refinement(pastDate)).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = dateRules.future();
      expect(rule.message).toBe('Must be in the future');
    });
  });

  describe('past', () => {
    it('should validate past dates', () => {
      const rule = dateRules.past();
      const pastDate = new Date(Date.now() - 86400000); // Yesterday

      expect(rule.refinement(pastDate)).toBe(true);
    });

    it('should reject future dates', () => {
      const rule = dateRules.past();
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow

      expect(rule.refinement(futureDate)).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = dateRules.past();
      expect(rule.message).toBe('Must be in the past');
    });
  });

  describe('todayOrFuture', () => {
    it('should validate today and future dates', () => {
      const rule = dateRules.todayOrFuture();
      const today = new Date();
      const tomorrow = new Date(Date.now() + 86400000);

      expect(rule.refinement(today)).toBe(true);
      expect(rule.refinement(tomorrow)).toBe(true);
    });

    it('should reject past dates', () => {
      const rule = dateRules.todayOrFuture();
      const yesterday = new Date(Date.now() - 86400000);

      expect(rule.refinement(yesterday)).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = dateRules.todayOrFuture();
      expect(rule.message).toBe('Must be today or in the future');
    });
  });

  describe('between', () => {
    it('should validate dates within range', () => {
      const min = new Date('2020-01-01');
      const max = new Date('2025-12-31');
      const rule = dateRules.between(min, max);

      expect(rule.refinement(new Date('2020-01-01'))).toBe(true);
      expect(rule.refinement(new Date('2023-06-15'))).toBe(true);
      expect(rule.refinement(new Date('2025-12-31'))).toBe(true);
    });

    it('should reject dates outside range', () => {
      const min = new Date('2020-01-01');
      const max = new Date('2025-12-31');
      const rule = dateRules.between(min, max);

      expect(rule.refinement(new Date('2019-12-31'))).toBe(false);
      expect(rule.refinement(new Date('2026-01-01'))).toBe(false);
    });

    it('should have appropriate error message', () => {
      const min = new Date('2020-01-01');
      const max = new Date('2025-12-31');
      const rule = dateRules.between(min, max);
      expect(rule.message).toContain('Must be between');
    });
  });
});

describe('arrayRules', () => {
  describe('minItems', () => {
    it('should validate minimum items', () => {
      const rule = arrayRules.minItems(2);
      const schema = rule.check!(z.array(z.any()));

      expect(schema.safeParse([1, 2]).success).toBe(true);
      expect(schema.safeParse([1, 2, 3]).success).toBe(true);
    });

    it('should reject below minimum items', () => {
      const rule = arrayRules.minItems(2);
      const schema = rule.check!(z.array(z.any()));

      expect(schema.safeParse([1]).success).toBe(false);
      expect(schema.safeParse([]).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = arrayRules.minItems(5);
      expect(rule.message).toBe('Must contain at least 5 item(s)');
    });
  });

  describe('maxItems', () => {
    it('should validate maximum items', () => {
      const rule = arrayRules.maxItems(3);
      const schema = rule.check!(z.array(z.any()));

      expect(schema.safeParse([1, 2, 3]).success).toBe(true);
      expect(schema.safeParse([1]).success).toBe(true);
    });

    it('should reject above maximum items', () => {
      const rule = arrayRules.maxItems(3);
      const schema = rule.check!(z.array(z.any()));

      expect(schema.safeParse([1, 2, 3, 4]).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = arrayRules.maxItems(10);
      expect(rule.message).toBe('Must contain at most 10 item(s)');
    });
  });

  describe('length', () => {
    it('should validate exact length', () => {
      const rule = arrayRules.length(3);
      const schema = rule.check!(z.array(z.any()));

      expect(schema.safeParse([1, 2, 3]).success).toBe(true);
    });

    it('should reject incorrect length', () => {
      const rule = arrayRules.length(3);
      const schema = rule.check!(z.array(z.any()));

      expect(schema.safeParse([1, 2]).success).toBe(false);
      expect(schema.safeParse([1, 2, 3, 4]).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = arrayRules.length(5);
      expect(rule.message).toBe('Must contain exactly 5 item(s)');
    });
  });

  describe('nonEmpty', () => {
    it('should validate non-empty arrays', () => {
      const rule = arrayRules.nonEmpty();
      const schema = rule.check!(z.array(z.any()));

      expect(schema.safeParse([1]).success).toBe(true);
      expect(schema.safeParse([1, 2, 3]).success).toBe(true);
    });

    it('should reject empty arrays', () => {
      const rule = arrayRules.nonEmpty();
      const schema = rule.check!(z.array(z.any()));

      expect(schema.safeParse([]).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = arrayRules.nonEmpty();
      expect(rule.message).toBe('Array cannot be empty');
    });
  });

  describe('unique', () => {
    it('should validate unique primitive items', () => {
      const rule = arrayRules.unique();

      expect(rule.refinement([1, 2, 3])).toBe(true);
      expect(rule.refinement(['a', 'b', 'c'])).toBe(true);
    });

    it('should reject duplicate primitive items', () => {
      const rule = arrayRules.unique();

      expect(rule.refinement([1, 2, 2, 3])).toBe(false);
      expect(rule.refinement(['a', 'b', 'a'])).toBe(false);
    });

    it('should use custom comparator for objects', () => {
      const compareFn = (a: { id: number }, b: { id: number }) => a.id === b.id;
      const rule = arrayRules.unique(compareFn);

      expect(rule.refinement([{ id: 1 }, { id: 2 }])).toBe(true);
      expect(rule.refinement([{ id: 1 }, { id: 1 }])).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = arrayRules.unique();
      expect(rule.message).toBe('All items must be unique');
    });

    it('should handle empty arrays', () => {
      const rule = arrayRules.unique();
      expect(rule.refinement([])).toBe(true);
    });

    it('should handle single item arrays', () => {
      const rule = arrayRules.unique();
      expect(rule.refinement([1])).toBe(true);
    });
  });
});

describe('objectRules', () => {
  describe('strict', () => {
    it('should validate strict objects', () => {
      const rule = objectRules.strict();
      const schema = rule.check!(z.object({ name: z.string() }));

      expect(schema.safeParse({ name: 'test' }).success).toBe(true);
    });

    it('should reject additional properties', () => {
      const rule = objectRules.strict();
      const schema = rule.check!(z.object({ name: z.string() }));

      expect(schema.safeParse({ name: 'test', extra: 'value' }).success).toBe(false);
    });

    it('should have appropriate error message', () => {
      const rule = objectRules.strict();
      expect(rule.message).toBe('No additional properties allowed');
    });
  });

  describe('passthrough', () => {
    it('should pass through unknown keys', () => {
      const rule = objectRules.passthrough();
      const schema = rule.check!(z.object({ name: z.string() }));

      const result = schema.parse({ name: 'test', extra: 'value' });
      expect(result).toEqual({ name: 'test', extra: 'value' });
    });

    it('should not have error message (transformation)', () => {
      const rule = objectRules.passthrough();
      expect(rule.message).toBeUndefined();
    });
  });

  describe('strip', () => {
    it('should strip unknown keys', () => {
      const rule = objectRules.strip();
      const schema = rule.check!(z.object({ name: z.string() }));

      const result = schema.parse({ name: 'test', extra: 'value' });
      expect(result).toEqual({ name: 'test' });
    });

    it('should not have error message (transformation)', () => {
      const rule = objectRules.strip();
      expect(rule.message).toBeUndefined();
    });
  });
});

describe('customRule', () => {
  it('should create custom validation rule', () => {
    const validator: CustomValidator<string> = (val) => val.startsWith('test_');
    const rule = customRule(validator, 'Must start with test_');

    expect(rule.refinement('test_value')).toBe(true);
    expect(rule.refinement('invalid')).toBe(false);
    expect(rule.message).toBe('Must start with test_');
  });

  it('should support async validators', async () => {
    const validator: CustomValidator<string> = async (val) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return val.length > 5;
    };
    const rule = customRule(validator, 'Must be longer than 5 chars');

    const result = await rule.refinement('hello world');
    expect(result).toBe(true);

    const result2 = await rule.refinement('hi');
    expect(result2).toBe(false);
  });

  it('should handle complex validation logic', () => {
    const validator: CustomValidator<number[]> = (arr) => {
      return arr.every((num) => num % 2 === 0);
    };
    const rule = customRule(validator, 'All numbers must be even');

    expect(rule.refinement([2, 4, 6])).toBe(true);
    expect(rule.refinement([1, 2, 3])).toBe(false);
  });
});

describe('combine', () => {
  it('should combine multiple refinements', () => {
    const refinement1 = { refinement: (val: string) => val.length > 5, message: 'Too short' };
    const refinement2 = {
      refinement: (val: string) => val.includes('@'),
      message: 'Must contain @',
    };

    const combined = combine(refinement1, refinement2);

    expect(combined).toHaveLength(2);
    expect(combined[0]).toBe(refinement1);
    expect(combined[1]).toBe(refinement2);
  });

  it('should handle empty combination', () => {
    const combined = combine();
    expect(combined).toHaveLength(0);
  });

  it('should handle single refinement', () => {
    const refinement = { refinement: (val: string) => val.length > 0, message: 'Required' };
    const combined = combine(refinement);

    expect(combined).toHaveLength(1);
    expect(combined[0]).toBe(refinement);
  });

  it('should preserve async refinements', () => {
    const asyncRefinement = {
      refinement: async (val: string) => val.length > 5,
      message: 'Too short',
    };
    const syncRefinement = {
      refinement: (val: string) => val.includes('@'),
      message: 'Must contain @',
    };

    const combined = combine(asyncRefinement, syncRefinement);

    expect(combined).toHaveLength(2);
  });
});

describe('Edge cases and integration', () => {
  it('should handle rule chaining', () => {
    const minRule = stringRules.minLength(5);
    const maxRule = stringRules.maxLength(10);

    let schema = z.string();
    schema = minRule.check!(schema);
    schema = maxRule.check!(schema);

    expect(schema.safeParse('hello').success).toBe(true);
    expect(schema.safeParse('hi').success).toBe(false);
    expect(schema.safeParse('this is too long').success).toBe(false);
  });

  it('should handle multiple number validations', () => {
    let schema = z.number();
    schema = numberRules.integer().check!(schema);
    schema = numberRules.positive().check!(schema);
    schema = numberRules.max(100).check!(schema);

    expect(schema.safeParse(50).success).toBe(true);
    expect(schema.safeParse(50.5).success).toBe(false);
    expect(schema.safeParse(-10).success).toBe(false);
    expect(schema.safeParse(150).success).toBe(false);
  });

  it('should handle transformations with validations', () => {
    let schema = z.string();
    schema = stringRules.trim().check!(schema);
    schema = stringRules.lowercase().check!(schema);
    schema = stringRules.minLength(3).check!(schema);

    const result = schema.parse('  HELLO  ');
    expect(result).toBe('hello');
  });
});
