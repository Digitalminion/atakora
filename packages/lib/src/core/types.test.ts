import { describe, it, expect } from 'vitest';
import { NamingComponent } from './types';

// Create a concrete implementation for testing
class TestNamingComponent extends NamingComponent {
  // No additional implementation needed for basic tests
}

describe('core/types', () => {
  describe('NamingComponent', () => {
    describe('constructor', () => {
      it('should create from simple string value', () => {
        const component = new TestNamingComponent('digital-minion');
        expect(component.value).toBe('digital-minion');
        expect(component.resourceName).toBe('digital-minion');
        expect(component.title).toBe('Digital Minion');
      });

      it('should create from options object', () => {
        const component = new TestNamingComponent({
          value: 'digital-minion',
          resourceName: 'dp',
          title: 'Digital Minion',
        });
        expect(component.value).toBe('digital-minion');
        expect(component.resourceName).toBe('dp');
        expect(component.title).toBe('Digital Minion');
      });

      it('should auto-generate resourceName when not provided', () => {
        const component = new TestNamingComponent({
          value: 'Digital Minion',
        });
        expect(component.resourceName).toBe('digital-minion');
      });

      it('should auto-generate title when not provided', () => {
        const component = new TestNamingComponent({
          value: 'Digital Minion',
        });
        expect(component.title).toBe('Digital Minion');
      });

      it('should throw error for empty value', () => {
        expect(() => new TestNamingComponent('')).toThrow(/cannot be empty/);
      });

      it('should throw error for whitespace-only value', () => {
        expect(() => new TestNamingComponent('   ')).toThrow(/cannot be empty/);
      });
    });

    describe('normalizeToResourceName()', () => {
      it('should convert to lowercase', () => {
        const component = new TestNamingComponent('UPPERCASE');
        expect(component.resourceName).toBe('uppercase');
      });

      it('should replace spaces with hyphens', () => {
        const component = new TestNamingComponent('Digital Minion');
        expect(component.resourceName).toBe('digital-minion');
      });

      it('should remove special characters', () => {
        const component = new TestNamingComponent('Test@#$%Component');
        expect(component.resourceName).toBe('testcomponent');
      });

      it('should collapse multiple hyphens', () => {
        const component = new TestNamingComponent('test---component');
        expect(component.resourceName).toBe('test-component');
      });

      it('should remove leading hyphens', () => {
        const component = new TestNamingComponent('---test');
        expect(component.resourceName).toBe('test');
      });

      it('should remove trailing hyphens', () => {
        const component = new TestNamingComponent('test---');
        expect(component.resourceName).toBe('test');
      });

      it('should handle mixed spacing', () => {
        const component = new TestNamingComponent('  Digital   Products  ');
        expect(component.resourceName).toBe('digital-minion');
      });

      it('should preserve numbers', () => {
        const component = new TestNamingComponent('East US 2');
        expect(component.resourceName).toBe('east-us-2');
      });

      it('should handle already normalized names', () => {
        const component = new TestNamingComponent('already-normalized-123');
        expect(component.resourceName).toBe('already-normalized-123');
      });
    });

    describe('normalizeToTitle()', () => {
      it('should capitalize first letter of each word', () => {
        const component = new TestNamingComponent('Digital Minion');
        expect(component.title).toBe('Digital Minion');
      });

      it('should handle single words', () => {
        const component = new TestNamingComponent('authr');
        expect(component.title).toBe('Authr');
      });

      it('should handle all uppercase input', () => {
        const component = new TestNamingComponent('Digital Minion');
        expect(component.title).toBe('Digital Minion');
      });

      it('should handle mixed case input', () => {
        const component = new TestNamingComponent('Digital Minion');
        expect(component.title).toBe('Digital Minion');
      });

      it('should trim whitespace', () => {
        const component = new TestNamingComponent('  Digital Minion  ');
        expect(component.title).toBe('Digital Minion');
      });

      it('should handle multiple spaces', () => {
        const component = new TestNamingComponent('digital    products');
        expect(component.title).toBe('Digital Minion');
      });
    });

    describe('toString()', () => {
      it('should return resourceName', () => {
        const component = new TestNamingComponent('Digital Minion');
        expect(component.toString()).toBe('digital-minion');
      });

      it('should work with string concatenation', () => {
        const component = new TestNamingComponent('test');
        const result = 'prefix-' + component;
        expect(result).toBe('prefix-test');
      });
    });

    describe('toJSON()', () => {
      it('should return object with all properties', () => {
        const component = new TestNamingComponent('Digital Minion');
        const json = component.toJSON();

        expect(json).toEqual({
          value: 'Digital Minion',
          resourceName: 'digital-minion',
          title: 'Digital Minion',
        });
      });

      it('should work with JSON.stringify', () => {
        const component = new TestNamingComponent('test');
        const jsonString = JSON.stringify(component);
        const parsed = JSON.parse(jsonString);

        expect(parsed.value).toBe('test');
        expect(parsed.resourceName).toBe('test');
        expect(parsed.title).toBe('Test');
      });
    });

    describe('Edge cases', () => {
      it('should handle numbers in input', () => {
        const component = new TestNamingComponent('authr2024');
        expect(component.resourceName).toBe('authr2024');
      });

      it('should handle hyphens in input', () => {
        const component = new TestNamingComponent('east-us-2');
        expect(component.resourceName).toBe('east-us-2');
      });

      it('should handle underscores by removing them', () => {
        const component = new TestNamingComponent('test_component');
        expect(component.resourceName).toBe('testcomponent');
      });

      it('should handle mixed alphanumeric', () => {
        const component = new TestNamingComponent('abc123def456');
        expect(component.resourceName).toBe('abc123def456');
      });

      it('should handle unicode characters by removing them', () => {
        const component = new TestNamingComponent('test™component©');
        expect(component.resourceName).toBe('testcomponent');
      });
    });
  });
});
