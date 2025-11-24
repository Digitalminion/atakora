/**
 * Basic Synthesis Example
 *
 * Demonstrates how to use the synthesis system to generate ARM templates
 * from backend definitions.
 */

import { synthesize, synthesizeToFile, synthesizeToDirectory } from '../index';

// Mock backend creation (replace with actual backend imports in real usage)
function createExampleBackend(): any {
  return {
    schema: {
      models: {
        User: {
          _modelType: 'crud',
          definition: {
            id: { type: 'id' },
            email: { type: 'string' },
            name: { type: 'string' },
            createdAt: { type: 'datetime' },
          },
        },
        Post: {
          _modelType: 'crud',
          definition: {
            id: { type: 'id' },
            title: { type: 'string' },
            content: { type: 'string' },
            authorId: { type: 'ref', modelName: 'User' },
            publishedAt: { type: 'datetime' },
          },
        },
      },
      _schemaInput: { schema: {} } as any,
    },
    authentication: {
      providers: {
        Primary: { type: 'entra' },
      },
    },
    settings: {
      name: 'my-blog-app',
      region: 'eastus',
      resourceGroup: 'my-blog-rg',
      tags: {
        environment: 'production',
        team: 'platform',
      },
      features: {
        monitoring: true,
        networking: false,
        performance: false,
      },
    },
    environment: 'production',
    storage: {
      account: createMockAttachmentPoint(),
      database: createMockAttachmentPoint(),
      blobs: createMockAttachmentPoint(),
    },
    compute: {
      functionApp: createMockAttachmentPoint(),
    },
    models: {},
    _metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      environment: 'production',
      modelCount: 2,
      hasAuthentication: true,
      enabledFeatures: ['monitoring'],
    },
    _attachments: new Map(),
    _defaults: {},
  };
}

function createMockAttachmentPoint(): any {
  return {
    attach: () => {},
    isAttached: () => false,
    getConfig: () => ({}),
    reset: () => {},
    _default: {},
    _path: 'mock',
  };
}

/**
 * Example 1: Basic synthesis to memory
 */
async function example1() {
  console.log('Example 1: Basic synthesis to memory\n');

  const backend = createExampleBackend();

  const result = await synthesize(backend);

  console.log('Synthesis complete!');
  console.log(`- Resources: ${result.resourceCount}`);
  console.log(`- CRUD models: ${result.analysis.models.crud.length}`);
  console.log(`- Environment: ${result.context.environment}`);
  console.log(`- Cloud type: ${result.context.cloudType}`);
  console.log('\nGenerated ARM template:');
  console.log(JSON.stringify(result.template, null, 2).substring(0, 500) + '...\n');
}

/**
 * Example 2: Synthesis to file
 */
async function example2() {
  console.log('Example 2: Synthesis to file\n');

  const backend = createExampleBackend();

  await synthesizeToFile(backend, './output/template.json', {
    prettyPrint: true,
    writeMetadata: true,
  });

  console.log('Files created:');
  console.log('- ./output/template.json');
  console.log('- ./output/template.metadata.json\n');
}

/**
 * Example 3: Synthesis to directory with deployment script
 */
async function example3() {
  console.log('Example 3: Synthesis to directory\n');

  const backend = createExampleBackend();

  await synthesizeToDirectory(backend, './output');

  console.log('Files created:');
  console.log('- ./output/template.json');
  console.log('- ./output/parameters.json');
  console.log('- ./output/template.metadata.json');
  console.log('- ./output/deploy.sh');
  console.log('\nRun ./output/deploy.sh to deploy to Azure\n');
}

/**
 * Example 4: Environment-specific synthesis
 */
async function example4() {
  console.log('Example 4: Environment-specific synthesis\n');

  const backend = createExampleBackend();

  // Synthesize for development
  const devResult = await synthesize(backend, { environment: 'development' });
  console.log(`Development: ${devResult.resourceCount} resources`);

  // Synthesize for staging
  const stagingResult = await synthesize(backend, { environment: 'staging' });
  console.log(`Staging: ${stagingResult.resourceCount} resources`);

  // Synthesize for production
  const prodResult = await synthesize(backend, { environment: 'production' });
  console.log(`Production: ${prodResult.resourceCount} resources\n`);
}

/**
 * Example 5: Synthesis with custom configuration
 */
async function example5() {
  console.log('Example 5: Synthesis with custom configuration\n');

  const backend = createExampleBackend();

  // Attach custom Cosmos DB configuration
  backend.storage.database = {
    attach: () => {},
    isAttached: () => true,
    getConfig: () => ({
      throughput: 2000,
      consistencyLevel: 'Strong',
      enableMultiRegion: true,
    }),
    reset: () => {},
    _default: {},
    _attached: {
      throughput: 2000,
      consistencyLevel: 'Strong',
      enableMultiRegion: true,
    },
    _path: 'storage.database',
  };

  const result = await synthesize(backend);

  console.log('Synthesis with custom configuration complete!');
  console.log(`- Resources: ${result.resourceCount}`);
  console.log(`- Attachments: ${result.analysis.attachments.storage.length}\n`);
}

/**
 * Main function - run all examples
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Backend Synthesis Examples');
  console.log('='.repeat(60));
  console.log();

  try {
    await example1();
    await example2();
    await example3();
    await example4();
    await example5();

    console.log('='.repeat(60));
    console.log('All examples completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run examples if executed directly
if (require.main === module) {
  main();
}

export { example1, example2, example3, example4, example5 };
