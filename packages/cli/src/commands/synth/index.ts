import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';

export function createSynthCommand(): Command {
  const synth = new Command('synth')
    .description('Synthesize ARM templates from TypeScript constructs')
    .argument('[app]', 'Path to app file (e.g., bin/app.ts)', 'bin/app.ts')
    .option('-o, --output <dir>', 'Output directory for synthesized templates', 'arm.out')
    .option('--skip-validation', 'Skip template validation')
    .option('--validate-only', 'Validate templates without writing files')
    .option('--stack <stack>', 'Only synthesize specific stack(s)', collectStacks, [])
    .option('--single-file', 'Merge all stacks into a single template with nested deployments')
    .action(async (appPath, options) => {
      const spinner = ora('Loading application...').start();

      try {
        // Resolve app path
        const resolvedAppPath = path.resolve(appPath);

        if (!fs.existsSync(resolvedAppPath)) {
          spinner.fail(chalk.red(`App file not found: ${appPath}`));
          console.log(
            chalk.cyan('\nMake sure your app file exists at the specified path')
          );
          process.exit(1);
        }

        spinner.text = 'Compiling TypeScript...';

        // Import and execute the app using tsx
        const { execSync } = require('child_process');
        const path_module = require('path');
        const tsxPath = path_module.join(require.resolve('tsx'), '../cli.mjs');

        // Create a temporary synthesis script
        const synthScript = `
          (async () => {
            try {
              const appModule = require('${resolvedAppPath.replace(/\\/g, '/')}');
              const app = appModule.app || appModule.default;

              if (!app) {
                throw new Error('App file must export an "app" or default export');
              }

              if (typeof app.synth !== 'function') {
                throw new Error('Exported app must have a synth() method');
              }

              // Set output directory
              app.outdir = '${options.output}';

              // Synthesize
              const assembly = await app.synth();

              // Output result as JSON
              console.log(JSON.stringify(assembly, null, 2));
            } catch (error) {
              console.error('Synthesis error:', error);
              process.exit(1);
            }
          })();
        `;

        const tempScriptPath = path.join(process.cwd(), '.synth-temp.js');
        fs.writeFileSync(tempScriptPath, synthScript);

        spinner.text = 'Synthesizing templates...';

        let synthOutput: string;
        try {
          synthOutput = execSync(`node "${tsxPath}" "${tempScriptPath}"`, {
            encoding: 'utf-8',
            cwd: process.cwd(),
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          });
        } catch (execError: any) {
          // Clean up temp script before throwing
          if (fs.existsSync(tempScriptPath)) {
            fs.unlinkSync(tempScriptPath);
          }

          // Include all output in error message
          const errorOutput = [
            execError.stdout ? `stdout: ${execError.stdout}` : '',
            execError.stderr ? `stderr: ${execError.stderr}` : ''
          ].filter(Boolean).join('\n');

          throw new Error(`Synthesis execution failed (exit code ${execError.status}):\n${errorOutput || execError.message}`);
        }

        // Clean up temp script
        if (fs.existsSync(tempScriptPath)) {
          fs.unlinkSync(tempScriptPath);
        }

        // Parse synthesis result
        const assembly = JSON.parse(synthOutput.trim());

        // If single-file flag is set, merge templates
        if (options.singleFile) {
          mergeSingleFile(assembly, options);
        }

        spinner.succeed(chalk.green('Templates synthesized successfully'));

        // Display synthesis results
        displaySynthesisResults(assembly, options);

      } catch (error) {
        spinner.fail(chalk.red('Synthesis failed'));

        if (error instanceof Error) {
          console.error(chalk.red('\nError: ' + error.message));

          // Show stack trace for debugging
          if (process.env.DEBUG) {
            console.error(chalk.gray('\n' + error.stack));
          } else {
            console.log(chalk.gray('\nRun with DEBUG=1 for full stack trace'));
          }
        } else {
          console.error(chalk.red('\nUnknown error occurred'));
        }

        process.exit(1);
      }
    });

  return synth;
}

/**
 * Collect multiple --stack options into an array.
 */
