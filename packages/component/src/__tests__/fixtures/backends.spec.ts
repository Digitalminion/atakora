/**
 * Test Fixtures Validation
 *
 * @remarks
 * Validates that all test fixtures are working correctly.
 * This ensures the fixtures themselves are reliable for other tests.
 */

import { describe, it, expect } from 'vitest';
import {
  createMinimalBackend,
  createStandardBackend,
  createComplexBackend,
  createProductionBackend,
  createGovernmentBackend,
  createCustomBackend,
  minimalSchema,
  standardSchema,
  complexSchema,
  productionSchema,
  governmentSchema,
  basicAuth,
  multiProviderAuth,
  productionAuth,
  governmentAuth,
} from './backends';

// ============================================================================
// Schema Fixture Tests
// ============================================================================

describe('Schema Fixtures', () => {
  it('should create minimal schema with 1 model', () => {
    expect(minimalSchema).toBeDefined();
    expect(minimalSchema.models).toBeDefined();
    expect(Object.keys(minimalSchema.models)).toHaveLength(1);
    expect(minimalSchema.models.User).toBeDefined();
  });

  it('should create standard schema with 4 models', () => {
    expect(standardSchema).toBeDefined();
    expect(Object.keys(standardSchema.models)).toHaveLength(4);
    expect(standardSchema.models.User).toBeDefined();
    expect(standardSchema.models.Post).toBeDefined();
    expect(standardSchema.models.UserRegistered).toBeDefined();
    expect(standardSchema.models.PostPublished).toBeDefined();
  });

  it('should create complex schema with 10 models', () => {
    expect(complexSchema).toBeDefined();
    expect(Object.keys(complexSchema.models)).toHaveLength(10);
  });

  it('should create production schema with 14 models', () => {
    expect(productionSchema).toBeDefined();
    const modelCount = Object.keys(productionSchema.models).length;
    expect(modelCount).toBe(14);
  });

  it('should create government schema with compliance features', () => {
    expect(governmentSchema).toBeDefined();
    expect(governmentSchema.models.Agency).toBeDefined();
    expect(governmentSchema.models.Document).toBeDefined();
    expect(governmentSchema.models.SecurityEvent).toBeDefined();
    expect(governmentSchema.models.ComplianceCheck).toBeDefined();
  });
});

// ============================================================================
// Authentication Fixture Tests
// ============================================================================

describe('Authentication Fixtures', () => {
  it('should create basic Entra ID authentication', () => {
    expect(basicAuth).toBeDefined();
    expect(basicAuth.providers.Entra).toBeDefined();
  });

  it('should create multi-provider authentication', () => {
    expect(multiProviderAuth).toBeDefined();
    expect(multiProviderAuth.providers.Primary).toBeDefined();
    expect(multiProviderAuth.providers.Secondary).toBeDefined();
  });

  it('should create production authentication', () => {
    expect(productionAuth).toBeDefined();
    expect(productionAuth.providers.Primary).toBeDefined();
  });

  it('should create government authentication', () => {
    expect(governmentAuth).toBeDefined();
    expect(governmentAuth.providers.Primary).toBeDefined();
  });
});

// ============================================================================
// Backend Fixture Tests
// ============================================================================

