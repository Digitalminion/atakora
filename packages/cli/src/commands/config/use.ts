import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../../config/config-manager';

/**
 * Creates the 'use' command to switch between Azure profiles.
 *
 * This command activates a different saved profile, changing which tenant,
 * subscription, and cloud environment will be used for subsequent CLI operations.
 * The active profile determines the Azure context for all deployments and operations.
 *
 * @returns A Commander.js Command instance configured for profile switching
 *
 * @example
 * ```bash
 * # Switch to production profile
 * azure-arm config use production
 *
 * # Switch to development profile
 * azure-arm config use dev
 *
 * # Switch to government cloud profile
 * azure-arm config use govcloud
 * ```
 *
 * @remarks
 * Command Arguments:
 * - `<profile>`: Profile name to activate (required)
 *
 * Profile Activation:
 * - Sets the specified profile as active
 * - All subsequent commands use this profile's configuration
 * - Change persists across CLI sessions
 * - Displays full profile configuration after activation
 *
 * Display After Switch:
 * - Profile name confirmation
 * - Tenant ID
 * - Subscription name and ID
 * - Cloud environment
 * - Default location
 *
 * Error Handling:
 * - Exits with code 1 if profile doesn't exist
 * - Guides users to 'config list' to see available profiles
 * - Suggests creating profile if it doesn't exist
 *
 * Use Cases:
 * - Switch between dev, staging, production environments
 * - Toggle between Commercial and Government Cloud
 * - Change to different tenant or subscription
 * - Verify configuration before deployment
 *
 * Best Practices:
 * - Run 'config show' after switching to verify active profile
 * - Use 'config list' to see all available profiles before switching
 * - Create named profiles for each environment (dev, staging, prod)
 *
 * @see {@link ConfigManager.setActiveProfile} for activation logic
 * @see {@link showCommand} to verify active profile
 * @see {@link listCommand} to see available profiles
 */
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
