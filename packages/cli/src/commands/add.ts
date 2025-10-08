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
    .option('--set-default', 'Set this package as the default for synthesis')
    .option('--no-prompt', 'Skip confirmation prompts')
    .addHelpText(
      'after',
      `
${chalk.bold('Description:')}
  Adds a new infrastructure package to your Atakora project.
  Each package represents a logical grouping of related Azure resources.

${chalk.bold('Package Structure:')}
  ${chalk.cyan('packages/<package-name>/')}
  ├── bin/
  │   └── app.ts           ${chalk.dim('# Package entry point')}
  ├── src/                 ${chalk.dim('# Source code (optional)')}
  ├── package.json
  └── tsconfig.json

${chalk.bold('Examples:')}
  ${chalk.dim('# Add a backend package')}
  ${chalk.cyan('$')} atakora add backend

  ${chalk.dim('# Add and set as default')}
  ${chalk.cyan('$')} atakora add networking --set-default

  ${chalk.dim('# Skip confirmation prompt')}
  ${chalk.cyan('$')} atakora add frontend --no-prompt

${chalk.bold('Common Package Patterns:')}
  ${chalk.cyan('•')} ${chalk.white('backend')}      - Application infrastructure (App Services, Functions)
  ${chalk.cyan('•')} ${chalk.white('frontend')}     - Static site hosting (Storage, CDN)
  ${chalk.cyan('•')} ${chalk.white('networking')}   - Network resources (VNets, NSGs, Private DNS)
  ${chalk.cyan('•')} ${chalk.white('data')}         - Data services (SQL, CosmosDB, Storage)
  ${chalk.cyan('•')} ${chalk.white('monitoring')}   - Observability (Log Analytics, App Insights)

${chalk.bold('What happens:')}
  ${chalk.green('✓')} Creates package directory structure
  ${chalk.green('✓')} Generates package.json and tsconfig.json
  ${chalk.green('✓')} Creates sample app.ts entry point
  ${chalk.green('✓')} Updates project manifest
  ${chalk.green('✓')} Optionally sets as default package
`
    )
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

        console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.bold.white(`  Adding Package: ${packageName}`));
        console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

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
        console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.green.bold('  ✓ Package added successfully!'));
        console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

        if (setAsDefault) {
          console.log(chalk.green(`   ✓ Default package: ${chalk.bold(packageName)}\n`));
        }

        console.log(chalk.bold('🚀 Next Steps:\n'));
        console.log(`  ${chalk.cyan('1.')} Define your infrastructure`);
        console.log(
          `     ${chalk.dim('Edit:')} ${chalk.bold(`packages/${packageName}/bin/app.ts`)}\n`
        );
        console.log(`  ${chalk.cyan('2.')} Build the project`);
        console.log(`     ${chalk.dim('$')} ${chalk.bold('npm run build')}\n`);
        console.log(`  ${chalk.cyan('3.')} Generate templates`);
        console.log(`     ${chalk.dim('$')} ${chalk.bold('npm run synth')}\n`);
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
