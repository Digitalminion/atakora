/**
 * Direct synthesis script for backend package
 * Generates ARM templates without requiring CLI
 */

const path = require('path');
const fs = require('fs');

// Load the backend infrastructure
const backend = require('./dist/index.js');

console.log('Starting ARM template synthesis...\n');

(async () => {
  try {
    // Get the app from the backend
    const app = backend.app;

    if (!app) {
      throw new Error('App not found in backend exports');
    }

    console.log('✓ Backend app loaded');
    console.log('✓ Geography:', process.env.AZURE_GEOGRAPHY || 'eastus2');
    console.log(
      '✓ Environment:',
      process.env.AZURE_ENVIRONMENT || process.env.NODE_ENV || 'nonprod'
    );
    console.log(
      '✓ Subscription ID:',
      process.env.AZURE_SUBSCRIPTION_ID || '00000000-0000-0000-0000-000000000000'
    );
    console.log('');

    // Synthesize the app to ARM templates
    console.log('Synthesizing ARM templates...');
    const assembly = await app.synth();

    console.log('\n✓ Synthesis complete!');
    console.log('');
    console.log('Assembly object:', JSON.stringify(assembly, null, 2).substring(0, 500));
    console.log('');
    console.log('Generated artifacts:');
    console.log('  Output directory:', assembly.directory);

    // List all generated stacks/templates
    const stacks = assembly.stacks;
    const stackNames = Object.keys(stacks);
    console.log('  Stacks generated:', stackNames.length);

    stackNames.forEach((stackName, index) => {
      const stack = stacks[stackName];
      console.log(`\n  Stack ${index + 1}: ${stack.name}`);
      console.log(`    Template file: ${stack.templatePath}`);
      console.log(`    Template path: ${path.join(assembly.directory, stack.templatePath)}`);

      // Read and display template size
      const templatePath = path.join(assembly.directory, stack.templatePath);
      if (fs.existsSync(templatePath)) {
        const stats = fs.statSync(templatePath);
        console.log(`    Template size: ${(stats.size / 1024).toFixed(2)} KB`);

        // Parse and show resource count
        try {
          const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
          const resourceCount = template.resources ? template.resources.length : 0;
          console.log(`    Resources: ${resourceCount}`);
        } catch (e) {
          console.log(`    Resources: Unable to count`);
        }
      }

      // Show linked templates if any
      if (stack.linkedTemplates && stack.linkedTemplates.length > 0) {
        console.log(`    Linked templates: ${stack.linkedTemplates.length}`);
        stack.linkedTemplates.forEach((linkedTemplate) => {
          console.log(`      - ${linkedTemplate}`);
        });
      }

      // Show function packages if any
      if (
        stack.artifacts &&
        stack.artifacts.functionPackages &&
        stack.artifacts.functionPackages.length > 0
      ) {
        console.log(`    Function packages: ${stack.artifacts.functionPackages.length}`);
        stack.artifacts.functionPackages.forEach((pkg) => {
          console.log(`      - ${pkg.functionAppName}: ${pkg.functions.length} functions`);
        });
      }
    });

    console.log('\n✓ ARM templates ready for review');
    console.log('');
  } catch (error) {
    console.error('✗ Synthesis failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})().catch((error) => {
  console.error('✗ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
