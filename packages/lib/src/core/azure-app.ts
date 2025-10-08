import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { App, AppProps } from './app';

/**
 * User configuration loaded from ~/.azure-arm/config.json
 */
export interface UserConfig {
  /**
   * The currently active profile name
   */
  activeProfile: string;

  /**
   * Named profiles containing Azure subscription information
   */
  profiles: Record<string, ProfileConfig>;
}

/**
 * Individual profile configuration
 */
export interface ProfileConfig {
  /**
   * Profile name
   */
  name: string;

  /**
   * Azure tenant ID
   */
  tenantId: string;

  /**
   * Azure subscription ID
   */
  subscriptionId: string;

  /**
   * Human-readable subscription name (optional)
   */
  subscriptionName?: string;

  /**
   * Azure cloud environment (AzureCloud, AzureUSGovernment, etc.)
   */
  cloud?: string;

  /**
   * Default location for resources (optional)
   */
  location?: string;
}

/**
 * Project-level configuration loaded from azure-arm.json
 */
export interface ProjectConfig {
  /**
   * The profile name to use for this project
   */
  profile?: string;

  /**
   * Project context values
   */
  context?: Record<string, unknown>;

  /**
   * Other project configuration options
   */
  [key: string]: unknown;
}

/**
 * Props for AzureApp construct with config loading support.
 */
export interface AzureAppProps extends Omit<AppProps, 'context'> {
  /**
   * Path to project config file.
   * @default './azure-arm.json'
   */
  readonly projectConfigPath?: string;

  /**
   * Path to user config file.
   * @default '~/.azure-arm/config.json'
   */
  readonly userConfigPath?: string;

  /**
   * Additional context (merged with config-based context).
   */
  readonly context?: Record<string, any>;
}

/**
 * Extended App that automatically loads configuration from user and project config files.
 *
 * @remarks
 * AzureApp extends the base App to automatically load and merge configuration from:
 * 1. User config file (`~/.azure-arm/config.json`) - Contains Azure subscription/tenant info
 * 2. Project config file (`./azure-arm.json`) - Contains project-specific context
 *
 * The resolved configuration is automatically injected into the construct tree context,
 * making subscription IDs and tenant IDs available to all child constructs.
 *
 * @example
 * Basic usage with automatic config loading:
 * ```typescript
 * import { AzureApp, SubscriptionStack } from '@atakora/lib';
 *
 * // Automatically loads config from:
 * // - ~/.azure-arm/config.json (user config via active profile)
 * // - ./azure-arm.json (project config)
 * const app = new AzureApp();
 *
 * // Stack inherits subscriptionId from active profile
 * const stack = new SubscriptionStack(app, 'Foundation', {
 *   location: 'eastus'  // subscriptionId injected automatically from config
 * });
 *
 * app.synth();
 * ```
 *
 * @example
 * With custom config paths:
 * ```typescript
 * const app = new AzureApp({
 *   projectConfigPath: './config/azure.json',
 *   userConfigPath: '/custom/path/config.json'
 * });
 * ```
 *
 * @example
 * With additional context:
 * ```typescript
 * const app = new AzureApp({
 *   context: {
 *     customValue: 'foo',
 *     anotherValue: 'bar'
 *   }
 * });
 * ```
 */
export class AzureApp extends App {
  /**
   * The resolved user configuration
   */
  public readonly userConfig: ProfileConfig | null;

  /**
   * The resolved project configuration
   */
  public readonly projectConfig: ProjectConfig;

  /**
   * Creates a new AzureApp instance with automatic config loading.
   *
   * @param props - App configuration options
   */
  constructor(props?: AzureAppProps) {
    // Load configurations
    const projectConfigPath = props?.projectConfigPath ?? './azure-arm.json';
    const userConfigPath =
      props?.userConfigPath ?? path.join(os.homedir(), '.azure-arm', 'config.json');

    // Load project config (may not exist, that's okay)
    const projectConfig = AzureApp.loadProjectConfig(projectConfigPath);

    // Load user config and resolve active profile
    const userConfig = AzureApp.loadUserConfig(userConfigPath, projectConfig.profile);

    // Merge contexts: user config < project config < props.context
    const mergedContext = {
      ...(userConfig
        ? {
            subscriptionId: userConfig.subscriptionId,
            tenantId: userConfig.tenantId,
            cloud: userConfig.cloud,
            ...(userConfig.location && { defaultLocation: userConfig.location }),
          }
        : {}),
      ...projectConfig.context,
      ...props?.context,
    };

    // Call parent constructor with merged context
    super({
      ...props,
      context: mergedContext,
    });

    // Store resolved configs
    this.userConfig = userConfig;
    this.projectConfig = projectConfig;
  }

  /**
   * Load project configuration from disk.
   *
   * @param configPath - Path to project config file
   * @returns Project configuration object
   *
   * @internal
   */
  private static loadProjectConfig(configPath: string): ProjectConfig {
    // Return empty config if file doesn't exist
    if (!fs.existsSync(configPath)) {
      return { context: {} };
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      return {
        profile: config.profile,
        context: config.context || {},
        ...config,
      };
    } catch (error) {
      throw new Error(
        `Failed to load project config from ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Load user configuration and resolve the active profile.
   *
   * @param configPath - Path to user config file
   * @param profileOverride - Optional profile name from project config
   * @returns Resolved profile configuration or null if not found
   *
   * @internal
   */
  private static loadUserConfig(
    configPath: string,
    profileOverride?: string
  ): ProfileConfig | null {
    // Return null if file doesn't exist (user hasn't run `azure-arm config login` yet)
    if (!fs.existsSync(configPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const userConfig: UserConfig = JSON.parse(content);

      // Determine which profile to use
      const profileName = profileOverride || userConfig.activeProfile || 'default';

      // Return the profile or null if it doesn't exist
      return userConfig.profiles[profileName] || null;
    } catch (error) {
      throw new Error(
        `Failed to load user config from ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get the subscription ID from the loaded configuration.
   *
   * @returns Subscription ID if available, undefined otherwise
   */
  public getSubscriptionId(): string | undefined {
    return this.node.tryGetContext('subscriptionId');
  }

  /**
   * Get the tenant ID from the loaded configuration.
   *
   * @returns Tenant ID if available, undefined otherwise
   */
  public getTenantId(): string | undefined {
    return this.node.tryGetContext('tenantId');
  }

  /**
   * Get the cloud environment from the loaded configuration.
   *
   * @returns Cloud environment name if available, undefined otherwise
   */
  public getCloud(): string | undefined {
    return this.node.tryGetContext('cloud');
  }

  /**
   * Get the default location from the loaded configuration.
   *
   * @returns Default location if available, undefined otherwise
   */
  public getDefaultLocation(): string | undefined {
    return this.node.tryGetContext('defaultLocation');
  }
}
