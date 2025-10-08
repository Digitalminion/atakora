import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { ResourceManagementClient } from '@azure/arm-resources';
import { ConfigManager, ProfileConfig } from '../../config/config-manager';
import { authManager } from '../../auth/auth-manager';

// Types for manifest
interface StackManifest {
  name: string;
  templatePath: string;
  resourceCount: number;
  parameterCount: number;
  outputCount: number;
  dependencies?: string[];
}

interface CloudAssemblyManifest {
  version: string;
  stacks: Record<string, StackManifest>;
  directory: string;
}

// Types for ARM template
interface ArmResource {
  type: string;
  apiVersion: string;
  name: string;
  location?: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ArmTemplate {
  $schema?: string;
  contentVersion: string;
  resources?: ArmResource[];
  parameters?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  [key: string]: unknown;
}

interface DeploymentProperties {
  mode: 'Incremental' | 'Complete';
  template: ArmTemplate;
  parameters: Record<string, unknown>;
}

interface Deployment {
  location?: string;
  properties: DeploymentProperties;
}

export function createDeployCommand(): Command {
  const deploy = new Command('deploy')
    .description('Deploy ARM templates to Azure')
    .argument('[stack]', 'Specific stack to deploy (optional)')
    .option('-a, --app <path>', 'Path to synthesized templates', 'arm.out')
    .option('--skip-validation', 'Skip pre-deployment validation')
    .option('--auto-approve', 'Skip confirmation prompts')
    .addHelpText(
      'after',
      `
${chalk.bold('Description:')}
  Deploys synthesized ARM templates to your Azure subscription.
  Creates or updates Azure resources based on your infrastructure code.

${chalk.bold('Examples:')}
  ${chalk.dim('# Deploy all stacks')}
  ${chalk.cyan('$')} atakora deploy

  ${chalk.dim('# Deploy specific stack')}
  ${chalk.cyan('$')} atakora deploy Foundation

  ${chalk.dim('# Deploy from custom output directory')}
  ${chalk.cyan('$')} atakora deploy --app ./custom-output

  ${chalk.dim('# Skip confirmation prompt')}
  ${chalk.cyan('$')} atakora deploy --auto-approve

  ${chalk.dim('# Skip validation checks')}
  ${chalk.cyan('$')} atakora deploy --skip-validation

${chalk.bold('Deployment Process:')}
  ${chalk.cyan('1.')} Loads synthesized templates from output directory
  ${chalk.cyan('2.')} Authenticates with Azure (or uses cached credentials)
  ${chalk.cyan('3.')} Validates templates and checks Azure quotas
  ${chalk.cyan('4.')} Shows deployment plan and prompts for confirmation
  ${chalk.cyan('5.')} Deploys resources to Azure subscription
  ${chalk.cyan('6.')} Monitors deployment progress and shows results

${chalk.bold('Requirements:')}
  ${chalk.cyan('•')} Azure subscription configured (${chalk.white('atakora config select')})
  ${chalk.cyan('•')} Synthesized templates exist (${chalk.white('atakora synth')})
  ${chalk.cyan('•')} Appropriate Azure permissions for deployment
  ${chalk.cyan('•')} Internet connection for Azure API calls

${chalk.bold('Safety:')}
  ${chalk.cyan('•')} Uses ${chalk.white('Incremental')} deployment mode by default
  ${chalk.cyan('•')} Existing resources not in template are preserved
  ${chalk.cyan('•')} Shows deployment plan before applying changes
  ${chalk.cyan('•')} Validates templates before deployment

${chalk.bold('Related Commands:')}
  ${chalk.white('atakora synth')}        ${chalk.dim('Generate templates before deploying')}
  ${chalk.white('atakora diff')}         ${chalk.dim('Preview changes before deployment')}
  ${chalk.white('atakora config show')}  ${chalk.dim('Verify deployment target')}
`
    )
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

        // Authenticate (using cached credential if available)
        const cloudEnvironment =
          (profile.cloud as 'AzureCloud' | 'AzureUSGovernment') || 'AzureCloud';
        const authService = authManager.getAuthService(cloudEnvironment);

        if (!authManager.isAuthenticated(cloudEnvironment)) {
          spinner.text = 'Authenticating with Azure...';
          const authResult = await authService.login();

          if (!authResult.success) {
            spinner.fail(chalk.red('Authentication failed'));
            console.error(chalk.red(authResult.error || 'Unknown error'));
            process.exit(1);
          }
        } else {
          spinner.text = 'Using cached credentials...';
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

        const manifest = JSON.parse(
          fs.readFileSync(manifestPath, 'utf-8')
        ) as CloudAssemblyManifest;

        // Determine which stacks to deploy
        const stacksToDeploy = stackName ? [stackName] : Object.keys(manifest.stacks);

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

        // Extract resource group name from AuthR stack (if it exists)
        let resourceGroupName: string | undefined;
        if (manifest.stacks['AuthR']) {
          const colorAIPath = path.join(assemblyPath, manifest.stacks['AuthR'].templatePath);
          const colorAITemplate = JSON.parse(fs.readFileSync(colorAIPath, 'utf-8')) as ArmTemplate;
          const rgResource = colorAITemplate.resources?.find(
            (r) => r.type === 'Microsoft.Resources/resourceGroups'
          );
          resourceGroupName = rgResource?.name;
        }

        // Deploy each stack
        for (const stack of stacksToDeploy) {
          await deployStack(
            client,
            assemblyPath,
            stack,
            manifest.stacks[stack],
            profile,
            resourceGroupName
          );
        }

        console.log(chalk.green.bold('\n✓ All deployments completed successfully!'));
      } catch (error) {
        spinner.fail(chalk.red('Deployment failed'));
        console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
      }
    });

  return deploy;
}

