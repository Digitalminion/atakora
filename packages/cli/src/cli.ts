#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createConfigCommand } from './commands/config';
import { createSynthCommand } from './commands/synth';
import { createDeployCommand } from './commands/deploy';
import { createDiffCommand } from './commands/diff';
import { createInitCommand } from './commands/init';
import { createAddCommand } from './commands/add';
import { createSetDefaultCommand } from './commands/set-default';

const BANNER = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('ATAKORA')}  ${chalk.gray('│')}  ${chalk.italic('Azure Infrastructure as TypeScript')}     ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════════╝')}
`;

export function cli() {
  const program = new Command();

  // Show banner when no args or help is requested
  if (process.argv.length <= 2 || process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(BANNER);
  }

  program
    .name('atakora')
    .description(chalk.gray('Type-safe Azure ARM template generation for modern infrastructure'))
    .version('1.0.0', '-v, --version', 'Output the current version')
    .helpOption('-h, --help', 'Display help for command')
    .addHelpText(
      'after',
      `
${chalk.bold('Quick Start:')}
  ${chalk.cyan('$')} atakora init                 ${chalk.gray('Create a new project')}
  ${chalk.cyan('$')} atakora synth                ${chalk.gray('Generate ARM templates')}
  ${chalk.cyan('$')} atakora deploy               ${chalk.gray('Deploy to Azure')}

${chalk.bold('Documentation:')} ${chalk.blue.underline('https://github.com/digital-minion/atakora')}
`
    );

  // Add commands
  program.addCommand(createInitCommand());
  program.addCommand(createAddCommand());
  program.addCommand(createSetDefaultCommand());
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
