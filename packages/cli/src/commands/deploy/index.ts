import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { ResourceManagementClient } from '@azure/arm-resources';
import { ConfigManager } from '../../config/config-manager';
import { AzureAuthService } from '../../auth/azure-auth';

export function createDeployCommand(): Command {
  const deploy = new Command('deploy')
    .description('Deploy ARM templates to Azure')
    .argument('[stack]', 'Stack name to deploy (deploys all stacks if not specified)')
    .option('-a, --app <path>', 'Path to synthesized cloud assembly directory', 'arm.out')
    .option('--skip-validation', 'Skip pre-deployment validation')
    .option('--auto-approve', 'Skip deployment confirmation prompt')
    .action(async (stackName, options) => {
      const spinner = ora('Initializing deployment...').start();

      try {
        // Load configuration
        const configManager = new ConfigManager();
        const profile = configManager.getProfile();

        if (!profile) {
          spinner.fail(chalk.red('No active profile found'));
          console.log(
            chalk.cyan('\nRun'),
            chalk.bold('azure-arm config select'),
            chalk.cyan('to configure your Azure credentials')
          );
          process.exit(1);
        }

        // Authenticate
        spinner.text = 'Authenticating with Azure...';
        const authService = new AzureAuthService(profile.cloud as any);
        const authResult = await authService.login();

        if (!authResult.success) {
          spinner.fail(chalk.red('Authentication failed'));
          console.error(chalk.red(authResult.error || 'Unknown error'));
          process.exit(1);
        }

        // Load cloud assembly
        spinner.text = 'Loading cloud assembly...';
        const assemblyPath = path.resolve(options.app);
        const manifestPath = path.join(assemblyPath, 'manifest.json');

        if (!fs.existsSync(manifestPath)) {
          spinner.fail(chalk.red('Cloud assembly not found'));
          console.log(
            chalk.cyan('\nRun'),
            chalk.bold('azure-arm synth'),
            chalk.cyan('to synthesize your templates first')
          );
          process.exit(1);
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

        // Determine which stacks to deploy
        const stacksToDeploy = stackName
          ? [stackName]
          : Object.keys(manifest.stacks);

        if (stackName && !manifest.stacks[stackName]) {
          spinner.fail(chalk.red(`Stack '${stackName}' not found in cloud assembly`));
          process.exit(1);
        }

        spinner.succeed(chalk.green(`Found ${stacksToDeploy.length} stack(s) to deploy`));

        // Display deployment plan
        console.log(chalk.bold('\nDeployment Plan:'));
        console.log(chalk.gray('─'.repeat(70)));
        for (const stack of stacksToDeploy) {
          const stackManifest = manifest.stacks[stack];
          console.log(chalk.cyan(`Stack: ${stack}`));
          console.log(`  Resources: ${stackManifest.resourceCount}`);
          console.log(`  Parameters: ${stackManifest.parameterCount}`);
          console.log(`  Outputs: ${stackManifest.outputCount}`);
          console.log(`  Template: ${stackManifest.templatePath}`);
        }
        console.log(chalk.gray('─'.repeat(70)));

        // Confirmation prompt
        if (!options.autoApprove) {
          const inquirer = (await import('inquirer')).default;
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Deploy ${stacksToDeploy.length} stack(s) to ${profile.subscriptionName || profile.subscriptionId}?`,
              default: false,
            },
          ]);

          if (!confirm) {
            console.log(chalk.yellow('\nDeployment cancelled'));
            process.exit(0);
          }
        }

        // Create deployment client
        const credential = authService.getCredential();
        const client = new ResourceManagementClient(credential, profile.subscriptionId);

        // Deploy each stack
        for (const stack of stacksToDeploy) {
          await deployStack(client, assemblyPath, stack, manifest.stacks[stack], profile);
        }

        console.log(chalk.green.bold('\n✓ All deployments completed successfully!'));
      } catch (error) {
        spinner.fail(chalk.red('Deployment failed'));
        console.error(
          chalk.red(error instanceof Error ? error.message : 'Unknown error')
        );
        process.exit(1);
      }
    });

  return deploy;
}

async function deployStack(
  client: ResourceManagementClient,
  assemblyPath: string,
  stackName: string,
  stackManifest: any,
  profile: any
): Promise<void> {
  const spinner = ora(`Deploying stack: ${stackName}...`).start();

  try {
    // Load template
    const templatePath = path.join(assemblyPath, stackManifest.templatePath);
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

    // Create deployment name
    const deploymentName = `${stackName}-${Date.now()}`;

    // Start deployment
    spinner.text = `Submitting deployment: ${deploymentName}...`;

    const deployment = {
      properties: {
        mode: 'Incremental' as const,
        template,
        parameters: {},
      },
    };

    // Deploy to subscription or resource group based on scope
    const poller = await client.deployments.beginCreateOrUpdateAtSubscriptionScope(
      deploymentName,
      deployment
    );

    spinner.text = `Deploying ${stackName}... (this may take several minutes)`;

    // Wait for deployment to complete
    const result = await poller.pollUntilDone();

    // Check deployment status
    if (result.properties?.provisioningState === 'Succeeded') {
      spinner.succeed(chalk.green(`✓ Stack '${stackName}' deployed successfully`));

      // Display outputs
      if (result.properties.outputs && Object.keys(result.properties.outputs).length > 0) {
        console.log(chalk.bold('\nOutputs:'));
        for (const [key, output] of Object.entries(result.properties.outputs as Record<string, any>)) {
          console.log(`  ${chalk.cyan(key)}: ${output.value}`);
        }
      }
    } else {
      spinner.fail(chalk.red(`✗ Stack '${stackName}' deployment failed`));
      console.error(chalk.red(`Provisioning state: ${result.properties?.provisioningState}`));

      if (result.properties?.error) {
        console.error(chalk.red(`Error: ${JSON.stringify(result.properties.error, null, 2)}`));
      }

      process.exit(1);
    }
  } catch (error) {
    spinner.fail(chalk.red(`✗ Stack '${stackName}' deployment failed`));
    throw error;
  }
}
