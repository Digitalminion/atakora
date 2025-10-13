import { Construct } from '@atakora/cdk';
import type { ApplicationGatewaysProps, IApplicationGateway, ApplicationGatewaySku } from './application-gateway-types';
import { ApplicationGatewayProtocol } from './application-gateway-types';
/**
 * L2 construct for Azure Application Gateway.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates gateway name using parent naming context
 * - Defaults location to parent resource group's location
 * - Defaults SKU to WAF_v2 with capacity 1
 * - Merges tags with parent tags
 * - Provides default configurations for common scenarios
 * - Helper methods for adding backends, listeners, and rules
 *
 * **ARM Resource Type**: `Microsoft.Network/applicationGateways`
 * **API Version**: `2023-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { ApplicationGateway } from '@atakora/cdk/network';
 *
 * // Creates Application Gateway with auto-generated name and defaults
 * const appgw = new ApplicationGateway(resourceGroup, 'MainAppGw', {
 *   subnetId: '/subscriptions/.../subnets/appgw',
 *   publicIpAddressId: '/subscriptions/.../publicIPAddresses/pip'
 * });
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const appgw = new ApplicationGateway(resourceGroup, 'MainAppGw', {
 *   gatewayName: 'my-custom-appgw',
 *   subnetId: '/subscriptions/.../subnets/appgw',
 *   publicIpAddressId: '/subscriptions/.../publicIPAddresses/pip',
 *   sku: {
 *     name: ApplicationGatewaySkuName.WAF_v2,
 *     tier: ApplicationGatewayTier.WAF_v2,
 *     capacity: 2
 *   },
 *   wafPolicyId: '/subscriptions/.../providers/Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/waf-policy',
 *   tags: {
 *     costCenter: '1234'
 *   }
 * });
 * ```
 *
 * @example
 * Import existing gateway:
 * ```typescript
 * const appgw = ApplicationGateway.fromGatewayId(
 *   stack,
 *   'ImportedAppGw',
 *   '/subscriptions/.../providers/Microsoft.Network/applicationGateways/my-appgw'
 * );
 * ```
 */
export declare class ApplicationGateways extends Construct implements IApplicationGateway {
    /**
     * Import an existing Application Gateway by resource ID.
     *
     * @param scope - Parent construct
     * @param id - Unique identifier for this construct
     * @param gatewayId - Full resource ID of the application gateway
     * @returns Application Gateway reference
     *
     * @example
     * ```typescript
     * const appgw = ApplicationGateway.fromGatewayId(
     *   stack,
     *   'ImportedAppGw',
     *   '/subscriptions/12345/resourceGroups/rg-network/providers/Microsoft.Network/applicationGateways/appgw-prod'
     * );
     * ```
     */
    static fromGatewayId(scope: Construct, id: string, gatewayId: string): IApplicationGateway;
    /**
     * Underlying L1 construct.
     */
    private readonly armApplicationGateway;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Name of the application gateway.
     */
    readonly gatewayName: string;
    /**
     * Location of the application gateway.
     */
    readonly location: string;
    /**
     * Resource group name where the gateway is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * SKU configuration.
     */
    readonly sku: ApplicationGatewaySku;
    /**
     * Tags applied to the application gateway (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * Subnet ID.
     */
    readonly subnetId: string;
    /**
     * Public IP address ID.
     */
    readonly publicIpAddressId?: string;
    /**
     * WAF Policy ID.
     */
    readonly wafPolicyId?: string;
    /**
     * Enable HTTP/2.
     */
    readonly enableHttp2: boolean;
    /**
     * Creates a new ApplicationGateway construct.
     *
     * @param scope - Parent construct (must be or contain a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - Application gateway properties
     *
     * @throws {Error} If scope does not contain a ResourceGroup
     * @throws {Error} If subnetId is not provided
     *
     * @example
     * ```typescript
     * const appgw = new ApplicationGateway(resourceGroup, 'MainAppGw', {
     *   subnetId: '/subscriptions/.../subnets/appgw',
     *   publicIpAddressId: '/subscriptions/.../publicIPAddresses/pip'
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props: ApplicationGatewaysProps);
    /**
     * Builds a WAF policy reference for ARM templates.
     * Converts a resource ID path to a resourceId() expression.
     *
     * @param wafPolicyId - Full resource ID of the WAF policy
     * @returns ARM resourceId() expression
     */
    private buildWafPolicyReference;
    /**
     * Builds a subnet reference for ARM templates.
     * Converts a subnet ID path to a resourceId() expression.
     *
     * @param subnetId - Full resource ID of the subnet
     * @returns ARM resourceId() expression
     */
    private buildSubnetReference;
    /**
     * Builds a public IP address reference for ARM templates.
     * Converts a public IP ID path to a resourceId() expression.
     *
     * @param publicIpId - Full resource ID of the public IP
     * @returns ARM resourceId() expression
     */
    private buildPublicIPReference;
    /**
     * Gets the parent ResourceGroup from the construct tree.
     *
     * @param scope - Parent construct
     * @returns The resource group interface
     * @throws {Error} If parent is not or doesn't contain a ResourceGroup
     */
    private getParentResourceGroup;
    /**
     * Checks if a construct implements IResourceGroup interface using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has ResourceGroup properties
     */
    private isResourceGroup;
    /**
     * Gets tags from parent construct hierarchy.
     *
     * @param scope - Parent construct
     * @returns Tags object (empty if no tags found)
     */
    private getParentTags;
    /**
     * Resolves the gateway name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - Application gateway properties
     * @returns Resolved gateway name
     */
    private resolveGatewayName;
    /**
     * Gets the SubscriptionStack from the construct tree.
     *
     * @returns SubscriptionStack or undefined if not found
     */
    private getSubscriptionStack;
    /**
     * Converts construct ID to purpose identifier for naming.
     *
     * @param id - Construct ID
     * @returns Purpose string for naming
     */
    private constructIdToPurpose;
    /**
     * Builds default configuration for the application gateway.
     *
     * @returns Default configuration object
     */
    private buildDefaultConfiguration;
    /**
     * Add a backend address pool.
     *
     * @param name - Name of the backend pool
     * @param addresses - Array of FQDNs or IP addresses
     *
     * @remarks
     * This is a future enhancement. For now, backends should be configured
     * via the underlying L1 construct or by creating a new ApplicationGateway
     * with the desired configuration.
     *
     * @example
     * ```typescript
     * appgw.addBackend('api-backend', ['api.example.com']);
     * ```
     */
    addBackend(name: string, addresses: string[]): void;
    /**
     * Add an HTTP listener.
     *
     * @param name - Name of the listener
     * @param port - Port number
     * @param protocol - Protocol (Http or Https)
     *
     * @remarks
     * This is a future enhancement. For now, listeners should be configured
     * via the underlying L1 construct.
     *
     * @example
     * ```typescript
     * appgw.addListener('api-listener', 8080, ApplicationGatewayProtocol.Http);
     * ```
     */
    addListener(name: string, port: number, protocol: ApplicationGatewayProtocol): void;
    /**
     * Add a routing rule.
     *
     * @param name - Name of the rule
     * @param listenerName - Name of the listener
     * @param backendPoolName - Name of the backend pool
     *
     * @remarks
     * This is a future enhancement. For now, rules should be configured
     * via the underlying L1 construct.
     *
     * @example
     * ```typescript
     * appgw.addRoutingRule('api-rule', 'api-listener', 'api-backend');
     * ```
     */
    addRoutingRule(name: string, listenerName: string, backendPoolName: string): void;
}
//# sourceMappingURL=application-gateways.d.ts.map