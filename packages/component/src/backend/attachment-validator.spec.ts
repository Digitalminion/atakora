/**
 * Attachment Validator Tests
 *
 * Comprehensive test suite for attachment validators.
 *
 * @module @atakora/component/backend/attachment-validator.spec
 */

import { describe, it, expect } from 'vitest';
import {
  AttachmentValidationError,
  isNonEmptyString,
  isValidResourceName,
  isValidSku,
  isPositiveInteger,
  isInRange,
  validateStorageAccountConfig,
  validateDatabaseConfig,
  validateFunctionAppConfig,
  validateVNetConfig,
  validateAppInsightsConfig,
  createRequiredFieldsValidator,
  composeValidators,
  ValidatorRegistry,
  defaultValidators,
  type StorageAccountConfig,
  type DatabaseConfig,
  type FunctionAppConfig,
  type VNetConfig,
  type AppInsightsConfig,
} from './attachment-validator';

describe('AttachmentValidationError', () => {
  it('should create error with path and reason', () => {
    const error = new AttachmentValidationError('storage.database', 'Invalid name');

    expect(error.path).toBe('storage.database');
    expect(error.reason).toBe('Invalid name');
    expect(error.message).toBe('Attachment validation failed at storage.database: Invalid name');
    expect(error.name).toBe('AttachmentValidationError');
  });
});

describe('Type guards', () => {
  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('test')).toBe(true);
      expect(isNonEmptyString('a')).toBe(true);
      expect(isNonEmptyString('  spaces  ')).toBe(true);
    });

    it('should return false for empty strings', () => {
      expect(isNonEmptyString('')).toBe(false);
    });

    it('should return false for non-strings', () => {
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString({})).toBe(false);
      expect(isNonEmptyString([])).toBe(false);
    });
  });

  describe('isValidResourceName', () => {
    it('should return true for valid resource names', () => {
      expect(isValidResourceName('abc')).toBe(true);
      expect(isValidResourceName('my-resource')).toBe(true);
      expect(isValidResourceName('test123')).toBe(true);
      expect(isValidResourceName('a1b2c3')).toBe(true);
    });

    it('should return false for invalid resource names', () => {
      // Too short
      expect(isValidResourceName('ab')).toBe(false);

      // Too long
      expect(isValidResourceName('a'.repeat(25))).toBe(false);

      // Invalid characters
      expect(isValidResourceName('test_resource')).toBe(false);
      expect(isValidResourceName('test.resource')).toBe(false);
      expect(isValidResourceName('TEST')).toBe(false); // Uppercase

      // Doesn't start with letter
      expect(isValidResourceName('123abc')).toBe(false);
      expect(isValidResourceName('-test')).toBe(false);

      // Ends with hyphen
      expect(isValidResourceName('test-')).toBe(false);
    });
  });

  describe('isValidSku', () => {
    it('should return true for valid SKUs', () => {
      const validSkus = ['Standard_LRS', 'Standard_GRS', 'Premium_LRS'];

      expect(isValidSku('Standard_LRS', validSkus)).toBe(true);
      expect(isValidSku('Standard_GRS', validSkus)).toBe(true);
      expect(isValidSku('Premium_LRS', validSkus)).toBe(true);
    });

    it('should return false for invalid SKUs', () => {
      const validSkus = ['Standard_LRS', 'Standard_GRS'];

      expect(isValidSku('Premium_LRS', validSkus)).toBe(false);
      expect(isValidSku('Invalid_SKU', validSkus)).toBe(false);
    });
  });

  describe('isPositiveInteger', () => {
    it('should return true for positive integers', () => {
      expect(isPositiveInteger(1)).toBe(true);
      expect(isPositiveInteger(100)).toBe(true);
      expect(isPositiveInteger(999999)).toBe(true);
    });

    it('should return false for non-positive integers', () => {
      expect(isPositiveInteger(0)).toBe(false);
      expect(isPositiveInteger(-1)).toBe(false);
      expect(isPositiveInteger(1.5)).toBe(false);
      expect(isPositiveInteger('1' as any)).toBe(false);
      expect(isPositiveInteger(null as any)).toBe(false);
      expect(isPositiveInteger(undefined as any)).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('should return true for values in range', () => {
      expect(isInRange(5, 1, 10)).toBe(true);
      expect(isInRange(1, 1, 10)).toBe(true); // Min boundary
      expect(isInRange(10, 1, 10)).toBe(true); // Max boundary
      expect(isInRange(0, -5, 5)).toBe(true);
    });

    it('should return false for values out of range', () => {
      expect(isInRange(0, 1, 10)).toBe(false);
      expect(isInRange(11, 1, 10)).toBe(false);
      expect(isInRange(-10, 1, 10)).toBe(false);
    });
  });
});