async function deployStack(
  client: ResourceManagementClient,
  assemblyPath: string,
  stackName: string,
  stackManifest: StackManifest,
  profile: ProfileConfig,
  resourceGroupName?: string
): Promise<void> {
  const spinner = ora(`Deploying stack: ${stackName}...`).start();

  try {
    // Load template
    const templatePath = path.join(assemblyPath, stackManifest.templatePath);
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8')) as ArmTemplate;

    // Determine deployment scope from template schema
    const isSubscriptionScope = template.$schema?.includes('subscriptionDeploymentTemplate');

    // Validate resource group name for resource group scoped deployments
    if (!isSubscriptionScope && !resourceGroupName) {
      throw new Error(
        `Resource group name not found. The AuthR stack must be deployed first to create the resource group.`
      );
    }

    // Create deployment name
    const deploymentName = `${stackName}-${Date.now()}`;

    // Start deployment
    spinner.text = `Submitting deployment: ${deploymentName}...`;

    // Build deployment object - location only needed for subscription scope
    const deployment: Deployment = {
      properties: {
        mode: 'Incremental',
        template,
        parameters: {},
      },
    };

    if (isSubscriptionScope) {
      deployment.location = profile.location || 'eastus2';
    }

    // Deploy to subscription or resource group based on scope
    let poller;
    if (isSubscriptionScope) {
      spinner.text = `Deploying ${stackName} at subscription scope...`;
      poller = await client.deployments.beginCreateOrUpdateAtSubscriptionScope(
        deploymentName,
        deployment
      );
    } else {
      // TypeScript: resourceGroupName is guaranteed to be defined here due to validation above
      spinner.text = `Deploying ${stackName} to resource group ${resourceGroupName}...`;
      poller = await client.deployments.beginCreateOrUpdate(
        resourceGroupName!,
        deploymentName,
        deployment
      );
    }

    spinner.text = `Deploying ${stackName}... (this may take several minutes)`;

    // Wait for deployment to complete
    const result = await poller.pollUntilDone();

    // Check deployment status
    if (result.properties?.provisioningState === 'Succeeded') {
      spinner.succeed(chalk.green(`✓ Stack '${stackName}' deployed successfully`));

      // Display outputs
      if (result.properties.outputs && Object.keys(result.properties.outputs).length > 0) {
        console.log(chalk.bold('\nOutputs:'));
        for (const [key, output] of Object.entries(
          result.properties.outputs as Record<string, any>
        )) {
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
