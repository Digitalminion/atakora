/**
 * Function list command
 *
 * Lists discovered Azure Functions
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Creates the `atakora function list` command
 *
 * Lists all discovered functions from the functions directory
 *
 * @returns Commander command instance
 */
export function createFunctionListCommand(): Command {
  const list = new Command('list')
    .description('List all discovered functions')
    .option('--path <path>', 'Functions directory path', './functions')
    .option('--json', 'Output as JSON')
    .addHelpText(
      'after',
      `
${chalk.bold('Examples:')}
  ${chalk.dim('# List all functions')}
  ${chalk.cyan('$')} atakora function list

  ${chalk.dim('# List functions with JSON output')}
  ${chalk.cyan('$')} atakora function list --json

${chalk.bold('Output:')}
  Shows discovered functions with:
  • Function name
  • Trigger type
  • Handler file path
  • Configuration file path
    `
    )
    .action(async (options) => {
      try {
        const functionsPath = options.path || './functions';
        const functionsDirPath = path.join(process.cwd(), functionsPath);

        // Check if functions directory exists
        if (!fs.existsSync(functionsDirPath)) {
          console.log(chalk.yellow(`\nFunctions directory not found: ${functionsPath}`));
          console.log(chalk.dim('Create a function first:'));
          console.log(chalk.cyan('  $ atakora function create --name myFunction\n'));
          process.exit(0);
        }

        // Scan for functions
        const directories = fs.readdirSync(functionsDirPath, { withFileTypes: true });
        const functions: Array<{
          name: string;
          hasHandler: boolean;
          hasResource: boolean;
          handlerPath: string;
          resourcePath: string;
        }> = [];

        for (const dir of directories) {
          if (!dir.isDirectory()) {
            continue;
          }

          const funcName = dir.name;
          const funcDir = path.join(functionsDirPath, funcName);

          // Check for handler files (TypeScript or JavaScript)
          const handlerTsPath = path.join(funcDir, 'handler.ts');
          const handlerJsPath = path.join(funcDir, 'handler.js');
          const hasHandlerTs = fs.existsSync(handlerTsPath);
          const hasHandlerJs = fs.existsSync(handlerJsPath);
          const hasHandler = hasHandlerTs || hasHandlerJs;
          const handlerPath = hasHandlerTs ? handlerTsPath : handlerJsPath;

          // Check for resource files
          const resourceTsPath = path.join(funcDir, 'resource.ts');
          const resourceJsPath = path.join(funcDir, 'resource.js');
          const hasResourceTs = fs.existsSync(resourceTsPath);
          const hasResourceJs = fs.existsSync(resourceJsPath);
          const hasResource = hasResourceTs || hasResourceJs;
          const resourcePath = hasResourceTs ? resourceTsPath : resourceJsPath;

          // Only include if it has at least a handler
          if (hasHandler) {
            functions.push({
              name: funcName,
              hasHandler,
              hasResource,
              handlerPath: path.relative(process.cwd(), handlerPath),
              resourcePath: path.relative(process.cwd(), resourcePath),
            });
          }
        }

        // Output results
        if (options.json) {
          console.log(JSON.stringify(functions, null, 2));
        } else {
          if (functions.length === 0) {
            console.log(chalk.yellow('\nNo functions found'));
            console.log(chalk.dim('Create a function first:'));
            console.log(chalk.cyan('  $ atakora function create --name myFunction\n'));
          } else {
            console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
            console.log(chalk.bold.white(`  Discovered Functions (${functions.length})`));
            console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

            for (const func of functions) {
              console.log(chalk.bold(`  ${chalk.cyan('●')} ${func.name}`));
              console.log(chalk.dim(`    Handler:  ${func.handlerPath}`));
              if (func.hasResource) {
                console.log(chalk.dim(`    Resource: ${func.resourcePath}`));
              } else {
                console.log(chalk.yellow(`    Resource: (missing)`));
              }
              // TODO: Load and display trigger type from resource.ts
              console.log();
            }

            console.log(chalk.dim('💡 Tip: Run ') + chalk.white('atakora function invoke <name>') + chalk.dim(' to test a function locally\n'));
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(chalk.red('\nError: ' + error.message));
        } else {
          console.error(chalk.red('\nUnknown error occurred'));
        }
        process.exit(1);
      }
    });

  return list;
}
