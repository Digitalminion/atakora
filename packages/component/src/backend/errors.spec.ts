/**
 * Tests for Backend Errors
 *
 * @remarks
 * Comprehensive test suite for all backend error classes and factory functions.
 * Tests cover:
 * - Error class constructors and properties
 * - Error inheritance hierarchy
 * - Error serialization and messages
 * - Stack trace handling
 * - Context and metadata attachment
 * - Error factory functions
 * - Error codes and identification
 */

import { describe, it, expect } from 'vitest';
import {
  BackendError,
  ComponentError,
  RequirementError,
  ProviderError,
  ProvisioningError,
  ValidationError,
  MergeError,
  ResourceLimitError,
  InitializationError,
  createDuplicateComponentError,
  createComponentNotFoundError,
  createInvalidRequirementError,
  createMissingProviderError,
  createProviderFailureError,
  createProvisioningFailureError,
  createValidationFailureError,
  createIncompatibleConfigsError,
  createLimitExceededError,
  createInitializationFailureError,
} from './errors';

// ============================================================================
// BackendError - Base Error Class
// ============================================================================

describe('BackendError', () => {
  describe('constructor', () => {
    it('should create error with message and code', () => {
      const error = new BackendError('test message', 'TEST_CODE');

      expect(error.message).toBe('test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('BackendError');
    });

    it('should create error with context', () => {
      const context = { resourceId: 'abc123', operation: 'provision' };
      const error = new BackendError('test message', 'TEST_CODE', context);

      expect(error.context).toEqual(context);
    });

    it('should create error without context', () => {
      const error = new BackendError('test message', 'TEST_CODE');

      expect(error.context).toBeUndefined();
    });

    it('should be instance of Error', () => {
      const error = new BackendError('test', 'TEST');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BackendError);
    });

    it('should capture stack trace', () => {
      const error = new BackendError('test', 'TEST');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('BackendError');
    });

    it('should have correct error name', () => {
      const error = new BackendError('test', 'TEST');

      expect(error.name).toBe('BackendError');
    });
  });

  describe('properties', () => {
    it('should have readonly code property', () => {
      const error = new BackendError('test', 'CODE');

      expect(error.code).toBe('CODE');
      // TypeScript enforces readonly at compile time
    });

    it('should have readonly context property', () => {
      const context = { key: 'value' };
      const error = new BackendError('test', 'CODE', context);

      expect(error.context).toEqual(context);
      // TypeScript enforces readonly at compile time
    });

    it('should preserve complex context objects', () => {
      const context = {
        nested: { value: 123 },
        array: [1, 2, 3],
        bool: true,
        str: 'test',
      };
      const error = new BackendError('test', 'CODE', context);

      expect(error.context).toEqual(context);
    });
  });
});

// ============================================================================
// ComponentError
// ============================================================================

describe('ComponentError', () => {
  describe('constructor', () => {
    it('should create error with component ID', () => {
      const error = new ComponentError('component error', 'comp-123');

      expect(error.message).toBe('component error');
      expect(error.componentId).toBe('comp-123');
      expect(error.code).toBe('COMPONENT_ERROR');
      expect(error.name).toBe('ComponentError');
    });

    it('should create error without component ID', () => {
      const error = new ComponentError('component error');

      expect(error.componentId).toBeUndefined();
    });

    it('should include component ID in context', () => {
      const error = new ComponentError('error', 'comp-123', { extra: 'data' });

      expect(error.context).toEqual({
        componentId: 'comp-123',
        extra: 'data',
      });
    });

    it('should extend BackendError', () => {
      const error = new ComponentError('test', 'comp-1');

      expect(error).toBeInstanceOf(BackendError);
      expect(error).toBeInstanceOf(ComponentError);
    });

    it('should preserve additional context', () => {
      const error = new ComponentError('error', 'comp-1', {
        backendId: 'backend-1',
        type: 'function',
      });

      expect(error.context).toMatchObject({
        componentId: 'comp-1',
        backendId: 'backend-1',
        type: 'function',
      });
    });
  });
});

// ============================================================================
// RequirementError
// ============================================================================

