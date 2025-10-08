import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { TemplateValidator, ValidationSeverity } from '../../validation';

// Types for assembly and manifest
interface StackManifest {
  stackName?: string;
  name?: string;
  resourceCount?: number;
  parameterCount?: number;
  outputCount?: number;
  templatePath: string;
  metadata?: {
    templateSize?: number;
    resourceCount?: number;
  };
}

interface ValidationMessage {
  path: string;
  message: string;
  fix?: string;
}

interface ValidationResults {
  warnings?: ValidationMessage[];
  errors?: ValidationMessage[];
}

interface CloudAssembly {
  stacks: Record<string, StackManifest> | StackManifest[];
  directory: string;
  validation?: ValidationResults;
}

interface ArmResource {
  type: string;
  apiVersion?: string;
  name?: string;
  location?: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ArmTemplate {
  $schema?: string;
  contentVersion?: string;
  resources?: ArmResource[];
  parameters?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  variables?: Record<string, unknown>;
}

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
          console.log(chalk.cyan('\nMake sure your app file exists at the specified path'));
          process.exit(1);
        }

        spinner.text = 'Compiling TypeScript...';

        // Import and execute the app using tsx
        // Find tsx CLI path
        let tsxPath: string;
        try {
          // Use import.meta.resolve in Node 20+, fallback to require.resolve
          const tsxMainPath = require.resolve('tsx');
          tsxPath = path.join(tsxMainPath, '../cli.mjs');
        } catch {
          throw new Error('tsx package not found. Install it with: npm install tsx');
        }

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
        } catch (execError: unknown) {
          // Clean up temp script before throwing
          if (fs.existsSync(tempScriptPath)) {
            fs.unlinkSync(tempScriptPath);
          }

          // Type guard for exec error
          const isExecError = (
            err: unknown
          ): err is { status?: number; stdout?: string; stderr?: string; message?: string } => {
            return typeof err === 'object' && err !== null;
          };

          if (isExecError(execError)) {
            // Include all output in error message
            const errorOutput = [
              execError.stdout ? `stdout: ${execError.stdout}` : '',
              execError.stderr ? `stderr: ${execError.stderr}` : '',
            ]
              .filter(Boolean)
              .join('\n');

            throw new Error(
              `Synthesis execution failed (exit code ${execError.status}):\n${errorOutput || execError.message || 'Unknown error'}`
            );
          }

          throw new Error(`Synthesis execution failed: ${String(execError)}`);
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

        // Validate templates unless skipped
        if (!options.skipValidation) {
          spinner.text = 'Validating templates...';
          spinner.start();

          const validationResults = validateTemplates(assembly);

          if (validationResults.hasErrors) {
            spinner.fail(chalk.red('Template validation failed'));
            console.log(validationResults.formatted);
            process.exit(1);
          } else if (validationResults.hasWarnings) {
            spinner.warn(chalk.yellow('Template validation passed with warnings'));
            console.log(validationResults.formatted);
          } else {
            spinner.succeed(chalk.green('Template validation passed'));
          }
        }

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
function displaySynthesisResults(
  assembly: CloudAssembly,
  options: { validateOnly?: boolean }
): void {
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
    if (stack.metadata?.templateSize && stack.metadata.templateSize > 3 * 1024 * 1024) {
      console.log(chalk.yellow(`  ⚠ Warning: Template size approaching 4MB limit`));
    }

    if (stack.metadata?.resourceCount && stack.metadata.resourceCount > 700) {
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
function mergeSingleFile(assembly: CloudAssembly, _options: unknown): void {
  const stacks = Array.isArray(assembly.stacks)
    ? assembly.stacks
    : assembly.stacks
      ? Object.values(assembly.stacks)
      : [];

  if (stacks.length === 0) {
    return;
  }

  // Load all templates and categorize them
  const subscriptionTemplates: Array<{ stack: StackManifest; template: ArmTemplate }> = [];
  const resourceGroupTemplates: Array<{ stack: StackManifest; template: ArmTemplate }> = [];
  let resourceGroupName: string | null = null;

  for (const stack of stacks) {
    const templatePath = path.join(assembly.directory, stack.templatePath);
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8')) as ArmTemplate;

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
  const mergedTemplate: ArmTemplate = {
    $schema:
      'https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#',
    contentVersion: '1.0.0.0',
    resources: [],
    parameters: {},
    outputs: {},
  };

  // Add subscription-level resources first
  for (const { template } of subscriptionTemplates) {
    if (mergedTemplate.resources && template.resources) {
      mergedTemplate.resources.push(...template.resources);
    }
    if (mergedTemplate.parameters && template.parameters) {
      Object.assign(mergedTemplate.parameters, template.parameters);
    }
    if (mergedTemplate.outputs && template.outputs) {
      Object.assign(mergedTemplate.outputs, template.outputs);
    }
  }

  // Add resource group templates as nested deployments
  for (const { stack, template } of resourceGroupTemplates) {
    if (resourceGroupName) {
      // Create nested deployment
      const nestedDeployment = {
        type: 'Microsoft.Resources/deployments',
        apiVersion: '2021-04-01',
        name: `${stack.name}-deployment`,
        resourceGroup: resourceGroupName,
        dependsOn: [`[resourceId('Microsoft.Resources/resourceGroups', '${resourceGroupName}')]`],
        properties: {
          mode: 'Incremental',
          template: template,
        },
      };

      if (mergedTemplate.resources) {
        mergedTemplate.resources.push(nestedDeployment);
      }
    } else {
      console.warn(
        chalk.yellow(
          `Warning: Could not determine resource group for stack ${stack.name}, skipping nested deployment`
        )
      );
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
function extractResourceGroupNameFromTemplate(template: ArmTemplate): string | null {
  const resources = template.resources || [];

  // Find the first resource group resource
  const rgResource = resources.find((r) => r.type === 'Microsoft.Resources/resourceGroups');

  return rgResource?.name || null;
}

/**
 * Format bytes into human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Validates all templates in the assembly
 */
function validateTemplates(assembly: CloudAssembly): {
  hasErrors: boolean;
  hasWarnings: boolean;
  formatted: string;
} {
  const validator = new TemplateValidator();
  const allResults: Array<{
    severity: ValidationSeverity;
    code: string;
    message: string;
  }> = [];

  // Get stacks as array
  const stacks = Array.isArray(assembly.stacks)
    ? assembly.stacks
    : assembly.stacks
      ? Object.values(assembly.stacks)
      : [];

  // Validate each stack template
  for (const stack of stacks) {
    const templatePath = path.join(assembly.directory, stack.templatePath);

    if (!fs.existsSync(templatePath)) {
      allResults.push({
        severity: ValidationSeverity.ERROR,
        code: 'TemplateNotFound',
        message: `Template file not found: ${templatePath}`,
      });
      continue;
    }

    try {
      const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
      const results = validator.validate({
        template,
        templatePath,
      });

      allResults.push(...results);
    } catch (error) {
      allResults.push({
        severity: ValidationSeverity.ERROR,
        code: 'TemplateParseError',
        message: `Failed to parse template ${stack.templatePath}: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  const hasErrors = allResults.some((r) => r.severity === ValidationSeverity.ERROR);
  const hasWarnings = allResults.some((r) => r.severity === ValidationSeverity.WARNING);

  return {
    hasErrors,
    hasWarnings,
    formatted: validator.formatResults(allResults),
  };
}
