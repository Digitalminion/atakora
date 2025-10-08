#!/usr/bin/env node
/**
 * Schema Sync Pipeline - Detects and processes ARM schema updates.
 *
 * @packageDocumentation
 */

import * as fs from 'fs';
import * as path from 'path';
import { SchemaParser } from './schema-parser';
import { TypeGenerator } from './type-generator';
import { ValidationGenerator } from './validation-generator';

interface SchemaConfig {
  /**
   * Path to Azure Resource Manager schemas directory.
   */
  schemasDir: string;

  /**
   * Output directory for generated TypeScript types.
   */
  typesOutputDir: string;

  /**
   * Output directory for generated validation code.
   */
  validationOutputDir: string;

  /**
   * Schema files to process (glob patterns).
   */
  schemaPatterns: string[];
}

interface ProcessResult {
  schemaPath: string;
  provider: string;
  apiVersion: string;
  typesGenerated: boolean;
  validationGenerated: boolean;
  error?: string;
}

/**
 * Schema Sync Pipeline for continuous ARM schema updates.
 *
 * @remarks
 * Monitors ARM schema directory and regenerates TypeScript types
 * and validation code when schemas change.
 */
export class SchemaSyncPipeline {
  private config: SchemaConfig;
  private parser: SchemaParser;
  private typeGen: TypeGenerator;
  private validationGen: ValidationGenerator;

  constructor(config: SchemaConfig) {
    this.config = config;
    this.parser = new SchemaParser();
    this.typeGen = new TypeGenerator();
    this.validationGen = new ValidationGenerator();
  }

  /**
   * Process all schemas in the configured directory.
   *
   * @returns Array of processing results
   */
  public async processAllSchemas(): Promise<ProcessResult[]> {
    const results: ProcessResult[] = [];

    console.log('🔍 Scanning for ARM schemas...');
    console.log(`  Directory: ${this.config.schemasDir}`);
    console.log('');

    const schemaFiles = this.findSchemaFiles();

    console.log(`Found ${schemaFiles.length} schema files`);
    console.log('');

    for (const schemaPath of schemaFiles) {
      const result = await this.processSchema(schemaPath);
      results.push(result);
    }

    return results;
  }

