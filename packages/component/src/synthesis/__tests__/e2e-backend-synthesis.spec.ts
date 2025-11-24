/**
 * End-to-End Backend Synthesis Integration Tests
 *
 * Tests the complete flow from backend definition to ARM template synthesis.
 * Validates the integration between component package and lib package synthesis.
 *
 * @module @atakora/component/synthesis/__tests__/e2e-backend-synthesis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BackendAdapter } from '../backend-adapter';
import { defineBackend } from '../../backend';
import { defineSchema, a, c, e, f } from '../../schema';
import { defineAuth, auth } from '../../auth';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('End-to-End Backend Synthesis', () => {
  let testOutputDir: string;

  beforeEach(() => {
    // Create temporary output directory for each test
    testOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-synthesis-'));
  });

  afterEach(() => {
    // Clean up test output directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('BackendAdapter', () => {
    it('should synthesize minimal backend with CRUD model', async () => {
      // Arrange: Create minimal backend with single CRUD model
      const backend = defineBackend({
        schema: defineSchema({
          schema: a.schema({
            User: c.model({
              id: a.id(),
              email: a.string().required().email(),
              name: a.string().required(),
            }),
          }),
        }),
        settings: {
          name: 'minimal-backend',
        },
      });

      const adapter = new BackendAdapter();

      // Act: Synthesize backend to ARM templates
      const assembly = await adapter.synthesize(backend, {
        outdir: testOutputDir,
        skipValidation: false,
        prettyPrint: true,
      });

      // Assert: Verify assembly structure
      expect(assembly).toBeDefined();
      expect(assembly.version).toBe('2.0.0');
      expect(assembly.directory).toBe(testOutputDir);
      expect(Object.keys(assembly.stacks)).toHaveLength(1);

      const stackName = Object.keys(assembly.stacks)[0];
      const manifest = assembly.stacks[stackName];

      expect(manifest.name).toBe('minimal-backend');
      expect(manifest.resourceCount).toBeGreaterThan(0);
      expect(manifest.templatePath).toBe('minimal-backend.json');

      // Assert: Verify files were created
      const templatePath = path.join(testOutputDir, 'minimal-backend.json');
      expect(fs.existsSync(templatePath)).toBe(true);

      const manifestPath = path.join(testOutputDir, 'manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const metadataPath = path.join(testOutputDir, 'minimal-backend.metadata.json');
      expect(fs.existsSync(metadataPath)).toBe(true);

      const parametersPath = path.join(testOutputDir, 'minimal-backend.parameters.json');
      expect(fs.existsSync(parametersPath)).toBe(true);

      // Assert: Verify ARM template structure
      const templateContent = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
      expect(templateContent.$schema).toBeDefined();
      expect(templateContent.contentVersion).toBe('1.0.0.0');
      expect(templateContent.resources).toBeDefined();
      expect(Array.isArray(templateContent.resources)).toBe(true);
      expect(templateContent.resources.length).toBeGreaterThan(0);

      // Assert: Verify Cosmos DB resources exist
      const cosmosResources = templateContent.resources.filter((r: any) =>
        r.type.includes('Microsoft.DocumentDB')
      );
      expect(cosmosResources.length).toBeGreaterThan(0);

      // Assert: Verify metadata contains backend info
      const metadataContent = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      expect(metadataContent.environment).toBeDefined();
      expect(metadataContent.cloudType).toBeDefined();
      expect(metadataContent.resourceCount).toBeGreaterThan(0);
      expect(metadataContent.modelCounts.crud).toBe(1);
    });

    it('should synthesize standard backend with CRUD and Events', async () => {
      // Arrange: Create backend with CRUD models and events
      const backend = defineBackend({
        schema: defineSchema({
          schema: a.schema({
            // CRUD Models
            User: c.model({
              id: a.id(),
              email: a.string().required().email(),
              name: a.string().required(),
              role: a.enum(['admin', 'user']).default('user'),
            }),

            Post: c.model({
              id: a.id(),
              title: a.string().required(),
              content: a.string().required(),
              authorId: a.string().required(),
            }),

            // Event Models
            UserRegistered: e.model({
              userId: a.string().required(),
              email: a.string().required().email(),
              registeredAt: a.datetime().required(),
            }),
          }),
        }),
        settings: {
          name: 'standard-backend',
        },
      });

      const adapter = new BackendAdapter();

      // Act: Synthesize
      const assembly = await adapter.synthesize(backend, {
        outdir: testOutputDir,
      });

      // Assert: Verify assembly
      expect(assembly).toBeDefined();
      const stackName = Object.keys(assembly.stacks)[0];
      const manifest = assembly.stacks[stackName];

      expect(manifest.name).toBe('standard-backend');
      expect(manifest.resourceCount).toBeGreaterThan(0);

      // Assert: Verify template
      const templatePath = path.join(testOutputDir, `${stackName}.json`);
      const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

      // Should have resources for both CRUD models
      const cosmosContainers = template.resources.filter((r: any) =>
        r.type === 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers'
      );
      expect(cosmosContainers.length).toBeGreaterThanOrEqual(2);

      // Assert: Verify metadata
      const metadataPath = path.join(testOutputDir, `${stackName}.metadata.json`);
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      expect(metadata.modelCounts.crud).toBeGreaterThanOrEqual(2); // May include internal models
      expect(metadata.modelCounts.event).toBeGreaterThanOrEqual(1);
    });

    it.skip('should synthesize backend with authentication', async () => {
      // Arrange: Create backend with authentication
      const backend = defineBackend({
        schema: defineSchema({
          schema: a.schema({
            User: c.model({
              id: a.id(),
              email: a.string().required().email(),
            }),
          }),
        }),
        authentication: defineAuth({
          Entra: auth.entra().tenant('00000000-0000-0000-0000-000000000000'),
        }),
        settings: {
          name: 'auth-backend',
        },
      });

      const adapter = new BackendAdapter();

      // Act: Synthesize
      const assembly = await adapter.synthesize(backend, {
        outdir: testOutputDir,
      });

      // Assert: Verify Key Vault resources for auth secrets
      const templatePath = path.join(testOutputDir, 'auth-backend.json');
      const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

      const keyVaultResources = template.resources.filter((r: any) =>
        r.type.includes('Microsoft.KeyVault')
      );
      expect(keyVaultResources.length).toBeGreaterThan(0);
    });

    it('should handle validation errors gracefully', async () => {
      // Arrange: Create invalid backend (missing required schema)
      const invalidBackend = {
        settings: {
          name: 'invalid-backend',
        },
        environment: 'development',
        // Missing schema - should cause validation error
      };

      const adapter = new BackendAdapter();

      // Act & Assert: Should throw validation error
      await expect(
        adapter.synthesize(invalidBackend as any, {
          outdir: testOutputDir,
        })
      ).rejects.toThrow();
    });
  });

  describe('Synthesizer.synthesizeBackend', () => {
    it('should synthesize backend through Synthesizer class', async () => {
      // Arrange: Create backend
      const backend = defineBackend({
        schema: defineSchema({
          schema: a.schema({
            Product: c.model({
              id: a.id(),
              name: a.string().required(),
              price: a.number().required(),
            }),
          }),
        }),
        settings: {
          name: 'product-backend',
        },
      });

      const synthesizer = new Synthesizer();

      // Act: Synthesize using Synthesizer.synthesizeBackend
      const assembly = await synthesizer.synthesizeBackend(backend, {
        outdir: testOutputDir,
      });

      // Assert: Verify assembly
      expect(assembly).toBeDefined();
      expect(Object.keys(assembly.stacks)).toHaveLength(1);

      const stackName = Object.keys(assembly.stacks)[0];
      expect(stackName).toBe('product-backend');

      // Assert: Verify template file exists
      const templatePath = path.join(testOutputDir, 'product-backend.json');
      expect(fs.existsSync(templatePath)).toBe(true);
    });
  });

  describe('ARM Template Validation', () => {
    it('should generate valid ARM template schema', async () => {
      // Arrange
      const backend = defineBackend({
        schema: defineSchema({
          schema: a.schema({
            Order: c.model({
              id: a.id(),
              customerId: a.string().required(),
              total: a.number().required(),
            }),
          }),
        }),
        settings: {
          name: 'order-backend',
        },
      });

      const adapter = new BackendAdapter();

      // Act
      await adapter.synthesize(backend, {
        outdir: testOutputDir,
      });

      // Assert: Verify ARM template adheres to Azure schema
      const templatePath = path.join(testOutputDir, 'order-backend.json');
      const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

      // Verify required ARM template fields
      expect(template.$schema).toBe(
        'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#'
      );
      expect(template.contentVersion).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect(Array.isArray(template.resources)).toBe(true);

      // Verify all resources have required fields
      for (const resource of template.resources) {
        expect(resource.type).toBeDefined();
        expect(resource.apiVersion).toBeDefined();
        expect(resource.name).toBeDefined();

        // Verify resource type is valid Azure resource type
        expect(resource.type).toMatch(/^Microsoft\.\w+\/\w+/);

        // Verify API version format
        expect(resource.apiVersion).toMatch(/^\d{4}-\d{2}-\d{2}/);
      }
    });

    it('should generate valid dependencies', async () => {
      // Arrange
      const backend = defineBackend({
        schema: defineSchema({
          schema: a.schema({
            Category: c.model({
              id: a.id(),
              name: a.string().required(),
            }),
            Item: c.model({
              id: a.id(),
              categoryId: a.string().required(),
              name: a.string().required(),
            }),
          }),
        }),
        settings: {
          name: 'dependency-backend',
        },
      });

      const adapter = new BackendAdapter();

      // Act
      await adapter.synthesize(backend, {
        outdir: testOutputDir,
      });

      // Assert: Verify dependency chains are valid
      const templatePath = path.join(testOutputDir, 'dependency-backend.json');
      const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

      const cosmosAccount = template.resources.find(
        (r: any) => r.type === 'Microsoft.DocumentDB/databaseAccounts'
      );
      expect(cosmosAccount).toBeDefined();

      const cosmosDatabase = template.resources.find(
        (r: any) => r.type === 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases'
      );
      expect(cosmosDatabase).toBeDefined();
      expect(cosmosDatabase.dependsOn).toBeDefined();
      expect(cosmosDatabase.dependsOn.length).toBeGreaterThan(0);

      // Verify containers depend on database
      const containers = template.resources.filter(
        (r: any) => r.type === 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers'
      );
      for (const container of containers) {
        expect(container.dependsOn).toBeDefined();
        expect(container.dependsOn.length).toBeGreaterThan(0);
      }
    });

    it.skip('should generate ARM template deployable to Azure', async () => {
      // Arrange: Create realistic backend
      const backend = defineBackend({
        schema: defineSchema({
          schema: a.schema({
            User: c.model({
              id: a.id(),
              email: a.string().required().email(),
              name: a.string().required(),
              createdAt: a.datetime().default('now'),
            }),
          }),
        }),
        authentication: defineAuth({
          Entra: auth.entra().tenant('00000000-0000-0000-0000-000000000000'),
        }),
        settings: {
          name: 'deployable-backend',
        },
      });

      const adapter = new BackendAdapter();

      // Act
      await adapter.synthesize(backend, {
        outdir: testOutputDir,
        skipValidation: false, // Run full validation
      });

      // Assert: Verify parameters file is valid
      const parametersPath = path.join(testOutputDir, 'deployable-backend.parameters.json');
      const parameters = JSON.parse(fs.readFileSync(parametersPath, 'utf-8'));

      expect(parameters.$schema).toBe(
        'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
      );
      expect(parameters.contentVersion).toBe('1.0.0.0');
      expect(parameters.parameters).toBeDefined();

      // Verify all template parameters have corresponding parameter values
      const templatePath = path.join(testOutputDir, 'deployable-backend.json');
      const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

      if (template.parameters) {
        for (const paramName of Object.keys(template.parameters)) {
          expect(parameters.parameters[paramName]).toBeDefined();
        }
      }
    });
  });

  describe('Complex Backend Scenarios', () => {
    it.skip('should handle backend with multiple model types', async () => {
      // Arrange: Create complex backend with CRUD, Events, and Functions
      const backend = defineBackend({
        schema: defineSchema({
          schema: a.schema({
            // CRUD Models
            Organization: c.model({
              id: a.id(),
              name: a.string().required(),
              domain: a.string().required(),
            }),

            User: c.model({
              id: a.id(),
              organizationId: a.string().required(),
              email: a.string().required().email(),
            }),

            // Event Models
            OrgCreated: e.model({
              orgId: a.string().required(),
              createdAt: a.datetime().required(),
            }),

            // Function Models
            sendWelcomeEmail: f.model({
              input: a.object({
                userId: a.string().required(),
                email: a.string().required().email(),
              }),
              output: a.object({}),
            }),
          }),
        }),
        settings: {
          name: 'complex-backend',
        },
      });

      const adapter = new BackendAdapter();

      // Act
      const assembly = await adapter.synthesize(backend, {
        outdir: testOutputDir,
      });

      // Assert: Verify metadata reflects all model types
      const metadataPath = path.join(testOutputDir, 'complex-backend.metadata.json');
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

      expect(metadata.modelCounts.crud).toBe(2);
      expect(metadata.modelCounts.event).toBe(1);
      expect(metadata.modelCounts.function).toBe(1);

      // Assert: Verify template has resources for all model types
      const templatePath = path.join(testOutputDir, 'complex-backend.json');
      const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

      // Should have Cosmos DB for CRUD
      expect(
        template.resources.some((r: any) => r.type.includes('Microsoft.DocumentDB'))
      ).toBe(true);

      // Should have Function App for functions
      expect(
        template.resources.some((r: any) => r.type.includes('Microsoft.Web'))
      ).toBe(true);
    });
  });
});
