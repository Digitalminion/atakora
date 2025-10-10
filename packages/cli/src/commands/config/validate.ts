import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../../config/config-manager';
import { authManager } from '../../auth/auth-manager';

/**
 * Creates the 'validate' command to verify profile configuration and Azure access.
 *
 * This command performs comprehensive validation of a profile's configuration,
 * including format validation, authentication verification, and Azure API access
 * checks. It confirms that the profile can be used for actual Azure operations.
 *
 * @returns A Commander.js Command instance configured for profile validation
 *
 * @example
 * ```bash
 * # Validate active profile
 * azure-arm config validate
 *
 * # Validate specific profile
 * azure-arm config validate production
 *
 * # Validate government cloud profile
 * azure-arm config validate govcloud
 * ```
 *
 * @remarks
 * Command Arguments:
 * - `[profile]`: Optional profile name (defaults to active profile)
 *
 * Validation Checks:
 * 1. Profile Existence: Confirms profile exists in config
 * 2. Format Validation: Verifies UUIDs and cloud environment values
 * 3. Authentication: Tests Azure login and credential validity
 * 4. Tenant Access: Confirms tenant is accessible with current credentials
 * 5. Subscription Access: Verifies subscription exists and is enabled
 *
 * Format Validation:
 * - Tenant ID must be valid UUID format
 * - Subscription ID must be valid UUID format
 * - Cloud environment must be one of: AzureCloud, AzureUSGovernment, AzureChinaCloud, AzureGermanCloud
 *
 * Azure API Checks:
 * - Authenticates if not already logged in
 * - Uses cached credentials when available
 * - Lists tenants to verify tenant access
 * - Lists subscriptions to verify subscription access
 * - Checks subscription state (must be "Enabled")
 *
 * Error Reporting:
 * - Errors: Critical issues that prevent profile use
 * - Warnings: Non-critical issues (e.g., subscription state not "Enabled")
 * - Exit code 1 if any errors found
 * - Exit code 0 if only warnings or success
 *
 * Output Format:
 * - Progressive spinner for each validation step
 * - Green checkmarks for passed checks
 * - Red X marks for failed checks
 * - Yellow warnings for non-critical issues
 * - Summary at end with error/warning counts
 *
 * Use Cases:
 * - Troubleshoot profile configuration issues
 * - Verify profile before deployment
 * - Confirm Azure access after credential changes
 * - Validate CI/CD profile setup
 * - Pre-flight checks before resource provisioning
 *
 * Troubleshooting Guide:
 * - Profile not found: Run 'config list' to see available profiles
 * - Authentication failed: Run 'config login' to re-authenticate
 * - Tenant not accessible: Check AAD permissions
 * - Subscription not accessible: Verify RBAC role assignments
 * - Subscription disabled: Contact Azure subscription admin
 *
 * @see {@link ConfigManager.getProfile} for profile retrieval
 * @see {@link authManager} for authentication handling
 * @see {@link selectCommand} to reconfigure profile
 */
