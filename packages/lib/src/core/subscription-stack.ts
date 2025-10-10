import { Construct } from './construct';
import type { App } from './app';
import type { Subscription } from './azure/subscription';
import type { Organization } from './context/organization';
import type { Project } from './context/project';
import type { Environment } from './context/environment';
import type { Instance } from './context/instance';
import type { Geography } from './azure/geography';
import { DeploymentScope } from './azure/scopes';
import { ResourceNameGenerator, NamingService, type NamingConventionConfig } from '../naming';
import { ResourceGroupStack, type IResourceGroup } from './resource-group-stack';

/**
 * Props for SubscriptionStack.
 */
export interface SubscriptionStackProps {
  /**
   * Azure subscription to deploy to.
   */
  readonly subscription: Subscription;

  /**
   * Azure geography where resources will be deployed.
   */
  readonly geography: Geography;

  /**
   * Tags applied to all resources in this stack.
   */
  readonly tags?: Record<string, string>;

  /**
   * Naming context for resource name generation.
   */
  readonly organization: Organization;
  readonly project: Project;
  readonly environment: Environment;
  readonly instance: Instance;

  /**
   * Custom naming conventions (optional).
   */
  readonly namingConventions?: NamingConventionConfig;
}

/**
 * Stack that deploys at Azure subscription scope.
 *
 * @remarks
 * Subscription-scoped stacks can:
 * - Create resource groups
 * - Deploy subscription-level resources (policies, RBAC, budgets)
 * - Contain nested ResourceGroupStack deployments
 *
 * This matches the AuthR foundation stack pattern.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const app = new App();
 *
 * const subscription = Subscription.fromId('12345678-1234-1234-1234-123456789abc');
 * const org = Organization.fromValue('digital-minion');
 * const project = new Project('authr');
 * const env = Environment.fromValue('nonprod');
 * const geo = Geography.fromValue('eastus');
 * const instance = Instance.fromNumber(1);
 *
 * const foundation = new SubscriptionStack(app, 'Foundation', {
 *   subscription,
 *   geography: geo,
 *   organization: org,
 *   project,
 *   environment: env,
 *   instance
 * });
 *
 * // Generate resource names
 * const rgName = foundation.generateResourceName('rg', 'data');
 * // Result: "rg-digital-minion-authr-data-nonprod-eus-00"
 * ```
 */
export class SubscriptionStack extends Construct {
  /**
   * Deployment scope (always Subscription).
   */
  readonly scope: DeploymentScope.Subscription = DeploymentScope.Subscription;

  /**
   * Azure subscription ID.
   */
  readonly subscriptionId: string;

  /**
   * Azure geography for deployment.
   */
  readonly geography: Geography;

  /**
   * Default location for resources in this stack.
   */
  readonly location: string;

  /**
   * Tags applied to all resources.
   */
  readonly tags: Record<string, string>;

  /**
   * Naming context.
   */
  readonly organization: Organization;
  readonly project: Project;
  readonly environment: Environment;
  readonly instance: Instance;

  /**
   * Resource name generator for this stack.
   */
  private readonly nameGenerator: ResourceNameGenerator;

  /**
   * Naming service for unique hash generation.
   * Provides a synthesis-wide unique hash that all resources can use.
   */
  public readonly namingService: NamingService;

  /**
   * Nested ResourceGroupStacks.
   */
  private readonly resourceGroupStacks: Map<string, any> = new Map();

  /**
   * Creates a new SubscriptionStack.
   *
   * @param app - Parent App construct
   * @param id - Stack identifier
   * @param props - Stack properties
   */
  constructor(app: App, id: string, props: SubscriptionStackProps) {
    super(app, id);

    this.subscriptionId = props.subscription.subscriptionId;
    this.geography = props.geography;
    this.location = props.geography.location;
    this.tags = props.tags ?? {};

    this.organization = props.organization;
    this.project = props.project;
    this.environment = props.environment;
    this.instance = props.instance;

    // Initialize naming service with unique hash for this synthesis
    this.namingService = new NamingService();

    // Initialize name generator with custom conventions if provided
    this.nameGenerator = new ResourceNameGenerator(props.namingConventions);

    // Mark this construct as a stack for synthesis
    this.node.addMetadata('azure:arm:stack', {
      scope: 'subscription',
    });

    // Register with app
    app.registerStack(this);
  }

  /**
   * Generate a resource name for this stack's context.
   *
   * @param resourceType - Azure resource type
   * @param purpose - Optional purpose identifier
   * @returns Generated resource name
   *
   * @example
   * ```typescript
   * const rgName = stack.generateResourceName('rg', 'data');
   * // Result: "rg-digital-minion-authr-data-nonprod-eus-00"
   * ```
   */
  public generateResourceName(resourceType: string, purpose?: string): string {
    return this.nameGenerator.generateForScope({
      scope: DeploymentScope.Subscription,
      resourceType,
      organization: this.organization.resourceName,
      project: this.project.resourceName,
      environment: this.environment.abbreviation,
      geography: this.geography.abbreviation,
      instance: this.instance.resourceName,
      purpose,
    });
  }

  /**
   * Add a nested ResourceGroupStack.
   *
   * @param id - Stack identifier
   * @param resourceGroup - Resource group created in this subscription stack
   * @returns The new ResourceGroupStack
   *
   * @remarks
   * This will be fully implemented when ResourceGroup construct is available in Phase 2.
   */
  public addResourceGroupStack(id: string, resourceGroup: IResourceGroup): ResourceGroupStack {
    const rgStack = new ResourceGroupStack(this, id, { resourceGroup });
    this.resourceGroupStacks.set(id, rgStack);
    return rgStack;
  }
}
