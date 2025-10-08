import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../../config/config-manager';

export function listCommand(): Command {
  const list = new Command('list')
    .description('List all saved profiles')
    .option('--json', 'Output in JSON format')
    .action((options) => {
      try {
        const configManager = new ConfigManager();
        const profiles = configManager.listProfiles();
        const activeProfileName = configManager.getActiveProfileName();

        if (profiles.length === 0) {
          if (options.json) {
            console.log(JSON.stringify({ profiles: [] }, null, 2));
          } else {
            console.log(chalk.yellow('No profiles configured'));
            console.log(
              chalk.cyan('\nRun'),
              chalk.bold('azure-arm config select'),
              chalk.cyan('to create a profile')
            );
          }
          return;
        }

        if (options.json) {
          const output = {
            activeProfile: activeProfileName,
            profiles: profiles.map((p) => ({
              name: p.name,
              tenantId: p.tenantId,
              subscriptionId: p.subscriptionId,
              subscriptionName: p.subscriptionName,
              cloud: p.cloud,
              location: p.location,
              isActive: p.name === activeProfileName,
            })),
          };
          console.log(JSON.stringify(output, null, 2));
        } else {
          console.log(chalk.bold('\nConfigured Profiles'));
          console.log(chalk.gray('─'.repeat(70)));

          profiles.forEach((profile) => {
            const isActive = profile.name === activeProfileName;
            const marker = isActive ? chalk.green('● ') : '  ';
            const profileName = isActive
              ? chalk.green.bold(profile.name)
              : chalk.white(profile.name);

            console.log(`${marker}${profileName}`);
            console.log(
              `  ${chalk.gray('Subscription:')} ${profile.subscriptionName || profile.subscriptionId}`
            );
            console.log(`  ${chalk.gray('Tenant ID:')}    ${profile.tenantId}`);
            if (profile.cloud) {
              console.log(`  ${chalk.gray('Cloud:')}        ${profile.cloud}`);
            }
            if (profile.location) {
              console.log(`  ${chalk.gray('Location:')}     ${profile.location}`);
            }
            console.log();
          });

          console.log(
            chalk.gray('Use'),
            chalk.bold('azure-arm config use <profile>'),
            chalk.gray('to switch profiles')
          );
        }
      } catch (error) {
        console.error(
          chalk.red('Failed to list profiles:'),
          error instanceof Error ? error.message : 'Unknown error'
        );
        process.exit(1);
      }
    });

  return list;
}
