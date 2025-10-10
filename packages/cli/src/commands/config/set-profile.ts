import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../../config/config-manager';

/**
 * Creates the 'set-profile' command for non-interactive profile creation.
 *
 * This command creates or updates profiles programmatically without user interaction,
 * making it ideal for CI/CD pipelines, automation scripts, and batch configuration.
 * All required Azure configuration values must be provided via command-line options.
 *
 * @returns A Commander.js Command instance configured for non-interactive profile setup
 *
 * @example
 * ```bash
 * # Create a production profile
 * azure-arm config set-profile \
 *   --name production \
 *   --tenant 12345678-1234-1234-1234-123456789abc \
 *   --subscription 87654321-4321-4321-4321-987654321abc \
 *   --subscription-name "Production Subscription" \
 *   --cloud AzureCloud \
 *   --location eastus \
 *   --activate
 *
 * # Create Gov Cloud profile without activating
 * azure-arm config set-profile \
 *   -n govcloud \
 *   -t ab123456-7890-abcd-ef12-34567890abcd \
 *   -s cd789012-3456-789a-bcde-f0123456789a \
 *   --cloud AzureUSGovernment \
 *   --location usgovvirginia
 * ```
 *
 * @remarks
 * Required Options:
 * - `-n, --name <name>`: Profile name (alphanumeric, hyphens, underscores only)
 * - `-t, --tenant <tenantId>`: Azure tenant ID (UUID format)
 * - `-s, --subscription <subscriptionId>`: Azure subscription ID (UUID format)
 *
 * Optional Options:
 * - `--subscription-name <name>`: Human-readable subscription display name
 * - `--cloud <cloud>`: Azure cloud environment (default: "AzureCloud")
 *   - Valid: AzureCloud, AzureUSGovernment, AzureChinaCloud, AzureGermanCloud
 * - `--location <location>`: Default Azure region (default: "eastus")
 * - `--activate`: Set as active profile immediately after creation
 *
 * Validation:
 * - Tenant ID: Must be valid UUID format
 * - Subscription ID: Must be valid UUID format
 * - Profile Name: Alphanumeric characters, hyphens, underscores only
 * - Cloud: Must be one of the four supported Azure cloud environments
 *
 * Use Cases:
 * - CI/CD Pipelines: Configure Azure profiles in automated workflows
 * - Infrastructure as Code: Manage profiles alongside deployment scripts
 * - Multi-Environment Setup: Quickly create dev, staging, production profiles
 * - Team Onboarding: Script profile setup for new developers
 *
 * Error Handling:
 * - Exits with code 1 if any validation fails
 * - Provides specific error messages for each validation failure
 * - No authentication required (unlike interactive select command)
 *
 * @see {@link ConfigManager.saveProfile} for profile storage implementation
 * @see {@link selectCommand} for interactive profile creation
 * @see {@link useCommand} for switching between profiles
 */
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
        const validClouds = [
          'AzureCloud',
          'AzureUSGovernment',
          'AzureChinaCloud',
          'AzureGermanCloud',
        ];
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
            chalk.red(
              'Invalid profile name. Use only alphanumeric characters, hyphens, and underscores.'
            )
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
