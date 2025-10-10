import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FunctionDiscovery } from './discovery';
import { DiscoveryError } from './types';

describe('FunctionDiscovery', () => {
  let tempDir: string;
  let discovery: FunctionDiscovery;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = path.join(os.tmpdir(), `atakora-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    discovery = new FunctionDiscovery(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('discover', () => {
    it('should discover functions with handler.ts and resource.ts', async () => {
      // Arrange: Create function directory
      const functionDir = path.join(tempDir, 'api');
      await fs.mkdir(functionDir);
      await fs.writeFile(path.join(functionDir, 'handler.ts'), 'export async function handler() {}');
      await fs.writeFile(
        path.join(functionDir, 'resource.ts'),
        `export default {
          type: 'AzureFunction',
          version: '1.0',
          config: { trigger: { type: 'http' } }
        }`
      );

      // Act
      const result = await discovery.discover();

      // Assert
      expect(result.functionsDiscovered).toBe(1);
      expect(result.registry.has('api')).toBe(true);

      const config = result.registry.get('api')!;
      expect(config.directory.name).toBe('api');
      expect(config.directory.handlerPath).toBe(path.join(functionDir, 'handler.ts'));
      expect(config.directory.resourcePath).toBe(path.join(functionDir, 'resource.ts'));
      expect(config.metadata.functionName).toBe('api');
      expect(config.metadata.handlerHash).toBeDefined();
      expect(config.metadata.resourceHash).toBeDefined();
    });

    it('should discover multiple functions', async () => {
      // Arrange: Create multiple function directories
      const functions = ['api', 'worker', 'scheduler'];

      for (const name of functions) {
        const functionDir = path.join(tempDir, name);
        await fs.mkdir(functionDir);
        await fs.writeFile(path.join(functionDir, 'handler.ts'), 'export async function handler() {}');
        await fs.writeFile(
          path.join(functionDir, 'resource.ts'),
          `export default {
            type: 'AzureFunction',
            version: '1.0',
            config: { trigger: { type: 'http' } }
          }`
        );
      }

      // Act
      const result = await discovery.discover();

      // Assert
      expect(result.functionsDiscovered).toBe(3);
      expect(result.registry.has('api')).toBe(true);
      expect(result.registry.has('worker')).toBe(true);
      expect(result.registry.has('scheduler')).toBe(true);
    });

    it('should skip directories without handler.ts', async () => {
      // Arrange: Create directory with only resource.ts
      const functionDir = path.join(tempDir, 'incomplete');
      await fs.mkdir(functionDir);
      await fs.writeFile(
        path.join(functionDir, 'resource.ts'),
        `export default { type: 'AzureFunction', version: '1.0', config: { trigger: { type: 'http' } } }`
      );

      // Act
      const result = await discovery.discover();

      // Assert
      expect(result.functionsDiscovered).toBe(0);
      expect(result.registry.has('incomplete')).toBe(false);
    });

    it('should skip directories without resource.ts', async () => {
      // Arrange: Create directory with only handler.ts
      const functionDir = path.join(tempDir, 'incomplete');
      await fs.mkdir(functionDir);
      await fs.writeFile(path.join(functionDir, 'handler.ts'), 'export async function handler() {}');

      // Act
      const result = await discovery.discover();

      // Assert
      expect(result.functionsDiscovered).toBe(0);
      expect(result.registry.has('incomplete')).toBe(false);
    });

    it('should skip hidden directories', async () => {
      // Arrange: Create hidden directory
      const functionDir = path.join(tempDir, '.hidden');
      await fs.mkdir(functionDir);
      await fs.writeFile(path.join(functionDir, 'handler.ts'), 'export async function handler() {}');
      await fs.writeFile(
        path.join(functionDir, 'resource.ts'),
        `export default { type: 'AzureFunction', version: '1.0', config: { trigger: { type: 'http' } } }`
      );

      // Act
      const result = await discovery.discover();

      // Assert
      expect(result.functionsDiscovered).toBe(0);
      expect(result.registry.has('.hidden')).toBe(false);
    });

    it('should skip node_modules directory', async () => {
      // Arrange: Create node_modules directory
      const functionDir = path.join(tempDir, 'node_modules');
      await fs.mkdir(functionDir);
      await fs.writeFile(path.join(functionDir, 'handler.ts'), 'export async function handler() {}');
      await fs.writeFile(
        path.join(functionDir, 'resource.ts'),
        `export default { type: 'AzureFunction', version: '1.0', config: { trigger: { type: 'http' } } }`
      );

      // Act
      const result = await discovery.discover();

      // Assert
      expect(result.functionsDiscovered).toBe(0);
      expect(result.registry.has('node_modules')).toBe(false);
    });

    it('should throw DiscoveryError for non-existent directory', async () => {
      // Arrange
      const nonExistentDir = path.join(tempDir, 'does-not-exist');
      const badDiscovery = new FunctionDiscovery(nonExistentDir);

      // Act & Assert
      await expect(badDiscovery.discover()).rejects.toThrow(DiscoveryError);
    });

    it('should compute different hashes for different file contents', async () => {
      // Arrange: Create two functions with different content
      const function1Dir = path.join(tempDir, 'function1');
      const function2Dir = path.join(tempDir, 'function2');

      await fs.mkdir(function1Dir);
      await fs.mkdir(function2Dir);

      await fs.writeFile(path.join(function1Dir, 'handler.ts'), 'export async function handler() { return 1; }');
      await fs.writeFile(
        path.join(function1Dir, 'resource.ts'),
        `export default { type: 'AzureFunction', version: '1.0', config: { trigger: { type: 'http' } } }`
      );

      await fs.writeFile(path.join(function2Dir, 'handler.ts'), 'export async function handler() { return 2; }');
      await fs.writeFile(
        path.join(function2Dir, 'resource.ts'),
        `export default { type: 'AzureFunction', version: '1.0', config: { trigger: { type: 'timer' } } }`
      );

      // Act
      const result = await discovery.discover();

      // Assert
      const config1 = result.registry.get('function1')!;
      const config2 = result.registry.get('function2')!;

      expect(config1.metadata.handlerHash).not.toBe(config2.metadata.handlerHash);
      expect(config1.metadata.resourceHash).not.toBe(config2.metadata.resourceHash);
    });

    it('should return empty registry for empty directory', async () => {
      // Act
      const result = await discovery.discover();

      // Assert
      expect(result.functionsDiscovered).toBe(0);
      expect(result.registry.size).toBe(0);
    });
  });

  describe('getFunctionsPath', () => {
    it('should return absolute path to functions directory', () => {
      // Act
      const functionsPath = discovery.getFunctionsPath();

      // Assert
      expect(path.isAbsolute(functionsPath)).toBe(true);
      expect(functionsPath).toBe(path.resolve(tempDir));
    });
  });
});