function collectStacks(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

/**
 * Display synthesis results in a formatted table.
 */
function displaySynthesisResults(assembly: any, options: any): void {
  console.log(chalk.bold('\n📦 Synthesis Results'));
  console.log(chalk.gray('═'.repeat(80)));

  // Convert stacks object to array if needed
  const stacks = Array.isArray(assembly.stacks)
    ? assembly.stacks
    : assembly.stacks
    ? Object.values(assembly.stacks)
    : [];

  if (stacks.length === 0) {
    console.log(chalk.yellow('\n⚠ No stacks found in assembly'));
    return;
  }

  console.log(chalk.cyan(`\nOutput directory: ${assembly.directory}`));
  console.log(chalk.cyan(`Stacks: ${stacks.length}\n`));

  // Display each stack
  for (const stack of stacks) {
    const stackName = stack.stackName || stack.name || 'Unknown';
    console.log(chalk.bold(`📚 ${stackName}`));
    console.log(chalk.gray('─'.repeat(80)));

    // Stack metadata
    console.log(`  ${chalk.dim('Resources:')}    ${chalk.white(stack.resourceCount || 0)}`);
    console.log(`  ${chalk.dim('Parameters:')}   ${chalk.white(stack.parameterCount || 0)}`);
    console.log(`  ${chalk.dim('Outputs:')}      ${chalk.white(stack.outputCount || 0)}`);
    console.log(`  ${chalk.dim('Template:')}     ${chalk.white(stack.templatePath)}`);

    // Check for warnings
    if (stack.metadata?.templateSize > 3 * 1024 * 1024) {
      console.log(chalk.yellow(`  ⚠ Warning: Template size approaching 4MB limit`));
    }

    if (stack.metadata?.resourceCount > 700) {
      console.log(chalk.yellow(`  ⚠ Warning: Resource count approaching 800 limit`));
    }

    console.log('');
  }

  // Validation warnings/errors
  if (assembly.validation) {
    if (assembly.validation.warnings && assembly.validation.warnings.length > 0) {
      console.log(chalk.yellow.bold('\n⚠ Warnings:'));
      for (const warning of assembly.validation.warnings) {
        console.log(chalk.yellow(`  • ${warning.path}: ${warning.message}`));
      }
    }

    if (assembly.validation.errors && assembly.validation.errors.length > 0) {
      console.log(chalk.red.bold('\n✗ Errors:'));
      for (const error of assembly.validation.errors) {
        console.log(chalk.red(`  • ${error.path}: ${error.message}`));
        if (error.fix) {
          console.log(chalk.gray(`    💡 ${error.fix}`));
        }
      }
    }
  }

  console.log(chalk.gray('═'.repeat(80)));

  if (options.validateOnly) {
    console.log(chalk.cyan('\n✓ Validation complete (templates not written)'));
  } else {
    console.log(chalk.green(`\n✓ Templates written to ${assembly.directory}`));
    console.log(chalk.cyan('\nNext steps:'));
    console.log(chalk.white(`  • Review templates: ${chalk.bold('ls ' + assembly.directory)}`));
    console.log(chalk.white(`  • Deploy to Azure: ${chalk.bold('azure-arm deploy')}`));
  }
}

/**
 * Merge all stacks into a single template with nested deployments.
 */
function mergeSingleFile(assembly: any, options: any): void {
  const stacks = Array.isArray(assembly.stacks)
    ? assembly.stacks
    : assembly.stacks
    ? Object.values(assembly.stacks)
    : [];

  if (stacks.length === 0) {
    return;
  }

  // Load all templates and categorize them
  const subscriptionTemplates: any[] = [];
  const resourceGroupTemplates: any[] = [];
  let resourceGroupName: string | null = null;

  for (const stack of stacks) {
    const templatePath = path.join(assembly.directory, stack.templatePath);
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

    // Check if this is a subscription-scoped template
    const isSubscriptionScope = template.$schema?.includes('subscriptionDeploymentTemplate');

    if (isSubscriptionScope) {
      subscriptionTemplates.push({ stack, template });

      // Try to extract resource group name from subscription template
      if (!resourceGroupName) {
        resourceGroupName = extractResourceGroupNameFromTemplate(template);
      }
    } else {
      resourceGroupTemplates.push({ stack, template });
    }
  }

  // Create merged template starting with subscription schema
  const mergedTemplate: any = {
    "$schema": "https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "resources": [],
    "parameters": {},
    "outputs": {}
  };

  // Add subscription-level resources first
  for (const { template } of subscriptionTemplates) {
    mergedTemplate.resources.push(...(template.resources || []));
    Object.assign(mergedTemplate.parameters, template.parameters || {});
    Object.assign(mergedTemplate.outputs, template.outputs || {});
  }

  // Add resource group templates as nested deployments
  for (const { stack, template } of resourceGroupTemplates) {
    if (resourceGroupName) {
      // Create nested deployment
      const nestedDeployment = {
        "type": "Microsoft.Resources/deployments",
        "apiVersion": "2021-04-01",
        "name": `${stack.name}-deployment`,
        "resourceGroup": resourceGroupName,
        "dependsOn": [
          `[resourceId('Microsoft.Resources/resourceGroups', '${resourceGroupName}')]`
        ],
        "properties": {
          "mode": "Incremental",
          "template": template
        }
      };

      mergedTemplate.resources.push(nestedDeployment);
    } else {
      console.warn(chalk.yellow(`Warning: Could not determine resource group for stack ${stack.name}, skipping nested deployment`));
    }
  }

  // Write merged template
  const mergedPath = path.join(assembly.directory, 'merged-template.json');
  fs.writeFileSync(mergedPath, JSON.stringify(mergedTemplate, null, 2));

  console.log(chalk.green(`\n✓ Single-file template written to ${mergedPath}`));
}

/**
 * Extract resource group name from subscription template resources.
 */
function extractResourceGroupNameFromTemplate(template: any): string | null {
  const resources = template.resources || [];

  // Find the first resource group resource
  const rgResource = resources.find((r: any) =>
    r.type === 'Microsoft.Resources/resourceGroups'
  );

  return rgResource?.name || null;
}

/**
 * Format bytes into human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