export function validateCommand(): Command {
  const validate = new Command('validate')
    .description('Validate profile configuration and Azure access')
    .argument('[profile]', 'Profile name to validate (defaults to active profile)')
    .action(async (profileName?: string) => {
      const configManager = new ConfigManager();
      const spinner = ora('Validating configuration...').start();
      const errors: string[] = [];
      const warnings: string[] = [];

      try {
        // Check if profile exists
        spinner.text = 'Checking profile...';
        const profile = configManager.getProfile(profileName);

        if (!profile) {
          const targetProfile = profileName || configManager.getActiveProfileName();
          spinner.fail(chalk.red(`Profile '${targetProfile}' does not exist`));
          console.log(
            chalk.cyan('\nRun'),
            chalk.bold('azure-arm config list'),
            chalk.cyan('to see available profiles')
          );
          process.exit(1);
        }

        spinner.succeed(chalk.green('Profile exists'));

        // Validate config file format
        spinner.start('Validating config file format...');
        const tenantIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!tenantIdRegex.test(profile.tenantId)) {
          errors.push('Invalid tenant ID format');
        }

        if (!tenantIdRegex.test(profile.subscriptionId)) {
          errors.push('Invalid subscription ID format');
        }

        const validClouds = [
          'AzureCloud',
          'AzureUSGovernment',
          'AzureChinaCloud',
          'AzureGermanCloud',
        ];
        if (profile.cloud && !validClouds.includes(profile.cloud)) {
          warnings.push(`Unknown cloud environment: ${profile.cloud}`);
        }

        if (errors.length > 0) {
          spinner.fail(chalk.red('Config file format validation failed'));
        } else {
          spinner.succeed(chalk.green('Config file format is valid'));
        }

        // Test Azure authentication and access
        const cloudEnvironment =
          (profile.cloud as 'AzureCloud' | 'AzureUSGovernment') || 'AzureCloud';
        const authService = authManager.getAuthService(cloudEnvironment);

        if (!authManager.isAuthenticated(cloudEnvironment)) {
          spinner.start('Authenticating with Azure...');
          try {
            const authResult = await authService.login();
            if (!authResult.success) {
              errors.push(`Authentication failed: ${authResult.error}`);
              spinner.fail(chalk.red('Authentication failed'));
            } else {
              spinner.succeed(chalk.green('Authentication successful'));
            }
          } catch (error) {
            errors.push(
              `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            spinner.fail(chalk.red('Authentication failed'));
          }
        } else {
          spinner.succeed(chalk.green('Using cached credentials'));
        }

        // Check tenant accessibility
        spinner.start('Checking tenant access...');
        try {
          const tenants = await authService.listTenants();
          const tenantExists = tenants.some((t) => t.tenantId === profile.tenantId);

          if (!tenantExists) {
            errors.push(`Tenant ${profile.tenantId} is not accessible`);
            spinner.fail(chalk.red('Tenant not accessible'));
          } else {
            spinner.succeed(chalk.green('Tenant is accessible'));
          }
        } catch (error) {
          errors.push(
            `Failed to list tenants: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          spinner.fail(chalk.red('Failed to check tenant access'));
        }

        // Check subscription accessibility
        spinner.start('Checking subscription access...');
        try {
          const subscriptions = await authService.listSubscriptions(profile.tenantId);
          const subscription = subscriptions.find(
            (s) => s.subscriptionId === profile.subscriptionId
          );

          if (!subscription) {
            errors.push(
              `Subscription ${profile.subscriptionId} is not accessible in tenant ${profile.tenantId}`
            );
            spinner.fail(chalk.red('Subscription not accessible'));
          } else if (subscription.state !== 'Enabled') {
            warnings.push(`Subscription state is '${subscription.state}' (not 'Enabled')`);
            spinner.warn(chalk.yellow(`Subscription is in '${subscription.state}' state`));
          } else {
            spinner.succeed(chalk.green('Subscription is accessible and enabled'));
          }
        } catch (error) {
          errors.push(
            `Failed to list subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          spinner.fail(chalk.red('Failed to check subscription access'));
        }

        // Display results
        console.log();
        if (errors.length === 0 && warnings.length === 0) {
          console.log(chalk.green.bold('✓ Validation passed'));
          console.log(
            chalk.gray(`Profile '${profile.name}' is properly configured and accessible`)
          );
        } else {
          if (errors.length > 0) {
            console.log(chalk.red.bold(`✗ Validation failed with ${errors.length} error(s):`));
            errors.forEach((err) => console.log(chalk.red(`  • ${err}`)));
          }

          if (warnings.length > 0) {
            console.log(chalk.yellow.bold(`\n⚠ ${warnings.length} warning(s):`));
            warnings.forEach((warn) => console.log(chalk.yellow(`  • ${warn}`)));
          }

          console.log(
            chalk.cyan('\nRun'),
            chalk.bold('azure-arm config select'),
            chalk.cyan('to reconfigure your profile')
          );

          if (errors.length > 0) {
            process.exit(1);
          }
        }
      } catch (error) {
        spinner.fail(chalk.red('Validation failed'));
        console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
      }
    });

  return validate;
}
