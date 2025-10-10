#!/usr/bin/env node

/**
 * Atakora CLI - Azure Infrastructure as TypeScript
 *
 * Main CLI entry point that configures and runs the command-line interface
 * for managing Azure infrastructure projects using TypeScript constructs.
 *
 * @module cli
 *
 * @remarks
 * Command Structure:
 * - `init` - Initialize new Atakora project
 * - `add` - Add infrastructure package to project
 * - `set-default` - Set default package for synthesis
 * - `config` - Manage Azure connection profiles
 * - `synth` - Synthesize ARM templates from TypeScript
 * - `deploy` - Deploy templates to Azure
 * - `diff` - Preview infrastructure changes
 *
 * Architecture:
 * - Built on Commander.js for command parsing
 * - Each command implemented as separate module
 * - Banner displayed for help and no-args invocation
 * - Version management via package.json
 *
 * Usage Patterns:
 * ```bash
 * # Project lifecycle
 * atakora init                    # Create project
 * atakora add networking          # Add package
 * atakora synth                   # Generate templates
 * atakora deploy                  # Deploy to Azure
 *
 * # Configuration management
 * atakora config login            # Authenticate
 * atakora config select           # Choose tenant/subscription
 * atakora config show             # View active config
 *
 * # Multi-package workflows
 * atakora synth --all             # Synthesize all packages
 * atakora set-default backend     # Set default package
 * ```
 *
 * Entry Points:
 * - Direct execution: #!/usr/bin/env node shebang
 * - Module import: cli() function export
 * - Package.json bin: "atakora" command
 *
 * @see {@link https://github.com/digital-minion/atakora} for documentation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createConfigCommand } from './commands/config';
import { createSynthCommand } from './commands/synth';
import { createDeployCommand } from './commands/deploy';
import { createDiffCommand } from './commands/diff';
import { createInitCommand } from './commands/init';
import { createAddCommand } from './commands/add';
import { createSetDefaultCommand } from './commands/set-default';

/**
 * ASCII banner displayed when running help or no commands.
 * Provides visual branding and project tagline.
 */
const BANNER = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('ATAKORA')}  ${chalk.gray('│')}  ${chalk.italic('Azure Infrastructure as TypeScript')}     ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════════╝')}
`;

/**
 * Initializes and runs the Atakora CLI.
 *
 * Creates the root Commander.js program, registers all subcommands,
 * and parses command-line arguments. Displays banner for help invocations.
 *
 * @example
 * ```typescript
 * // Direct invocation
 * import { cli } from '@atakora/cli';
 * cli();
 *
 * // Or via package.json bin
 * // $ atakora init
 * ```
 *
 * @remarks
 * Command Registration Order:
 * 1. init - Project initialization
 * 2. add - Package addition
 * 3. set-default - Default package selection
 * 4. config - Azure configuration
 * 5. synth - Template synthesis
 * 6. deploy - Azure deployment
 * 7. diff - Change preview
 *
 * Banner Display:
 * - Shown when no arguments provided
 * - Shown when --help or -h flag used
 * - Hidden during normal command execution
 *
 * Version Management:
 * - Version read from package.json
 * - Displayed with -v or --version flag
 * - Follows semantic versioning
 */
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
