#!/usr/bin/env node
/**
 * CLI tool for generating L1 construct implementations from ARM schemas.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SchemaParser } from './schema-parser';
import { ResourceFactory } from './resource-factory';

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npm run codegen:resource <schema-path> <resource-index> [output-dir]');
    console.log('');
    console.log('Arguments:');
    console.log('  schema-path    - Path to ARM schema JSON file');
    console.log('  resource-index - Index of resource to generate (0-based)');
    console.log('  output-dir     - Output directory for generated files (optional)');
    console.log('');
    console.log('Example:');
    console.log(
      '  npm run codegen:resource ../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Storage.json 0'
    );
    console.log('');
    console.log('To see available resources, run without resource-index:');
    console.log(
      '  npm run codegen:resource ../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Storage.json'
    );
    process.exit(1);
  }

  const schemaPath = path.resolve(args[0]);
  const resourceIndex = args[1] ? parseInt(args[1], 10) : undefined;
  const outputDir = args[2] ? path.resolve(args[2]) : path.join(__dirname, '../resources');

  console.log(`Parsing schema: ${schemaPath}`);

  const parser = new SchemaParser();
  const ir = parser.parse(schemaPath);

  console.log(`Provider: ${ir.provider}`);
  console.log(`API Version: ${ir.apiVersion}`);
  console.log(`Resources: ${ir.resources.length}`);
  console.log('');

  // If no resource index provided, list available resources
  if (resourceIndex === undefined) {
    console.log('Available resources:');
    ir.resources.forEach((resource, index) => {
      console.log(`  [${index}] ${resource.armType}`);
      console.log(`      Name: ${resource.name}`);
      if (resource.description) {
        console.log(`      Description: ${resource.description.substring(0, 100)}...`);
      }
      console.log('');
    });
    console.log(
      'Run with resource index to generate: npm run codegen:resource <schema-path> <index>'
    );
    process.exit(0);
  }

  // Validate resource index
  if (resourceIndex < 0 || resourceIndex >= ir.resources.length) {
    console.error(
      `Error: Invalid resource index ${resourceIndex}. Must be 0-${ir.resources.length - 1}`
    );
    process.exit(1);
  }

  const resource = ir.resources[resourceIndex];

  console.log(`Generating L1 construct for: ${resource.armType}`);
  console.log('');

  const factory = new ResourceFactory();
  const code = factory.generateResource(resource, ir);

  console.log(`Generated ${code.split('\n').length} lines of code`);
  console.log('');

  // Create output filename
  const resourceName = resource.name.toLowerCase().replace(/\//g, '-');
  const outputPath = path.join(outputDir, resourceName, `arm-${resourceName}.ts`);

  // Ensure output directory exists
  const resourceDir = path.dirname(outputPath);
  if (!fs.existsSync(resourceDir)) {
    fs.mkdirSync(resourceDir, { recursive: true });
  }

  // Write output file
  fs.writeFileSync(outputPath, code, 'utf-8');

  console.log(`✓ L1 construct written to: ${outputPath}`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Create types file: ${resourceName}/types.ts`);
  console.log(`  2. Create L2 construct: ${resourceName}/${resourceName}.ts`);
  console.log(`  3. Create tests: ${resourceName}/arm-${resourceName}.test.ts`);
  console.log(`  4. Add exports to index.ts`);
}

main();
