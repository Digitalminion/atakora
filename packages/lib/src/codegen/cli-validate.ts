#!/usr/bin/env node
/**
 * CLI tool for generating validation code from ARM schemas.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SchemaParser } from './schema-parser';
import { ValidationGenerator } from './validation-generator';

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npm run codegen:validate <schema-path> [output-path]');
    console.log('');
    console.log('Example:');
    console.log(
      '  npm run codegen:validate ../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
    );
    process.exit(1);
  }

  const schemaPath = path.resolve(args[0]);
  const outputPath = args[1]
    ? path.resolve(args[1])
    : path.join(
        __dirname,
        '../generated/validation',
        path.basename(schemaPath).replace('.json', '.validators.ts')
      );

  console.log(`Parsing schema: ${schemaPath}`);

  const parser = new SchemaParser();
  const ir = parser.parse(schemaPath);

  console.log(`Provider: ${ir.provider}`);
  console.log(`API Version: ${ir.apiVersion}`);
  console.log(`Resources: ${ir.resources.length}`);
  console.log('');

  console.log('Generating validation code...');
  const generator = new ValidationGenerator();
  const code = generator.generate(ir);

  console.log(`Generated ${code.split('\n').length} lines of code`);
  console.log('');

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output file
  fs.writeFileSync(outputPath, code, 'utf-8');

  console.log(`✓ Validators written to: ${outputPath}`);
}

main();
