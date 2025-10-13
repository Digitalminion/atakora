import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { ManifestManager } from '../manifest/manifest-manager';
import { CrudGenerator } from '../generators/crud-generator';

/**
 * Creates the `atakora add-crud` command
 *
 * Adds a new CRUD stack with REST API and Azure Functions:
 * - Creates Cosmos DB container
 * - Generates REST API with OpenAPI schema
 * - Creates Azure Functions for Create, Read, Update, Delete, List
 * - Wires up RBAC permissions
 *
 * @returns Commander command instance
 */
export function createAddCrudCommand(): Command {
  const addCrud = new Command('add-crud')
    .description('Add a CRUD stack with REST API and Azure Functions')
    .argument('<resource-name>', 'Name of the resource (e.g., "user", "product")')
    .option('--package <package>', 'Target package name (defaults to current package)')
    .option('--no-prompt', 'Skip confirmation prompts')
    .addHelpText(
      'after',
      `
${chalk.bold('Description:')}
  Generates a complete CRUD stack for a resource with:
  - REST API endpoints (POST, GET, PUT, DELETE, LIST)
  - Azure Functions for each operation
  - Cosmos DB integration with managed identity
  - OpenAPI schema definition

${chalk.bold('Generated Structure:')}
  ${chalk.cyan('packages/<package>/rest/<resource>/')}
  ├── stack.ts                    ${chalk.dim('# Main stack - API + Cosmos')}
  ├── resource.ts                 ${chalk.dim('# TypeScript types & schema')}
  ├── ${chalk.cyan('<resource>-create/')}
  │   ├── handler.ts             ${chalk.dim('# Azure Function handler')}
  │   └── resource.ts            ${chalk.dim('# Function CDK resource')}
  ├── ${chalk.cyan('<resource>-read/')}
  ├── ${chalk.cyan('<resource>-update/')}
  ├── ${chalk.cyan('<resource>-delete/')}
  └── ${chalk.cyan('<resource>-list/')}

${chalk.bold('REST API Endpoints:')}
  POST   /api/<resources>           ${chalk.dim('# Create new item')}
  GET    /api/<resources>           ${chalk.dim('# List items (paginated)')}
  GET    /api/<resources>/{id}      ${chalk.dim('# Get single item')}
  PUT    /api/<resources>/{id}      ${chalk.dim('# Update item')}
  DELETE /api/<resources>/{id}      ${chalk.dim('# Delete item')}

${chalk.bold('Examples:')}
  ${chalk.dim('# Generate CRUD stack for users')}
  ${chalk.cyan('$')} atakora add-crud user

  ${chalk.dim('# Generate in specific package')}
  ${chalk.cyan('$')} atakora add-crud product --package backend

  ${chalk.dim('# Skip prompts')}
  ${chalk.cyan('$')} atakora add-crud order --no-prompt

${chalk.bold('What happens:')}
  ${chalk.green('✓')} Creates REST API structure
  ${chalk.green('✓')} Generates 5 Azure Functions (CRUDL)
  ${chalk.green('✓')} Configures Cosmos DB integration
  ${chalk.green('✓')} Sets up managed identity & RBAC
  ${chalk.green('✓')} Defines OpenAPI schema
`
    )
    .action(async (resourceName: string, options) => {
      const spinner = ora();

      try {
        // Check if project is initialized
        const manifestManager = new ManifestManager();
        if (!manifestManager.exists()) {
          console.log(chalk.red('\nProject not initialized!'));
          console.log(chalk.cyan('Run: atakora init'));
          process.exit(1);
        }

        // Read manifest
        const manifest = manifestManager.read();

        // Determine package name
        const packageName = options.package || manifest.defaultPackage;

        if (!manifest.packages[packageName]) {
          console.log(chalk.red(`\nPackage '${packageName}' does not exist!`));
          console.log(chalk.gray(`Available packages: ${Object.keys(manifest.packages).join(', ')}`));
          process.exit(1);
        }

        // Confirm if not in non-prompt mode
        if (!options.noPrompt) {
          const answers = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Generate CRUD stack for '${resourceName}' in package '${packageName}'?`,
              default: true,
            },
          ]);

          if (!answers.confirm) {
            console.log(chalk.gray('\nCancelled.'));
            process.exit(0);
          }
        }

        console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.bold.white(`  Generating CRUD Stack: ${resourceName}`));
        console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

        // Generate CRUD stack
        spinner.start('Generating CRUD stack...');
        const crudGenerator = new CrudGenerator();
        crudGenerator.generate({
          resourceName,
          workspaceRoot: process.cwd(),
          packageName,
        });
        spinner.succeed(chalk.green(`Created CRUD stack in packages/${packageName}/src/rest/${resourceName}/`));

        // Success message
        console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.green.bold('  ✓ CRUD stack generated successfully!'));
        console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

        console.log(chalk.bold('📋 Generated Files:\n'));
        console.log(`  ${chalk.cyan('•')} Stack configuration`);
        console.log(`     ${chalk.dim('packages/')}${packageName}${chalk.dim('/src/rest/')}${resourceName}${chalk.dim('/stack.ts')}\n`);
        console.log(`  ${chalk.cyan('•')} Resource types & schema`);
        console.log(`     ${chalk.dim('packages/')}${packageName}${chalk.dim('/src/rest/')}${resourceName}${chalk.dim('/resource.ts')}\n`);
        console.log(`  ${chalk.cyan('•')} 5 Azure Functions (Create, Read, Update, Delete, List)`);
        console.log(`     ${chalk.dim('packages/')}${packageName}${chalk.dim('/src/rest/')}${resourceName}${chalk.dim('/<operation>/')}\n`);

        console.log(chalk.bold('🚀 Next Steps:\n'));
        console.log(`  ${chalk.cyan('1.')} Customize the schema`);
        console.log(`     ${chalk.dim('Edit:')} ${chalk.bold(`packages/${packageName}/src/rest/${resourceName}/resource.ts`)}\n`);
        console.log(`  ${chalk.cyan('2.')} Update the stack configuration`);
        console.log(`     ${chalk.dim('Edit:')} ${chalk.bold(`packages/${packageName}/src/rest/${resourceName}/stack.ts`)}\n`);
        console.log(`  ${chalk.cyan('3.')} Customize handlers if needed`);
        console.log(`     ${chalk.dim('Edit:')} ${chalk.bold(`packages/${packageName}/src/rest/${resourceName}/*-*/handler.ts`)}\n`);
        console.log(`  ${chalk.cyan('4.')} Build and synthesize`);
        console.log(`     ${chalk.dim('$')} ${chalk.bold('npm run build && npm run synth')}\n`);

        console.log(chalk.dim(`💡 Tip: The generated functions use managed identity to access Cosmos DB\n`));
      } catch (error) {
        spinner.fail(chalk.red('Failed to generate CRUD stack'));

        if (error instanceof Error) {
          console.error(chalk.red('\nError: ' + error.message));
        } else {
          console.error(chalk.red('\nUnknown error occurred'));
        }

        process.exit(1);
      }
    });

  return addCrud;
}
