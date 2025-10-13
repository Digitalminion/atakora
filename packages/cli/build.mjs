#!/usr/bin/env node
/**
 * esbuild configuration for CLI bundling
 *
 * Bundles the CLI into a single self-contained JavaScript file with all dependencies.
 */

import * as esbuild from 'esbuild';
import { readFileSync, cpSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  await esbuild.build({
    entryPoints: ['src/cli.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    outfile: 'dist/cli.bundle.js',
    sourcemap: true,
    minify: false, // Keep readable for debugging

    // Mark Azure SDK packages as external - they have native dependencies
    // that don't bundle well and need to be loaded at runtime
    external: ['@azure/*'],

    // Preserve function names for better stack traces
    keepNames: true,

    // Log build info
    logLevel: 'info',

    // Tree shaking
    treeShaking: true,

    // Resolve extensions
    resolveExtensions: ['.ts', '.js', '.json'],
  });

  console.log('✅ CLI bundled successfully to dist/cli.bundle.js');

  // Copy templates to dist
  const templatesSource = resolve(__dirname, 'src/templates');
  const templatesDest = resolve(__dirname, 'dist/templates');

  if (existsSync(templatesSource)) {
    console.log('📋 Copying templates...');
    cpSync(templatesSource, templatesDest, { recursive: true });
    console.log('✅ Templates copied to dist/templates');
  }

  // Copy package metadata files to dist
  console.log('📋 Copying package metadata...');
  const filesToCopy = ['README.md', 'LICENSE', 'package.json'];

  for (const file of filesToCopy) {
    const source = resolve(__dirname, file);
    const dest = resolve(__dirname, 'dist', file);

    if (existsSync(source)) {
      cpSync(source, dest);
    } else {
      console.warn(`⚠️  ${file} not found, skipping`);
    }
  }

  console.log('✅ Package metadata copied to dist');
} catch (error) {
  console.error('❌ Bundle failed:', error);
  process.exit(1);
}
