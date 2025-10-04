import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../../config/config-manager';

export function setProfileCommand(): Command {
  const setProfile = new Command('set-profile')
    .description('Create or update a profile non-interactively (for CI/CD)')
    .requiredOption('-n, --name <name>', 'Profile name')
    .requiredOption('-t, --tenant <tenantId>', 'Azure tenant ID')
    .requiredOption('-s, --subscription <subscriptionId>', 'Azure subscription ID')
    .option('--subscription-name <name>', 'Subscription display name')
    .option('--cloud <cloud>', 'Azure cloud environment', 'AzureCloud')
    .option('--location <location>', 'Default Azure location', 'eastus')
    .option('--activate', 'Set as active profile after creation')
    .action((options) => {
      try {
        const configManager = new ConfigManager();

        // Validate tenant ID format (UUID)
        const tenantIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!tenantIdRegex.test(options.tenant)) {
          console.error(chalk.red('Invalid tenant ID format. Must be a valid UUID.'));
          process.exit(1);
        }

        // Validate subscription ID format (UUID)
        if (!tenantIdRegex.test(options.subscription)) {
          console.error(chalk.red('Invalid subscription ID format. Must be a valid UUID.'));
          process.exit(1);
        }

        // Validate cloud environment
        const validClouds = ['AzureCloud', 'AzureUSGovernment', 'AzureChinaCloud', 'AzureGermanCloud'];
        if (!validClouds.includes(options.cloud)) {
          console.error(
            chalk.red(`Invalid cloud environment. Must be one of: ${validClouds.join(', ')}`)
          );
          process.exit(1);
        }

        // Validate profile name (alphanumeric, hyphens, underscores only)
        const profileNameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!profileNameRegex.test(options.name)) {
          console.error(
            chalk.red('Invalid profile name. Use only alphanumeric characters, hyphens, and underscores.')
          );
          process.exit(1);
        }

        // Save profile
        configManager.saveProfile({
          name: options.name,
          tenantId: options.tenant,
          subscriptionId: options.subscription,
          subscriptionName: options.subscriptionName,
          cloud: options.cloud,
          location: options.location,
        });

        // Activate if requested
        if (options.activate) {
          configManager.setActiveProfile(options.name);
        }

        console.log(chalk.green(`\n✓ Profile '${options.name}' saved successfully`));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.cyan('Tenant ID:      '), options.tenant);
        console.log(chalk.cyan('Subscription ID:'), options.subscription);
        if (options.subscriptionName) {
          console.log(chalk.cyan('Subscription:   '), options.subscriptionName);
        }
        console.log(chalk.cyan('Cloud:          '), options.cloud);
        console.log(chalk.cyan('Location:       '), options.location);
        if (options.activate) {
          console.log(chalk.green('\n✓ Profile activated'));
        }
        console.log();
      } catch (error) {
        console.error(
          chalk.red('Failed to save profile:'),
          error instanceof Error ? error.message : 'Unknown error'
        );
        process.exit(1);
      }
    });

  return setProfile;
}