  /**
   * Process a single schema file.
   *
   * @param schemaPath - Path to schema JSON file
   * @returns Processing result
   */
  private async processSchema(schemaPath: string): Promise<ProcessResult> {
    const result: ProcessResult = {
      schemaPath,
      provider: '',
      apiVersion: '',
      typesGenerated: false,
      validationGenerated: false,
    };

    try {
      console.log(`📄 Processing: ${path.basename(schemaPath)}`);

      // Parse schema
      const ir = this.parser.parse(schemaPath);
      result.provider = ir.provider;
      result.apiVersion = ir.apiVersion;

      console.log(`  Provider: ${ir.provider}`);
      console.log(`  API Version: ${ir.apiVersion}`);
      console.log(`  Resources: ${ir.resources.length}`);

      // Generate TypeScript types
      const typesCode = this.typeGen.generate(ir);
      const typesOutputPath = this.getTypesOutputPath(schemaPath);

      this.ensureDirectoryExists(path.dirname(typesOutputPath));
      fs.writeFileSync(typesOutputPath, typesCode, 'utf-8');

      result.typesGenerated = true;
      console.log(`  ✓ Types: ${path.basename(typesOutputPath)}`);

      // Generate validation code
      const validationCode = this.validationGen.generate(ir);
      const validationOutputPath = this.getValidationOutputPath(schemaPath);

      this.ensureDirectoryExists(path.dirname(validationOutputPath));
      fs.writeFileSync(validationOutputPath, validationCode, 'utf-8');

      result.validationGenerated = true;
      console.log(`  ✓ Validation: ${path.basename(validationOutputPath)}`);

      console.log('');
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Error: ${result.error}`);
      console.log('');
    }

    return result;
  }

  /**
   * Find all schema files matching configured patterns.
   *
   * @returns Array of schema file paths
   */
  private findSchemaFiles(): string[] {
    const schemaFiles: string[] = [];

    // For now, look for all .json files in schemas directory
    const walkDir = (dir: string) => {
      if (!fs.existsSync(dir)) {
        return;
      }

      const files = fs.readdirSync(dir);

      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (file.endsWith('.json')) {
          // Filter by schema patterns if configured
          const shouldInclude =
            this.config.schemaPatterns.length === 0 ||
            this.config.schemaPatterns.some((pattern) => {
              return fullPath.includes(pattern);
            });

          if (shouldInclude) {
            schemaFiles.push(fullPath);
          }
        }
      }
    };

    walkDir(this.config.schemasDir);
    return schemaFiles;
  }

  /**
   * Get output path for generated types.
   *
   * @param schemaPath - Input schema path
   * @returns Output path for TypeScript types
   */
  private getTypesOutputPath(schemaPath: string): string {
    const fileName = path.basename(schemaPath).replace('.json', '.ts');
    return path.join(this.config.typesOutputDir, fileName);
  }

  /**
   * Get output path for generated validation code.
   *
   * @param schemaPath - Input schema path
   * @returns Output path for validation code
   */
  private getValidationOutputPath(schemaPath: string): string {
    const baseName = path.basename(schemaPath).replace('.json', '');
    const fileName = `${baseName}.validators.ts`;
    return path.join(this.config.validationOutputDir, fileName);
  }

  /**
   * Ensure directory exists, creating if necessary.
   *
   * @param dir - Directory path
   */
  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Generate summary report of processing results.
   *
   * @param results - Processing results
   * @returns Formatted summary
   */
  public generateReport(results: ProcessResult[]): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('📊 Schema Sync Summary');
    lines.push('═══════════════════════');
    lines.push('');

    const successful = results.filter((r) => !r.error);
    const failed = results.filter((r) => r.error);

    lines.push(`Total schemas processed: ${results.length}`);
    lines.push(`✓ Successful: ${successful.length}`);
    lines.push(`❌ Failed: ${failed.length}`);
    lines.push('');

    if (successful.length > 0) {
      lines.push('Successfully processed:');
      for (const result of successful) {
        lines.push(`  ✓ ${result.provider} (${result.apiVersion})`);
      }
      lines.push('');
    }

    if (failed.length > 0) {
      lines.push('Failed to process:');
      for (const result of failed) {
        lines.push(`  ❌ ${path.basename(result.schemaPath)}`);
        lines.push(`     Error: ${result.error}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * CLI entry point.
 */
async function main() {
  const args = process.argv.slice(2);

  // Default configuration
  const config: SchemaConfig = {
    schemasDir: args[0] || '../azure-resource-manager-schemas-main/schemas',
    typesOutputDir: path.join(__dirname, '../generated/types'),
    validationOutputDir: path.join(__dirname, '../generated/validation'),
    schemaPatterns: args.slice(1), // Additional args are patterns to match
  };

  console.log('🚀 ARM Schema Sync Pipeline');
  console.log('═══════════════════════════');
  console.log('');
  console.log('Configuration:');
  console.log(`  Schemas: ${config.schemasDir}`);
  console.log(`  Types output: ${config.typesOutputDir}`);
  console.log(`  Validation output: ${config.validationOutputDir}`);

  if (config.schemaPatterns.length > 0) {
    console.log(`  Patterns: ${config.schemaPatterns.join(', ')}`);
  }

  console.log('');

  const pipeline = new SchemaSyncPipeline(config);
  const results = await pipeline.processAllSchemas();
  const report = pipeline.generateReport(results);

  console.log(report);

  // Exit with error code if any failed
  const hasErrors = results.some((r) => r.error);
  process.exit(hasErrors ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