describe('Resource validators', () => {
  describe('validateStorageAccountConfig', () => {
    it('should pass for valid config', () => {
      const config: StorageAccountConfig = {
        name: 'test-storage',
        sku: 'Standard_LRS',
        tier: 'Hot',
      };

      expect(validateStorageAccountConfig(config)).toBeUndefined();
    });

    it('should pass for minimal config', () => {
      const config: StorageAccountConfig = {};

      expect(validateStorageAccountConfig(config)).toBeUndefined();
    });

    it('should fail for invalid name', () => {
      const config: StorageAccountConfig = {
        name: 'INVALID',
      };

      const result = validateStorageAccountConfig(config);
      expect(result).toContain('lowercase');
    });

    it('should fail for invalid SKU', () => {
      const config: StorageAccountConfig = {
        sku: 'Invalid_SKU' as any,
      };

      const result = validateStorageAccountConfig(config);
      expect(result).toContain('SKU must be one of');
    });

    it('should fail for invalid tier', () => {
      const config: StorageAccountConfig = {
        tier: 'Archive' as any,
      };

      const result = validateStorageAccountConfig(config);
      expect(result).toContain('tier must be one of');
    });
  });

  describe('validateDatabaseConfig', () => {
    it('should pass for valid config', () => {
      const config: DatabaseConfig = {
        name: 'test-db',
        mode: 'Serverless',
        consistency: 'Session',
        throughput: 1000,
      };

      expect(validateDatabaseConfig(config)).toBeUndefined();
    });

    it('should pass for throughput range', () => {
      const config: DatabaseConfig = {
        throughput: [400, 10000],
      };

      expect(validateDatabaseConfig(config)).toBeUndefined();
    });

    it('should fail for invalid mode', () => {
      const config: DatabaseConfig = {
        mode: 'Invalid' as any,
      };

      const result = validateDatabaseConfig(config);
      expect(result).toContain('mode must be one of');
    });

    it('should fail for invalid consistency', () => {
      const config: DatabaseConfig = {
        consistency: 'Invalid' as any,
      };

      const result = validateDatabaseConfig(config);
      expect(result).toContain('consistency must be one of');
    });

    it('should fail for invalid throughput', () => {
      const config: DatabaseConfig = {
        throughput: 100, // Too low
      };

      const result = validateDatabaseConfig(config);
      expect(result).toContain('between 400 and 1,000,000');
    });

    it('should fail for invalid throughput range', () => {
      const config: DatabaseConfig = {
        throughput: [10000, 400], // Min > max
      };

      const result = validateDatabaseConfig(config);
      expect(result).toContain('minimum must be less than maximum');
    });
  });

  describe('validateFunctionAppConfig', () => {
    it('should pass for valid config', () => {
      const config: FunctionAppConfig = {
        name: 'test-func',
        plan: 'Consumption',
        runtime: { language: 'node', version: '18' },
      };

      expect(validateFunctionAppConfig(config)).toBeUndefined();
    });

    it('should fail for alwaysOn with Consumption plan', () => {
      const config: FunctionAppConfig = {
        plan: 'Consumption',
        alwaysOn: true,
      };

      const result = validateFunctionAppConfig(config);
      expect(result).toContain('AlwaysOn is not supported on Consumption plan');
    });

    it('should fail for invalid instance counts', () => {
      const config: FunctionAppConfig = {
        minInstances: 10,
        maxInstances: 5, // Less than min
      };

      const result = validateFunctionAppConfig(config);
      expect(result).toContain('Minimum instances cannot exceed maximum');
    });

    it('should fail for too many instances', () => {
      const config: FunctionAppConfig = {
        maxInstances: 300, // Exceeds limit
      };

      const result = validateFunctionAppConfig(config);
      expect(result).toContain('Maximum instances cannot exceed 200');
    });
  });

  describe('validateVNetConfig', () => {
    it('should pass for valid config', () => {
      const config: VNetConfig = {
        name: 'test-vnet',
        addressSpace: ['10.0.0.0/16'],
        subnets: [
          { name: 'subnet1', range: '10.0.1.0/24' },
          { name: 'subnet2', range: '10.0.2.0/24' },
        ],
      };

      expect(validateVNetConfig(config)).toBeUndefined();
    });

    it('should fail for empty address space', () => {
      const config: VNetConfig = {
        addressSpace: [],
      };

      const result = validateVNetConfig(config);
      expect(result).toContain('non-empty array');
    });

    it('should fail for invalid CIDR notation', () => {
      const config: VNetConfig = {
        addressSpace: ['invalid'],
      };

      const result = validateVNetConfig(config);
      expect(result).toContain('Invalid CIDR notation');
    });

    it('should fail for subnet without name', () => {
      const config: VNetConfig = {
        subnets: [{ name: '', range: '10.0.1.0/24' }],
      };

      const result = validateVNetConfig(config);
      expect(result).toContain('Subnet name is required');
    });
  });

  describe('validateAppInsightsConfig', () => {
    it('should pass for valid config', () => {
      const config: AppInsightsConfig = {
        name: 'test-ai',
        samplingPercentage: 50,
        retentionDays: 90,
        enableLiveMetrics: true,
      };

      expect(validateAppInsightsConfig(config)).toBeUndefined();
    });

    it('should fail for invalid sampling percentage', () => {
      const config: AppInsightsConfig = {
        samplingPercentage: 150, // Out of range
      };

      const result = validateAppInsightsConfig(config);
      expect(result).toContain('between 0 and 100');
    });

    it('should fail for invalid retention days', () => {
      const config: AppInsightsConfig = {
        retentionDays: 45, // Not a valid option
      };

      const result = validateAppInsightsConfig(config);
      expect(result).toContain('Retention days must be one of');
    });
  });
});

