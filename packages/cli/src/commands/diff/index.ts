import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { ResourceManagementClient } from '@azure/arm-resources';
import { ConfigManager, ProfileConfig } from '../../config/config-manager';
import { authManager } from '../../auth/auth-manager';

// Types
interface StackManifest {
  name?: string;
  templatePath: string;
  resourceCount?: number;
  parameterCount?: number;
  outputCount?: number;
}

interface ArmResource {
  type: string;
  name: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ArmTemplate {
  resources?: ArmResource[];
  parameters?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
}

interface DeployedResource {
  resourceType?: string;
  resourceName?: string;
  id?: string;
  properties?: Record<string, unknown>;
}

interface ResourceChange {
  action: 'add' | 'modify' | 'delete' | 'no-change';
  resourceType: string;
  resourceName: string;
  changes?: string[];
}

export function createDiffCommand(): Command {
  const diff = new Command('diff')
    .description('Preview changes before deployment (like terraform plan)')
    .argument('[stack]', 'Stack name to diff (diffs all stacks if not specified)')
    .option('-a, --app <path>', 'Path to synthesized cloud assembly directory', 'arm.out')
    .action(async (stackName, options) => {
      const spinner = ora('Initializing diff...').start();

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

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

        // Determine which stacks to diff
        const stacksToDiff = stackName ? [stackName] : Object.keys(manifest.stacks);

        if (stackName && !manifest.stacks[stackName]) {
          spinner.fail(chalk.red(`Stack '${stackName}' not found in cloud assembly`));
          process.exit(1);
        }

        // Create client
        const credential = authService.getCredential();
        const client = new ResourceManagementClient(credential, profile.subscriptionId);

        spinner.succeed(chalk.green('Ready to compute diff'));

        // Diff each stack
        for (const stack of stacksToDiff) {
          await diffStack(client, assemblyPath, stack, manifest.stacks[stack]);
        }
      } catch (error) {
        spinner.fail(chalk.red('Diff failed'));
        console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
      }
    });

  return diff;
}

async function diffStack(
  client: ResourceManagementClient,
  assemblyPath: string,
  stackName: string,
  stackManifest: StackManifest
): Promise<void> {
  console.log(chalk.bold(`\nStack: ${stackName}`));
  console.log(chalk.gray('─'.repeat(70)));

  try {
    // Load local template
    const templatePath = path.join(assemblyPath, stackManifest.templatePath);
    const localTemplate = JSON.parse(fs.readFileSync(templatePath, 'utf-8')) as ArmTemplate;

    // Try to find existing deployment
    let deployedResources: DeployedResource[] = [];

    try {
      // List recent deployments for this stack
      const deployments = [];
      for await (const deployment of client.deployments.listAtSubscriptionScope()) {
        if (deployment.name?.startsWith(stackName)) {
          deployments.push(deployment);
        }
      }

      // Get the most recent deployment
      if (deployments.length > 0) {
        const mostRecent = deployments.sort((a, b) => {
          const timeA = a.properties?.timestamp?.getTime() || 0;
          const timeB = b.properties?.timestamp?.getTime() || 0;
          return timeB - timeA;
        })[0];

        if (mostRecent.properties?.outputResources) {
          deployedResources = mostRecent.properties.outputResources;
        }
      }
    } catch (error) {
      console.error(error);
      // No previous deployment found, all resources will be new
    }

    // Compute changes
    const changes = computeChanges(localTemplate.resources || [], deployedResources);

    // Display changes
    displayChanges(changes);

    // Display summary
    displaySummary(changes);
  } catch (error) {
    console.error(
      chalk.red(
        `Error diffing stack '${stackName}': ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    );
  }
}

function computeChanges(
  localResources: ArmResource[],
  deployedResources: DeployedResource[]
): ResourceChange[] {
  const changes: ResourceChange[] = [];
  const deployedMap = new Map<string, DeployedResource>();

  // Build map of deployed resources
  for (const resource of deployedResources) {
    const key = `${resource.resourceType || resource.id?.split('/').slice(-2, -1)[0]}/${resource.resourceName || resource.id?.split('/').pop()}`;
    deployedMap.set(key, resource);
  }

  // Check local resources
  for (const localResource of localResources) {
    const key = `${localResource.type}/${localResource.name}`;
    const deployed = deployedMap.get(key);

    if (!deployed) {
      // New resource
      changes.push({
        action: 'add',
        resourceType: localResource.type,
        resourceName: localResource.name,
      });
    } else {
      // Resource exists - check for modifications
      // Simple comparison (in practice, would need more sophisticated diffing)
      const hasChanges =
        JSON.stringify(localResource.properties) !== JSON.stringify(deployed.properties);

      changes.push({
        action: hasChanges ? 'modify' : 'no-change',
        resourceType: localResource.type,
        resourceName: localResource.name,
        changes: hasChanges ? ['Properties modified'] : undefined,
      });

      deployedMap.delete(key);
    }
  }

  // Remaining deployed resources will be deleted
  for (const [key] of deployedMap.entries()) {
    const [type, name] = key.split('/');
    changes.push({
      action: 'delete',
      resourceType: type,
      resourceName: name,
    });
  }

  return changes;
}

function displayChanges(changes: ResourceChange[]): void {
  const adds = changes.filter((c) => c.action === 'add');
  const modifies = changes.filter((c) => c.action === 'modify');
  const deletes = changes.filter((c) => c.action === 'delete');

  if (adds.length > 0) {
    console.log(chalk.green.bold('\nResources to add:'));
    for (const change of adds) {
      console.log(chalk.green(`  + ${change.resourceType}/${change.resourceName}`));
    }
  }

  if (modifies.length > 0) {
    console.log(chalk.yellow.bold('\nResources to modify:'));
    for (const change of modifies) {
      console.log(chalk.yellow(`  ~ ${change.resourceType}/${change.resourceName}`));
      if (change.changes) {
        for (const c of change.changes) {
          console.log(chalk.gray(`      ${c}`));
        }
      }
    }
  }

  if (deletes.length > 0) {
    console.log(chalk.red.bold('\nResources to delete:'));
    for (const change of deletes) {
      console.log(chalk.red(`  - ${change.resourceType}/${change.resourceName}`));
    }
  }

  const noChanges = changes.filter((c) => c.action === 'no-change');
  if (noChanges.length > 0) {
    console.log(chalk.gray(`\n${noChanges.length} resource(s) unchanged`));
  }
}

function displaySummary(changes: ResourceChange[]): void {
  const adds = changes.filter((c) => c.action === 'add').length;
  const modifies = changes.filter((c) => c.action === 'modify').length;
  const deletes = changes.filter((c) => c.action === 'delete').length;

  console.log(chalk.bold('\nPlan Summary:'));
  console.log(chalk.green(`  ${adds} to add`));
  console.log(chalk.yellow(`  ${modifies} to modify`));
  console.log(chalk.red(`  ${deletes} to delete`));

  if (adds + modifies + deletes === 0) {
    console.log(chalk.gray('\nNo changes. Infrastructure is up-to-date.'));
  } else {
    console.log(
      chalk.cyan('\nRun'),
      chalk.bold('azure-arm deploy'),
      chalk.cyan('to apply these changes')
    );
  }
}
