import { Command } from 'commander';
import { loginCommand } from './login';
import { selectCommand } from './select';
import { showCommand } from './show';
import { useCommand } from './use';
import { listCommand } from './list';
import { setProfileCommand } from './set-profile';
import { validateCommand } from './validate';

export function createConfigCommand(): Command {
  const config = new Command('config').description('Manage Azure ARM CLI configuration');

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
