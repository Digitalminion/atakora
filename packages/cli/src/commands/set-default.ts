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
