import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../../config/config-manager';

export function showCommand(): Command {
  const show = new Command('show')
    .description('Display current active profile configuration')
    .argument('[profile]', 'Profile name to display (defaults to active profile)')
    .action((profileName?: string) => {
      try {
        const configManager = new ConfigManager();
        const profile = configManager.getProfile(profileName);

        if (!profile) {
          const targetProfile = profileName || configManager.getActiveProfileName();
          console.error(chalk.red(`Profile '${targetProfile}' not found`));
          console.log(
            chalk.cyan('\nRun'),
            chalk.bold('azure-arm config select'),
            chalk.cyan('to create a profile')
          );
          process.exit(1);
        }

        const isActive = profile.name === configManager.getActiveProfileName();

        console.log(chalk.bold('\nAzure ARM Configuration'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(
          chalk.cyan('Profile:       '),
          profile.name,
          isActive ? chalk.green('(active)') : ''
        );
        console.log(chalk.cyan('Tenant ID:     '), profile.tenantId);
        console.log(
          chalk.cyan('Subscription:  '),
          profile.subscriptionName || profile.subscriptionId
        );
        console.log(chalk.cyan('Subscription ID:'), profile.subscriptionId);
        if (profile.cloud) {
          console.log(chalk.cyan('Cloud:         '), profile.cloud);
        }
        if (profile.location) {
          console.log(chalk.cyan('Location:      '), profile.location);
        }
        console.log();
      } catch (error) {
        console.error(
          chalk.red('Failed to load configuration:'),
          error instanceof Error ? error.message : 'Unknown error'
        );
        process.exit(1);
      }
    });

  return show;
}
