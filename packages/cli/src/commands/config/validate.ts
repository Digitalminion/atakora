import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../../config/config-manager';
import { AzureAuthService } from '../../auth/azure-auth';

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

        const validClouds = ['AzureCloud', 'AzureUSGovernment', 'AzureChinaCloud', 'AzureGermanCloud'];
        if (profile.cloud && !validClouds.includes(profile.cloud)) {
          warnings.push(`Unknown cloud environment: ${profile.cloud}`);
        }

        if (errors.length > 0) {
          spinner.fail(chalk.red('Config file format validation failed'));
        } else {
          spinner.succeed(chalk.green('Config file format is valid'));
        }

        // Test Azure authentication and access
        spinner.start('Authenticating with Azure...');
        const authService = new AzureAuthService(profile.cloud as any || 'AzureCloud');

        try {
          const authResult = await authService.login();
          if (!authResult.success) {
            errors.push(`Authentication failed: ${authResult.error}`);
            spinner.fail(chalk.red('Authentication failed'));
          } else {
            spinner.succeed(chalk.green('Authentication successful'));
          }
        } catch (error) {
          errors.push(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          spinner.fail(chalk.red('Authentication failed'));
        }

        // Check tenant accessibility
        spinner.start('Checking tenant access...');
        try {
          const tenants = await authService.listTenants();
          const tenantExists = tenants.some(t => t.tenantId === profile.tenantId);

          if (!tenantExists) {
            errors.push(`Tenant ${profile.tenantId} is not accessible`);
            spinner.fail(chalk.red('Tenant not accessible'));
          } else {
            spinner.succeed(chalk.green('Tenant is accessible'));
          }
        } catch (error) {
          errors.push(`Failed to list tenants: ${error instanceof Error ? error.message : 'Unknown error'}`);
          spinner.fail(chalk.red('Failed to check tenant access'));
        }

        // Check subscription accessibility
        spinner.start('Checking subscription access...');
        try {
          const subscriptions = await authService.listSubscriptions(profile.tenantId);
          const subscription = subscriptions.find(s => s.subscriptionId === profile.subscriptionId);

          if (!subscription) {
            errors.push(`Subscription ${profile.subscriptionId} is not accessible in tenant ${profile.tenantId}`);
            spinner.fail(chalk.red('Subscription not accessible'));
          } else if (subscription.state !== 'Enabled') {
            warnings.push(`Subscription state is '${subscription.state}' (not 'Enabled')`);
            spinner.warn(chalk.yellow(`Subscription is in '${subscription.state}' state`));
          } else {
            spinner.succeed(chalk.green('Subscription is accessible and enabled'));
          }
        } catch (error) {
          errors.push(`Failed to list subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`);
          spinner.fail(chalk.red('Failed to check subscription access'));
        }

        // Display results
        console.log();
        if (errors.length === 0 && warnings.length === 0) {
          console.log(chalk.green.bold('✓ Validation passed'));
          console.log(chalk.gray(`Profile '${profile.name}' is properly configured and accessible`));
        } else {
          if (errors.length > 0) {
            console.log(chalk.red.bold(`✗ Validation failed with ${errors.length} error(s):`));
            errors.forEach(err => console.log(chalk.red(`  • ${err}`)));
          }

          if (warnings.length > 0) {
            console.log(chalk.yellow.bold(`\n⚠ ${warnings.length} warning(s):`));
            warnings.forEach(warn => console.log(chalk.yellow(`  • ${warn}`)));
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
        console.error(
          chalk.red(error instanceof Error ? error.message : 'Unknown error')
        );
        process.exit(1);
      }
    });

  return validate;
}