describe('Backend Fixtures', () => {
  describe('Minimal Backend', () => {
    it('should create minimal backend successfully', () => {
      const backend = createMinimalBackend();

      expect(backend).toBeDefined();
      expect(backend.settings.name).toBe('minimal-test-app');
      expect(backend.environment).toBe('development');
    });

    it('should have no authentication', () => {
      const backend = createMinimalBackend();

      expect(backend.authentication).toBeUndefined();
      expect(backend._metadata.hasAuthentication).toBe(false);
    });

    it('should have 1 model', () => {
      const backend = createMinimalBackend();

      expect(backend._metadata.modelCount).toBe(1);
      expect(Object.keys(backend.schema.models)).toHaveLength(1);
    });

    it('should have no optional features enabled', () => {
      const backend = createMinimalBackend();

      expect(backend.settings.features.monitoring).toBe(false);
      expect(backend.settings.features.networking).toBe(false);
      expect(backend.settings.features.performance).toBe(false);
    });
  });

  describe('Standard Backend', () => {
    it('should create standard backend successfully', () => {
      const backend = createStandardBackend();

      expect(backend).toBeDefined();
      expect(backend.settings.name).toBe('standard-test-app');
      expect(backend.environment).toBe('development');
    });

    it('should have basic authentication', () => {
      const backend = createStandardBackend();

      expect(backend.authentication).toBeDefined();
      expect(backend._metadata.hasAuthentication).toBe(true);
    });

    it('should have 4 models', () => {
      const backend = createStandardBackend();

      expect(backend._metadata.modelCount).toBe(4);
    });

    it('should have custom tags', () => {
      const backend = createStandardBackend();

      expect(backend.settings.tags.team).toBe('test');
      expect(backend.settings.tags.purpose).toBe('integration-testing');
    });
  });

  describe('Complex Backend', () => {
    it('should create complex backend successfully', () => {
      const backend = createComplexBackend();

      expect(backend).toBeDefined();
      expect(backend.settings.name).toBe('complex-test-app');
      expect(backend.environment).toBe('staging');
    });

    it('should have multi-provider authentication', () => {
      const backend = createComplexBackend();

      expect(backend.authentication).toBeDefined();
      expect(backend.authentication!.providers.Primary).toBeDefined();
      expect(backend.authentication!.providers.Secondary).toBeDefined();
    });

    it('should have 10 models (4 CRUD + 3 Event + 3 Function)', () => {
      const backend = createComplexBackend();

      expect(backend._metadata.modelCount).toBe(10);
    });

    it('should have monitoring and networking enabled', () => {
      const backend = createComplexBackend();

      expect(backend.settings.features.monitoring).toBe(true);
      expect(backend.settings.features.networking).toBe(true);
      expect(backend.settings.features.performance).toBe(false);
    });
  });

  describe('Production Backend', () => {
    it('should create production backend successfully', () => {
      const backend = createProductionBackend();

      expect(backend).toBeDefined();
      expect(backend.settings.name).toBe('production-test-app');
      expect(backend.environment).toBe('production');
    });

    it('should have full authentication', () => {
      const backend = createProductionBackend();

      expect(backend.authentication).toBeDefined();
      expect(backend.authentication!.providers.Primary).toBeDefined();
    });

    it('should have 14 models', () => {
      const backend = createProductionBackend();

      expect(backend._metadata.modelCount).toBe(14);
    });

    it('should have all features enabled', () => {
      const backend = createProductionBackend();

      expect(backend.settings.features.monitoring).toBe(true);
      expect(backend.settings.features.networking).toBe(true);
      expect(backend.settings.features.performance).toBe(true);
    });

    it('should have monitoring attachment points', () => {
      const backend = createProductionBackend();

      expect(backend.monitoring).toBeDefined();
      expect(backend.monitoring!.appInsights).toBeDefined();
      expect(backend.monitoring!.logAnalytics).toBeDefined();
    });

    it('should have network attachment points', () => {
      const backend = createProductionBackend();

      expect(backend.network).toBeDefined();
      expect(backend.network!.vnet).toBeDefined();
      expect(backend.network!.firewall).toBeDefined();
    });

    it('should have performance attachment points', () => {
      const backend = createProductionBackend();

      expect(backend.performance).toBeDefined();
      expect(backend.performance!.cdn).toBeDefined();
      expect(backend.performance!.cache).toBeDefined();
    });
  });

  describe('Government Backend', () => {
    it('should create government backend successfully', () => {
      const backend = createGovernmentBackend();

      expect(backend).toBeDefined();
      expect(backend.settings.name).toBe('gov-test-app');
      expect(backend.environment).toBe('production');
    });

    it('should have government authentication', () => {
      const backend = createGovernmentBackend();

      expect(backend.authentication).toBeDefined();
      expect(backend.authentication!.providers.Primary).toBeDefined();
    });

    it('should have government region', () => {
      const backend = createGovernmentBackend();

      expect(backend.settings.region).toBe('usgov-virginia');
    });

    it('should have compliance tags', () => {
      const backend = createGovernmentBackend();

      expect(backend.settings.tags.cloud).toBe('government');
      expect(backend.settings.tags.classification).toBe('sensitive');
    });
  });

  describe('Custom Backend Builder', () => {
    it('should create custom backend with minimal options', () => {
      const backend = createCustomBackend({
        name: 'custom-test',
        schema: minimalSchema,
      });

      expect(backend).toBeDefined();
      expect(backend.settings.name).toBe('custom-test');
      expect(backend.environment).toBe('development');
    });

    it('should create custom backend with all options', () => {
      const backend = createCustomBackend({
        name: 'custom-full',
        schema: standardSchema,
        authentication: basicAuth,
        environment: 'staging',
        region: 'westus',
        features: {
          monitoring: true,
          networking: false,
          performance: true,
        },
        tags: {
          custom: 'value',
        },
      });

      expect(backend.settings.name).toBe('custom-full');
      expect(backend.environment).toBe('staging');
      expect(backend.settings.region).toBe('westus');
      expect(backend.settings.features.monitoring).toBe(true);
      expect(backend.settings.features.networking).toBe(false);
      expect(backend.settings.features.performance).toBe(true);
      expect(backend.settings.tags.custom).toBe('value');
    });
  });
});

