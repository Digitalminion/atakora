/**
 * Unit tests for Threshold builders
 *
 * @remarks
 * Tests threshold creation, evaluation logic, and integration with Duration objects.
 */

import { describe, it, expect } from 'vitest';
import { greaterThan, lessThan, between, equals, olderThan, type Threshold } from './threshold';
import { milliseconds, seconds, minutes, hours, days } from './duration';

describe('Threshold', () => {
  describe('greaterThan()', () => {
    describe('numeric thresholds', () => {
      it('should create greater than threshold', () => {
        const threshold = greaterThan(80);

        expect(threshold.type).toBe('greater');
        expect(threshold.value).toBe(80);
      });

      it('should evaluate correctly for values above threshold', () => {
        const threshold = greaterThan(50);

        expect(threshold.evaluate(51)).toBe(true);
        expect(threshold.evaluate(100)).toBe(true);
        expect(threshold.evaluate(1000)).toBe(true);
      });

      it('should evaluate correctly for values at threshold', () => {
        const threshold = greaterThan(50);

        expect(threshold.evaluate(50)).toBe(false);
      });

      it('should evaluate correctly for values below threshold', () => {
        const threshold = greaterThan(50);

        expect(threshold.evaluate(49)).toBe(false);
        expect(threshold.evaluate(0)).toBe(false);
        expect(threshold.evaluate(-10)).toBe(false);
      });

      it('should handle zero threshold', () => {
        const threshold = greaterThan(0);

        expect(threshold.evaluate(1)).toBe(true);
        expect(threshold.evaluate(0)).toBe(false);
        expect(threshold.evaluate(-1)).toBe(false);
      });

      it('should handle negative threshold', () => {
        const threshold = greaterThan(-10);

        expect(threshold.evaluate(0)).toBe(true);
        expect(threshold.evaluate(-9)).toBe(true);
        expect(threshold.evaluate(-10)).toBe(false);
        expect(threshold.evaluate(-11)).toBe(false);
      });
    });

    describe('duration thresholds', () => {
      it('should create greater than threshold with duration', () => {
        const threshold = greaterThan(minutes(5));

        expect(threshold.type).toBe('greater');
      });

      it('should evaluate correctly with same duration units', () => {
        const threshold = greaterThan(minutes(5));

        expect(threshold.evaluate(minutes(6))).toBe(true);
        expect(threshold.evaluate(minutes(5))).toBe(false);
        expect(threshold.evaluate(minutes(4))).toBe(false);
      });

      it('should evaluate correctly with different duration units', () => {
        const threshold = greaterThan(minutes(5));

        expect(threshold.evaluate(seconds(301))).toBe(true);
        expect(threshold.evaluate(seconds(300))).toBe(false);
        expect(threshold.evaluate(seconds(299))).toBe(false);
      });

      it('should handle zero duration', () => {
        const threshold = greaterThan(seconds(0));

        expect(threshold.evaluate(seconds(1))).toBe(true);
        expect(threshold.evaluate(seconds(0))).toBe(false);
      });
    });

    it('should return string representation', () => {
      expect(greaterThan(80).toString()).toBe('> 80');
      expect(greaterThan(minutes(5)).toString()).toContain('5 minutes');
    });
  });

  describe('lessThan()', () => {
    describe('numeric thresholds', () => {
      it('should create less than threshold', () => {
        const threshold = lessThan(20);

        expect(threshold.type).toBe('less');
        expect(threshold.value).toBe(20);
      });

      it('should evaluate correctly for values below threshold', () => {
        const threshold = lessThan(50);

        expect(threshold.evaluate(49)).toBe(true);
        expect(threshold.evaluate(0)).toBe(true);
        expect(threshold.evaluate(-10)).toBe(true);
      });

      it('should evaluate correctly for values at threshold', () => {
        const threshold = lessThan(50);

        expect(threshold.evaluate(50)).toBe(false);
      });

      it('should evaluate correctly for values above threshold', () => {
        const threshold = lessThan(50);

        expect(threshold.evaluate(51)).toBe(false);
        expect(threshold.evaluate(100)).toBe(false);
      });
    });

    describe('duration thresholds', () => {
      it('should create less than threshold with duration', () => {
        const threshold = lessThan(seconds(2));

        expect(threshold.type).toBe('less');
      });

      it('should evaluate correctly with duration', () => {
        const threshold = lessThan(seconds(30));

        expect(threshold.evaluate(seconds(29))).toBe(true);
        expect(threshold.evaluate(seconds(30))).toBe(false);
        expect(threshold.evaluate(seconds(31))).toBe(false);
      });

      it('should handle different duration units', () => {
        const threshold = lessThan(minutes(1));

        expect(threshold.evaluate(seconds(59))).toBe(true);
        expect(threshold.evaluate(seconds(60))).toBe(false);
      });
    });

    it('should return string representation', () => {
      expect(lessThan(20).toString()).toBe('< 20');
    });
  });

  describe('between()', () => {
    describe('numeric thresholds', () => {
      it('should create between threshold', () => {
        const threshold = between(20, 80);

        expect(threshold.type).toBe('between');
        expect(threshold.value).toBe(20);
        expect(threshold.upperValue).toBe(80);
      });

      it('should evaluate correctly for values in range (inclusive)', () => {
        const threshold = between(20, 80);

        expect(threshold.evaluate(20)).toBe(true); // Lower bound
        expect(threshold.evaluate(50)).toBe(true); // Middle
        expect(threshold.evaluate(80)).toBe(true); // Upper bound
      });

      it('should evaluate correctly for values outside range', () => {
        const threshold = between(20, 80);

        expect(threshold.evaluate(19)).toBe(false);
        expect(threshold.evaluate(81)).toBe(false);
        expect(threshold.evaluate(0)).toBe(false);
        expect(threshold.evaluate(100)).toBe(false);
      });

      it('should handle zero in range', () => {
        const threshold = between(-10, 10);

        expect(threshold.evaluate(0)).toBe(true);
        expect(threshold.evaluate(-10)).toBe(true);
        expect(threshold.evaluate(10)).toBe(true);
      });

      it('should handle single value range', () => {
        const threshold = between(50, 50);

        expect(threshold.evaluate(50)).toBe(true);
        expect(threshold.evaluate(49)).toBe(false);
        expect(threshold.evaluate(51)).toBe(false);
      });
    });

    describe('duration thresholds', () => {
      it('should create between threshold with durations', () => {
        const threshold = between(minutes(1), seconds(120));

        expect(threshold.type).toBe('between');
      });

      it('should evaluate correctly with durations', () => {
        const threshold = between(seconds(10), seconds(60));

        expect(threshold.evaluate(seconds(10))).toBe(true);
        expect(threshold.evaluate(seconds(30))).toBe(true);
        expect(threshold.evaluate(seconds(60))).toBe(true);
        expect(threshold.evaluate(seconds(9))).toBe(false);
        expect(threshold.evaluate(seconds(61))).toBe(false);
      });

      it('should handle different duration units', () => {
        const threshold = between(seconds(30), minutes(2));

        expect(threshold.evaluate(seconds(45))).toBe(true);
        expect(threshold.evaluate(minutes(1))).toBe(true);
        expect(threshold.evaluate(seconds(29))).toBe(false);
        expect(threshold.evaluate(seconds(121))).toBe(false);
      });
    });

    it('should return string representation', () => {
      expect(between(20, 80).toString()).toBe('20 - 80');
    });
  });

  describe('equals()', () => {
    describe('numeric thresholds', () => {
      it('should create equals threshold', () => {
        const threshold = equals(100);

        expect(threshold.type).toBe('equals');
        expect(threshold.value).toBe(100);
      });

      it('should evaluate correctly for matching value', () => {
        const threshold = equals(50);

        expect(threshold.evaluate(50)).toBe(true);
      });

      it('should evaluate correctly for non-matching values', () => {
        const threshold = equals(50);

        expect(threshold.evaluate(49)).toBe(false);
        expect(threshold.evaluate(51)).toBe(false);
        expect(threshold.evaluate(0)).toBe(false);
      });

      it('should handle zero', () => {
        const threshold = equals(0);

        expect(threshold.evaluate(0)).toBe(true);
        expect(threshold.evaluate(1)).toBe(false);
        expect(threshold.evaluate(-1)).toBe(false);
      });

      it('should handle negative values', () => {
        const threshold = equals(-10);

        expect(threshold.evaluate(-10)).toBe(true);
        expect(threshold.evaluate(-9)).toBe(false);
      });
    });

    describe('duration thresholds', () => {
      it('should create equals threshold with duration', () => {
        const threshold = equals(hours(24));

        expect(threshold.type).toBe('equals');
      });

      it('should evaluate correctly with matching duration', () => {
        const threshold = equals(minutes(30));

        expect(threshold.evaluate(minutes(30))).toBe(true);
        expect(threshold.evaluate(minutes(29))).toBe(false);
        expect(threshold.evaluate(minutes(31))).toBe(false);
      });

      it('should evaluate correctly with equivalent durations in different units', () => {
        const threshold = equals(hours(24));

        expect(threshold.evaluate(days(1))).toBe(true);
        expect(threshold.evaluate(minutes(1440))).toBe(true);
      });
    });

    it('should return string representation', () => {
      expect(equals(100).toString()).toBe('= 100');
    });
  });

  describe('olderThan()', () => {
    it('should create older than threshold', () => {
      const threshold = olderThan(days(30));

      expect(threshold.type).toBe('older');
    });

    it('should evaluate correctly for older values', () => {
      const threshold = olderThan(days(30));

      expect(threshold.evaluate(days(31))).toBe(true);
      expect(threshold.evaluate(days(60))).toBe(true);
      expect(threshold.evaluate(days(365))).toBe(true);
    });

    it('should evaluate correctly for exact age', () => {
      const threshold = olderThan(days(30));

      expect(threshold.evaluate(days(30))).toBe(false);
    });

    it('should evaluate correctly for younger values', () => {
      const threshold = olderThan(days(30));

      expect(threshold.evaluate(days(29))).toBe(false);
      expect(threshold.evaluate(days(1))).toBe(false);
      expect(threshold.evaluate(hours(1))).toBe(false);
    });

    it('should work with different duration units', () => {
      const threshold = olderThan(hours(24));

      expect(threshold.evaluate(days(2))).toBe(true);
      expect(threshold.evaluate(hours(25))).toBe(true);
      expect(threshold.evaluate(hours(24))).toBe(false);
      expect(threshold.evaluate(hours(23))).toBe(false);
    });

    it('should return string representation', () => {
      const result = olderThan(days(30)).toString();
      expect(result).toContain('older than');
    });
  });

  describe('type inference', () => {
    it('should infer numeric type for numeric thresholds', () => {
      const threshold: Threshold<number> = greaterThan(50);

      expect(threshold.evaluate(60)).toBe(true);
    });

    it('should work with explicit Duration type', () => {
      const threshold = greaterThan(minutes(5));

      // Should accept Duration objects
      expect(threshold.evaluate(minutes(6))).toBe(true);
      expect(threshold.evaluate(seconds(360))).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle very large numbers', () => {
      const threshold = greaterThan(Number.MAX_SAFE_INTEGER - 100);

      expect(threshold.evaluate(Number.MAX_SAFE_INTEGER)).toBe(true);
      expect(threshold.evaluate(Number.MAX_SAFE_INTEGER - 101)).toBe(false);
    });

    it('should handle very small numbers', () => {
      const threshold = lessThan(Number.MIN_VALUE * 2);

      expect(threshold.evaluate(Number.MIN_VALUE)).toBe(true);
    });

    it('should handle floating point numbers', () => {
      const threshold = between(0.1, 0.9);

      expect(threshold.evaluate(0.5)).toBe(true);
      expect(threshold.evaluate(0.05)).toBe(false);
      expect(threshold.evaluate(0.95)).toBe(false);
    });

    it('should handle Infinity', () => {
      const threshold = lessThan(Infinity);

      expect(threshold.evaluate(Number.MAX_VALUE)).toBe(true);
      expect(threshold.evaluate(Infinity)).toBe(false);
    });
  });

  describe('common use cases', () => {
    it('should support CPU percentage thresholds', () => {
      const cpuWarning = greaterThan(70);
      const cpuCritical = greaterThan(90);

      expect(cpuWarning.evaluate(75)).toBe(true);
      expect(cpuCritical.evaluate(75)).toBe(false);
      expect(cpuCritical.evaluate(95)).toBe(true);
    });

    it('should support memory thresholds', () => {
      const lowMemory = lessThan(10);
      const normalMemory = between(10, 80);
      const highMemory = greaterThan(80);

      expect(lowMemory.evaluate(5)).toBe(true);
      expect(normalMemory.evaluate(50)).toBe(true);
      expect(highMemory.evaluate(85)).toBe(true);
    });

    it('should support timeout thresholds', () => {
      const fastResponse = lessThan(seconds(1));
      const normalResponse = between(seconds(1), seconds(5));
      const slowResponse = greaterThan(seconds(5));

      expect(fastResponse.evaluate(milliseconds(500))).toBe(true);
      expect(normalResponse.evaluate(seconds(3))).toBe(true);
      expect(slowResponse.evaluate(seconds(10))).toBe(true);
    });

    it('should support age-based cleanup', () => {
      const staleData = olderThan(days(30));
      const veryOldData = olderThan(days(365));

      expect(staleData.evaluate(days(45))).toBe(true);
      expect(veryOldData.evaluate(days(45))).toBe(false);
      expect(veryOldData.evaluate(days(400))).toBe(true);
    });

    it('should support exact match validation', () => {
      const expectedRetries = equals(3);
      const expectedTimeout = equals(seconds(30));

      expect(expectedRetries.evaluate(3)).toBe(true);
      expect(expectedRetries.evaluate(2)).toBe(false);
      expect(expectedTimeout.evaluate(seconds(30))).toBe(true);
    });
  });

  describe('Threshold interface', () => {
    it('should have all required properties', () => {
      const threshold: Threshold = greaterThan(50);

      expect(threshold).toHaveProperty('type');
      expect(threshold).toHaveProperty('value');
      expect(threshold).toHaveProperty('evaluate');
      expect(threshold).toHaveProperty('toString');
    });

    it('should have readonly properties', () => {
      const threshold = greaterThan(50);

      expect(Object.getOwnPropertyDescriptor(threshold, 'type')?.writable).toBe(false);
      expect(Object.getOwnPropertyDescriptor(threshold, 'value')?.writable).toBe(false);
    });

    it('should support upperValue for between threshold', () => {
      const threshold = between(10, 90);

      expect(threshold.upperValue).toBe(90);
    });
  });

  describe('performance', () => {
    it('should create thresholds quickly', () => {
      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        greaterThan(i);
        lessThan(i);
        between(i, i + 100);
        equals(i);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50); // Should complete in < 50ms
    });

    it('should evaluate thresholds quickly', () => {
      const thresholds = [greaterThan(50), lessThan(100), between(25, 75), equals(60)];

      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        thresholds.forEach((t) => t.evaluate(i % 100));
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50); // Should complete in < 50ms
    });
  });
});
