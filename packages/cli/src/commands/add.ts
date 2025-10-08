import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { ManifestManager } from '../manifest/manifest-manager';
import { validatePackageName } from '../manifest/validator';
import { PackageGenerator } from '../generators/package-generator';

/**
 * Creates the `atakora add` command
 *
 * Adds a new package to an existing Atakora project:
 * - Validates package name
 * - Creates package directory structure
 * - Updates manifest with new package
 * - Optionally sets as default package
 *
 * @returns Commander command instance
 */
export function createAddCommand(): Command {
  const add = new Command('add')
    .description('Add a new package to the project')
    .argument('<package-name>', 'Name of the package to add')
    .option('--set-default', 'Set this package as the default')
    .option('--no-prompt', 'Skip prompts and use defaults')
    .action(async (packageName: string, options) => {
      const spinner = ora();

      try {
        // Validate package name
        const validation = validatePackageName(packageName);
        if (!validation.valid) {
          console.log(chalk.red(`\nInvalid package name: ${validation.error}`));
          process.exit(1);
        }

        // Check if project is initialized
        const manifestManager = new ManifestManager();
        if (!manifestManager.exists()) {
          console.log(chalk.red('\nProject not initialized!'));
          console.log(chalk.cyan('Run: atakora init'));
          process.exit(1);
        }

        // Read manifest to get organization
        const manifest = manifestManager.read();

        // Check if package already exists
        const existingPackage = manifestManager.getPackage(packageName);
        if (existingPackage) {
          console.log(chalk.red(`\nPackage '${packageName}' already exists!`));
          console.log(chalk.gray(`Location: ${existingPackage.path}`));
          process.exit(1);
        }

        // Determine if should set as default
        let setAsDefault = options.setDefault || false;

        if (!options.noPrompt && !options.setDefault) {
          const answers = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'setAsDefault',
              message: 'Set as default package?',
              default: false,
            },
          ]);
          setAsDefault = answers.setAsDefault;
        }

        console.log(chalk.bold(`\nAdding package: ${packageName}\n`));

        // Generate package structure
        spinner.start('Creating package directory...');
        const packageGenerator = new PackageGenerator();
        packageGenerator.generate({
          packageName,
          workspaceRoot: process.cwd(),
          organization: manifest.organization,
        });
        spinner.succeed(chalk.green(`Created packages/${packageName}/`));

        // Update manifest
        spinner.start('Updating manifest...');
        manifestManager.addPackage({
          name: packageName,
          setAsDefault,
        });
        spinner.succeed(chalk.green('Updated manifest'));

        // Success message
        console.log(chalk.green.bold('\n✓ Package added successfully!\n'));

        if (setAsDefault) {
          console.log(chalk.cyan(`Default package set to: ${chalk.bold(packageName)}`));
        }

        console.log(chalk.cyan('\nNext steps:'));
        console.log(
          chalk.white(
            `  1. Define infrastructure: ${chalk.bold(`packages/${packageName}/bin/app.ts`)}`
          )
        );
        console.log(chalk.white(`  2. Build project: ${chalk.bold('npm run build')}`));
        console.log(chalk.white(`  3. Synthesize templates: ${chalk.bold('npm run synth')}\n`));
      } catch (error) {
        spinner.fail(chalk.red('Failed to add package'));

        if (error instanceof Error) {
          console.error(chalk.red('\nError: ' + error.message));
        } else {
          console.error(chalk.red('\nUnknown error occurred'));
        }

        process.exit(1);
      }
    });

  return add;
}
