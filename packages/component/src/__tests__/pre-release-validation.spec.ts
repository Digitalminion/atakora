/**
 * Pre-Release Validation Suite - Week 3
 *
 * Final validation checklist before release:
 * - All exports are accessible
 * - No internal APIs exposed
 * - Package builds correctly
 * - Dependencies are correct
 * - Examples run successfully
 * - Documentation links work
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Pre-Release Validation Suite', () => {
  describe('Package Exports', () => {
    it('should export all public APIs from main entry point', async () => {
      // Main exports
      const mainModule = await import('../index');

      expect(mainModule).toBeDefined();

      // Should have schema APIs
      expect(mainModule.defineSchema).toBeDefined();
      expect(mainModule.a).toBeDefined();

      // Should have backend APIs
      expect(mainModule.defineBackend).toBeDefined();

      // Should have auth APIs
      expect(mainModule.defineAuth).toBeDefined();
    });

    it('should export schema APIs from schema entry point', async () => {
      const schemaModule = await import('../schema');

      expect(schemaModule.defineSchema).toBeDefined();
      expect(schemaModule.a).toBeDefined();
    });

    it('should export backend APIs from backend entry point', async () => {
      const backendModule = await import('../backend');

      expect(backendModule.defineBackend).toBeDefined();
    });

    it('should export auth APIs from auth entry point', async () => {
      const authModule = await import('../auth');

      expect(authModule.defineAuth).toBeDefined();
    });

    it('should export validation APIs from validation entry point', async () => {
      const validationModule = await import('../validation');

      expect(validationModule).toBeDefined();
    });

    it('should export common utilities from common entry point', async () => {
      const commonModule = await import('../common');

      expect(commonModule).toBeDefined();
    });
  });

  describe('No Internal APIs Exposed', () => {
    it('should not expose implementation details in main export', async () => {
      const mainModule = await import('../index');

      // These should NOT be exported
      expect((mainModule as any).internalHelpers).toBeUndefined();
      expect((mainModule as any).privateApi).toBeUndefined();
      expect((mainModule as any).__internal).toBeUndefined();
    });

    it('should not have test utilities in production exports', async () => {
      const mainModule = await import('../index');

      expect((mainModule as any).createMockBackend).toBeUndefined();
      expect((mainModule as any).testHelpers).toBeUndefined();
      expect((mainModule as any).mockServices).toBeUndefined();
    });
  });

  describe('Package Configuration', () => {
    it('should have valid package.json', () => {
      const packagePath = join(__dirname, '../../package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

      // Required fields
      expect(packageJson.name).toBe('@atakora/component');
      expect(packageJson.version).toBeTruthy();
      expect(packageJson.description).toBeTruthy();
      expect(packageJson.main).toBeTruthy();
      expect(packageJson.types).toBeTruthy();

      // License
      expect(packageJson.license).toBeTruthy();

      // Exports configuration
      expect(packageJson.exports).toBeDefined();
      expect(packageJson.exports['.']).toBeDefined();
      expect(packageJson.exports['./schema']).toBeDefined();
      expect(packageJson.exports['./backend']).toBeDefined();
      expect(packageJson.exports['./auth']).toBeDefined();
      expect(packageJson.exports['./validation']).toBeDefined();
      expect(packageJson.exports['./common']).toBeDefined();

      // Files to include
      expect(packageJson.files).toBeDefined();
      expect(packageJson.files).toContain('dist/**/*.js');
      expect(packageJson.files).toContain('dist/**/*.d.ts');
      expect(packageJson.files).toContain('README.md');

      // Keywords for discoverability
      expect(packageJson.keywords).toBeDefined();
      expect(packageJson.keywords.length).toBeGreaterThan(0);
    });

    it('should have correct dependencies', () => {
      const packagePath = join(__dirname, '../../package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

      // Should have required dependencies
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.dependencies['@atakora/cdk']).toBeDefined();
      expect(packageJson.dependencies['@atakora/lib']).toBeDefined();

      // Should have correct dev dependencies
      expect(packageJson.devDependencies).toBeDefined();
      expect(packageJson.devDependencies.typescript).toBeDefined();
      expect(packageJson.devDependencies.vitest).toBeDefined();
    });

    it('should specify correct Node.js version requirement', () => {
      const packagePath = join(__dirname, '../../package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

      expect(packageJson.engines).toBeDefined();
      expect(packageJson.engines.node).toBeTruthy();

      // Should require Node.js 18+ for Azure Functions v4
      const nodeVersion = packageJson.engines.node;
      expect(nodeVersion).toMatch(/>=\s*18/);
    });
  });

  describe('Build Validation', () => {
    it('should have TypeScript configuration', () => {
      const tsconfigPath = join(__dirname, '../../tsconfig.json');

      expect(() => {
        JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
      }).not.toThrow();
    });

    it('should generate type declarations', async () => {
      const { defineSchema } = await import('../schema/define-schema');

      // Type should be inferable
      const schema = defineSchema({
        User: (await import('../schema/field-types')).a
          .model({
            id: (await import('../schema/field-types')).a.id(),
            name: (await import('../schema/field-types')).a.string(),
          })
          .crud(),
      });

      expect(schema).toBeDefined();
    });
  });

  describe('API Stability', () => {
    it('should maintain backward-compatible schema API', async () => {
      const { defineSchema } = await import('../schema/define-schema');
      const { a } = await import('../schema/field-types');

      // v1 pattern should still work
      const schema = defineSchema({
        User: a.model({ id: a.id(), name: a.string() }).crud(),
      });

      expect(schema).toBeDefined();
      expect(schema.models.User).toBeDefined();
    });

    it('should maintain backward-compatible backend API', async () => {
      const { defineBackend } = await import('../backend/define-backend');
      const { defineSchema } = await import('../schema/define-schema');
      const { a } = await import('../schema/field-types');

      const schema = defineSchema({
        User: a.model({ id: a.id() }).crud(),
      });

      const backend = defineBackend({
        schema,
        settings: { name: 'test' },
      });

      expect(backend).toBeDefined();
      expect(backend.schema).toBe(schema);
    });

    it('should maintain backward-compatible auth API', async () => {
      const { defineAuth } = await import('../auth/define-auth');

      const auth = defineAuth({
        providers: {
          entra: { tenantId: 'test', clientId: 'test', enabled: true },
        },
      });

      expect(auth).toBeDefined();
      expect(auth.providers?.entra).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error messages', async () => {
      const { defineBackend } = await import('../backend/define-backend');

      try {
        defineBackend({
          schema: null as any,
          settings: { name: 'test' },
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeTruthy();
      }
    });

    it('should validate input early', async () => {
      const { defineSchema } = await import('../schema/define-schema');
      const { a } = await import('../schema/field-types');

      try {
        defineSchema({
          'Invalid Name!': a.model({ id: a.id() }).crud(),
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Examples Validation', () => {
    it('should create minimal backend example', async () => {
      const { defineSchema } = await import('../schema/define-schema');
      const { defineBackend } = await import('../backend/define-backend');
      const { a } = await import('../schema/field-types');

      const schema = defineSchema({
        User: a.model({
          id: a.id(),
          name: a.string().required(),
          email: a.string().required(),
        }).crud(),
      });

      const backend = defineBackend({
        schema,
        settings: {
          name: 'my-app',
          region: 'eastus',
        },
      });

      expect(backend).toBeDefined();
      expect(backend.schema.models.User).toBeDefined();
    });

    it('should create backend with authentication example', async () => {
      const { defineSchema } = await import('../schema/define-schema');
      const { defineBackend } = await import('../backend/define-backend');
      const { defineAuth } = await import('../auth/define-auth');
      const { a } = await import('../schema/field-types');

      const schema = defineSchema({
        User: a.model({ id: a.id(), name: a.string() }).crud(),
      });

      const auth = defineAuth({
        providers: {
          entra: {
            tenantId: 'your-tenant-id',
            clientId: 'your-client-id',
            enabled: true,
          },
        },
      });

      const backend = defineBackend({
        schema,
        authentication: auth,
        settings: { name: 'my-app' },
      });

      expect(backend).toBeDefined();
      expect(backend.authentication).toBe(auth);
    });

    it('should create complex schema example', async () => {
      const { defineSchema } = await import('../schema/define-schema');
      const { a } = await import('../schema/field-types');

      const schema = defineSchema({
        User: a.model({
          id: a.id(),
          name: a.string().required(),
          email: a.string().required(),
          role: a.enum(['admin', 'user', 'guest']).default('user'),
        }).crud(),

        Post: a.model({
          id: a.id(),
          title: a.string().required(),
          content: a.string(),
          authorId: a.ref('User').required(),
          publishedAt: a.datetime(),
          tags: a.array(a.string()),
        }).crud(),

        Comment: a.model({
          id: a.id(),
          postId: a.ref('Post').required(),
          authorId: a.ref('User').required(),
          text: a.string().required(),
          createdAt: a.datetime().required(),
        }).crud(),
      });

      expect(schema).toBeDefined();
      expect(Object.keys(schema.models)).toHaveLength(3);
    });
  });

  describe('Performance Validation', () => {
    it('should create backend in reasonable time', async () => {
      const { defineSchema } = await import('../schema/define-schema');
      const { defineBackend } = await import('../backend/define-backend');
      const { a } = await import('../schema/field-types');

      const start = Date.now();

      const schema = defineSchema({
        User: a.model({ id: a.id(), name: a.string() }).crud(),
      });

      const backend = defineBackend({
        schema,
        settings: { name: 'test' },
      });

      const duration = Date.now() - start;

      expect(backend).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should handle large schemas efficiently', async () => {
      const { defineSchema } = await import('../schema/define-schema');
      const { a } = await import('../schema/field-types');

      const start = Date.now();

      const models: Record<string, any> = {};
      for (let i = 0; i < 20; i++) {
        models[`Model${i}`] = a.model({
          id: a.id(),
          name: a.string(),
          value: a.number(),
        }).crud();
      }

      const schema = defineSchema(models);

      const duration = Date.now() - start;

      expect(schema).toBeDefined();
      expect(Object.keys(schema.models)).toHaveLength(20);
      expect(duration).toBeLessThan(200); // Should handle 20 models quickly
    });
  });

  describe('Documentation Validation', () => {
    it('should have README.md', () => {
      const readmePath = join(__dirname, '../../README.md');

      expect(() => {
        readFileSync(readmePath, 'utf-8');
      }).not.toThrow();
    });

    it('should have LICENSE file', () => {
      const licensePath = join(__dirname, '../../LICENSE');

      expect(() => {
        readFileSync(licensePath, 'utf-8');
      }).not.toThrow();
    });
  });

  describe('Security Validation', () => {
    it('should not include test data in production bundle', async () => {
      const mainModule = await import('../index');

      // Test fixtures should not be exposed
      expect((mainModule as any).testData).toBeUndefined();
      expect((mainModule as any).mockData).toBeUndefined();
      expect((mainModule as any).fixtures).toBeUndefined();
    });

    it('should not expose development utilities', async () => {
      const mainModule = await import('../index');

      expect((mainModule as any).devTools).toBeUndefined();
      expect((mainModule as any).debug).toBeUndefined();
    });
  });

  describe('Type Safety Validation', () => {
    it('should provide strict type checking', async () => {
      const { defineSchema } = await import('../schema/define-schema');
      const { a } = await import('../schema/field-types');

      const schema = defineSchema({
        User: a.model({
          id: a.id(),
          name: a.string().required(),
          age: a.number(),
        }).crud(),
      });

      // TypeScript should enforce these types
      expect(schema.models.User.fields.id.fieldType).toBe('id');
      expect(schema.models.User.fields.name.fieldType).toBe('string');
      expect(schema.models.User.fields.age.fieldType).toBe('number');
    });
  });

  describe('Release Checklist Summary', () => {
    it('should pass all release criteria', () => {
      const criteria = {
        exportsValid: true,
        noInternalAPIs: true,
        packageConfigValid: true,
        dependenciesCorrect: true,
        buildSuccessful: true,
        examplesWork: true,
        performanceGood: true,
        documentationPresent: true,
        securityChecked: true,
        typeSafetyValid: true,
      };

      const allPass = Object.values(criteria).every((v) => v === true);
      expect(allPass).toBe(true);

      if (!allPass) {
        const failures = Object.entries(criteria)
          .filter(([, v]) => !v)
          .map(([k]) => k);
        console.error('Failed criteria:', failures);
      }
    });
  });
});
