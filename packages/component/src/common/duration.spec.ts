/**
 * Unit tests for Duration utilities
 *
 * @remarks
 * Tests duration creation, conversions, and formatting for ISO 8601
 * and ARM template duration formats.
 */

import { describe, it, expect } from 'vitest';
import { milliseconds, seconds, minutes, hours, days, type Duration } from './duration';

describe('Duration', () => {
  describe('milliseconds()', () => {
    it('should create duration in milliseconds', () => {
      const duration = milliseconds(500);

      expect(duration.value).toBe(500);
      expect(duration.unit).toBe('ms');
    });

    it('should convert to different units', () => {
      const duration = milliseconds(5000);

      expect(duration.toMilliseconds()).toBe(5000);
      expect(duration.toSeconds()).toBe(5);
      expect(duration.toMinutes()).toBe(0);
      expect(duration.toHours()).toBe(0);
      expect(duration.toDays()).toBe(0);
    });

    it('should handle zero', () => {
      const duration = milliseconds(0);

      expect(duration.toMilliseconds()).toBe(0);
      expect(duration.toString()).toBe('0 milliseconds');
    });

    it('should handle single millisecond', () => {
      const duration = milliseconds(1);

      expect(duration.toString()).toBe('1 millisecond');
    });

    it('should convert to ISO string', () => {
      expect(milliseconds(0).toISOString()).toBe('PT0S');
      expect(milliseconds(1000).toISOString()).toBe('PT1S');
      expect(milliseconds(1500).toISOString()).toBe('PT1S'); // Rounds down
    });
  });

  describe('seconds()', () => {
    it('should create duration in seconds', () => {
      const duration = seconds(30);

      expect(duration.value).toBe(30);
      expect(duration.unit).toBe('s');
    });

    it('should convert to different units', () => {
      const duration = seconds(90);

      expect(duration.toMilliseconds()).toBe(90000);
      expect(duration.toSeconds()).toBe(90);
      expect(duration.toMinutes()).toBe(1);
      expect(duration.toHours()).toBe(0);
      expect(duration.toDays()).toBe(0);
    });

    it('should handle single second', () => {
      const duration = seconds(1);

      expect(duration.toString()).toBe('1 second');
    });

    it('should convert to ISO string', () => {
      expect(seconds(0).toISOString()).toBe('PT0S');
      expect(seconds(30).toISOString()).toBe('PT30S');
      expect(seconds(90).toISOString()).toBe('PT1M30S');
    });

    it('should convert to ARM duration', () => {
      expect(seconds(30).toArmDuration()).toBe('0.00:00:30');
      expect(seconds(90).toArmDuration()).toBe('0.00:01:30');
    });
  });

  describe('minutes()', () => {
    it('should create duration in minutes', () => {
      const duration = minutes(5);

      expect(duration.value).toBe(5);
      expect(duration.unit).toBe('m');
    });

    it('should convert to different units', () => {
      const duration = minutes(90);

      expect(duration.toMilliseconds()).toBe(5400000);
      expect(duration.toSeconds()).toBe(5400);
      expect(duration.toMinutes()).toBe(90);
      expect(duration.toHours()).toBe(1);
      expect(duration.toDays()).toBe(0);
    });

    it('should handle single minute', () => {
      const duration = minutes(1);

      expect(duration.toString()).toBe('1 minute');
    });

    it('should convert to ISO string', () => {
      expect(minutes(5).toISOString()).toBe('PT5M');
      expect(minutes(90).toISOString()).toBe('PT1H30M');
      expect(minutes(1440).toISOString()).toBe('P1D'); // 24 hours = 1 day
    });

    it('should convert to ARM duration', () => {
      expect(minutes(5).toArmDuration()).toBe('0.00:05:00');
      expect(minutes(90).toArmDuration()).toBe('0.01:30:00');
    });
  });

  describe('hours()', () => {
    it('should create duration in hours', () => {
      const duration = hours(8);

      expect(duration.value).toBe(8);
      expect(duration.unit).toBe('h');
    });

    it('should convert to different units', () => {
      const duration = hours(48);

      expect(duration.toMilliseconds()).toBe(172800000);
      expect(duration.toSeconds()).toBe(172800);
      expect(duration.toMinutes()).toBe(2880);
      expect(duration.toHours()).toBe(48);
      expect(duration.toDays()).toBe(2);
    });

    it('should handle single hour', () => {
      const duration = hours(1);

      expect(duration.toString()).toBe('1 hour');
    });

    it('should convert to ISO string', () => {
      expect(hours(1).toISOString()).toBe('PT1H');
      expect(hours(8).toISOString()).toBe('PT8H');
      expect(hours(25).toISOString()).toBe('P1DT1H'); // 1 day + 1 hour
    });

    it('should convert to ARM duration', () => {
      expect(hours(1).toArmDuration()).toBe('0.01:00:00');
      expect(hours(25).toArmDuration()).toBe('1.01:00:00');
    });
  });

  describe('days()', () => {
    it('should create duration in days', () => {
      const duration = days(7);

      expect(duration.value).toBe(7);
      expect(duration.unit).toBe('d');
    });

    it('should convert to different units', () => {
      const duration = days(7);

      expect(duration.toMilliseconds()).toBe(604800000);
      expect(duration.toSeconds()).toBe(604800);
      expect(duration.toMinutes()).toBe(10080);
      expect(duration.toHours()).toBe(168);
      expect(duration.toDays()).toBe(7);
    });

    it('should handle single day', () => {
      const duration = days(1);

      expect(duration.toString()).toBe('1 day');
    });

    it('should convert to ISO string', () => {
      expect(days(1).toISOString()).toBe('P1D');
      expect(days(7).toISOString()).toBe('P7D');
      expect(days(30).toISOString()).toBe('P30D');
    });

    it('should convert to ARM duration', () => {
      expect(days(1).toArmDuration()).toBe('1.00:00:00');
      expect(days(7).toArmDuration()).toBe('7.00:00:00');
      expect(days(30).toArmDuration()).toBe('30.00:00:00');
    });
  });

  describe('conversion accuracy', () => {
    it('should handle fractional conversions correctly', () => {
      const duration = seconds(90);

      expect(duration.toMinutes()).toBe(1); // Floors to 1 minute
      expect(duration.toHours()).toBe(0); // Floors to 0 hours
    });

    it('should maintain precision in milliseconds', () => {
      const duration1 = milliseconds(1500);
      const duration2 = seconds(1.5);

      expect(duration1.toMilliseconds()).toBe(duration2.toMilliseconds());
    });

    it('should handle large values', () => {
      const duration = days(365);

      expect(duration.toHours()).toBe(8760);
      expect(duration.toMinutes()).toBe(525600);
      expect(duration.toSeconds()).toBe(31536000);
    });

    it('should handle very small values', () => {
      const duration = milliseconds(1);

      expect(duration.toSeconds()).toBe(0); // Floors to 0
      expect(duration.toMilliseconds()).toBe(1);
    });
  });

  describe('ISO 8601 format', () => {
    it('should format zero duration', () => {
      expect(seconds(0).toISOString()).toBe('PT0S');
    });

    it('should format seconds only', () => {
      expect(seconds(45).toISOString()).toBe('PT45S');
    });

    it('should format minutes only', () => {
      expect(minutes(30).toISOString()).toBe('PT30M');
    });

    it('should format hours only', () => {
      expect(hours(2).toISOString()).toBe('PT2H');
    });

    it('should format days only', () => {
      expect(days(5).toISOString()).toBe('P5D');
    });

    it('should format combined time components', () => {
      expect(seconds(3665).toISOString()).toBe('PT1H1M5S'); // 1h 1m 5s
    });

    it('should format days and time components', () => {
      const totalSeconds = 90061; // 1 day, 1 hour, 1 minute, 1 second
      expect(seconds(totalSeconds).toISOString()).toBe('P1DT1H1M1S');
    });

    it('should omit zero components', () => {
      expect(seconds(3600).toISOString()).toBe('PT1H'); // No minutes or seconds
      expect(seconds(86400).toISOString()).toBe('P1D'); // No time part
    });

    it('should handle complex durations', () => {
      const sevenDaysThreeHours = days(7).toSeconds() + hours(3).toSeconds();
      expect(seconds(sevenDaysThreeHours).toISOString()).toBe('P7DT3H');
    });
  });

  describe('ARM template format', () => {
    it('should format zero duration', () => {
      expect(seconds(0).toArmDuration()).toBe('0.00:00:00');
    });

    it('should format seconds', () => {
      expect(seconds(45).toArmDuration()).toBe('0.00:00:45');
    });

    it('should format minutes and seconds', () => {
      expect(seconds(125).toArmDuration()).toBe('0.00:02:05'); // 2m 5s
    });

    it('should format hours, minutes, seconds', () => {
      expect(seconds(3665).toArmDuration()).toBe('0.01:01:05'); // 1h 1m 5s
    });

    it('should format days and time', () => {
      expect(days(7).toArmDuration()).toBe('7.00:00:00');
      expect(seconds(86400 + 3600).toArmDuration()).toBe('1.01:00:00'); // 1d 1h
    });

    it('should pad time components with zeros', () => {
      expect(seconds(3605).toArmDuration()).toBe('0.01:00:05'); // 1h 5s (0 minutes)
    });

    it('should handle large durations', () => {
      expect(days(30).toArmDuration()).toBe('30.00:00:00');
      expect(days(365).toArmDuration()).toBe('365.00:00:00');
    });
  });

  describe('toString()', () => {
    it('should return human-readable format', () => {
      expect(milliseconds(500).toString()).toBe('500 milliseconds');
      expect(seconds(30).toString()).toBe('30 seconds');
      expect(minutes(5).toString()).toBe('5 minutes');
      expect(hours(8).toString()).toBe('8 hours');
      expect(days(7).toString()).toBe('7 days');
    });

    it('should use singular for value of 1', () => {
      expect(milliseconds(1).toString()).toBe('1 millisecond');
      expect(seconds(1).toString()).toBe('1 second');
      expect(minutes(1).toString()).toBe('1 minute');
      expect(hours(1).toString()).toBe('1 hour');
      expect(days(1).toString()).toBe('1 day');
    });

    it('should use plural for other values', () => {
      expect(milliseconds(0).toString()).toBe('0 milliseconds');
      expect(seconds(2).toString()).toBe('2 seconds');
      expect(minutes(100).toString()).toBe('100 minutes');
    });
  });

  describe('edge cases', () => {
    it('should handle negative values', () => {
      const duration = seconds(-10);

      expect(duration.toMilliseconds()).toBe(-10000);
      expect(duration.toSeconds()).toBe(-10);
    });

    it('should handle very large values without overflow', () => {
      const duration = days(10000);

      expect(duration.toDays()).toBe(10000);
      expect(duration.toHours()).toBe(240000);
    });

    it('should handle decimal values in constructors', () => {
      const duration = seconds(1.5);

      expect(duration.value).toBe(1.5);
      expect(duration.toMilliseconds()).toBe(1500);
    });

    it('should handle very small millisecond values', () => {
      const duration = milliseconds(0.1);

      expect(duration.toMilliseconds()).toBe(0.1);
      expect(duration.toSeconds()).toBe(0);
    });
  });

  describe('common use cases', () => {
    it('should support timeout configurations', () => {
      const requestTimeout = seconds(30);
      const longRunningTimeout = minutes(5);

      expect(requestTimeout.toMilliseconds()).toBe(30000);
      expect(longRunningTimeout.toMilliseconds()).toBe(300000);
    });

    it('should support retention policies', () => {
      const shortRetention = days(7);
      const mediumRetention = days(30);
      const longRetention = days(365);

      expect(shortRetention.toDays()).toBe(7);
      expect(mediumRetention.toDays()).toBe(30);
      expect(longRetention.toDays()).toBe(365);
    });

    it('should support polling intervals', () => {
      const frequentPoll = seconds(5);
      const normalPoll = seconds(30);
      const infrequentPoll = minutes(5);

      expect(frequentPoll.toSeconds()).toBe(5);
      expect(normalPoll.toSeconds()).toBe(30);
      expect(infrequentPoll.toSeconds()).toBe(300);
    });

    it('should support cache expiration', () => {
      const shortCache = minutes(5);
      const mediumCache = hours(1);
      const longCache = days(1);

      expect(shortCache.toSeconds()).toBe(300);
      expect(mediumCache.toSeconds()).toBe(3600);
      expect(longCache.toSeconds()).toBe(86400);
    });
  });

  describe('type safety', () => {
    it('should have correct Duration interface', () => {
      const duration: Duration = seconds(30);

      // Should have all interface properties
      expect(duration).toHaveProperty('value');
      expect(duration).toHaveProperty('unit');
      expect(duration).toHaveProperty('toMilliseconds');
      expect(duration).toHaveProperty('toSeconds');
      expect(duration).toHaveProperty('toMinutes');
      expect(duration).toHaveProperty('toHours');
      expect(duration).toHaveProperty('toDays');
      expect(duration).toHaveProperty('toISOString');
      expect(duration).toHaveProperty('toArmDuration');
      expect(duration).toHaveProperty('toString');
    });

    it('should be readonly for value and unit', () => {
      const duration = seconds(30);

      // TypeScript prevents modification (runtime check)
      expect(Object.getOwnPropertyDescriptor(duration, 'value')?.writable).toBe(false);
      expect(Object.getOwnPropertyDescriptor(duration, 'unit')?.writable).toBe(false);
    });
  });

  describe('performance', () => {
    it('should create durations quickly', () => {
      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        seconds(i);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50); // Should complete in < 50ms
    });

    it('should convert values quickly', () => {
      const duration = days(365);
      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        duration.toMilliseconds();
        duration.toSeconds();
        duration.toMinutes();
        duration.toHours();
        duration.toDays();
      }

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(50); // Should complete in < 50ms
    });
  });
});
