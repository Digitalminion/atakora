/**
 * Test utilities for CLI tests
 *
 * Provides helpers for test isolation, temp directory management,
 * and common test fixtures.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Manifest } from '../../manifest/types';

/**
 * Creates a temporary test directory and returns its path
 */
export function createTempDir(prefix: string = 'atakora-test-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Removes a directory and all its contents
 */
export function removeTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Creates a test workspace with basic structure
 */
export function createTestWorkspace(dir: string): void {
  // Create basic directory structure
  fs.mkdirSync(path.join(dir, '.atakora'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'packages'), { recursive: true });
}

/**
 * Writes a manifest file to the test directory
 */
export function writeManifest(dir: string, manifest: Manifest): void {
  const manifestPath = path.join(dir, '.atakora', 'manifest.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

/**
 * Reads a manifest file from the test directory
 */
export function readManifest(dir: string): Manifest {
  const manifestPath = path.join(dir, '.atakora', 'manifest.json');
  const content = fs.readFileSync(manifestPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Creates a sample manifest for testing
 */
export function createSampleManifest(overrides?: Partial<Manifest>): Manifest {
  const now = new Date().toISOString();
  return {
    version: '1.0.0',
    organization: 'Test Org',
    project: 'Test Project',
    defaultPackage: 'backend',
    packages: [
      {
        name: 'backend',
        path: 'packages/backend',
        entryPoint: 'bin/app.ts',
        enabled: true,
      },
    ],
    outputDirectory: '.atakora/arm.out',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Checks if a file exists at the given path
 */
export function fileExists(dir: string, relativePath: string): boolean {
  return fs.existsSync(path.join(dir, relativePath));
}

/**
 * Reads a file from the test directory
 */
export function readFile(dir: string, relativePath: string): string {
  return fs.readFileSync(path.join(dir, relativePath), 'utf-8');
}

/**
 * Writes a file to the test directory
 */
export function writeFile(dir: string, relativePath: string, content: string): void {
  const filePath = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

/**
 * Creates a package directory structure
 */
export function createPackageStructure(dir: string, packageName: string): void {
  const packagePath = path.join(dir, 'packages', packageName);

  // Create directories
  fs.mkdirSync(path.join(packagePath, 'src'), { recursive: true });
  fs.mkdirSync(path.join(packagePath, 'bin'), { recursive: true });

  // Create basic files
  writeFile(
    dir,
    `packages/${packageName}/package.json`,
    JSON.stringify(
      {
        name: `@atakora/${packageName}`,
        version: '1.0.0',
        main: 'dist/index.js',
      },
      null,
      2
    )
  );

  writeFile(
    dir,
    `packages/${packageName}/tsconfig.json`,
    JSON.stringify(
      {
        extends: '../../tsconfig.base.json',
        compilerOptions: {
          outDir: './dist',
          rootDir: './src',
        },
        include: ['src/**/*', 'bin/**/*'],
      },
      null,
      2
    )
  );

  writeFile(
    dir,
    `packages/${packageName}/bin/app.ts`,
    `
import { App } from '@atakora/lib';

const app = new App();

// Your infrastructure code here

app.synth();
`.trim()
  );
}

/**
 * Test workspace context manager
 */
export class TestWorkspace {
  private dir: string;
  private originalCwd: string;

  constructor(prefix?: string) {
    this.dir = createTempDir(prefix);
    this.originalCwd = process.cwd();
  }

  /**
   * Get the workspace directory path
   */
  getPath(): string {
    return this.dir;
  }

  /**
   * Change to workspace directory
   */
  enter(): void {
    process.chdir(this.dir);
  }

  /**
   * Return to original directory
   */
  exit(): void {
    process.chdir(this.originalCwd);
  }

  /**
   * Clean up workspace
   */
  cleanup(): void {
    this.exit();
    removeTempDir(this.dir);
  }

  /**
   * Write a manifest file
   */
  writeManifest(manifest: Manifest): void {
    writeManifest(this.dir, manifest);
  }

  /**
   * Read the manifest file
   */
  readManifest(): Manifest {
    return readManifest(this.dir);
  }

  /**
   * Check if a file exists
   */
  fileExists(relativePath: string): boolean {
    return fileExists(this.dir, relativePath);
  }

  /**
   * Read a file
   */
  readFile(relativePath: string): string {
    return readFile(this.dir, relativePath);
  }

  /**
   * Write a file
   */
  writeFile(relativePath: string, content: string): void {
    writeFile(this.dir, relativePath, content);
  }

  /**
   * Create a package structure
   */
  createPackage(packageName: string): void {
    createPackageStructure(this.dir, packageName);
  }

  /**
   * Setup basic workspace structure
   */
  setup(): void {
    createTestWorkspace(this.dir);
  }
}
