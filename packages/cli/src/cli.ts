#!/usr/bin/env node

import { Command } from 'commander';
import { createConfigCommand } from './commands/config';
import { createSynthCommand } from './commands/synth';
import { createDeployCommand } from './commands/deploy';
import { createDiffCommand } from './commands/diff';

export function cli() {
  const program = new Command();

  program
    .name('azure-arm')
    .description('Azure ARM Infrastructure as Code CLI')
    .version('1.0.0');

  // Add commands
  program.addCommand(createConfigCommand());
  program.addCommand(createSynthCommand());
  program.addCommand(createDeployCommand());
  program.addCommand(createDiffCommand());

  program.parse(process.argv);
}

// Run if executed directly
if (require.main === module) {
  cli();
}
