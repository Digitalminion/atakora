import { Construct } from './construct';
import type { CloudAssembly } from '../synthesis/types';
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
export declare class App extends Construct {
    /**
     * Output directory for synthesized templates.
     */
    readonly outdir: string;
    /**
     * Registered stacks in this app.
     */
    private readonly stacks;
    /**
     * User profile loaded from ~/.azure-arm/config.json
     */
    private readonly userProfile?;
    /**
     * Creates a new App instance.
     *
     * @param props - App configuration
     */
    constructor(props?: AppProps);
    /**
     * Synthesize all stacks to ARM templates.
     *
     * @returns Cloud assembly containing all generated templates
     *
     * @remarks
     * Orchestrates the synthesis pipeline to generate ARM templates from the construct tree.
     */
    synth(): Promise<CloudAssembly>;
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
    registerStack(stack: Construct): void;
    /**
     * Get all registered stacks.
     *
     * @returns Array of all stacks in this app
     */
    get allStacks(): readonly Construct[];
    /**
     * Load project configuration from azure-arm.json
     *
     * @param configPath - Path to project config file
     * @returns Project configuration or undefined if not found
     * @private
     */
    private loadProjectConfig;
    /**
     * Load user profile from ~/.azure-arm/config.json
     *
     * @param profileName - Name of the profile to load
     * @returns User profile or undefined if not found
     * @private
     */
    private loadUserProfile;
    /**
     * Build merged context from all sources
     *
     * @param props - App props
     * @param projectConfig - Project configuration
     * @param userProfile - User profile
     * @returns Merged context object
     * @private
     */
    private buildContext;
    /**
     * Get the user profile loaded by this app
     *
     * @returns User profile or undefined
     */
    getUserProfile(): UserProfile | undefined;
    /**
     * Get subscription ID from context
     *
     * @returns Subscription ID or undefined
     */
    getSubscriptionId(): string | undefined;
    /**
     * Get tenant ID from context
     *
     * @returns Tenant ID or undefined
     */
    getTenantId(): string | undefined;
}
//# sourceMappingURL=app.d.ts.map