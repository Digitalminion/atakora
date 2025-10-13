/**
 * Types and interfaces for Azure Functions build pipeline
 *
 * @remarks
 * This module defines the core types used throughout the function build
 * pipeline including artifacts, packages, and deployment configurations.
 */
/**
 * Packaging strategy for function deployment
 */
export declare enum PackagingStrategy {
    /**
     * Inline deployment - function code embedded in ARM template (<4KB)
     */
    INLINE = "inline",
    /**
     * Storage deployment - function package uploaded to Azure Storage (<100MB)
     */
    STORAGE = "storage",
    /**
     * Container deployment - function deployed as container image (>100MB or native modules)
     */
    CONTAINER = "container",
    /**
     * External deployment - function package hosted externally
     */
    EXTERNAL = "external"
}
/**
 * Build artifact produced by the bundler
 */
export interface BuildArtifact {
    /**
     * Unique identifier for the function
     */
    readonly functionId: string;
    /**
     * Function name as deployed
     */
    readonly functionName: string;
    /**
     * Bundled function code
     */
    readonly bundle: Uint8Array;
    /**
     * Source map for debugging (optional)
     */
    readonly sourceMap?: Uint8Array;
    /**
     * Build metadata
     */
    readonly metadata: BuildMetadata;
}
/**
 * Metadata about the build process and artifact
 */
export interface BuildMetadata {
    /**
     * Bundle size in bytes
     */
    readonly size: number;
    /**
     * Build timestamp
     */
    readonly buildTime: number;
    /**
     * Content hash for cache invalidation
     */
    readonly hash: string;
    /**
     * External dependencies included in bundle
     */
    readonly dependencies: string[];
    /**
     * Whether bundle contains native modules
     */
    readonly hasNativeModules?: boolean;
    /**
     * Estimated memory requirement in MB
     */
    readonly memoryEstimate?: number;
}
/**
 * Packaged function ready for deployment
 */
export interface FunctionPackage {
    /**
     * Build artifact
     */
    readonly artifact: BuildArtifact;
    /**
     * Packaging strategy used
     */
    readonly strategy: PackagingStrategy;
    /**
     * Deployment configuration
     */
    readonly deployment: DeploymentConfig;
}
/**
 * Deployment configuration for a function
 */
export interface DeploymentConfig {
    /**
     * Deployment type matching strategy
     */
    readonly type: 'inline' | 'storage' | 'container' | 'external';
    /**
     * Storage URL or container image location
     */
    readonly location?: string;
    /**
     * Base64 encoded code for inline deployment
     */
    readonly inline?: string;
    /**
     * SAS token for storage deployments
     */
    readonly sasToken?: string;
    /**
     * SHA256 hash for integrity verification
     */
    readonly integrity?: string;
}
/**
 * Build options for esbuild
 */
export interface BuildOptions {
    /**
     * Bundle dependencies (default: true)
     */
    readonly bundle?: boolean;
    /**
     * Minify output (default: true)
     */
    readonly minify?: boolean;
    /**
     * Generate source maps ('inline' | 'external' | false, default: 'external')
     */
    readonly sourcemap?: 'inline' | 'external' | boolean;
    /**
     * External dependencies to exclude from bundle
     */
    readonly external?: string[];
    /**
     * Target Node.js version (default: 'node18')
     */
    readonly target?: string;
    /**
     * Enable tree-shaking (default: true)
     */
    readonly treeShaking?: boolean;
    /**
     * Define global constants
     */
    readonly define?: Record<string, string>;
    /**
     * Custom loaders for file types
     */
    readonly loader?: Record<string, 'js' | 'jsx' | 'ts' | 'tsx' | 'json' | 'text' | 'base64' | 'dataurl' | 'file' | 'binary'>;
}
/**
 * Result of the build phase
 */
export interface BuildResult {
    /**
     * Build artifacts by function ID
     */
    readonly artifacts: Map<string, BuildArtifact>;
    /**
     * Function packages by function ID
     */
    readonly packages?: Map<string, FunctionPackage>;
    /**
     * Build telemetry
     */
    readonly telemetry?: BuildTelemetry[];
}
/**
 * Build telemetry for monitoring
 */
export interface BuildTelemetry {
    /**
     * Function identifier
     */
    readonly functionId: string;
    /**
     * Build duration in milliseconds
     */
    readonly buildTime: number;
    /**
     * Bundle size in bytes
     */
    readonly bundleSize: number;
    /**
     * Whether cache was used
     */
    readonly cacheHit: boolean;
    /**
     * Packaging strategy selected
     */
    readonly strategy: PackagingStrategy;
    /**
     * Whether build succeeded
     */
    readonly success: boolean;
    /**
     * Error message if build failed
     */
    readonly error?: string;
}
/**
 * Cache entry for built functions
 */
export interface CacheEntry {
    /**
     * Cache key
     */
    readonly key: string;
    /**
     * Build artifact
     */
    readonly artifact: BuildArtifact;
    /**
     * Timestamp when cached
     */
    readonly cachedAt: number;
    /**
     * Time-to-live in milliseconds
     */
    readonly ttl: number;
}
/**
 * Build error with context
 */
export declare class BuildError extends Error {
    readonly functionId?: string;
    readonly cause?: Error;
    constructor(message: string, functionId?: string, cause?: Error);
}
/**
 * Packaging error with context
 */
