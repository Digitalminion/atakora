import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { AzureAuthService, TenantInfo, SubscriptionInfo } from '../../auth/azure-auth';
import { ConfigManager } from '../../config/config-manager';

export function selectCommand(): Command {
  const select = new Command('select')
    .description('Interactively select Azure tenant and subscription')
    .option('-p, --profile <name>', 'Profile name to save configuration to', 'default')
    .option('--cloud <cloud>', 'Azure cloud environment (AzureCloud, AzureUSGovernment, AzureChinaCloud, AzureGermanCloud)', 'AzureCloud')
    .action(async (options) => {
      const spinner = ora('Authenticating with Azure...').start();

      try {
        const authService = new AzureAuthService(options.cloud);
        const configManager = new ConfigManager();

        // Authenticate
        const authResult = await authService.login();
        if (!authResult.success) {
          spinner.fail(chalk.red('Authentication failed'));
          console.error(chalk.red(authResult.error || 'Unknown error'));
          process.exit(1);
        }

        // List tenants
        spinner.text = 'Fetching tenants...';
        const tenants = await authService.listTenants();

        if (tenants.length === 0) {
          spinner.fail(chalk.red('No tenants found'));
          process.exit(1);
        }

        spinner.stop();

        // Prompt for tenant selection
        const tenantChoices = tenants.map((t: TenantInfo) => ({
          name: `${t.displayName} (${t.tenantId})`,
          value: t.tenantId,
          short: t.displayName,
        }));

        const { selectedTenant } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedTenant',
            message: 'Select a tenant:',
            choices: tenantChoices,
          },
        ]);

        // List subscriptions for selected tenant
        spinner.start('Fetching subscriptions...');
        const subscriptions = await authService.listSubscriptions(selectedTenant);

        if (subscriptions.length === 0) {
          spinner.fail(chalk.red('No subscriptions found in the selected tenant'));
          process.exit(1);
        }

        spinner.stop();

        // Prompt for subscription selection
        const subscriptionChoices = subscriptions
          .filter((s: SubscriptionInfo) => s.state === 'Enabled')
          .map((s: SubscriptionInfo) => ({
            name: `${s.displayName} (${s.subscriptionId})`,
            value: s.subscriptionId,
            short: s.displayName,
          }));

        if (subscriptionChoices.length === 0) {
          console.error(chalk.red('No enabled subscriptions found'));
          process.exit(1);
        }

        const { selectedSubscription } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedSubscription',
            message: 'Select a subscription:',
            choices: subscriptionChoices,
          },
        ]);

        // Find selected subscription details
        const subscription = subscriptions.find(
          (s: SubscriptionInfo) => s.subscriptionId === selectedSubscription
        );

        // Save profile
        configManager.saveProfile({
          name: options.profile,
          tenantId: selectedTenant,
          subscriptionId: selectedSubscription,
          subscriptionName: subscription?.displayName,
          cloud: options.cloud,
          location: 'eastus',
        });

        configManager.setActiveProfile(options.profile);

        console.log(chalk.green('\n✓ Configuration saved successfully'));
        console.log(chalk.gray(`Profile: ${options.profile}`));
        console.log(chalk.gray(`Tenant: ${selectedTenant}`));
        console.log(chalk.gray(`Subscription: ${subscription?.displayName} (${selectedSubscription})`));
        console.log(
          chalk.cyan('\nRun'),
          chalk.bold('azure-arm config show'),
          chalk.cyan('to view your configuration')
        );
      } catch (error) {
        spinner.fail(chalk.red('Configuration failed'));
        console.error(
          chalk.red(error instanceof Error ? error.message : 'Unknown error')
        );
        process.exit(1);
      }
    });

  return select;
}
