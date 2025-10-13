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
export declare class AzureApp extends App {
    /**
     * The resolved user configuration
     */
    readonly userConfig: ProfileConfig | null;
    /**
     * The resolved project configuration
     */
    readonly projectConfig: ProjectConfig;
    /**
     * Creates a new AzureApp instance with automatic config loading.
     *
     * @param props - App configuration options
     */
    constructor(props?: AzureAppProps);
    /**
     * Load project configuration from disk.
     *
     * @param configPath - Path to project config file
     * @returns Project configuration object
     *
     * @internal
     */
    private static loadProjectConfig;
    /**
     * Load user configuration and resolve the active profile.
     *
     * @param configPath - Path to user config file
     * @param profileOverride - Optional profile name from project config
     * @returns Resolved profile configuration or null if not found
     *
     * @internal
     */
    private static loadUserConfig;
    /**
     * Get the subscription ID from the loaded configuration.
     *
     * @returns Subscription ID if available, undefined otherwise
     */
    getSubscriptionId(): string | undefined;
    /**
     * Get the tenant ID from the loaded configuration.
     *
     * @returns Tenant ID if available, undefined otherwise
     */
    getTenantId(): string | undefined;
    /**
     * Get the cloud environment from the loaded configuration.
     *
     * @returns Cloud environment name if available, undefined otherwise
     */
    getCloud(): string | undefined;
    /**
     * Get the default location from the loaded configuration.
     *
     * @returns Default location if available, undefined otherwise
     */
    getDefaultLocation(): string | undefined;
}
//# sourceMappingURL=azure-app.d.ts.map