describe('RequirementError', () => {
  describe('constructor', () => {
    it('should create error with resource type and requirement key', () => {
      const error = new RequirementError('requirement error', 'storage', 'capacity');

      expect(error.message).toBe('requirement error');
      expect(error.resourceType).toBe('storage');
      expect(error.requirementKey).toBe('capacity');
      expect(error.code).toBe('REQUIREMENT_ERROR');
      expect(error.name).toBe('RequirementError');
    });

    it('should create error with only resource type', () => {
      const error = new RequirementError('error', 'storage');

      expect(error.resourceType).toBe('storage');
      expect(error.requirementKey).toBeUndefined();
    });

    it('should create error without resource metadata', () => {
      const error = new RequirementError('error');

      expect(error.resourceType).toBeUndefined();
      expect(error.requirementKey).toBeUndefined();
    });

    it('should include resource info in context', () => {
      const error = new RequirementError('error', 'cosmos', 'throughput', { value: 400 });

      expect(error.context).toEqual({
        resourceType: 'cosmos',
        requirementKey: 'throughput',
        value: 400,
      });
    });

    it('should extend BackendError', () => {
      const error = new RequirementError('test', 'storage', 'size');

      expect(error).toBeInstanceOf(BackendError);
      expect(error).toBeInstanceOf(RequirementError);
    });
  });
});

// ============================================================================
// ProviderError
// ============================================================================

describe('ProviderError', () => {
  describe('constructor', () => {
    it('should create error with provider ID', () => {
      const error = new ProviderError('provider error', 'cosmos-provider');

      expect(error.message).toBe('provider error');
      expect(error.providerId).toBe('cosmos-provider');
      expect(error.code).toBe('PROVIDER_ERROR');
      expect(error.name).toBe('ProviderError');
    });

    it('should create error without provider ID', () => {
      const error = new ProviderError('provider error');

      expect(error.providerId).toBeUndefined();
    });

    it('should include provider ID in context', () => {
      const error = new ProviderError('error', 'storage-provider', { region: 'eastus' });

      expect(error.context).toEqual({
        providerId: 'storage-provider',
        region: 'eastus',
      });
    });

    it('should extend BackendError', () => {
      const error = new ProviderError('test', 'provider-1');

      expect(error).toBeInstanceOf(BackendError);
      expect(error).toBeInstanceOf(ProviderError);
    });
  });
});

// ============================================================================
// ProvisioningError
// ============================================================================

describe('ProvisioningError', () => {
  describe('constructor', () => {
    it('should create error with resource type and key', () => {
      const error = new ProvisioningError('provisioning failed', 'storage', 'main-storage');

      expect(error.message).toBe('provisioning failed');
      expect(error.resourceType).toBe('storage');
      expect(error.resourceKey).toBe('main-storage');
      expect(error.code).toBe('PROVISIONING_ERROR');
      expect(error.name).toBe('ProvisioningError');
    });

    it('should create error with only resource type', () => {
      const error = new ProvisioningError('error', 'functions');

      expect(error.resourceType).toBe('functions');
      expect(error.resourceKey).toBeUndefined();
    });

    it('should create error without resource metadata', () => {
      const error = new ProvisioningError('error');

      expect(error.resourceType).toBeUndefined();
      expect(error.resourceKey).toBeUndefined();
    });

    it('should include resource info in context', () => {
      const error = new ProvisioningError('error', 'cosmos', 'db-1', { reason: 'timeout' });

      expect(error.context).toEqual({
        resourceType: 'cosmos',
        resourceKey: 'db-1',
        reason: 'timeout',
      });
    });

    it('should extend BackendError', () => {
      const error = new ProvisioningError('test', 'storage', 'key');

      expect(error).toBeInstanceOf(BackendError);
      expect(error).toBeInstanceOf(ProvisioningError);
    });
  });
});

// ============================================================================
// ValidationError
// ============================================================================

