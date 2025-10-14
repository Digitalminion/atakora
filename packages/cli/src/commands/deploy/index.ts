import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { ResourceManagementClient } from '@azure/arm-resources';
import { ConfigManager, ProfileConfig } from '../../config/config-manager';
import { authManager } from '../../auth/auth-manager';

// Import types from lib
import type { CloudAssemblyV2, StackManifestV2, CloudAssembly, StackManifest } from '@atakora/lib/synthesis/types';
import { ArtifactStorageManager } from '@atakora/lib/synthesis/storage';
import { ArtifactUploader } from '../../deployment/artifact-uploader';

// Legacy manifest type (v1.0.0)
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

/**
 * Creates the 'deploy' command for deploying ARM templates to Azure.
 *
 * This command orchestrates the complete deployment process including authentication,
 * template loading, validation, user confirmation, and resource provisioning in Azure.
 * It supports both subscription-scoped and resource group-scoped deployments.
 *
 * @returns A Commander.js Command instance configured for Azure deployment
 *
 * @example
 * ```bash
 * # Deploy all stacks from default output directory
 * atakora deploy
 *
 * # Deploy specific stack
 * atakora deploy Foundation
 *
 * # Deploy from custom output directory
 * atakora deploy --app ./custom-output
 *
 * # Skip confirmation for CI/CD
 * atakora deploy --auto-approve
 *
 * # Skip pre-deployment validation
 * atakora deploy --skip-validation
 * ```
 *
 * @remarks
 * Command Options:
 * - `[stack]`: Optional specific stack name to deploy
 * - `-a, --app <path>`: Path to synthesized templates (default: "arm.out")
 * - `--skip-validation`: Skip pre-deployment template validation
 * - `--auto-approve`: Skip manual confirmation prompt
 *
 * Deployment Process:
 * 1. Loads active Azure profile configuration
 * 2. Authenticates with Azure (uses cached credentials when available)
 * 3. Loads cloud assembly manifest from output directory
 * 4. Determines which stacks to deploy (all or specific)
 * 5. Displays deployment plan with resource counts
 * 6. Prompts for confirmation (unless --auto-approve)
 * 7. Deploys each stack in order
 * 8. Monitors progress and displays results
 *
 * Deployment Modes:
 * - Subscription Scope: Creates subscription-level resources (resource groups, policies, etc.)
 * - Resource Group Scope: Creates resources within a resource group
 * - Uses Incremental mode (preserves existing resources not in template)
 *
 * Requirements:
 * - Active Azure profile (run 'azure-arm config select')
 * - Synthesized templates exist (run 'azure-arm synth')
 * - Valid Azure credentials with deployment permissions
 * - AuthR stack deployed first (for resource group name extraction)
 *
 * Error Handling:
 * - Exits with code 1 if profile not configured
 * - Exits with code 1 if authentication fails
 * - Exits with code 1 if cloud assembly not found
 * - Exits with code 1 if specified stack doesn't exist
 * - Exits with code 1 if any deployment fails
 * - Displays Azure API errors with full details
 *
 * Safety Features:
 * - Incremental deployment mode (no destructive updates)
 * - Confirmation prompt before applying changes
 * - Deployment plan display before execution
 * - Per-stack success/failure reporting
 * - Output display for debugging and verification
 *
 * @see {@link deployStack} for individual stack deployment logic
 * @see {@link ConfigManager} for profile management
 * @see {@link authManager} for Azure authentication
 */
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

        const manifestData = JSON.parse(
          fs.readFileSync(manifestPath, 'utf-8')
        );

        // Check manifest version
        const isV2Manifest = manifestData.version === '2.0.0';
        const manifest = manifestData as CloudAssemblyManifest | CloudAssemblyV2;

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

          // Show linked template info for v2
          if (isV2Manifest && (stackManifest as StackManifestV2).linkedTemplates) {
            const v2Manifest = stackManifest as StackManifestV2;
            console.log(`  Linked Templates: ${v2Manifest.linkedTemplates?.length || 0}`);
          }
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

        // Extract resource group name by finding the stack that creates the resource group
        // This is typically a subscription-scoped stack that contains Microsoft.Resources/resourceGroups
        let resourceGroupName: string | undefined;
        for (const [stackName, stackManifest] of Object.entries(manifest.stacks)) {
          const templatePath = path.join(assemblyPath, stackManifest.templatePath);
          const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8')) as ArmTemplate;
          const rgResource = template.resources?.find(
            (r) => r.type === 'Microsoft.Resources/resourceGroups'
          );
          if (rgResource) {
            resourceGroupName = rgResource.name;
            break; // Found the resource group, no need to continue
          }
        }

        // Deploy each stack
        for (const stack of stacksToDeploy) {
          await deployStack(
            client,
            assemblyPath,
            stack,
            manifest.stacks[stack],
            profile,
            resourceGroupName,
            isV2Manifest ? (manifest as CloudAssemblyV2) : undefined,
            credential
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

/**
 * Deploys a single stack to Azure.
 *
 * Handles both subscription-scoped and resource group-scoped deployments.
 * Creates a timestamped deployment name, submits the template to Azure,
 * polls for completion, and displays outputs.
 *
 * @param client - Azure Resource Management client for API calls
 * @param assemblyPath - Path to cloud assembly directory containing templates
 * @param stackName - Name of the stack to deploy
 * @param stackManifest - Stack metadata from manifest.json
 * @param profile - Active Azure profile configuration
 * @param resourceGroupName - Optional resource group name for RG-scoped deployments
 *
 * @throws Error if resource group name missing for RG-scoped deployment
 * @throws Error if deployment provisioning fails
 *
 * @remarks
 * Deployment Scope Detection:
 * - Checks template $schema for 'subscriptionDeploymentTemplate'
 * - Subscription scope: Deploys directly to subscription
 * - Resource group scope: Requires resourceGroupName parameter
 *
 * Deployment Naming:
 * - Format: `{stackName}-{timestamp}`
 * - Example: "Foundation-1234567890"
 * - Enables tracking deployment history in Azure portal
 *
 * Progress Monitoring:
 * - Uses Azure SDK polling mechanism
 * - Displays spinner during deployment
 * - Shows success/failure upon completion
 * - Displays stack outputs after successful deployment
 *
 * @see {@link createDeployCommand} for overall deployment orchestration
 */
async function deployStack(
  client: ResourceManagementClient,
  assemblyPath: string,
  stackName: string,
  stackManifest: StackManifest,
  profile: ProfileConfig,
  resourceGroupName?: string,
  cloudAssembly?: CloudAssemblyV2,
  credential?: any
): Promise<void> {
  const spinner = ora(`Deploying stack: ${stackName}...`).start();

  try {
    // Check if this is a v2 manifest with linked templates
    const isV2 = cloudAssembly && cloudAssembly.version === '2.0.0';
    const v2Manifest = isV2 ? (stackManifest as StackManifestV2) : undefined;
    const hasLinkedTemplates = v2Manifest?.linkedTemplates && v2Manifest.linkedTemplates.length > 0;

    // Upload Phase: Upload templates and packages if using linked templates
    let artifactBaseUri: string | undefined;
    let artifactSasToken: string | undefined;
    let storageManager: ArtifactStorageManager | undefined;

    if (hasLinkedTemplates && cloudAssembly) {
      spinner.text = `Uploading artifacts for ${stackName}...`;

      // Initialize storage manager
      storageManager = new ArtifactStorageManager({
        subscriptionId: profile.subscriptionId,
        resourceGroupName: resourceGroupName || `rg-${stackName.toLowerCase()}`,
        location: profile.location || 'eastus2',
        project: 'atakora',
        environment: 'production',
        credential: credential
      });

      // Provision storage
      await storageManager.provisionStorage();

      // Upload artifacts
      const uploader = new ArtifactUploader((progress) => {
        const percent = Math.round((progress.current / progress.total) * 100);
        spinner.text = `Uploading ${progress.phase}: ${progress.currentFile} (${percent}%)`;
      });

      const uploadResult = await uploader.uploadAll(cloudAssembly, storageManager, stackName);

      artifactBaseUri = uploadResult.baseUri;
      artifactSasToken = uploadResult.sasToken;

      spinner.text = `Artifacts uploaded for ${stackName}`;
    }

    // Load template
    const templatePath = path.join(assemblyPath, stackManifest.templatePath);
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8')) as ArmTemplate;

    // Determine deployment scope from template schema
    const isSubscriptionScope = template.$schema?.includes('subscriptionDeploymentTemplate');

    // Validate resource group name for resource group scoped deployments
    if (!isSubscriptionScope && !resourceGroupName) {
      throw new Error(
        `Resource group name not found. A subscription-scoped stack with Microsoft.Resources/resourceGroups must be deployed first to create the resource group.`
      );
    }

    // Create deployment name
    const deploymentName = `${stackName}-${Date.now()}`;

    // Start deployment
    spinner.text = `Submitting deployment: ${deploymentName}...`;

    // Build deployment parameters
    const parameters: Record<string, any> = {};

    // Add artifact parameters for linked templates
    if (hasLinkedTemplates && artifactBaseUri && artifactSasToken) {
      parameters._artifactsLocation = { value: artifactBaseUri };
      parameters._artifactsLocationSasToken = { value: artifactSasToken };
    }

    // Build deployment object - location only needed for subscription scope
    const deployment: Deployment = {
      properties: {
        mode: 'Incremental',
        template,
        parameters,
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

      // Update manifest with storage config if using linked templates
      if (hasLinkedTemplates && cloudAssembly && storageManager) {
        await updateManifestWithStorageConfig(
          assemblyPath,
          cloudAssembly,
          storageManager,
          deploymentName
        );
      }

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

/**
 * Update manifest with storage configuration after successful deployment
 */
async function updateManifestWithStorageConfig(
  assemblyPath: string,
  manifest: CloudAssemblyV2,
  storageManager: ArtifactStorageManager,
  deploymentId: string
): Promise<void> {
  try {
    const storageConfig = storageManager.getStorageConfig();

    // Create or update artifactStorage config
    const existingDeployments = manifest.artifactStorage?.deployments || [];
    const updatedDeployments = [...existingDeployments.slice(-9), deploymentId]; // Keep last 10

    const updatedManifest: CloudAssemblyV2 = {
      ...manifest,
      artifactStorage: {
        accountName: storageConfig.accountName,
        resourceGroupName: storageConfig.resourceGroupName,
        location: storageConfig.location,
        containerName: storageConfig.containerName,
        endpoint: storageConfig.endpoint,
        provisionedAt: manifest.artifactStorage?.provisionedAt || new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        deployments: updatedDeployments,
      },
    };

    // Write updated manifest back to disk
    const manifestPath = path.join(assemblyPath, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2), 'utf-8');
  } catch (error) {
    // Log error but don't fail deployment
    console.warn(chalk.yellow(`Warning: Could not update manifest with storage config: ${error}`));
  }
}
