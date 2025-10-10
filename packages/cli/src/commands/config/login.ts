import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { authManager } from '../../auth/auth-manager';

/**
 * Creates the 'login' command for Azure authentication.
 *
 * This command initiates an interactive browser-based authentication flow with Azure
 * using the device code flow. The credential is cached by the auth manager for reuse
 * across CLI commands.
 *
 * @returns A Commander.js Command instance configured for Azure login
 *
 * @example
 * ```bash
 * # Login to Azure Commercial Cloud
 * azure-arm config login
 *
 * # Login to Azure US Government Cloud
 * azure-arm config login --cloud AzureUSGovernment
 * ```
 *
 * @remarks
 * Command Options:
 * - `--cloud <cloud>`: Specify the Azure cloud environment
 *   - Valid values: AzureCloud, AzureUSGovernment, AzureChinaCloud, AzureGermanCloud
 *   - Default: AzureCloud
 *
 * Authentication Flow:
 * 1. Opens browser for interactive authentication
 * 2. User authenticates with Microsoft credentials
 * 3. Token is cached for subsequent commands
 * 4. Displays authenticated tenant information
 *
 * Error Handling:
 * - Exits with code 1 if authentication fails
 * - Displays user-friendly error messages for common issues
 * - Shows next steps after successful authentication
 *
 * @see {@link authManager} for credential caching implementation
 * @see {@link selectCommand} for tenant/subscription selection after login
 */
export function loginCommand(): Command {
  const login = new Command('login')
    .description('Authenticate with Azure using interactive browser login')
    .option(
      '--cloud <cloud>',
      'Azure cloud environment (AzureCloud, AzureUSGovernment, AzureChinaCloud, AzureGermanCloud)',
      'AzureCloud'
    )
    .action(async (options) => {
      const spinner = ora('Opening browser for authentication...').start();

      try {
        const authService = authManager.getAuthService(options.cloud);
        const result = await authService.login();

        if (result.success) {
          spinner.succeed(chalk.green('Successfully authenticated with Azure'));

          if (result.tenantId) {
            console.log(chalk.gray(`Tenant: ${result.tenantId}`));
          }

          console.log(
            chalk.cyan('\nNext steps:'),
            '\n  1. Run',
            chalk.bold('azure-arm config select'),
            'to choose your tenant and subscription',
            '\n  2. Run',
            chalk.bold('azure-arm config show'),
            'to view your configuration'
          );
        } else {
          spinner.fail(chalk.red('Authentication failed'));
          console.error(chalk.red(result.error || 'Unknown error'));
          process.exit(1);
        }
      } catch (error) {
        spinner.fail(chalk.red('Authentication failed'));
        console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
      }
    });

  return login;
}
