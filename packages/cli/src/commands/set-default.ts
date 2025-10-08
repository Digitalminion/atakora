import { Command } from 'commander';
import chalk from 'chalk';
import { ManifestManager } from '../manifest/manifest-manager';

/**
 * Creates the `atakora set-default` command
 *
 * Sets the default package for the project.
 * The default package is used when no package is explicitly specified
 * in commands like synth and deploy.
 *
 * @returns Commander command instance
 */
export function createSetDefaultCommand(): Command {
  const setDefault = new Command('set-default')
    .description('Set the default package for the project')
    .argument('<package-name>', 'Name of the package to set as default')
    .addHelpText(
      'after',
      `
${chalk.bold('Description:')}
  Sets which package should be used by default when running commands
  without the --package flag.

${chalk.bold('Examples:')}
  ${chalk.dim('# Set backend as the default package')}
  ${chalk.cyan('$')} atakora set-default backend

  ${chalk.dim('# After setting default, synth uses it')}
  ${chalk.cyan('$')} atakora synth              ${chalk.dim('# Uses backend package')}
  ${chalk.cyan('$')} atakora synth -p frontend  ${chalk.dim('# Override with specific package')}

${chalk.bold('When is this useful?')}
  ${chalk.cyan('•')} You have multiple packages and want to work primarily on one
  ${chalk.cyan('•')} You want ${chalk.white('atakora synth')} to target a specific package
  ${chalk.cyan('•')} You're switching focus between different infrastructure areas

${chalk.bold('Related Commands:')}
  ${chalk.white('atakora add <name> --set-default')}  ${chalk.dim('Set default when adding')}
  ${chalk.white('atakora synth --package <name>')}    ${chalk.dim('Override default temporarily')}
`
    )
    .action(async (packageName: string) => {
      try {
        // Check if project is initialized
        const manifestManager = new ManifestManager();
        if (!manifestManager.exists()) {
          console.log(chalk.red('\nProject not initialized!'));
          console.log(chalk.cyan('Run: atakora init'));
          process.exit(1);
        }

        // Validate package exists
        const pkg = manifestManager.getPackage(packageName);
        if (!pkg) {
          console.log(chalk.red(`\nPackage '${packageName}' not found in manifest!`));
          console.log(chalk.cyan('\nAvailable packages:'));

          const packages = manifestManager.listPackages();
          packages.forEach((p) => {
            console.log(chalk.white(`  - ${p.name}`));
          });

          process.exit(1);
        }

        // Set default package
        manifestManager.setDefaultPackage(packageName);

        console.log(chalk.green(`\n✓ Default package set to: ${chalk.bold(packageName)}\n`));
      } catch (error) {
        if (error instanceof Error) {
          console.error(chalk.red('\nError: ' + error.message));
        } else {
          console.error(chalk.red('\nUnknown error occurred'));
        }

        process.exit(1);
      }
    });

  return setDefault;
}
