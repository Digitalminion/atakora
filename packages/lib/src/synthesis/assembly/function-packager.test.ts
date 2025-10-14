/**
 * Tests for Function Packager
 */

import { FunctionPackager, FunctionAppMetadata } from './function-packager';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('FunctionPackager', () => {
  let packager: FunctionPackager;
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = path.join(os.tmpdir(), `function-packager-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    packager = new FunctionPackager({
      outputDir: tempDir,
      minify: false,
    });
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('generateHostJson', () => {
    it('should generate valid host.json', () => {
      const functionApp: FunctionAppMetadata = {
        functionAppName: 'test-app',
        functions: [],
      };

      const hostJson = packager.generateHostJson(functionApp);

      expect(hostJson).toHaveProperty('version', '2.0');
      expect(hostJson).toHaveProperty('logging');
      expect(hostJson).toHaveProperty('extensionBundle');
    });

    it('should use custom extension bundle if provided', () => {
      const functionApp: FunctionAppMetadata = {
        functionAppName: 'test-app',
        functions: [],
        extensionBundle: {
          id: 'Custom.Bundle',
          version: '[1.*, 2.0.0)',
        },
      };

      const hostJson = packager.generateHostJson(functionApp);

      expect(hostJson).toHaveProperty('extensionBundle.id', 'Custom.Bundle');
      expect(hostJson).toHaveProperty('extensionBundle.version', '[1.*, 2.0.0)');
    });
  });

  describe('generateFunctionJson', () => {
    it('should generate function.json with HTTP trigger', () => {
      const func = {
        functionName: 'test-function',
        code: 'module.exports = async function (context, req) { return { status: 200 }; };',
        httpTrigger: {
          methods: ['GET', 'POST'],
          authLevel: 'function' as const,
          route: 'api/test',
        },
      };

      const functionJson = packager.generateFunctionJson(func);

      expect(functionJson).toHaveProperty('bindings');
      const bindings = (functionJson as any).bindings;
      expect(bindings).toHaveLength(2);

      // Check HTTP trigger
      const httpTrigger = bindings[0];
      expect(httpTrigger.type).toBe('httpTrigger');
      expect(httpTrigger.direction).toBe('in');
      expect(httpTrigger.methods).toEqual(['GET', 'POST']);
      expect(httpTrigger.authLevel).toBe('function');
      expect(httpTrigger.route).toBe('api/test');

      // Check HTTP output
      const httpOutput = bindings[1];
      expect(httpOutput.type).toBe('http');
      expect(httpOutput.direction).toBe('out');
    });

    it('should include additional bindings', () => {
      const func = {
        functionName: 'test-function',
        code: 'module.exports = async function (context, req) { return { status: 200 }; };',
        httpTrigger: {
          methods: ['POST'],
        },
        bindings: [
          {
            type: 'cosmosDB',
            direction: 'in' as const,
            name: 'inputDocument',
            databaseName: 'testdb',
            collectionName: 'items',
            connectionStringSetting: 'CosmosDBConnection',
          },
        ],
      };

      const functionJson = packager.generateFunctionJson(func);

      const bindings = (functionJson as any).bindings;
      expect(bindings).toHaveLength(3); // HTTP trigger + output + Cosmos binding

      const cosmosBinding = bindings[2];
      expect(cosmosBinding.type).toBe('cosmosDB');
      expect(cosmosBinding.direction).toBe('in');
      expect(cosmosBinding.name).toBe('inputDocument');
    });
  });

  describe('package', () => {
    it('should create valid function package', async () => {
      const functionApp: FunctionAppMetadata = {
        functionAppName: 'test-functions',
        functions: [
          {
            functionName: 'create-user',
            code: 'module.exports = async function (context, req) { return { status: 200, body: "Created" }; };',
            httpTrigger: {
              methods: ['POST'],
              authLevel: 'function',
              route: 'users',
            },
          },
          {
            functionName: 'read-user',
            code: 'module.exports = async function (context, req) { return { status: 200, body: "User data" }; };',
            httpTrigger: {
              methods: ['GET'],
              authLevel: 'function',
              route: 'users/{id}',
            },
          },
        ],
      };

      const result = await packager.package(functionApp);

      // Check package metadata
      expect(result.functionAppName).toBe('test-functions');
      expect(result.functions).toEqual(['create-user', 'read-user']);
      expect(result.size).toBeGreaterThan(0);
      expect(result.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(result.packagePath).toContain('test-functions');

      // Check package file exists
      const stats = await fs.stat(result.packagePath);
      expect(stats.isFile()).toBe(true);

      // Check structure metadata
      expect(result.structure.hostJson).toHaveProperty('version', '2.0');
      expect(Object.keys(result.structure.functionJsons)).toHaveLength(2);
      expect(result.structure.functionJsons['create-user']).toBeDefined();
      expect(result.structure.functionJsons['read-user']).toBeDefined();
      expect(result.structure.codeFiles['create-user']).toBe('create-user/index.js');
      expect(result.structure.codeFiles['read-user']).toBe('read-user/index.js');
    }, 10000);

    it('should create package with minification', async () => {
      const packagerWithMinify = new FunctionPackager({
        outputDir: tempDir,
        minify: true,
      });

      const functionApp: FunctionAppMetadata = {
        functionAppName: 'test-minified',
        functions: [
          {
            functionName: 'test-func',
            code: `
              // This is a comment
              module.exports = async function (context, req) {
                /* Block comment */
                return {
                  status: 200,
                  body: "Success"
                };
              };
            `,
            httpTrigger: {
              methods: ['GET'],
            },
          },
        ],
      };

      const result = await packagerWithMinify.package(functionApp);

      // Package should be created
      expect(result.packagePath).toBeTruthy();
      const stats = await fs.stat(result.packagePath);
      expect(stats.isFile()).toBe(true);

      // Size should be smaller due to minification (though hard to test precisely)
      expect(result.size).toBeGreaterThan(0);
    }, 10000);
  });

  describe('validatePackage', () => {
    it('should validate correct package', async () => {
      const functionApp: FunctionAppMetadata = {
        functionAppName: 'test-validate',
        functions: [
          {
            functionName: 'test-func',
            code: 'module.exports = async function (context, req) { return { status: 200 }; };',
            httpTrigger: {
              methods: ['GET'],
            },
          },
        ],
      };

      const result = await packager.package(functionApp);
      const validation = await packager.validatePackage(result.packagePath);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    }, 10000);

    it('should detect missing host.json', async () => {
      // Create a package without host.json
      const files = new Map<string, string>();
      files.set('test-func/function.json', JSON.stringify({ bindings: [] }));
      files.set('test-func/index.js', 'module.exports = () => {};');

      const packageBuffer = await packager.createZipPackage(files);
      const packagePath = path.join(tempDir, 'invalid-package.zip');
      await fs.writeFile(packagePath, packageBuffer);

      const validation = await packager.validatePackage(packagePath);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing host.json');
    }, 10000);

    it('should detect missing function code', async () => {
      // Create a package with function.json but no index.js
      const files = new Map<string, string>();
      files.set('host.json', JSON.stringify({ version: '2.0' }));
      files.set('test-func/function.json', JSON.stringify({ bindings: [] }));

      const packageBuffer = await packager.createZipPackage(files);
      const packagePath = path.join(tempDir, 'invalid-package2.zip');
      await fs.writeFile(packagePath, packageBuffer);

      const validation = await packager.validatePackage(packagePath);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Missing index.js'))).toBe(true);
    }, 10000);
  });

  describe('extractPackage', () => {
    it('should extract package to directory', async () => {
      const functionApp: FunctionAppMetadata = {
        functionAppName: 'test-extract',
        functions: [
          {
            functionName: 'test-func',
            code: 'module.exports = async function (context, req) { return { status: 200 }; };',
            httpTrigger: {
              methods: ['GET'],
            },
          },
        ],
      };

      const result = await packager.package(functionApp);

      // Extract package
      const extractDir = path.join(tempDir, 'extracted');
      await packager.extractPackage(result.packagePath, extractDir);

      // Check extracted files
      const hostJsonPath = path.join(extractDir, 'host.json');
      const functionJsonPath = path.join(extractDir, 'test-func', 'function.json');
      const indexJsPath = path.join(extractDir, 'test-func', 'index.js');

      expect(await fs.stat(hostJsonPath).then((s) => s.isFile())).toBe(true);
      expect(await fs.stat(functionJsonPath).then((s) => s.isFile())).toBe(true);
      expect(await fs.stat(indexJsPath).then((s) => s.isFile())).toBe(true);

      // Verify content
      const hostJson = JSON.parse(await fs.readFile(hostJsonPath, 'utf-8'));
      expect(hostJson.version).toBe('2.0');
    }, 10000);
  });

  describe('createZipPackage', () => {
    it('should create ZIP from files map', async () => {
      const files = new Map<string, string>();
      files.set('test.txt', 'Hello World');
      files.set('dir/nested.txt', 'Nested content');

      const buffer = await packager.createZipPackage(files);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // Write and extract to verify
      const packagePath = path.join(tempDir, 'test-package.zip');
      await fs.writeFile(packagePath, buffer);

      const extractDir = path.join(tempDir, 'test-extracted');
      await packager.extractPackage(packagePath, extractDir);

      const content = await fs.readFile(path.join(extractDir, 'test.txt'), 'utf-8');
      expect(content).toBe('Hello World');
    }, 10000);
  });
});
