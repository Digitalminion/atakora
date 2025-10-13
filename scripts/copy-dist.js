#!/usr/bin/env node
/**
 * Post-build script to copy compiled files from centralized dist/ to package-local dist/ folders.
 * This enables proper module resolution for workspace dependencies.
 */

const fs = require('fs');
const path = require('path');

// Package configurations: [source in root dist, destination in package]
const packages = [
  { name: 'lib', src: 'dist/lib', dest: 'packages/lib/dist' },
  { name: 'cdk', src: 'dist/cdk', dest: 'packages/cdk/dist' },
  // Copy CLI bundle to root dist for global access
  { name: 'cli-bundle', src: 'packages/cli/dist', dest: 'dist/cli', onlyFiles: ['cli.bundle.js', 'cli.bundle.js.map', 'package.json', 'README.md'] },
];

/**
 * Recursively copy directory contents
 */
function copyRecursive(src, dest, onlyFiles = null) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // If onlyFiles is specified, skip files not in the list
    if (onlyFiles && !entry.isDirectory() && !onlyFiles.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      // Skip directories if we have an onlyFiles filter
      if (!onlyFiles) {
        copyRecursive(srcPath, destPath, onlyFiles);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('📦 Copying compiled files to package directories...\n');

  for (const pkg of packages) {
    const srcPath = path.resolve(__dirname, '..', pkg.src);
    const destPath = path.resolve(__dirname, '..', pkg.dest);

    // Check if source exists
    if (!fs.existsSync(srcPath)) {
      console.log(`⚠️  Skipping ${pkg.name}: source directory not found (${pkg.src})`);
      continue;
    }

    console.log(`✓ Copying ${pkg.name}: ${pkg.src} → ${pkg.dest}`);
    copyRecursive(srcPath, destPath, pkg.onlyFiles);
  }

  console.log('\n✅ All files copied successfully!');
}

main();
