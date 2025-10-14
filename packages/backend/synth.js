/**
 * Direct synthesis script for backend package
 * Generates ARM templates without requiring CLI
 */

const path = require('path');
const fs = require('fs');

// Load the backend infrastructure
const backend = require('./dist/index.js');

console.log('Starting ARM template synthesis...\n');

try {
  // Get the app from the backend
  const app = backend.app;

  if (!app) {
    throw new Error('App not found in backend exports');
  }

  console.log('✓ Backend app loaded');
  console.log('✓ Geography:', process.env.AZURE_GEOGRAPHY || 'eastus2');
  console.log('✓ Environment:', process.env.AZURE_ENVIRONMENT || process.env.NODE_ENV || 'nonprod');
  console.log('✓ Subscription ID:', process.env.AZURE_SUBSCRIPTION_ID || '00000000-0000-0000-0000-000000000000');
  console.log('');

  // Synthesize the app to ARM templates
  console.log('Synthesizing ARM templates...');
  const assembly = app.synth();

  console.log('\n✓ Synthesis complete!');
  console.log('');
  console.log('Generated artifacts:');
  console.log('  Output directory:', assembly.directory);

  // List all generated stacks/templates
  const stacks = assembly.stacks;
  console.log('  Stacks generated:', stacks.length);

  stacks.forEach((stack, index) => {
    console.log(`\n  Stack ${index + 1}: ${stack.stackName}`);
    console.log(`    Template file: ${stack.templateFile}`);
    console.log(`    Template path: ${path.join(assembly.directory, stack.templateFile)}`);

    // Read and display template size
    const templatePath = path.join(assembly.directory, stack.templateFile);
    if (fs.existsSync(templatePath)) {
      const stats = fs.statSync(templatePath);
      console.log(`    Template size: ${(stats.size / 1024).toFixed(2)} KB`);

      // Parse and show resource count
      try {
        const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
        const resourceCount = template.resources ? Object.keys(template.resources).length : 0;
        console.log(`    Resources: ${resourceCount}`);
      } catch (e) {
        console.log(`    Resources: Unable to count`);
      }
    }
  });

  console.log('\n✓ ARM templates ready for review');
  console.log('');

} catch (error) {
  console.error('✗ Synthesis failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