// ============================================================================
// Backend Structure Validation
// ============================================================================

describe('Backend Structure Validation', () => {
  it('should have valid attachment points structure', () => {
    const backend = createMinimalBackend();

    // Storage
    expect(backend.storage).toBeDefined();
    expect(backend.storage.account).toBeDefined();
    expect(backend.storage.database).toBeDefined();
    expect(backend.storage.blobs).toBeDefined();

    // Compute
    expect(backend.compute).toBeDefined();
    expect(backend.compute.functionApp).toBeDefined();
  });

  it('should have valid metadata structure', () => {
    const backend = createMinimalBackend();

    expect(backend._metadata).toBeDefined();
    expect(backend._metadata.version).toBeTruthy();
    expect(backend._metadata.createdAt).toBeInstanceOf(Date);
    expect(backend._metadata.environment).toBe('development');
    expect(backend._metadata.modelCount).toBe(1);
    expect(backend._metadata.hasAuthentication).toBe(false);
    expect(backend._metadata.enabledFeatures).toBeInstanceOf(Array);
  });

  it('should have valid settings structure', () => {
    const backend = createMinimalBackend();

    expect(backend.settings).toBeDefined();
    expect(backend.settings.name).toBeTruthy();
    expect(backend.settings.region).toBeTruthy();
    expect(backend.settings.resourceGroup).toBeTruthy();
    expect(backend.settings.tags).toBeDefined();
    expect(backend.settings.features).toBeDefined();
  });
});

// ============================================================================
// Performance Validation
// ============================================================================

describe('Fixture Creation Performance', () => {
  it('should create minimal backend quickly', () => {
    const start = performance.now();
    createMinimalBackend();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50); // Should be < 50ms
  });

  it('should create standard backend quickly', () => {
    const start = performance.now();
    createStandardBackend();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // Should be < 100ms
  });

  it('should create complex backend quickly', () => {
    const start = performance.now();
    createComplexBackend();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(150); // Should be < 150ms
  });

  it('should create production backend in reasonable time', () => {
    const start = performance.now();
    createProductionBackend();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(200); // Should be < 200ms
  });
});
