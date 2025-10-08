import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { TemplateValidator, ValidationSeverity } from '../../validation';
import { ManifestManager } from '../../manifest/manifest-manager';
import { isLegacyManifest, type PackageConfiguration } from '../../manifest/types';

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

interface SynthesisResult {
  packageName: string;
  assembly: CloudAssembly;
  success: boolean;
  error?: Error;
}

export function createSynthCommand(): Command {
  const synth = new Command('synth')
    .description('Synthesize ARM templates from TypeScript constructs')
    .option('-p, --package <name>', 'Synthesize a specific package')
    .option('-a, --all', 'Synthesize all enabled packages')
    .option('-o, --output <dir>', 'Output directory (overrides manifest)')
    .option('--skip-validation', 'Skip ARM template validation')
    .option('--validate-only', 'Validate without writing templates')
    .option('--stack <stack>', 'Only synthesize specific stack(s)', collectStacks, [])
    .option('--single-file', 'Merge stacks into one template')
    .addHelpText(
      'after',
      `
${chalk.bold('Description:')}
  Converts your TypeScript infrastructure code into Azure ARM templates.
  Generates deployable JSON templates in the .atakora/arm.out/ directory.

${chalk.bold('Examples:')}
  ${chalk.dim('# Synthesize default package')}
  ${chalk.cyan('$')} atakora synth

  ${chalk.dim('# Synthesize specific package')}
  ${chalk.cyan('$')} atakora synth --package backend

  ${chalk.dim('# Synthesize all packages')}
  ${chalk.cyan('$')} atakora synth --all

  ${chalk.dim('# Synthesize only specific stacks')}
  ${chalk.cyan('$')} atakora synth --stack Foundation --stack Networking

  ${chalk.dim('# Custom output directory')}
  ${chalk.cyan('$')} atakora synth --output ./custom-output

  ${chalk.dim('# Validate without generating files')}
  ${chalk.cyan('$')} atakora synth --validate-only

${chalk.bold('Output Structure:')}
  ${chalk.cyan('.atakora/arm.out/')}
  └── ${chalk.cyan('<package-name>/')}
      ├── Foundation.json       ${chalk.dim('# Subscription-level resources')}
      ├── Networking.json       ${chalk.dim('# Resource group resources')}
      ├── manifest.json         ${chalk.dim('# Stack metadata')}
      └── parameters/           ${chalk.dim('# Parameter files')}

${chalk.bold('Validation:')}
  ${chalk.cyan('•')} Validates ARM template schema and syntax
  ${chalk.cyan('•')} Checks resource name compliance with Azure naming rules
  ${chalk.cyan('•')} Verifies resource dependencies and references
  ${chalk.cyan('•')} Warns about template size and resource limits

${chalk.bold('Related Commands:')}
  ${chalk.white('atakora deploy')}       ${chalk.dim('Deploy synthesized templates to Azure')}
  ${chalk.white('atakora diff')}         ${chalk.dim('Show changes before deployment')}
`
    )
    .action(async (options) => {
      const spinner = ora('Loading manifest...').start();

      try {
        // Load manifest
        const manifestManager = new ManifestManager(process.cwd());

        if (!manifestManager.exists()) {
          spinner.fail(chalk.red('Manifest not found'));
          console.log(
            chalk.cyan('\nNo manifest found. Initialize a project with: ') +
              chalk.bold('atakora init')
          );
          process.exit(1);
        }

        const manifest = manifestManager.read();

        // Determine which packages to synthesize
        const packagesToSynthesize = determinePackages(manifest, options, spinner);

        if (packagesToSynthesize.length === 0) {
          spinner.fail(chalk.red('No packages to synthesize'));
          process.exit(1);
        }

        spinner.succeed(chalk.green('Manifest loaded'));

        // Synthesize each package
        const results: SynthesisResult[] = [];

        for (const pkg of packagesToSynthesize) {
          const packageName = getPackageName(pkg);
          const result = await synthesizePackage(
            packageName,
            pkg,
            manifest,
            options,
            manifestManager
          );
          results.push(result);

          // Exit early on error unless synthesizing all
          if (!result.success && !options.all) {
            process.exit(1);
          }
        }

        // Display summary for multi-package synthesis
        if (results.length > 1) {
          displayMultiPackageSummary(results);
        }

        // Exit with error if any package failed
        if (results.some((r) => !r.success)) {
          process.exit(1);
        }
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
 * Determine which packages to synthesize based on options and manifest
 */
function determinePackages(
  manifest: any,
  options: { package?: string; all?: boolean },
  spinner: any
): any[] {
  const isLegacy = isLegacyManifest(manifest);

  // Handle --all flag
  if (options.all) {
    if (isLegacy) {
      return manifest.packages.filter((pkg: any) => pkg.enabled !== false);
    } else {
      return Object.entries(manifest.packages)
        .filter(([_, pkg]: [string, any]) => pkg.enabled !== false)
        .map(([name, config]: [string, any]) => ({ name, ...config }));
    }
  }

  // Handle --package flag
  if (options.package) {
    if (isLegacy) {
      const pkg = manifest.packages.find((p: any) => p.name === options.package);
      if (!pkg) {
        spinner.fail(chalk.red(`Package '${options.package}' not found in manifest`));
        process.exit(1);
      }
      return [pkg];
    } else {
      const config = manifest.packages[options.package];
      if (!config) {
        spinner.fail(chalk.red(`Package '${options.package}' not found in manifest`));
        process.exit(1);
      }
      return [{ name: options.package, ...config }];
    }
  }

  // Default: synthesize default package
  if (!manifest.defaultPackage) {
    spinner.fail(chalk.red('No default package specified in manifest'));
    console.log(
      chalk.cyan('\nSet a default package with: ') + chalk.bold('atakora set-default <package>')
    );
    process.exit(1);
  }

  if (isLegacy) {
    const pkg = manifest.packages.find((p: any) => p.name === manifest.defaultPackage);
    if (!pkg) {
      spinner.fail(chalk.red(`Default package '${manifest.defaultPackage}' not found`));
      process.exit(1);
    }
    return [pkg];
  } else {
    const config = manifest.packages[manifest.defaultPackage];
    if (!config) {
      spinner.fail(chalk.red(`Default package '${manifest.defaultPackage}' not found`));
      process.exit(1);
    }
    return [{ name: manifest.defaultPackage, ...config }];
  }
}

/**
 * Get package name from package object (handles legacy and modern formats)
 */
function getPackageName(pkg: any): string {
  return pkg.name;
}

/**
 * Synthesize a single package
 */
async function synthesizePackage(
  packageName: string,
  packageConfig: any,
  manifest: any,
  options: any,
  manifestManager: ManifestManager
): Promise<SynthesisResult> {
  const spinner = ora(`Synthesizing package: ${chalk.bold(packageName)}`).start();

  try {
    // Resolve package path
    const packagePath = path.resolve(process.cwd(), packageConfig.path);

    // Determine entry point (legacy uses 'entryPoint', modern uses 'entry')
    const entryPoint = packageConfig.entry || packageConfig.entryPoint || 'bin/app.ts';
    const appPath = path.join(packagePath, entryPoint);

    if (!fs.existsSync(appPath)) {
      throw new Error(`App file not found: ${appPath}`);
    }

    spinner.text = `Compiling TypeScript for ${packageName}...`;

    // Find tsx CLI path
    let tsxPath: string;
    try {
      const tsxMainPath = require.resolve('tsx');
      tsxPath = path.join(tsxMainPath, '../cli.mjs');
    } catch {
      throw new Error('tsx package not found. Install it with: npm install tsx');
    }

    // Determine output directory
    const globalOutputDir =
      options.output || manifest.outputDirectory || ManifestManager.DEFAULT_OUTPUT_DIR;
    const packageOutputDir = path.join(globalOutputDir, packageName);

    // Create a temporary synthesis script
    const synthScript = `
      (async () => {
        try {
          const appModule = require('${appPath.replace(/\\/g, '/')}');
          const app = appModule.app || appModule.default;

          if (!app) {
            throw new Error('App file must export an "app" or default export');
          }

          if (typeof app.synth !== 'function') {
            throw new Error('Exported app must have a synth() method');
          }

          // Set output directory
          app.outdir = '${packageOutputDir.replace(/\\/g, '/')}';

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

    const tempScriptPath = path.join(process.cwd(), `.synth-temp-${packageName}.js`);
    fs.writeFileSync(tempScriptPath, synthScript);

    spinner.text = `Synthesizing templates for ${packageName}...`;

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

    spinner.succeed(chalk.green(`Templates synthesized for ${packageName}`));

    // Validate templates unless skipped
    if (!options.skipValidation) {
      spinner.text = `Validating templates for ${packageName}...`;
      spinner.start();

      const validationResults = validateTemplates(assembly);

      if (validationResults.hasErrors) {
        spinner.fail(chalk.red(`Template validation failed for ${packageName}`));
        console.log(validationResults.formatted);
        return {
          packageName,
          assembly,
          success: false,
          error: new Error('Validation failed'),
        };
      } else if (validationResults.hasWarnings) {
        spinner.warn(chalk.yellow(`Template validation passed with warnings for ${packageName}`));
        console.log(validationResults.formatted);
      } else {
        spinner.succeed(chalk.green(`Template validation passed for ${packageName}`));
      }
    }

    // Display synthesis results
    displaySynthesisResults(assembly, options, packageName);

    return {
      packageName,
      assembly,
      success: true,
    };
  } catch (error) {
    spinner.fail(chalk.red(`Synthesis failed for ${packageName}`));

    if (error instanceof Error) {
      console.error(chalk.red(`\nError in ${packageName}: ` + error.message));

      // Show stack trace for debugging
      if (process.env.DEBUG) {
        console.error(chalk.gray('\n' + error.stack));
      }
    }

    return {
      packageName,
      assembly: { stacks: [], directory: '' },
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Display summary for multi-package synthesis
 */
function displayMultiPackageSummary(results: SynthesisResult[]): void {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(
    chalk.cyan(
      '\n╔═══════════════════════════════════════════════════════════════════════════════╗'
    )
  );
  console.log(
    chalk.cyan('║') +
      chalk.bold.white('  📦 Multi-Package Synthesis Summary'.padEnd(77)) +
      chalk.cyan('║')
  );
  console.log(
    chalk.cyan(
      '╚═══════════════════════════════════════════════════════════════════════════════╝\n'
    )
  );

  console.log(chalk.dim(`   Total:      ${results.length} packages`));
  console.log(chalk.green(`   Successful: ${successful.length}`));
  if (failed.length > 0) {
    console.log(chalk.red(`   Failed:     ${failed.length}`));
  }
  console.log();

  if (successful.length > 0) {
    console.log(chalk.green.bold('✓ Successful:\n'));
    for (const result of successful) {
      const stackCount = Array.isArray(result.assembly.stacks)
        ? result.assembly.stacks.length
        : Object.keys(result.assembly.stacks).length;
      console.log(
        `   ${chalk.green('●')} ${chalk.bold(result.packageName)}  ${chalk.dim(`${stackCount} stack${stackCount !== 1 ? 's' : ''}`)}`
      );
    }
    console.log();
  }

  if (failed.length > 0) {
    console.log(chalk.red.bold('✗ Failed:\n'));
    for (const result of failed) {
      console.log(`   ${chalk.red('●')} ${chalk.bold(result.packageName)}`);
      console.log(chalk.dim(`     ${result.error?.message}`));
    }
    console.log();
  }
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
  options: { validateOnly?: boolean },
  packageName?: string
): void {
  const header = packageName ? `Synthesis Results: ${packageName}` : 'Synthesis Results';
  console.log(
    chalk.cyan(
      '\n╔═══════════════════════════════════════════════════════════════════════════════╗'
    )
  );
  console.log(chalk.cyan('║') + chalk.bold.white(`  📦 ${header}`.padEnd(77)) + chalk.cyan('║'));
  console.log(
    chalk.cyan('╚═══════════════════════════════════════════════════════════════════════════════╝')
  );

  // Convert stacks object to array if needed
  const stacks = Array.isArray(assembly.stacks)
    ? assembly.stacks
    : assembly.stacks
      ? Object.values(assembly.stacks)
      : [];

  if (stacks.length === 0) {
    console.log(chalk.yellow('\n⚠  No stacks found in assembly'));
    return;
  }

  console.log(chalk.dim(`\n   Output: ${assembly.directory}`));
  console.log(chalk.dim(`   Stacks: ${stacks.length}\n`));

  // Display each stack
  for (const stack of stacks) {
    const stackName = stack.stackName || stack.name || 'Unknown';
    console.log(
      chalk.cyan('┌─') +
        chalk.bold.white(` ${stackName} `) +
        chalk.cyan('─'.repeat(75 - stackName.length))
    );

    // Stack metadata in a clean table format
    console.log(chalk.cyan('│'));
    console.log(
      chalk.cyan('│  ') +
        chalk.dim('Resources:  ') +
        chalk.white((stack.resourceCount || 0).toString().padEnd(8)) +
        chalk.dim('Parameters: ') +
        chalk.white((stack.parameterCount || 0).toString().padEnd(8)) +
        chalk.dim('Outputs: ') +
        chalk.white(stack.outputCount || 0)
    );
    console.log(chalk.cyan('│  ') + chalk.dim('Template:   ') + chalk.white(stack.templatePath));

    // Check for warnings
    if (stack.metadata?.templateSize && stack.metadata.templateSize > 3 * 1024 * 1024) {
      console.log(chalk.cyan('│  ') + chalk.yellow(`⚠  Template size approaching 4MB limit`));
    }

    if (stack.metadata?.resourceCount && stack.metadata.resourceCount > 700) {
      console.log(chalk.cyan('│  ') + chalk.yellow(`⚠  Resource count approaching 800 limit`));
    }

    console.log(chalk.cyan('└') + chalk.cyan('─'.repeat(79)));
  }

  // Validation warnings/errors
  if (assembly.validation) {
    if (assembly.validation.warnings && assembly.validation.warnings.length > 0) {
      console.log(chalk.yellow.bold('\n⚠  Warnings:'));
      for (const warning of assembly.validation.warnings) {
        console.log(chalk.yellow(`   • ${warning.path}: ${warning.message}`));
      }
    }

    if (assembly.validation.errors && assembly.validation.errors.length > 0) {
      console.log(chalk.red.bold('\n✗  Errors:'));
      for (const error of assembly.validation.errors) {
        console.log(chalk.red(`   • ${error.path}: ${error.message}`));
        if (error.fix) {
          console.log(chalk.gray(`     💡 ${error.fix}`));
        }
      }
    }
  }

  if (options.validateOnly) {
    console.log(
      chalk.green.bold('\n✓  Validation complete') + chalk.dim(' (templates not written)')
    );
  } else {
    console.log(chalk.green.bold('\n✓  Templates synthesized successfully!'));
    console.log(chalk.dim(`   ${assembly.directory}`));
    console.log(chalk.bold('\n🚀 Next Steps:\n'));
    console.log(
      `   ${chalk.cyan('•')} Review templates: ${chalk.bold('ls ' + assembly.directory)}`
    );
    console.log(`   ${chalk.cyan('•')} Deploy to Azure:  ${chalk.bold('atakora deploy')}\n`);
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
