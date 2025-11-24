/**
 * Backend Synthesizer Integration Tests
 *
 * Tests the integration of DataSynthesizer into BackendSynthesizer.
 *
 * @module @atakora/component/synthesis/__tests__/backend-synthesizer-integration
 */

import { describe, it, expect } from 'vitest';
import { BackendSynthesizer } from '../backend-synthesizer';
import { defineBackend } from '../../backend/define-backend';
import { defineSchema, a, c } from '../../schema';

// ============================================================================
// Integration Tests
// ============================================================================

describe('BackendSynthesizer - DataSynthesizer Integration', () => {
  it('should synthesize backend with Cosmos DB resources', async () => {
    // Define a simple schema with CRUD models
    const schema = defineSchema({
      schema: {
        User: c.model({
          id: a.id(),
          email: a.string(),
          name: a.string(),
        }),
        Product: c.model({
          id: a.id(),
          name: a.string(),
          price: a.number(),
        }),
      },
    });

    // Define backend with schema
    const backend = defineBackend({
      schema,
      settings: {
        name: 'test-integration',
        organization: 'testorg',
        region: 'eastus',
        resourceGroup: 'test-integration-rg',
        instance: '01',
      },
    });

    // Create synthesizer and synthesize
    const synthesizer = new BackendSynthesizer();
    const result = await synthesizer.synthesize(backend, {
      outputDir: undefined, // Don't write files
    });

    // Verify synthesis result structure
    expect(result).toBeDefined();
    expect(result.armTemplate).toBeDefined();
    expect(result.metadata).toBeDefined();

    // Verify ARM template has resources
    expect(result.armTemplate.resources).toBeDefined();
    expect(Array.isArray(result.armTemplate.resources)).toBe(true);

    // Should have Cosmos DB resources (account, database, containers)
    const cosmosResources = result.armTemplate.resources.filter((r: any) =>
      r.type?.startsWith('Microsoft.DocumentDB/')
    );

    expect(cosmosResources.length).toBeGreaterThan(0);
  });

  it('should create containers for CRUD models', async () => {
    const schema = defineSchema({
      schema: {
        User: c.model({
          id: a.id(),
          email: a.string(),
          name: a.string(),
        }),
        Category: c.model({
          id: a.id(),
          name: a.string(),
        }),
      },
    });

    const backend = defineBackend({
      schema,
      settings: {
        name: 'test-containers',
        organization: 'testorg',
        region: 'eastus',
      },
    });

    const synthesizer = new BackendSynthesizer();
    const result = await synthesizer.synthesize(backend);

    // Should have container resources
    const containerResources = result.armTemplate.resources.filter((r: any) =>
      r.type === 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers'
    );

    // Should have 2 containers (users, categories)
    expect(containerResources.length).toBeGreaterThanOrEqual(2);
  });

  it('should set serverless mode for development environment', async () => {
    const schema = defineSchema({
      schema: {
        User: c.model({
          id: a.id(),
          email: a.string(),
        }),
      },
    });

    const backend = defineBackend({
      schema,
      settings: {
        name: 'dev-app',
        organization: 'testorg',
        region: 'eastus',
      },
      environment: 'development',
    });

    const synthesizer = new BackendSynthesizer();
    const result = await synthesizer.synthesize(backend);

    const cosmosAccount = result.armTemplate.resources.find((r: any) =>
      r.type === 'Microsoft.DocumentDB/databaseAccounts'
    );

    expect(cosmosAccount).toBeDefined();
    // Serverless accounts have EnableServerless capability
    expect(cosmosAccount.properties?.capabilities).toBeDefined();

    const hasServerless = cosmosAccount.properties.capabilities.some(
      (c: any) => c.name === 'EnableServerless'
    );

    expect(hasServerless).toBe(true);
  });

  it('should set provisioned mode for production environment', async () => {
    const schema = defineSchema({
      schema: {
        User: c.model({
          id: a.id(),
          email: a.string(),
        }),
      },
    });

    const backend = defineBackend({
      schema,
      settings: {
        name: 'prod-app',
        organization: 'testorg',
        region: 'eastus',
      },
      environment: 'production',
    });

    const synthesizer = new BackendSynthesizer();
    const result = await synthesizer.synthesize(backend);

    const cosmosDatabase = result.armTemplate.resources.find((r: any) =>
      r.type === 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases'
    );

    expect(cosmosDatabase).toBeDefined();
    // Production should have throughput configured
    expect(cosmosDatabase.properties?.options).toBeDefined();
  });

  it('should handle custom Cosmos configuration', async () => {
    const schema = defineSchema({
      schema: {
        User: c.model({
          id: a.id(),
          email: a.string(),
        }),
      },
    });

    const backend = defineBackend({
      schema,
      settings: {
        name: 'custom-app',
        organization: 'testorg',
        region: 'eastus',
        data: {
          accountName: 'custom-cosmos-account',
          databaseName: 'custom-db',
          consistencyLevel: 'Strong',
        },
      },
    });

    const synthesizer = new BackendSynthesizer();
    const result = await synthesizer.synthesize(backend);

    const cosmosAccount = result.armTemplate.resources.find((r: any) =>
      r.type === 'Microsoft.DocumentDB/databaseAccounts'
    );

    const cosmosDatabase = result.armTemplate.resources.find((r: any) =>
      r.type === 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases'
    );

    expect(cosmosAccount?.name).toContain('custom-cosmos-account');
    expect(cosmosDatabase?.name).toContain('custom-db');
    expect(cosmosAccount?.properties?.consistencyPolicy?.defaultConsistencyLevel).toBe('Strong');
  });
});
