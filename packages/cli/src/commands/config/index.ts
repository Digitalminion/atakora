import { Command } from 'commander';
import chalk from 'chalk';
import { loginCommand } from './login';
import { selectCommand } from './select';
import { showCommand } from './show';
import { useCommand } from './use';
import { listCommand } from './list';
import { setProfileCommand } from './set-profile';
import { validateCommand } from './validate';

export function createConfigCommand(): Command {
  const config = new Command('config')
    .description('Manage Azure authentication and configuration')
    .addHelpText(
      'after',
      `
${chalk.bold('Description:')}
  Manage Azure authentication, subscriptions, and deployment profiles.
  Configure how Atakora connects to Azure and which resources to target.

${chalk.bold('Subcommands:')}
  ${chalk.white('login')}        ${chalk.dim('Authenticate with Azure')}
  ${chalk.white('select')}       ${chalk.dim('Choose active Azure subscription')}
  ${chalk.white('list')}         ${chalk.dim('List available subscriptions')}
  ${chalk.white('show')}         ${chalk.dim('Display current configuration')}
  ${chalk.white('use')}          ${chalk.dim('Switch deployment profiles')}
  ${chalk.white('set-profile')}  ${chalk.dim('Create or update a profile')}
  ${chalk.white('validate')}     ${chalk.dim('Verify configuration is valid')}

${chalk.bold('Examples:')}
  ${chalk.dim('# Authenticate with Azure')}
  ${chalk.cyan('$')} atakora config login

  ${chalk.dim('# List available subscriptions')}
  ${chalk.cyan('$')} atakora config list

  ${chalk.dim('# Set active subscription')}
  ${chalk.cyan('$')} atakora config select

  ${chalk.dim('# Show current configuration')}
  ${chalk.cyan('$')} atakora config show

${chalk.bold('Configuration File:')}
  Location: ${chalk.white('~/.atakora/config.json')}

  Stores:
  ${chalk.cyan('•')} Azure authentication tokens
  ${chalk.cyan('•')} Active subscription ID
  ${chalk.cyan('•')} Deployment profiles (prod, staging, dev)
  ${chalk.cyan('•')} Default resource group and location

${chalk.bold('Getting Started:')}
  ${chalk.cyan('1.')} Run ${chalk.white('atakora config login')} to authenticate
  ${chalk.cyan('2.')} Run ${chalk.white('atakora config select')} to choose subscription
  ${chalk.cyan('3.')} Run ${chalk.white('atakora deploy')} to deploy infrastructure

${chalk.dim('For detailed help on a subcommand, run:')}
  ${chalk.cyan('$')} atakora config <subcommand> --help
`
    );

  // Add subcommands
  config.addCommand(loginCommand());
  config.addCommand(selectCommand());
  config.addCommand(showCommand());
  config.addCommand(useCommand());
  config.addCommand(listCommand());
  config.addCommand(setProfileCommand());
  config.addCommand(validateCommand());

  return config;
}