export declare class PackagingError extends Error {
    readonly strategy: PackagingStrategy;
    readonly cause?: Error;
    constructor(message: string, strategy: PackagingStrategy, cause?: Error);
}
/**
 * Cache configuration
 */
export interface CacheConfig {
    /**
     * Cache directory path
     */
    readonly cacheDir: string;
    /**
     * Time-to-live in milliseconds (default: 1 hour)
     */
    readonly ttl?: number;
    /**
     * Maximum cache size in bytes
     */
    readonly maxSize?: number;
    /**
     * Enable cache (default: true)
     */
    readonly enabled?: boolean;
}
/**
 * Directory information for a discovered function
 */
export interface FunctionDirectory {
    /**
     * Name of the function directory
     */
    readonly name: string;
    /**
     * Absolute path to the function directory
     */
    readonly path: string;
    /**
     * Absolute path to handler.ts file
     */
    readonly handlerPath: string;
    /**
     * Absolute path to resource.ts file
     */
    readonly resourcePath: string;
}
/**
 * Configuration for a function trigger
 */
export interface TriggerConfig {
    /**
     * Type of trigger (http, timer, queue, etc.)
     */
    readonly type: string;
    /**
     * Trigger-specific configuration
     */
    readonly [key: string]: any;
}
/**
 * Configuration for input/output bindings
 */
export interface BindingConfig {
    /**
     * Type of binding (cosmosDb, blob, queue, etc.)
     */
    readonly type: string;
    /**
     * Direction of binding (in, out, inout)
     */
    readonly direction: 'in' | 'out' | 'inout';
    /**
     * Name used to reference the binding in code
     */
    readonly name: string;
    /**
     * Connection string or resource reference
     */
    readonly connection?: string | any;
    /**
     * Binding-specific configuration
     */
    readonly [key: string]: any;
}
/**
 * Environment variable placeholders
 * Values can be literal strings or placeholders like ${VAR_NAME}
 */
export type EnvironmentPlaceholders<T extends Record<string, string> = Record<string, string>> = {
    [K in keyof T]: string | `\${${string}}`;
};
/**
 * Function configuration from resource.ts
 */
export interface FunctionConfig<TEnv extends Record<string, string> = Record<string, string>> {
    /**
     * Function timeout in seconds
     */
    readonly timeout?: number;
    /**
     * Memory size in MB
     */
    readonly memorySize?: number;
    /**
     * Environment variables with placeholder support
     */
    readonly environment?: EnvironmentPlaceholders<TEnv>;
    /**
     * Trigger configuration
     */
    readonly trigger: TriggerConfig;
    /**
     * Input bindings
     */
    readonly inputBindings?: readonly BindingConfig[];
    /**
     * Output bindings
     */
    readonly outputBindings?: readonly BindingConfig[];
    /**
     * Build options
     */
    readonly buildOptions?: BuildOptions;
}
/**
 * Complete function definition from resource.ts
 */
export interface FunctionDefinition<TEnv extends Record<string, string> = Record<string, string>> {
    /**
     * Type identifier
     */
    readonly type: 'AzureFunction';
    /**
     * Definition version
     */
    readonly version: string;
    /**
     * Function configuration
     */
    readonly config: FunctionConfig<TEnv>;
}
/**
 * Metadata about a discovered function
 */
export interface FunctionMetadata {
    /**
     * Timestamp when function was discovered
     */
    readonly discoveredAt: number;
    /**
     * Name of the function (from directory)
     */
    readonly functionName: string;
    /**
     * Whether function has typed environment variables
     */
    readonly hasTypedEnvironment: boolean;
    /**
     * Hash of handler.ts content for cache invalidation
     */
    readonly handlerHash?: string;
    /**
     * Hash of resource.ts content for cache invalidation
     */
    readonly resourceHash?: string;
}
/**
 * Complete function configuration with directory and metadata
 */
export interface FunctionConfiguration<TEnv extends Record<string, string> = Record<string, string>> {
    /**
     * Directory information
     */
    readonly directory: FunctionDirectory;
    /**
     * Function definition from resource.ts
     */
    readonly definition: FunctionDefinition<TEnv>;
    /**
     * Discovery metadata
     */
    readonly metadata: FunctionMetadata;
}
/**
 * Result of function discovery phase
 */
export interface DiscoveryResult {
    /**
     * Number of functions discovered
     */
    readonly functionsDiscovered: number;
    /**
     * Registry of discovered functions by name
     */
    readonly registry: Map<string, FunctionConfiguration>;
}
/**
 * Error thrown during discovery
 */
export declare class DiscoveryError extends Error {
    readonly functionName?: string;
    readonly cause?: Error;
    constructor(message: string, functionName?: string, cause?: Error);
}
/**
 * Error thrown during resource loading
 */
export declare class ResourceLoadError extends Error {
    readonly resourcePath: string;
    readonly cause?: Error;
    constructor(message: string, resourcePath: string, cause?: Error);
}
/**
 * Error thrown during environment resolution
 */
export declare class EnvironmentResolutionError extends Error {
    readonly placeholder: string;
    readonly functionName: string;
    readonly cause?: Error;
    constructor(message: string, placeholder: string, functionName: string, cause?: Error);
}
//# sourceMappingURL=types.d.ts.map