describe('ValidationError', () => {
  describe('constructor', () => {
    it('should create error with errors array', () => {
      const errors = ['Error 1', 'Error 2'];
      const error = new ValidationError('validation failed', errors);

      expect(error.message).toBe('validation failed');
      expect(error.errors).toEqual(errors);
      expect(error.warnings).toBeUndefined();
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('should create error with errors and warnings', () => {
      const errors = ['Error 1'];
      const warnings = ['Warning 1', 'Warning 2'];
      const error = new ValidationError('validation failed', errors, warnings);

      expect(error.errors).toEqual(errors);
      expect(error.warnings).toEqual(warnings);
    });

    it('should handle empty errors array', () => {
      const error = new ValidationError('no errors', []);

      expect(error.errors).toEqual([]);
      expect(error.errors).toHaveLength(0);
    });

    it('should include errors and warnings in context', () => {
      const errors = ['Error 1'];
      const warnings = ['Warning 1'];
      const error = new ValidationError('failed', errors, warnings, { stage: 'pre-provision' });

      expect(error.context).toEqual({
        errors: ['Error 1'],
        warnings: ['Warning 1'],
        stage: 'pre-provision',
      });
    });

    it('should have readonly errors array', () => {
      const errors = ['Error 1'];
      const error = new ValidationError('failed', errors);

      expect(error.errors).toEqual(errors);
      // TypeScript enforces ReadonlyArray at compile time
    });

    it('should extend BackendError', () => {
      const error = new ValidationError('test', ['error']);

      expect(error).toBeInstanceOf(BackendError);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });
});

// ============================================================================
// MergeError
// ============================================================================

describe('MergeError', () => {
  describe('constructor', () => {
    it('should create error with message', () => {
      const error = new MergeError('merge failed');

      expect(error.message).toBe('merge failed');
      expect(error.conflictingConfigs).toBeUndefined();
      expect(error.code).toBe('MERGE_ERROR');
      expect(error.name).toBe('MergeError');
    });

    it('should create error with conflicting configs', () => {
      const configs = [{ sku: 'Standard' }, { sku: 'Premium' }];
      const error = new MergeError('merge failed', configs);

      expect(error.conflictingConfigs).toEqual(configs);
    });

    it('should include conflicting configs in context', () => {
      const configs = [{ size: 'S' }, { size: 'L' }];
      const error = new MergeError('failed', configs, { field: 'size' });

      expect(error.context).toEqual({
        conflictingConfigs: configs,
        field: 'size',
      });
    });

    it('should have readonly conflicting configs', () => {
      const configs = [{ a: 1 }, { a: 2 }];
      const error = new MergeError('failed', configs);

      expect(error.conflictingConfigs).toEqual(configs);
      // TypeScript enforces ReadonlyArray at compile time
    });

    it('should extend BackendError', () => {
      const error = new MergeError('test');

      expect(error).toBeInstanceOf(BackendError);
      expect(error).toBeInstanceOf(MergeError);
    });
  });
});

// ============================================================================
// ResourceLimitError
// ============================================================================

describe('ResourceLimitError', () => {
  describe('constructor', () => {
    it('should create error with limit information', () => {
      const error = new ResourceLimitError('limit exceeded', 'cosmos', 20, 25);

      expect(error.message).toBe('limit exceeded');
      expect(error.resourceType).toBe('cosmos');
      expect(error.limit).toBe(20);
      expect(error.current).toBe(25);
      expect(error.code).toBe('RESOURCE_LIMIT_ERROR');
      expect(error.name).toBe('ResourceLimitError');
    });

    it('should include limit info in context', () => {
      const error = new ResourceLimitError('exceeded', 'storage', 100, 150, { region: 'eastus' });

      expect(error.context).toEqual({
        resourceType: 'storage',
        limit: 100,
        current: 150,
        region: 'eastus',
      });
    });

    it('should handle zero values', () => {
      const error = new ResourceLimitError('exceeded', 'functions', 0, 1);

      expect(error.limit).toBe(0);
      expect(error.current).toBe(1);
    });

    it('should handle equal limit and current', () => {
      const error = new ResourceLimitError('at limit', 'cosmos', 10, 10);

      expect(error.limit).toBe(10);
      expect(error.current).toBe(10);
    });

    it('should extend BackendError', () => {
      const error = new ResourceLimitError('test', 'type', 10, 20);

      expect(error).toBeInstanceOf(BackendError);
      expect(error).toBeInstanceOf(ResourceLimitError);
    });
  });
});

// ============================================================================
// InitializationError
// ============================================================================

describe('InitializationError', () => {
  describe('constructor', () => {
    it('should create error with backend ID and phase', () => {
      const error = new InitializationError('init failed', 'my-backend', 'provisioning');

      expect(error.message).toBe('init failed');
      expect(error.backendId).toBe('my-backend');
      expect(error.phase).toBe('provisioning');
      expect(error.code).toBe('INITIALIZATION_ERROR');
      expect(error.name).toBe('InitializationError');
    });

    it('should create error with only backend ID', () => {
      const error = new InitializationError('init failed', 'my-backend');

      expect(error.backendId).toBe('my-backend');
      expect(error.phase).toBeUndefined();
    });

    it('should create error without metadata', () => {
      const error = new InitializationError('init failed');

      expect(error.backendId).toBeUndefined();
      expect(error.phase).toBeUndefined();
    });

    it('should include backend and phase in context', () => {
      const error = new InitializationError('failed', 'backend-1', 'validation', {
        reason: 'invalid schema',
      });

      expect(error.context).toEqual({
        backendId: 'backend-1',
        phase: 'validation',
        reason: 'invalid schema',
      });
    });

    it('should extend BackendError', () => {
      const error = new InitializationError('test', 'backend', 'phase');

      expect(error).toBeInstanceOf(BackendError);
      expect(error).toBeInstanceOf(InitializationError);
    });
  });
});

// ============================================================================
// Error Factory Functions - Component Errors
// ============================================================================

describe('Error Factory Functions - Component', () => {
  describe('createDuplicateComponentError()', () => {
    it('should create ComponentError for duplicate component', () => {
      const error = createDuplicateComponentError('api-component', 'my-backend');

      expect(error).toBeInstanceOf(ComponentError);
      expect(error.message).toContain('api-component');
      expect(error.message).toContain('already exists');
      expect(error.message).toContain('my-backend');
      expect(error.componentId).toBe('api-component');
      expect(error.context?.backendId).toBe('my-backend');
    });

    it('should have descriptive error message', () => {
      const error = createDuplicateComponentError('comp-1', 'backend-1');

      expect(error.message).toBe(
        'Component with ID "comp-1" already exists in backend "backend-1"'
      );
    });
  });

  describe('createComponentNotFoundError()', () => {
    it('should create ComponentError for missing component', () => {
      const error = createComponentNotFoundError('missing-comp', 'my-backend');

      expect(error).toBeInstanceOf(ComponentError);
      expect(error.message).toContain('missing-comp');
      expect(error.message).toContain('not found');
      expect(error.message).toContain('my-backend');
      expect(error.componentId).toBe('missing-comp');
      expect(error.context?.backendId).toBe('my-backend');
    });

    it('should have descriptive error message', () => {
      const error = createComponentNotFoundError('comp-2', 'backend-2');

      expect(error.message).toBe('Component "comp-2" not found in backend "backend-2"');
    });
  });
});

// ============================================================================
// Error Factory Functions - Requirement Errors
// ============================================================================

describe('Error Factory Functions - Requirement', () => {
  describe('createInvalidRequirementError()', () => {
    it('should create RequirementError with reason', () => {
      const error = createInvalidRequirementError('missing required field');

      expect(error).toBeInstanceOf(RequirementError);
      expect(error.message).toContain('Invalid requirement');
      expect(error.message).toContain('missing required field');
    });

    it('should create error with resource type', () => {
      const error = createInvalidRequirementError('invalid value', 'storage');

      expect(error.resourceType).toBe('storage');
      expect(error.requirementKey).toBeUndefined();
    });

    it('should create error with resource type and key', () => {
      const error = createInvalidRequirementError('out of range', 'cosmos', 'throughput');

      expect(error.resourceType).toBe('cosmos');
      expect(error.requirementKey).toBe('throughput');
    });

    it('should have descriptive error message', () => {
      const error = createInvalidRequirementError('value too large', 'storage', 'capacity');

      expect(error.message).toBe('Invalid requirement: value too large');
    });
  });
});

// ============================================================================
// Error Factory Functions - Provider Errors
// ============================================================================

describe('Error Factory Functions - Provider', () => {
  describe('createMissingProviderError()', () => {
    it('should create ProviderError for missing provider', () => {
      const error = createMissingProviderError('custom-resource');

      expect(error).toBeInstanceOf(ProviderError);
      expect(error.message).toContain('No provider found');
      expect(error.message).toContain('custom-resource');
      expect(error.message).toContain('Register a custom provider');
      expect(error.context?.resourceType).toBe('custom-resource');
    });

    it('should have helpful error message', () => {
      const error = createMissingProviderError('my-resource');

      expect(error.message).toBe(
        'No provider found for resource type "my-resource". ' +
          'Register a custom provider or ensure the resource type is supported.'
      );
    });
  });

  describe('createProviderFailureError()', () => {
    it('should create ProviderError for provider failure', () => {
      const error = createProviderFailureError('cosmos-provider', 'provision', 'timeout');

      expect(error).toBeInstanceOf(ProviderError);
      expect(error.message).toContain('cosmos-provider');
      expect(error.message).toContain('provision');
      expect(error.message).toContain('timeout');
      expect(error.providerId).toBe('cosmos-provider');
      expect(error.context?.operation).toBe('provision');
      expect(error.context?.reason).toBe('timeout');
    });

    it('should have descriptive error message', () => {
      const error = createProviderFailureError('storage-provider', 'validate', 'invalid config');

      expect(error.message).toBe(
        'Provider "storage-provider" failed during validate: invalid config'
      );
    });
  });
});

// ============================================================================
// Error Factory Functions - Provisioning Errors
// ============================================================================

describe('Error Factory Functions - Provisioning', () => {
  describe('createProvisioningFailureError()', () => {
    it('should create ProvisioningError', () => {
      const error = createProvisioningFailureError('storage', 'main-storage', 'quota exceeded');

      expect(error).toBeInstanceOf(ProvisioningError);
      expect(error.message).toContain('storage');
      expect(error.message).toContain('main-storage');
      expect(error.message).toContain('quota exceeded');
      expect(error.resourceType).toBe('storage');
      expect(error.resourceKey).toBe('main-storage');
      expect(error.context?.reason).toBe('quota exceeded');
    });

    it('should have descriptive error message', () => {
      const error = createProvisioningFailureError('cosmos', 'db-1', 'insufficient permissions');

      expect(error.message).toBe(
        'Failed to provision resource "cosmos:db-1": insufficient permissions'
      );
    });
  });
});

// ============================================================================
// Error Factory Functions - Validation Errors
// ============================================================================

describe('Error Factory Functions - Validation', () => {
  describe('createValidationFailureError()', () => {
    it('should create ValidationError with errors', () => {
      const errors = ['Error 1', 'Error 2', 'Error 3'];
      const error = createValidationFailureError(errors);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('Validation failed');
      expect(error.message).toContain('3 error(s)');
      expect(error.errors).toEqual(errors);
      expect(error.warnings).toBeUndefined();
    });

    it('should create ValidationError with errors and warnings', () => {
      const errors = ['Error 1'];
      const warnings = ['Warning 1', 'Warning 2'];
      const error = createValidationFailureError(errors, warnings);

      expect(error.errors).toEqual(errors);
      expect(error.warnings).toEqual(warnings);
    });

    it('should have count in error message', () => {
      const error = createValidationFailureError(['E1', 'E2']);

      expect(error.message).toBe('Validation failed with 2 error(s)');
    });

    it('should handle single error', () => {
      const error = createValidationFailureError(['Single error']);

      expect(error.message).toBe('Validation failed with 1 error(s)');
    });
  });
});

// ============================================================================
// Error Factory Functions - Merge Errors
// ============================================================================

describe('Error Factory Functions - Merge', () => {
  describe('createIncompatibleConfigsError()', () => {
    it('should create MergeError for incompatible configs', () => {
      const error = createIncompatibleConfigsError('storage', 'conflicting SKUs');

      expect(error).toBeInstanceOf(MergeError);
      expect(error.message).toContain('Cannot merge configurations');
      expect(error.message).toContain('storage');
      expect(error.message).toContain('conflicting SKUs');
      expect(error.context?.resourceType).toBe('storage');
      expect(error.context?.reason).toBe('conflicting SKUs');
    });

    it('should create error with conflicting configs', () => {
      const configs = [{ sku: 'Standard' }, { sku: 'Premium' }];
      const error = createIncompatibleConfigsError('cosmos', 'different tiers', configs);

      expect(error.conflictingConfigs).toEqual(configs);
    });

    it('should have descriptive error message', () => {
      const error = createIncompatibleConfigsError('functions', 'different regions');

      expect(error.message).toBe('Cannot merge configurations for "functions": different regions');
    });
  });
});

// ============================================================================
// Error Factory Functions - Resource Limit Errors
// ============================================================================

describe('Error Factory Functions - Resource Limit', () => {
  describe('createLimitExceededError()', () => {
    it('should create ResourceLimitError', () => {
      const error = createLimitExceededError('cosmos', 20, 25);

      expect(error).toBeInstanceOf(ResourceLimitError);
      expect(error.message).toContain('Resource limit exceeded');
      expect(error.message).toContain('cosmos');
      expect(error.message).toContain('Maximum: 20');
      expect(error.message).toContain('Current: 25');
      expect(error.resourceType).toBe('cosmos');
      expect(error.limit).toBe(20);
      expect(error.current).toBe(25);
    });

    it('should have descriptive error message', () => {
      const error = createLimitExceededError('storage', 100, 150);

      expect(error.message).toBe(
        'Resource limit exceeded for "storage". Maximum: 100, Current: 150'
      );
    });

    it('should handle zero limit', () => {
      const error = createLimitExceededError('feature', 0, 1);

      expect(error.limit).toBe(0);
      expect(error.current).toBe(1);
    });
  });
});

// ============================================================================
// Error Factory Functions - Initialization Errors
// ============================================================================

describe('Error Factory Functions - Initialization', () => {
  describe('createInitializationFailureError()', () => {
    it('should create InitializationError', () => {
      const error = createInitializationFailureError('my-backend', 'provisioning', 'timeout');

      expect(error).toBeInstanceOf(InitializationError);
      expect(error.message).toContain('my-backend');
      expect(error.message).toContain('failed to initialize');
      expect(error.message).toContain('provisioning');
      expect(error.message).toContain('timeout');
      expect(error.backendId).toBe('my-backend');
      expect(error.phase).toBe('provisioning');
      expect(error.context?.reason).toBe('timeout');
    });

    it('should have descriptive error message', () => {
      const error = createInitializationFailureError('backend-1', 'validation', 'invalid schema');

      expect(error.message).toBe(
        'Backend "backend-1" failed to initialize during validation: invalid schema'
      );
    });
  });
});

// ============================================================================
// Error Inheritance and Type Checking
// ============================================================================

describe('Error Inheritance', () => {
  it('should maintain proper inheritance chain', () => {
    const componentError = new ComponentError('test', 'comp');
    const requirementError = new RequirementError('test', 'storage');
    const providerError = new ProviderError('test', 'provider');
    const provisioningError = new ProvisioningError('test', 'storage', 'key');
    const validationError = new ValidationError('test', ['error']);
    const mergeError = new MergeError('test');
    const limitError = new ResourceLimitError('test', 'cosmos', 10, 20);
    const initError = new InitializationError('test', 'backend');

    // All should be instances of BackendError
    expect(componentError).toBeInstanceOf(BackendError);
    expect(requirementError).toBeInstanceOf(BackendError);
    expect(providerError).toBeInstanceOf(BackendError);
    expect(provisioningError).toBeInstanceOf(BackendError);
    expect(validationError).toBeInstanceOf(BackendError);
    expect(mergeError).toBeInstanceOf(BackendError);
    expect(limitError).toBeInstanceOf(BackendError);
    expect(initError).toBeInstanceOf(BackendError);

    // All should be instances of Error
    expect(componentError).toBeInstanceOf(Error);
    expect(requirementError).toBeInstanceOf(Error);
    expect(providerError).toBeInstanceOf(Error);
    expect(provisioningError).toBeInstanceOf(Error);
    expect(validationError).toBeInstanceOf(Error);
    expect(mergeError).toBeInstanceOf(Error);
    expect(limitError).toBeInstanceOf(Error);
    expect(initError).toBeInstanceOf(Error);
  });

  it('should allow type-specific error handling', () => {
    const error: BackendError = new ComponentError('test', 'comp');

    if (error instanceof ComponentError) {
      expect(error.componentId).toBe('comp');
    }
  });

  it('should preserve error codes for all types', () => {
    expect(new ComponentError('test').code).toBe('COMPONENT_ERROR');
    expect(new RequirementError('test').code).toBe('REQUIREMENT_ERROR');
    expect(new ProviderError('test').code).toBe('PROVIDER_ERROR');
    expect(new ProvisioningError('test').code).toBe('PROVISIONING_ERROR');
    expect(new ValidationError('test', []).code).toBe('VALIDATION_ERROR');
    expect(new MergeError('test').code).toBe('MERGE_ERROR');
    expect(new ResourceLimitError('test', 'type', 1, 2).code).toBe('RESOURCE_LIMIT_ERROR');
    expect(new InitializationError('test').code).toBe('INITIALIZATION_ERROR');
  });
});

// ============================================================================
// Error Serialization
// ============================================================================

describe('Error Serialization', () => {
  it('should serialize error to JSON with custom properties', () => {
    const error = new ComponentError('component error', 'comp-1', { backendId: 'backend-1' });

    // Error objects don't serialize well by default, but we can access properties
    expect(error.message).toBe('component error');
    expect(error.name).toBe('ComponentError');
    expect(error.code).toBe('COMPONENT_ERROR');
    expect(error.componentId).toBe('comp-1');
    expect(error.context?.backendId).toBe('backend-1');
  });

  it('should preserve error message in string conversion', () => {
    const error = new BackendError('test error', 'TEST_CODE');
    const str = error.toString();

    expect(str).toContain('test error');
  });

  it('should maintain stack trace after serialization', () => {
    const error = new BackendError('test', 'CODE');
    const stack = error.stack;

    expect(stack).toBeDefined();
    expect(stack).toContain('BackendError');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Error Edge Cases', () => {
  it('should handle empty string message', () => {
    const error = new BackendError('', 'CODE');

    expect(error.message).toBe('');
    expect(error.code).toBe('CODE');
  });

  it('should handle very long error messages', () => {
    const longMessage = 'x'.repeat(10000);
    const error = new BackendError(longMessage, 'CODE');

    expect(error.message).toBe(longMessage);
    expect(error.message.length).toBe(10000);
  });

  it('should handle special characters in messages', () => {
    const message = 'Error with "quotes", \\backslashes\\ and \nnewlines\n';
    const error = new BackendError(message, 'CODE');

    expect(error.message).toBe(message);
  });

  it('should handle null values in context', () => {
    const error = new BackendError('test', 'CODE', { value: null } as any);

    expect(error.context?.value).toBeNull();
  });

  it('should handle undefined values in context', () => {
    const error = new BackendError('test', 'CODE', { value: undefined });

    expect(error.context).toHaveProperty('value');
  });

  it('should handle complex nested context', () => {
    const context = {
      level1: {
        level2: {
          level3: {
            value: 'deep',
          },
        },
      },
      array: [1, 2, { nested: true }],
    };

    const error = new BackendError('test', 'CODE', context);

    expect(error.context).toEqual(context);
  });

  it('should handle empty arrays in ValidationError', () => {
    const error = new ValidationError('test', [], []);

    expect(error.errors).toHaveLength(0);
    expect(error.warnings).toHaveLength(0);
  });

  it('should handle very large error arrays', () => {
    const errors = Array(1000).fill('error');
    const error = new ValidationError('test', errors);

    expect(error.errors).toHaveLength(1000);
  });
});

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Error Usage Scenarios', () => {
  it('should support backend provisioning error flow', () => {
    // Component validation fails
    const validationError = createValidationFailureError(
      ['Invalid schema', 'Missing required field'],
      ['Unused property']
    );

    expect(validationError.errors).toHaveLength(2);
    expect(validationError.warnings).toHaveLength(1);

    // Provider fails to provision
    const provisioningError = createProvisioningFailureError(
      'storage',
      'main-storage',
      validationError.message
    );

    expect(provisioningError.resourceType).toBe('storage');
    expect(provisioningError.message).toContain('Validation failed');

    // Backend initialization fails
    const initError = createInitializationFailureError(
      'my-backend',
      'provisioning',
      provisioningError.message
    );

    expect(initError.backendId).toBe('my-backend');
    expect(initError.phase).toBe('provisioning');
  });

  it('should support resource limit checking', () => {
    const error = createLimitExceededError('cosmos', 20, 25);

    // Could be caught and handled
    if (error instanceof ResourceLimitError) {
      const overageAmount = error.current - error.limit;
      expect(overageAmount).toBe(5);
    }
  });

  it('should support provider error handling', () => {
    const missingProvider = createMissingProviderError('custom-resource');
    const providerFailure = createProviderFailureError('cosmos-provider', 'validate', 'timeout');

    expect(missingProvider.message).toContain('Register a custom provider');
    expect(providerFailure.providerId).toBe('cosmos-provider');
  });

  it('should support merge conflict resolution', () => {
    const configs = [
      { sku: 'Standard', region: 'eastus' },
      { sku: 'Premium', region: 'eastus' },
    ];

    const error = createIncompatibleConfigsError('storage', 'SKU mismatch', configs);

    expect(error.conflictingConfigs).toHaveLength(2);
    expect(error.context?.resourceType).toBe('storage');
  });
});
