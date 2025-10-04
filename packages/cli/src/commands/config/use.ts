import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../../config/config-manager';

export function useCommand(): Command {
  const use = new Command('use')
    .description('Switch to a different profile')
    .argument('<profile>', 'Profile name to activate')
    .action((profileName: string) => {
      try {
        const configManager = new ConfigManager();

        // Check if profile exists
        const profile = configManager.getProfile(profileName);
        if (!profile) {
          console.error(chalk.red(`Profile '${profileName}' does not exist`));
          console.log(
            chalk.cyan('\nRun'),
            chalk.bold('azure-arm config list'),
            chalk.cyan('to see available profiles')
          );
          process.exit(1);
        }

        // Switch to the profile
        configManager.setActiveProfile(profileName);

        console.log(chalk.green(`\n✓ Switched to profile '${profileName}'`));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.cyan('Tenant ID:      '), profile.tenantId);
        console.log(
          chalk.cyan('Subscription:   '),
          profile.subscriptionName || profile.subscriptionId
        );
        console.log(chalk.cyan('Subscription ID:'), profile.subscriptionId);
        if (profile.cloud) {
          console.log(chalk.cyan('Cloud:          '), profile.cloud);
        }
        if (profile.location) {
          console.log(chalk.cyan('Location:       '), profile.location);
        }
        console.log();
      } catch (error) {
        console.error(
          chalk.red('Failed to switch profile:'),
          error instanceof Error ? error.message : 'Unknown error'
        );
        process.exit(1);
      }
    });

  return use;
}
