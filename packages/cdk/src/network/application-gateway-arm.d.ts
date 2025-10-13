import { Construct, Resource, DeploymentScope, ValidationResult } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmApplicationGatewayProps, ApplicationGatewaySku } from './application-gateway-types';
/**
 * L1 construct for Azure Application Gateway.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/applicationGateways ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/applicationGateways`
 * **API Version**: `2023-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link ApplicationGateway} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmApplicationGateway, ApplicationGatewaySkuName, ApplicationGatewayTier } from '@atakora/cdk/network';
 *
 * const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', {
 *   gatewayName: 'appgw-prod-eastus-01',
 *   location: 'eastus',
 *   resourceGroupName: 'rg-network',
 *   sku: {
 *     name: ApplicationGatewaySkuName.WAF_v2,
 *     tier: ApplicationGatewayTier.WAF_v2,
 *     capacity: 2
 *   },
 *   gatewayIPConfigurations: [
 *     {
 *       name: 'gateway-ip-config',
 *       subnet: { id: '/subscriptions/.../subnets/appgw' }
 *     }
 *   ],
 *   frontendIPConfigurations: [
 *     {
 *       name: 'frontend-ip',
 *       publicIPAddress: { id: '/subscriptions/.../publicIPAddresses/pip' }
 *     }
 *   ],
 *   frontendPorts: [
 *     { name: 'port-80', port: 80 },
 *     { name: 'port-443', port: 443 }
 *   ],
 *   backendAddressPools: [
 *     {
 *       name: 'backend-pool',
 *       backendAddresses: [{ fqdn: 'backend.example.com' }]
 *     }
 *   ],
 *   backendHttpSettingsCollection: [
 *     {
 *       name: 'backend-settings',
 *       port: 443,
 *       protocol: ApplicationGatewayProtocol.Https,
 *       cookieBasedAffinity: ApplicationGatewayCookieBasedAffinity.Disabled,
 *       requestTimeout: 30
 *     }
 *   ],
 *   httpListeners: [
 *     {
 *       name: 'http-listener',
 *       frontendIPConfiguration: { id: '[resourceId(...)]' },
 *       frontendPort: { id: '[resourceId(...)]' },
 *       protocol: ApplicationGatewayProtocol.Http
 *     }
 *   ],
 *   requestRoutingRules: [
 *     {
 *       name: 'routing-rule',
 *       ruleType: ApplicationGatewayRequestRoutingRuleType.Basic,
 *       priority: 100,
 *       httpListener: { id: '[resourceId(...)]' },
 *       backendAddressPool: { id: '[resourceId(...)]' },
 *       backendHttpSettings: { id: '[resourceId(...)]' }
 *     }
 *   ]
 * });
 * ```
 */
export declare class ArmApplicationGateway extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for application gateways.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the application gateway.
     */
    readonly gatewayName: string;
    /**
     * Resource name (same as gatewayName).
     */
    readonly name: string;
    /**
     * Azure region where the application gateway is located.
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
     * Tags applied to the application gateway.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/applicationGateways/{gatewayName}`
     */
    readonly resourceId: string;
    /**
     * Gateway IP configurations.
     */
    readonly gatewayIPConfigurations: any[];
    /**
     * Frontend IP configurations.
     */
    readonly frontendIPConfigurations: any[];
    /**
     * Frontend ports.
     */
    readonly frontendPorts: any[];
    /**
     * Backend address pools.
     */
    readonly backendAddressPools: any[];
    /**
     * Backend HTTP settings collection.
     */
    readonly backendHttpSettingsCollection: any[];
    /**
     * HTTP listeners.
     */
    readonly httpListeners: any[];
    /**
     * Request routing rules.
     */
    readonly requestRoutingRules: any[];
    /**
     * Probes.
     */
    readonly probes?: any[];
    /**
     * SSL certificates.
     */
    readonly sslCertificates?: any[];
    /**
     * Redirect configurations.
     */
    readonly redirectConfigurations?: any[];
    /**
     * Web Application Firewall configuration.
     */
    readonly webApplicationFirewallConfiguration?: any;
    /**
     * Firewall policy reference.
     */
    readonly firewallPolicy?: {
        id: string;
    };
    /**
     * Enable HTTP/2.
     */
    readonly enableHttp2?: boolean;
    /**
     * Creates a new ArmApplicationGateway construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Application gateway properties
     *
     * @throws {Error} If gatewayName is invalid
     * @throws {Error} If location is empty
     * @throws {Error} If required collections are empty
     */
    constructor(scope: Construct, id: string, props: ArmApplicationGatewayProps);
    /**
     * Validates application gateway properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmApplicationGatewayProps): void;
    /**
     * Validates the ARM structure of this resource.
     *
     * @remarks
     * Called during synthesis to validate the ARM template structure.
     * Ensures all required properties are present and properly formatted.
     *
     * @returns Validation result with any errors or warnings
     */
    validateArmStructure(): ValidationResult;
    /**
     * Generates ARM template representation of this resource.
     *
     * @remarks
     * Called during synthesis to produce the ARM template JSON.
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=application-gateway-arm.d.ts.map