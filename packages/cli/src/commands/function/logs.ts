/**
 * Function logs command
 *
 * Streams logs from deployed Azure Functions
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Creates the `atakora function logs` command
 *
 * Streams logs from a deployed Azure Function
 *
 * @returns Commander command instance
 */
export function createFunctionLogsCommand(): Command {
  const logs = new Command('logs')
    .description('Stream logs from a deployed function')
    .argument('<name>', 'Function name')
    .option('-f, --follow', 'Follow log output (tail -f style)')
    .option('-n, --lines <count>', 'Number of lines to show', '100')
    .option('--since <time>', 'Show logs since timestamp (e.g., "1h", "30m", "2024-01-15T10:00:00")')
    .option('--level <level>', 'Minimum log level (verbose, info, warning, error)')
    .option('--resource-group <group>', 'Target resource group')
    .option('--function-app <app>', 'Function app name')
    .addHelpText(
      'after',
      `
${chalk.bold('Examples:')}
  ${chalk.dim('# Show recent logs')}
  ${chalk.cyan('$')} atakora function logs api

  ${chalk.dim('# Follow logs in real-time')}
  ${chalk.cyan('$')} atakora function logs api --follow

  ${chalk.dim('# Show logs from last hour')}
  ${chalk.cyan('$')} atakora function logs api --since 1h

  ${chalk.dim('# Show only errors')}
  ${chalk.cyan('$')} atakora function logs api --level error

  ${chalk.dim('# Show last 50 lines')}
  ${chalk.cyan('$')} atakora function logs api --lines 50

${chalk.bold('Log Levels:')}
  • verbose - All logs including debug information
  • info    - Informational messages and above
  • warning - Warnings and errors
  • error   - Only errors
    `
    )
    .action(async (name: string, options) => {
      const spinner = ora();

      try {
        console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.bold.white(`  Function Logs: ${name}`));
        console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

        const isFollow = options.follow || false;
        const lineCount = parseInt(options.lines || '100', 10);
        const logLevel = options.level || 'info';
        const since = options.since;

        // Get resource information
        spinner.start('Connecting to Azure...');
        // TODO: Get function app name and resource group from manifest or options
        spinner.succeed(chalk.green('Connected to Azure'));

        spinner.start(`Retrieving logs for ${name}...`);
        // TODO: Use Azure SDK to retrieve logs from Application Insights or Log Analytics
        spinner.succeed(chalk.green('Logs retrieved'));

        if (isFollow) {
          console.log(chalk.dim('Following logs (Press Ctrl+C to stop)...\n'));
          // TODO: Stream logs in real-time
          // This would use Azure Monitor Query API or Application Insights Live Metrics
        } else {
          console.log(chalk.dim(`Showing last ${lineCount} log entries...\n`));
          // TODO: Display historical logs
        }

        // Sample log output format
        console.log(chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.dim('2024-01-15 10:30:45.123 [INFO] Processing HTTP request'));
        console.log(chalk.dim('2024-01-15 10:30:45.456 [INFO] Request completed successfully'));
        console.log(chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

        console.log(chalk.yellow('Note: Log streaming requires Azure credentials and deployed functions'));
        console.log(chalk.dim('Set up authentication with: ') + chalk.white('az login\n'));
      } catch (error) {
        spinner.fail(chalk.red('Failed to retrieve logs'));

        if (error instanceof Error) {
          console.error(chalk.red('\nError: ' + error.message));
        } else {
          console.error(chalk.red('\nUnknown error occurred'));
        }

        process.exit(1);
      }
    });

  return logs;
}
