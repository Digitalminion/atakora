#!/usr/bin/env node
/**
 * Simple Synthesis Test
 * Tests the current synthesis pipeline with a minimal backend
 */

import { defineBackend, defineSchema, a, c } from './packages/component/dist/index.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🚀 Testing synthesis with minimal backend...\n');

  // Create a minimal backend
  const backend = defineBackend({
    schema: defineSchema({
      schema: a.schema({
        User: c.model({
          id: a.id(),
          email: a.string(),
          name: a.string(),
        }),
      }),
    }),
    settings: {
      name: 'test-app',
      environment: 'development',
      region: 'eastus',
      organization: 'testorg',
      instance: '01',
      geography: 'eus',
    },
  });

  console.log('✅ Backend defined successfully');
  console.log(`   Name: ${backend.settings.name}`);
  console.log(`   Environment: ${backend.settings.environment}`);
  console.log(`   Region: ${backend.settings.region}\n`);

  // Try to use the synthesize function
  try {
    const { synthesize } = await import('./packages/component/dist/synthesis/index.js');
    console.log('📦 Synthesis module loaded');

    console.log('🔄 Running synthesis...\n');
    const result = await synthesize(backend);

    console.log('✅ Synthesis complete!');
    console.log(`   Template: ${result.armTemplate ? 'Generated' : 'Not generated'}`);
    console.log(`   Functions: ${result.functions ? 'Generated' : 'Not generated'}`);
    console.log(`   Schemas: ${result.schemas ? 'Generated' : 'Not generated'}`);

    // Write output
    const outdir = './arm.out';
    if (!fs.existsSync(outdir)) {
      fs.mkdirSync(outdir, { recursive: true });
    }

    if (result.armTemplate) {
      const templatePath = path.join(outdir, 'test-app.json');
      fs.writeFileSync(templatePath, JSON.stringify(result.armTemplate, null, 2));
      console.log(`\n📄 ARM template written to: ${templatePath}`);

      // Show resource summary
      if (result.armTemplate.resources) {
        console.log(`\n📋 Generated Resources:`);
        result.armTemplate.resources.forEach((resource, index) => {
          console.log(`   ${index + 1}. ${resource.type} - ${resource.name}`);
        });
      }
    }

    if (result.schemas?.openapi) {
      const schemaPath = path.join(outdir, 'openapi.json');
      fs.writeFileSync(schemaPath, JSON.stringify(result.schemas.openapi, null, 2));
      console.log(`\n📄 OpenAPI spec written to: ${schemaPath}`);
    }

  } catch (error) {
    console.error('❌ Synthesis failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
