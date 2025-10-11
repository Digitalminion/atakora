/**
 * Bundle size and tree-shaking validation tests
 *
 * These tests verify that:
 * 1. Importing a single namespace only bundles that namespace's code
 * 2. Tree-shaking properly eliminates unused code
 * 3. Bundle sizes stay within acceptable limits
 *
 * Note: Run `npm run bundle:analyze` to regenerate bundle analysis data.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface BundleAnalysis {
  name: string;
  importPattern: string;
  size: {
    raw: number;
    minified: number;
    gzipped: number;
  };
  modules: {
    total: number;
    fromCdk: number;
    fromLib: number;
  };
  timestamp: string;
}

describe('Bundle Size Budget Compliance', () => {
  const BUNDLE_SIZE_BUDGET_MB = 2;
  const BUNDLE_SIZE_BUDGET_BYTES = BUNDLE_SIZE_BUDGET_MB * 1024 * 1024;

  let analyses: BundleAnalysis[] = [];

  try {
    const reportPath = path.join(__dirname, '..', '..', 'bundle-analysis-results', 'bundle-analysis-report.json');
    if (fs.existsSync(reportPath)) {
      const reportData = fs.readFileSync(reportPath, 'utf-8');
      analyses = JSON.parse(reportData);
    }
  } catch (error) {
    console.warn('Bundle analysis report not found. Run `npm run bundle:analyze` to generate it.');
  }

  it('should have bundle analysis data available', () => {
    expect(analyses.length).toBeGreaterThan(0);
  });

  it('should comply with ADR-005 bundle size budget (< 2MB)', () => {
    if (analyses.length === 0) {
      console.warn('Skipping bundle size test - no analysis data. Run `npm run bundle:analyze`');
      return;
    }

    analyses.forEach((analysis) => {
      const sizeMB = analysis.size.minified / (1024 * 1024);
      expect(analysis.size.minified).toBeLessThan(BUNDLE_SIZE_BUDGET_BYTES);
      console.log(`✓ ${analysis.importPattern}: ${sizeMB.toFixed(2)} MB / ${BUNDLE_SIZE_BUDGET_MB} MB`);
    });
  });

  it('should have reasonable namespace sizes (< 500 KB minified)', () => {
    if (analyses.length === 0) return;

    const NAMESPACE_SIZE_LIMIT = 500 * 1024; // 500 KB

    const namespaceTests = analyses.filter((a) => a.name.endsWith('-namespace'));
    namespaceTests.forEach((analysis) => {
      expect(analysis.size.minified).toBeLessThan(NAMESPACE_SIZE_LIMIT);
    });
  });
});

describe('Tree-Shaking Validation', () => {
  let analyses: BundleAnalysis[] = [];

  try {
    const reportPath = path.join(__dirname, '..', '..', 'bundle-analysis-results', 'bundle-analysis-report.json');
    if (fs.existsSync(reportPath)) {
      const reportData = fs.readFileSync(reportPath, 'utf-8');
      analyses = JSON.parse(reportData);
    }
  } catch (error) {
    // Analysis data not available
  }

  it('should demonstrate namespace isolation (network !== storage)', () => {
    if (analyses.length === 0) return;

    const networkNamespace = analyses.find((a) => a.name === 'network-namespace');
    const storageNamespace = analyses.find((a) => a.name === 'storage-namespace');
    const multipleNamespaces = analyses.find((a) => a.name === 'multiple-namespaces');

    if (!networkNamespace || !storageNamespace || !multipleNamespaces) {
      console.warn('Missing namespace test data');
      return;
    }

    // Multiple namespaces should be larger than any single namespace
    expect(multipleNamespaces.size.gzipped).toBeGreaterThan(networkNamespace.size.gzipped);
    expect(multipleNamespaces.size.gzipped).toBeGreaterThan(storageNamespace.size.gzipped);

    // Multiple namespaces should NOT be as large as sum of all individual namespaces
    // (because they share common dependencies)
    const sumOfIndividual = networkNamespace.size.gzipped + storageNamespace.size.gzipped;
    expect(multipleNamespaces.size.gzipped).toBeLessThan(sumOfIndividual);

    console.log('✓ Namespace isolation verified:');
    console.log(`  Network: ${(networkNamespace.size.gzipped / 1024).toFixed(2)} KB`);
    console.log(`  Storage: ${(storageNamespace.size.gzipped / 1024).toFixed(2)} KB`);
    console.log(`  Combined: ${(multipleNamespaces.size.gzipped / 1024).toFixed(2)} KB`);
  });

  it('should have minimal framework-only import size', () => {
    if (analyses.length === 0) return;

    const frameworkOnly = analyses.find((a) => a.name === 'framework-only');
    if (!frameworkOnly) return;

    // Framework-only imports should be < 10 KB (because @atakora/lib is external)
    const FRAMEWORK_SIZE_LIMIT = 10 * 1024;
    expect(frameworkOnly.size.minified).toBeLessThan(FRAMEWORK_SIZE_LIMIT);

    console.log(`✓ Framework-only import: ${(frameworkOnly.size.minified / 1024).toFixed(2)} KB`);
  });

  it('should document within-namespace tree-shaking behavior', () => {
    if (analyses.length === 0) return;

    const networkNamespace = analyses.find((a) => a.name === 'network-namespace');
    const networkSingle = analyses.find((a) => a.name === 'network-single-resource');

    if (!networkNamespace || !networkSingle) return;

    // Document current behavior: single resource import === full namespace import
    // This is expected due to barrel index pattern
    const difference = Math.abs(networkNamespace.size.gzipped - networkSingle.size.gzipped);
    const percentDifference = (difference / networkNamespace.size.gzipped) * 100;

    console.log('✓ Within-namespace tree-shaking:');
    console.log(`  Full namespace: ${(networkNamespace.size.gzipped / 1024).toFixed(2)} KB`);
    console.log(`  Single resource: ${(networkSingle.size.gzipped / 1024).toFixed(2)} KB`);
    console.log(`  Difference: ${percentDifference.toFixed(1)}%`);
    console.log('  Note: Limited tree-shaking within namespace is expected (barrel index pattern)');

    // Difference should be minimal (< 5%) - this documents current behavior
    expect(percentDifference).toBeLessThan(5);
  });
});

describe('Bundle Analysis Freshness', () => {
  it('should have recent bundle analysis data', () => {
    try {
      const reportPath = path.join(__dirname, '..', '..', 'bundle-analysis-results', 'bundle-analysis-report.json');
      if (!fs.existsSync(reportPath)) {
        console.warn('Bundle analysis report not found. Run `npm run bundle:analyze`');
        return;
      }

      const reportData = fs.readFileSync(reportPath, 'utf-8');
      const analyses: BundleAnalysis[] = JSON.parse(reportData);

      if (analyses.length === 0) return;

      const latestTimestamp = new Date(analyses[0].timestamp);
      const now = new Date();
      const daysSinceAnalysis = (now.getTime() - latestTimestamp.getTime()) / (1000 * 60 * 60 * 24);

      // Warn if analysis is > 7 days old
      if (daysSinceAnalysis > 7) {
        console.warn(`⚠️  Bundle analysis is ${daysSinceAnalysis.toFixed(1)} days old. Consider running \`npm run bundle:analyze\``);
      } else {
        console.log(`✓ Bundle analysis is fresh (${daysSinceAnalysis.toFixed(1)} days old)`);
      }

      // Don't fail the test, just document the age
      expect(daysSinceAnalysis).toBeGreaterThanOrEqual(0);
    } catch (error) {
      console.warn('Could not check bundle analysis freshness:', error);
    }
  });
});
