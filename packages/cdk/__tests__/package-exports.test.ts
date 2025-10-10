/**
 * Package exports validation tests
 *
 * These tests verify that the package.json exports configuration
 * correctly exposes all namespaces with proper TypeScript types.
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

describe('Package Exports Configuration', () => {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  const expectedNamespaces = [
    'network',
    'storage',
    'compute',
    'web',
    'keyvault',
    'sql',
    'insights',
    'operationalinsights',
    'documentdb',
    'cognitiveservices',
    'search',
    'apimanagement',
    'resources',
  ];

  it('should export all required namespaces', () => {
    expectedNamespaces.forEach((namespace) => {
      expect(packageJson.exports).toHaveProperty(`./${namespace}`);
    });
  });

  it('should configure types for all namespaces', () => {
    expectedNamespaces.forEach((namespace) => {
      const exportConfig = packageJson.exports[`./${namespace}`];
      expect(exportConfig).toHaveProperty('types');
      expect(exportConfig.types).toBe(`./dist/${namespace}/index.d.ts`);
    });
  });

  it('should configure import/require for all namespaces', () => {
    expectedNamespaces.forEach((namespace) => {
      const exportConfig = packageJson.exports[`./${namespace}`];
      expect(exportConfig).toHaveProperty('import');
      expect(exportConfig).toHaveProperty('require');
    });
  });

  it('should configure typesVersions for TypeScript compatibility', () => {
    expect(packageJson.typesVersions).toBeDefined();
    expect(packageJson.typesVersions['*']).toBeDefined();

    expectedNamespaces.forEach((namespace) => {
      expect(packageJson.typesVersions['*']).toHaveProperty(namespace);
    });
  });

  it('should specify minimum Node.js version', () => {
    expect(packageJson.engines).toBeDefined();
    expect(packageJson.engines.node).toBeDefined();
    expect(packageJson.engines.node).toMatch(/>=14.0.0/);
  });

  it('should have @atakora/lib as dependency', () => {
    expect(packageJson.dependencies).toHaveProperty('@atakora/lib');
  });
});

describe('Namespace Index Files', () => {
  const namespacesDir = path.join(__dirname, '..', 'src');

  it('should have index.ts for all namespaces', () => {
    const expectedNamespaces = [
      'network',
      'storage',
      'compute',
      'web',
      'keyvault',
      'sql',
      'insights',
      'operationalinsights',
      'documentdb',
      'cognitiveservices',
      'search',
      'apimanagement',
      'resources',
    ];

    expectedNamespaces.forEach((namespace) => {
      const indexPath = path.join(namespacesDir, namespace, 'index.ts');
      expect(fs.existsSync(indexPath)).toBe(true);
    });
  });
});
