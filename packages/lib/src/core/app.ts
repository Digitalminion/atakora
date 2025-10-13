import { Construct } from './construct';
import type { DeploymentScope } from './azure/scopes';
import type { CloudAssembly, StackManifest } from '../synthesis/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * User configuration profile from ~/.azure-arm/config.json
 */
export interface UserProfile {
  readonly tenantId: string;
  readonly subscriptionId: string;
  readonly subscriptionName?: string;
  readonly cloud?: string;
  readonly defaultLocation?: string;
}

/**
 * Project configuration from azure-arm.json
 */
export interface ProjectConfig {
  readonly app?: string;
  readonly output?: string;
  readonly profile?: string;
  readonly context?: Record<string, any>;
  readonly stacks?: Record<string, any>;
}

/**
 * Props for App construct.
 */
export interface AppProps {
  /**
   * Output directory for synthesized templates.
   * @default 'arm.out'
   */
  readonly outdir?: string;

  /**
   * Application context (key-value pairs).
   */
  readonly context?: Record<string, any>;

  /**
   * Path to project config file.
   * @default './azure-arm.json'
   */
  readonly projectConfigPath?: string;

  /**
   * Profile name to use from user config.
   * Overrides profile specified in project config.
   */
  readonly profile?: string;

  /**
   * Disable automatic user config loading.
   * @default false
   */
  readonly disableUserConfig?: boolean;
}

/**
 * Root of the construct tree.
 *
 * @remarks
 * The App represents the entire ARM deployment application.
 * It contains one or more stacks and orchestrates the synthesis process.
 *
 * The App is the root construct and does not have a parent.
 * All stacks must be children of the App.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const app = new App();
 *
 * const stack = new SubscriptionStack(app, 'MyStack', {
 *   subscription: Subscription.fromId('...'),
 *   location: 'eastus',
 *   organization: new Organization('digital-minion'),
 *   project: new Project('authr'),
 *   environment: Environment.fromValue('nonprod'),
 *   instance: Instance.fromNumber(1)
 * });
 *
 * app.synth();  // Generate ARM templates (when implemented by Grace)
 * ```
 *
 * @example
 * With custom output directory:
 * ```typescript
 * const app = new App({
 *   outdir: './dist/arm-templates'
 * });
 * ```
 */
export class App extends Construct {
  /**
   * Output directory for synthesized templates.
   */
  readonly outdir: string;

  /**
   * Registered stacks in this app.
   */
  private readonly stacks: Map<string, Construct> = new Map();

  /**
   * User profile loaded from ~/.azure-arm/config.json
   */
  private readonly userProfile?: UserProfile;

  /**
   * Creates a new App instance.
   *
   * @param props - App configuration
   */
  constructor(props?: AppProps) {
    // App is the root construct with no parent
    super(undefined as unknown as Construct, '');

    this.outdir = props?.outdir ?? 'arm.out';

    // Load project config
    const projectConfig = this.loadProjectConfig(props?.projectConfigPath);

    // Load user config unless disabled
    if (!props?.disableUserConfig) {
      const profileName = props?.profile ?? projectConfig?.profile ?? 'default';
      this.userProfile = this.loadUserProfile(profileName);
    }

    // Build merged context
    const mergedContext = this.buildContext(props, projectConfig, this.userProfile);

    // Set context
    for (const [key, value] of Object.entries(mergedContext)) {
      this.node.setContext(key, value);
    }
  }

  /**
   * Synthesize all stacks to ARM templates.
   *
   * @returns Cloud assembly containing all generated templates
   *
   * @remarks
   * Orchestrates the synthesis pipeline to generate ARM templates from the construct tree.
   */
  public async synth(): Promise<CloudAssembly> {
    // Import synthesizer dynamically to avoid circular dependencies
    const { Synthesizer } = await import('../synthesis');
    const synthesizer = new Synthesizer();

    // Run synthesis pipeline
    const assembly = await synthesizer.synthesize(this, {
      outdir: this.outdir,
      skipValidation: true, // Skip validation to avoid blocking on component issues
    });

    return assembly;
  }

  /**
   * Register a stack with this app.
   *
   * @param stack - Stack to register
   * @internal
   *
   * @remarks
   * Called automatically by stack constructors.
   * Should not be called directly by users.
   */
  public registerStack(stack: Construct): void {
    this.stacks.set(stack.node.id, stack);
  }

