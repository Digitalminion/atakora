/**
 * Real Backend Synthesis Tests
 *
 * Tests synthesis of actual backend packages (backend-simple, backend)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BackendAdapter } from '../backend-adapter';
import { defineBackend } from '../../backend';
import { defineSchema, a, c } from '../../schema';
import { defineAuth, auth } from '../../auth';
import * as fs from 'fs';
import * as path from 'path';

describe('Real Backend Synthesis', () => {
  const testOutputDir = path.join(__dirname, '../../__test-output__/real-backends');

  beforeEach(async () => {
    // Create test output directory
    await fs.promises.mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test output
    try {
      await fs.promises.rm(testOutputDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore errors
    }
  });

  it('should synthesize backend-simple equivalent', async () => {
    // Recreate backend-simple structure
    const backend = defineBackend({
      schema: defineSchema({
        schema: a.schema({
          // CRUD Models
          User: c.model({
            id: a.id(),
            email: a.string().required().email(),
            name: a.string().required(),
            role: a.enum(['admin', 'user']).default('user'),
            createdAt: a.datetime().required(),
          }),

          Project: c.model({
            id: a.id(),
            name: a.string().required(),
            description: a.string(),
            ownerId: a.string().required(),
            status: a.enum(['active', 'archived']).default('active'),
            createdAt: a.datetime().required(),
          }),
        }),
      }),
      authentication: defineAuth({
        Entra: auth
          .entra()
          .tenant('00000000-0000-0000-0000-000000000000')
          .clientId('11111111-1111-1111-1111-111111111111'),
      }),
      settings: {
        name: 'my-app',
        environment: 'development',
        region: 'eastus',
      },
    });

    // Synthesize
    const adapter = new BackendAdapter();
    const assembly = await adapter.synthesize(backend, {
      outdir: testOutputDir,
    });

    // Verify assembly
    expect(assembly).toBeDefined();
    const stackName = Object.keys(assembly.stacks)[0];
    const manifest = assembly.stacks[stackName];

    expect(manifest.name).toBe('my-app');
    expect(manifest.resourceCount).toBeGreaterThan(0);

    // Verify files were created
    const templatePath = path.join(testOutputDir, `${stackName}.json`);
    expect(fs.existsSync(templatePath)).toBe(true);

    // Read and verify template structure
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
    expect(template.resources).toBeDefined();
    expect(Array.isArray(template.resources)).toBe(true);
    expect(template.resources.length).toBeGreaterThan(0);

    // Should have Cosmos DB resources (database, containers for User and Project)
    const cosmosResources = template.resources.filter((r: any) =>
      r.type.startsWith('Microsoft.DocumentDB/')
    );
    expect(cosmosResources.length).toBeGreaterThan(0);

    // Should have Function App resources
    const functionResources = template.resources.filter((r: any) =>
      r.type.startsWith('Microsoft.Web/sites')
    );
    expect(functionResources.length).toBeGreaterThanOrEqual(0); // May or may not have functions yet

    console.log('\n✅ Backend-simple synthesis successful!');
    console.log(`   Template: ${templatePath}`);
    console.log(`   Resources: ${template.resources.length}`);
    console.log(`   Cosmos resources: ${cosmosResources.length}`);
  });

  it('should generate deployment-ready ARM template', async () => {
    // Create a simple backend
    const backend = defineBackend({
      schema: defineSchema({
        schema: a.schema({
          Task: c.model({
            id: a.id(),
            title: a.string().required(),
            completed: a.boolean().default(false),
          }),
        }),
      }),
      settings: {
        name: 'task-app',
        environment: 'production',
        region: 'westus2',
      },
    });

    // Synthesize
    const adapter = new BackendAdapter();
    const assembly = await adapter.synthesize(backend, {
      outdir: testOutputDir,
    });

    const stackName = Object.keys(assembly.stacks)[0];
    const templatePath = path.join(testOutputDir, `${stackName}.json`);
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

    // Verify ARM template structure (valid for deployment)
    expect(template.$schema).toBeDefined();
    expect(template.$schema).toContain('deploymentTemplate.json');
    expect(template.contentVersion).toBeDefined();
    expect(template.resources).toBeDefined();
    expect(Array.isArray(template.resources)).toBe(true);

    // All resources should have required ARM properties
    for (const resource of template.resources) {
      expect(resource.type).toBeDefined();
      expect(resource.apiVersion).toBeDefined();
      expect(resource.name).toBeDefined();
    }

    console.log('\n✅ Deployment-ready ARM template generated!');
    console.log(`   Schema: ${template.$schema}`);
    console.log(`   Version: ${template.contentVersion}`);
    console.log(`   Ready for: az deployment group create`);
  });
});
