import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmFunctionProps, TriggerConfig } from './function-app-types';
/**
 * L1 construct for individual Azure Function.
 *
 * @remarks
 * Direct mapping to Microsoft.Web/sites/functions ARM sub-resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Web/sites/functions`
 * **API Version**: `2023-01-01`
 * **Deployment Scope**: ResourceGroup (nested under Function App)
 *
 * This is a low-level construct for maximum control. Individual functions are typically
 * auto-discovered in the L2 pattern, but this construct allows manual function definition.
 *
 * @example
 * Basic HTTP trigger function:
 * ```typescript
 * import { ArmFunction, AuthLevel, HttpMethod } from '@atakora/cdk/web';
 *
 * const httpFunction = new ArmFunction(functionApp, 'HttpApi', {
 *   functionName: 'HttpTrigger1',
 *   trigger: {
 *     type: 'http',
 *     route: 'api/users/{userId}',
 *     methods: [HttpMethod.GET, HttpMethod.POST],
 *     authLevel: AuthLevel.FUNCTION
 *   },
 *   inlineCode: 'base64EncodedCode...'
 * });
 * ```
 *
 * @example
 * Timer trigger function:
 * ```typescript
 * const timerFunction = new ArmFunction(functionApp, 'TimerJob', {
 *   functionName: 'TimerTrigger1',
 *   trigger: {
 *     type: 'timer',
 *     schedule: '0 *\/5 * * * *', // Every 5 minutes
 *     runOnStartup: false
 *   },
 *   packageUri: 'https://storage.blob.core.windows.net/...'
 * });
 * ```
 */
export declare class ArmFunction extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for Functions.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the function.
     */
    readonly functionName: string;
    /**
     * Resource name (same as functionName).
     */
    readonly name: string;
    /**
     * Trigger configuration.
     */
    readonly trigger: TriggerConfig;
    /**
     * Inline function code (Base64-encoded).
     */
    readonly inlineCode?: string;
    /**
     * Package URI for external deployment.
     */
    readonly packageUri?: string;
    /**
     * Custom function.json configuration.
     */
    readonly config?: Record<string, any>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{siteName}/functions/{functionName}`
     */
    readonly resourceId: string;
    /**
     * Function resource ID (alias for resourceId).
     */
    readonly functionId: string;
    /**
     * Trigger URL for HTTP triggers.
     */
    readonly triggerUrl?: string;
    /**
     * Creates a new ArmFunction construct.
     *
     * @param scope - Parent construct (typically an ArmFunctionApp)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Function properties
     *
     * @throws {Error} If functionName is invalid
     * @throws {Error} If neither inlineCode nor packageUri is provided
     * @throws {Error} If both inlineCode and packageUri are provided
     */
    constructor(scope: Construct, id: string, props: ArmFunctionProps);
    /**
     * Validates Function properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmFunctionProps): void;
    /**
     * Builds function.json configuration from trigger configuration.
     *
     * @remarks
     * Converts the TypeScript trigger configuration to the Azure Functions function.json format.
     *
     * @returns function.json configuration object
     */
    protected buildFunctionConfig(): Record<string, any>;
    /**
     * Generates ARM template representation of this resource.
     *
     * @remarks
     * Called during synthesis to produce the ARM template JSON.
     * For Functions, this generates a nested resource under the Function App.
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=function-arm.d.ts.map