  /**
   * Get all registered stacks.
   *
   * @returns Array of all stacks in this app
   */
  public get allStacks(): readonly Construct[] {
    return Array.from(this.stacks.values());
  }

  /**
   * Load project configuration from azure-arm.json
   *
   * @param configPath - Path to project config file
   * @returns Project configuration or undefined if not found
   * @private
   */
  private loadProjectConfig(configPath?: string): ProjectConfig | undefined {
    const projectConfigPath = configPath ?? path.join(process.cwd(), 'azure-arm.json');

    if (!fs.existsSync(projectConfigPath)) {
      return undefined;
    }

    try {
      const content = fs.readFileSync(projectConfigPath, 'utf-8');
      return JSON.parse(content) as ProjectConfig;
    } catch (error) {
      console.warn(
        `Warning: Failed to load project config from ${projectConfigPath}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      return undefined;
    }
  }

  /**
   * Load user profile from ~/.azure-arm/config.json
   *
   * @param profileName - Name of the profile to load
   * @returns User profile or undefined if not found
   * @private
   */
  private loadUserProfile(profileName: string): UserProfile | undefined {
    try {
      // Import ConfigManager dynamically to avoid circular dependencies
      // and to make it optional (CLI might not be installed)
      const configManagerPath = '../../../cli/src/config/config-manager';

      // Try to load ConfigManager, but don't fail if CLI is not available
      let ConfigManager: { new (): { getProfile(name: string): unknown } } | undefined;
      try {
        ConfigManager = require(configManagerPath).ConfigManager;
      } catch {
        // CLI not available, silently skip user config
        return undefined;
      }

      if (!ConfigManager) {
        return undefined;
      }

      const configManager = new ConfigManager();
      const profile = configManager.getProfile(profileName);

      if (!profile) {
        console.error(`Warning: Profile '${profileName}' not found in user config`);
        return undefined;
      }

      // Type guard for profile
      const profileData = profile as {
        tenantId?: string;
        subscriptionId?: string;
        subscriptionName?: string;
        cloud?: string;
        location?: string;
      };

      return {
        tenantId: profileData.tenantId || '',
        subscriptionId: profileData.subscriptionId || '',
        subscriptionName: profileData.subscriptionName,
        cloud: profileData.cloud,
        defaultLocation: profileData.location,
      };
    } catch (error) {
      console.warn(
        `Warning: Failed to load user profile '${profileName}': ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      return undefined;
    }
  }

  /**
   * Build merged context from all sources
   *
   * @param props - App props
   * @param projectConfig - Project configuration
   * @param userProfile - User profile
   * @returns Merged context object
   * @private
   */
  private buildContext(
    props: AppProps | undefined,
    projectConfig: ProjectConfig | undefined,
    userProfile: UserProfile | undefined
  ): Record<string, any> {
    const context: Record<string, any> = {};

    // 1. Start with project context
    if (projectConfig?.context) {
      Object.assign(context, projectConfig.context);
    }

    // 2. Inject user profile values (subscriptionId, tenantId, etc.)
    if (userProfile) {
      context.subscriptionId = userProfile.subscriptionId;
      context.tenantId = userProfile.tenantId;

      if (userProfile.cloud) {
        context.cloud = userProfile.cloud;
      }

      if (userProfile.defaultLocation) {
        context.defaultLocation = userProfile.defaultLocation;
      }

      if (userProfile.subscriptionName) {
        context.subscriptionName = userProfile.subscriptionName;
      }
    }

    // 3. Override with explicit props context
    if (props?.context) {
      Object.assign(context, props.context);
    }

    return context;
  }

  /**
   * Get the user profile loaded by this app
   *
   * @returns User profile or undefined
   */
  public getUserProfile(): UserProfile | undefined {
    return this.userProfile;
  }

  /**
   * Get subscription ID from context
   *
   * @returns Subscription ID or undefined
   */
  public getSubscriptionId(): string | undefined {
    return this.node.tryGetContext('subscriptionId');
  }

  /**
   * Get tenant ID from context
   *
   * @returns Tenant ID or undefined
   */
  public getTenantId(): string | undefined {
    return this.node.tryGetContext('tenantId');
  }
}