describe('Validator utilities', () => {
  describe('createRequiredFieldsValidator', () => {
    interface TestConfig {
      name: string;
      value: number;
      optional?: string;
    }

    it('should pass when all required fields are present', () => {
      const validator = createRequiredFieldsValidator<TestConfig>(['name', 'value']);

      const config: TestConfig = {
        name: 'test',
        value: 123,
      };

      expect(validator(config)).toBeUndefined();
    });

    it('should fail when required field is missing', () => {
      const validator = createRequiredFieldsValidator<TestConfig>(['name', 'value']);

      const config = {
        name: 'test',
      } as TestConfig;

      const result = validator(config);
      expect(result).toContain("Required field 'value' is missing");
    });

    it('should fail when required field is null', () => {
      const validator = createRequiredFieldsValidator<TestConfig>(['name']);

      const config = {
        name: null as any,
      } as TestConfig;

      const result = validator(config);
      expect(result).toContain("Required field 'name' is missing");
    });
  });

  describe('composeValidators', () => {
    interface TestConfig {
      name: string;
      value: number;
    }

    it('should pass when all validators pass', () => {
      const validator1 = (config: TestConfig) => {
        if (!config.name) return 'Name is required';
        return undefined;
      };

      const validator2 = (config: TestConfig) => {
        if (config.value < 0) return 'Value must be positive';
        return undefined;
      };

      const composed = composeValidators(validator1, validator2);

      const config: TestConfig = {
        name: 'test',
        value: 123,
      };

      expect(composed(config)).toBeUndefined();
    });

    it('should fail with first error encountered', () => {
      const validator1 = (config: TestConfig) => {
        if (!config.name) return 'Name is required';
        return undefined;
      };

      const validator2 = (config: TestConfig) => {
        if (config.value < 0) return 'Value must be positive';
        return undefined;
      };

      const composed = composeValidators(validator1, validator2);

      const config = {
        name: '',
        value: -5,
      } as TestConfig;

      const result = composed(config);
      expect(result).toBe('Name is required'); // First error
    });

    it('should handle empty validator list', () => {
      const composed = composeValidators<{ name: string }>();

      const config = { name: 'test' };

      expect(composed(config)).toBeUndefined();
    });
  });
});

describe('ValidatorRegistry', () => {
  it('should register and retrieve validators', () => {
    const registry = new ValidatorRegistry();
    const validator = (config: any) => undefined;

    registry.register('test-type', validator);

    expect(registry.has('test-type')).toBe(true);
    expect(registry.get('test-type')).toBe(validator);
  });

  it('should return undefined for unregistered types', () => {
    const registry = new ValidatorRegistry();

    expect(registry.has('unknown')).toBe(false);
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('should overwrite existing validators', () => {
    const registry = new ValidatorRegistry();
    const validator1 = (config: any) => 'error1';
    const validator2 = (config: any) => 'error2';

    registry.register('test-type', validator1);
    registry.register('test-type', validator2);

    expect(registry.get('test-type')).toBe(validator2);
  });
});

describe('Default validators registry', () => {
  it('should have storage-account validator registered', () => {
    expect(defaultValidators.has('storage-account')).toBe(true);
    expect(defaultValidators.get('storage-account')).toBe(validateStorageAccountConfig);
  });

  it('should have database validator registered', () => {
    expect(defaultValidators.has('database')).toBe(true);
    expect(defaultValidators.get('database')).toBe(validateDatabaseConfig);
  });

  it('should have function-app validator registered', () => {
    expect(defaultValidators.has('function-app')).toBe(true);
    expect(defaultValidators.get('function-app')).toBe(validateFunctionAppConfig);
  });

  it('should have vnet validator registered', () => {
    expect(defaultValidators.has('vnet')).toBe(true);
    expect(defaultValidators.get('vnet')).toBe(validateVNetConfig);
  });

  it('should have app-insights validator registered', () => {
    expect(defaultValidators.has('app-insights')).toBe(true);
    expect(defaultValidators.get('app-insights')).toBe(validateAppInsightsConfig);
  });
});
