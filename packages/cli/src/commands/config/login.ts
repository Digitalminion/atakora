import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { AzureAuthService } from '../../auth/azure-auth';

export function loginCommand(): Command {
  const login = new Command('login')
    .description('Authenticate with Azure using interactive browser login')
    .option('--cloud <cloud>', 'Azure cloud environment (AzureCloud, AzureUSGovernment, AzureChinaCloud, AzureGermanCloud)', 'AzureCloud')
    .action(async (options) => {
      const spinner = ora('Opening browser for authentication...').start();

      try {
        const authService = new AzureAuthService(options.cloud);
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
        console.error(
          chalk.red(error instanceof Error ? error.message : 'Unknown error')
        );
        process.exit(1);
      }
    });

  return login;
}
