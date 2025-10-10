import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { TenantInfo, SubscriptionInfo } from '../../auth/azure-auth';
import { authManager } from '../../auth/auth-manager';
import { ConfigManager } from '../../config/config-manager';

/**
 * Creates the 'select' command for interactive Azure tenant and subscription selection.
 *
 * This command provides a guided, interactive experience to:
 * 1. Authenticate with Azure (if not already authenticated)
 * 2. Select from available tenants
 * 3. Choose an enabled subscription within the tenant
 * 4. Save configuration as a named profile
 * 5. Set the profile as active
 *
 * @returns A Commander.js Command instance configured for interactive selection
 *
 * @example
 * ```bash
 * # Select tenant/subscription and save as default profile
 * azure-arm config select
 *
 * # Select and save to a named profile
 * azure-arm config select --profile production
 *
 * # Select for Azure Government Cloud
 * azure-arm config select --cloud AzureUSGovernment --profile govcloud
 * ```
 *
 * @remarks
 * Command Options:
 * - `-p, --profile <name>`: Profile name to save configuration (default: "default")
 * - `--cloud <cloud>`: Azure cloud environment (default: "AzureCloud")
 *   - Valid values: AzureCloud, AzureUSGovernment, AzureChinaCloud, AzureGermanCloud
 *
 * Interactive Flow:
 * 1. Authentication: Uses cached credentials if available, prompts for login if needed
 * 2. Tenant Selection: Displays all accessible tenants with display names
 * 3. Subscription Selection: Shows only enabled subscriptions in selected tenant
 * 4. Profile Save: Stores configuration with default location (eastus)
 * 5. Activation: Automatically sets new profile as active
 *
 * Credential Caching:
 * - Reuses existing Azure credentials when available
 * - Skips re-authentication if already logged in to target cloud
 * - Maintains tenant-scoped credentials for subscription listing
 *
 * Error Handling:
 * - Exits if authentication fails
 * - Exits if no tenants found
 * - Exits if no enabled subscriptions available
 * - Displays helpful error messages with remediation steps
 *
 * @see {@link authManager} for authentication and credential management
 * @see {@link ConfigManager} for profile storage
 * @see {@link loginCommand} for standalone authentication
 */
export function selectCommand(): Command {
  const select = new Command('select')
    .description('Interactively select Azure tenant and subscription')
    .option('-p, --profile <name>', 'Profile name to save configuration to', 'default')
    .option(
      '--cloud <cloud>',
      'Azure cloud environment (AzureCloud, AzureUSGovernment, AzureChinaCloud, AzureGermanCloud)',
      'AzureCloud'
    )
    .action(async (options) => {
      const spinner = ora('Authenticating with Azure...').start();

      try {
        const authService = authManager.getAuthService(options.cloud);
        const configManager = new ConfigManager();

        // Authenticate (using cached credential if available)
        let authResult;
        if (!authManager.isAuthenticated(options.cloud)) {
          authResult = await authService.login();
        } else {
          spinner.text = 'Using cached credentials...';
          authResult = { success: true };
        }
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
        console.log(
          chalk.gray(`Subscription: ${subscription?.displayName} (${selectedSubscription})`)
        );
        console.log(
          chalk.cyan('\nRun'),
          chalk.bold('azure-arm config show'),
          chalk.cyan('to view your configuration')
        );
      } catch (error) {
        spinner.fail(chalk.red('Configuration failed'));
        console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
      }
    });

  return select;
}
