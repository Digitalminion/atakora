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

  // Build unbundled synthesis modules for dynamic loading
  // These are required by loader scripts during synth command
  console.log('📋 Building synthesis modules for dynamic loading...');

  const synthesisDir = resolve(__dirname, 'dist/synthesis');
  if (!existsSync(synthesisDir)) {
    mkdirSync(synthesisDir, { recursive: true });
  }

  await esbuild.build({
    entryPoints: ['src/synthesis/backend-synthesis-strategy.ts'],
    bundle: true, // Bundle is required to use external
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    outfile: 'dist/synthesis/backend-synthesis-strategy.js',
    sourcemap: true,
    external: ['@atakora/*', '@azure/*'], // Keep atakora and Azure packages external
    keepNames: true,
    logLevel: 'info',
  });

  console.log('✅ Synthesis modules built successfully');
} catch (error) {
  console.error('❌ Bundle failed:', error);
  process.exit(1);
}
