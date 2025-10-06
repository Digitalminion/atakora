import { Construct } from '../../core/construct';
import type { IResourceGroup } from '../resource-group/types';
import { ArmApplicationGateway } from './arm-application-gateway';
import type {
  ApplicationGatewayProps,
  IApplicationGateway,
  ApplicationGatewaySku,
  GatewayIPConfiguration,
  FrontendIPConfiguration,
  FrontendPort,
  BackendAddressPool,
  BackendHttpSettings,
  HttpListener,
  RequestRoutingRule,
} from './types';
import {
  ApplicationGatewaySkuName,
  ApplicationGatewayTier,
  ApplicationGatewayProtocol,
  ApplicationGatewayCookieBasedAffinity,
  ApplicationGatewayRequestRoutingRuleType,
} from './types';

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
 * import { ApplicationGateway } from '@atakora/lib';
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
export class ApplicationGateway
  extends Construct
  implements IApplicationGateway
{
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
  public static fromGatewayId(
    scope: Construct,
    id: string,
    gatewayId: string
  ): IApplicationGateway {
    // Parse the resource ID to extract components
    const parts = gatewayId.split('/');
    const gatewayName = parts[parts.length - 1];
    const resourceGroupName = parts[parts.indexOf('resourceGroups') + 1];

    // Create a reference object that implements IApplicationGateway
    class ApplicationGatewayRef
      extends Construct
      implements IApplicationGateway
    {
      public readonly gatewayName: string;
      public readonly location: string;
      public readonly resourceGroupName: string;
      public readonly sku: ApplicationGatewaySku;

      constructor(scope: Construct, id: string) {
        super(scope, id);
        this.gatewayName = gatewayName;
        this.resourceGroupName = resourceGroupName;
        // We don't know the actual location or SKU for imported resources
        this.location = 'unknown';
        this.sku = {
          name: ApplicationGatewaySkuName.WAF_v2,
          tier: ApplicationGatewayTier.WAF_v2,
        };
      }
    }

    return new ApplicationGatewayRef(scope, id);
  }

  /**
   * Underlying L1 construct.
   */
  private readonly armApplicationGateway: ArmApplicationGateway;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the application gateway.
   */
  public readonly gatewayName: string;

  /**
   * Location of the application gateway.
   */
  public readonly location: string;

  /**
   * Resource group name where the gateway is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * SKU configuration.
   */
  public readonly sku: ApplicationGatewaySku;

  /**
   * Tags applied to the application gateway (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * Subnet ID.
   */
  public readonly subnetId: string;

  /**
   * Public IP address ID.
   */
  public readonly publicIpAddressId?: string;

  /**
   * WAF Policy ID.
   */
  public readonly wafPolicyId?: string;

  /**
   * Enable HTTP/2.
   */
  public readonly enableHttp2: boolean;

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
  constructor(scope: Construct, id: string, props: ApplicationGatewayProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided gateway name
    this.gatewayName = this.resolveGatewayName(id, props);

    // Default location to resource group's location or use provided
    this.location = props.location ?? this.parentResourceGroup.location;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Default SKU to WAF_v2 with capacity 1
    this.sku = props.sku ?? {
      name: ApplicationGatewaySkuName.WAF_v2,
      tier: ApplicationGatewayTier.WAF_v2,
      capacity: 1,
    };

    // Store required properties
    this.subnetId = props.subnetId;
    this.publicIpAddressId = props.publicIpAddressId;
    this.wafPolicyId = props.wafPolicyId;
    this.enableHttp2 = props.enableHttp2 ?? false;

    // Merge tags with parent (get tags from parent construct if available)
    this.tags = {
      ...this.getParentTags(scope),
      ...props.tags,
    };

    // Build default configuration
    const config = this.buildDefaultConfiguration();

    // Create underlying L1 resource
    this.armApplicationGateway = new ArmApplicationGateway(scope, `${id}ApplicationGateway`, {
      gatewayName: this.gatewayName,
      location: this.location,
      resourceGroupName: this.resourceGroupName,
      sku: this.sku,
      gatewayIPConfigurations: config.gatewayIPConfigurations,
      frontendIPConfigurations: config.frontendIPConfigurations,
      frontendPorts: config.frontendPorts,
      backendAddressPools: config.backendAddressPools,
      backendHttpSettingsCollection: config.backendHttpSettingsCollection,
      httpListeners: config.httpListeners,
      requestRoutingRules: config.requestRoutingRules,
      firewallPolicy: this.wafPolicyId
        ? { id: this.wafPolicyId }
        : undefined,
      enableHttp2: this.enableHttp2,
      tags: this.tags,
    });
  }

  /**
   * Gets the parent ResourceGroup from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The resource group interface
   * @throws {Error} If parent is not or doesn't contain a ResourceGroup
   */
  private getParentResourceGroup(scope: Construct): IResourceGroup {
    // Walk up the construct tree to find ResourceGroup
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IResourceGroup interface
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error(
      'ApplicationGateway must be created within or under a ResourceGroup. ' +
        'Ensure the parent scope is a ResourceGroup or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IResourceGroup interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has ResourceGroup properties
   */
  private isResourceGroup(construct: any): construct is IResourceGroup {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      typeof construct.location === 'string'
    );
  }

  /**
   * Gets tags from parent construct hierarchy.
   *
   * @param scope - Parent construct
   * @returns Tags object (empty if no tags found)
   */
  private getParentTags(scope: Construct): Record<string, string> {
    // Try to get tags from parent
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }

  /**
   * Resolves the gateway name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - Application gateway properties
   * @returns Resolved gateway name
   */
  private resolveGatewayName(
    id: string,
    props: ApplicationGatewayProps
  ): string {
    // If name provided explicitly, use it
    if (props.gatewayName) {
      return props.gatewayName;
    }

    // Auto-generate name using parent's naming context
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      return subscriptionStack.generateResourceName('appgw', purpose);
    }

    // Fallback: construct a basic name from ID
    return `appgw-${id.toLowerCase()}`;
  }

  /**
   * Gets the SubscriptionStack from the construct tree.
   *
   * @returns SubscriptionStack or undefined if not found
   */
  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      // Check if current is a SubscriptionStack using duck typing
      if (
        current &&
        typeof (current as any).generateResourceName === 'function' &&
        typeof (current as any).subscriptionId === 'string'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }

  /**
   * Converts construct ID to purpose identifier for naming.
   *
   * @param id - Construct ID
   * @returns Purpose string for naming
   */
  private constructIdToPurpose(id: string): string {
    return id.toLowerCase();
  }

  /**
   * Builds default configuration for the application gateway.
   *
   * @returns Default configuration object
   */
  private buildDefaultConfiguration(): {
    gatewayIPConfigurations: GatewayIPConfiguration[];
    frontendIPConfigurations: FrontendIPConfiguration[];
    frontendPorts: FrontendPort[];
    backendAddressPools: BackendAddressPool[];
    backendHttpSettingsCollection: BackendHttpSettings[];
    httpListeners: HttpListener[];
    requestRoutingRules: RequestRoutingRule[];
  } {
    // Gateway IP Configuration
    const gatewayIPConfigurations: GatewayIPConfiguration[] = [
      {
        name: 'gateway-ip-config',
        subnet: {
          id: this.subnetId,
        },
      },
    ];

    // Frontend IP Configuration
    const frontendIPConfigurations: FrontendIPConfiguration[] = [];

    if (this.publicIpAddressId) {
      frontendIPConfigurations.push({
        name: 'frontend-ip-public',
        publicIPAddress: {
          id: this.publicIpAddressId,
        },
      });
    } else {
      // If no public IP, create a private frontend IP
      frontendIPConfigurations.push({
        name: 'frontend-ip-private',
        subnet: {
          id: this.subnetId,
        },
        privateIPAllocationMethod: 'Dynamic',
      });
    }

    // Frontend Ports
    const frontendPorts: FrontendPort[] = [
      {
        name: 'port-80',
        port: 80,
      },
      {
        name: 'port-443',
        port: 443,
      },
    ];

    // Backend Address Pool (empty by default)
    const backendAddressPools: BackendAddressPool[] = [
      {
        name: 'default-backend-pool',
        backendAddresses: [],
      },
    ];

    // Backend HTTP Settings
    const backendHttpSettingsCollection: BackendHttpSettings[] = [
      {
        name: 'default-backend-settings',
        port: 80,
        protocol: ApplicationGatewayProtocol.Http,
        cookieBasedAffinity: ApplicationGatewayCookieBasedAffinity.Disabled,
        requestTimeout: 30,
      },
    ];

    // HTTP Listeners
    const frontendIpName = this.publicIpAddressId
      ? 'frontend-ip-public'
      : 'frontend-ip-private';

    const httpListeners: HttpListener[] = [
      {
        name: 'default-http-listener',
        frontendIPConfiguration: {
          id: `[resourceId('Microsoft.Network/applicationGateways/frontendIPConfigurations', '${this.gatewayName}', '${frontendIpName}')]`,
        },
        frontendPort: {
          id: `[resourceId('Microsoft.Network/applicationGateways/frontendPorts', '${this.gatewayName}', 'port-80')]`,
        },
        protocol: ApplicationGatewayProtocol.Http,
      },
    ];

    // Request Routing Rules
    const requestRoutingRules: RequestRoutingRule[] = [
      {
        name: 'default-routing-rule',
        ruleType: ApplicationGatewayRequestRoutingRuleType.Basic,
        priority: 100,
        httpListener: {
          id: `[resourceId('Microsoft.Network/applicationGateways/httpListeners', '${this.gatewayName}', 'default-http-listener')]`,
        },
        backendAddressPool: {
          id: `[resourceId('Microsoft.Network/applicationGateways/backendAddressPools', '${this.gatewayName}', 'default-backend-pool')]`,
        },
        backendHttpSettings: {
          id: `[resourceId('Microsoft.Network/applicationGateways/backendHttpSettingsCollection', '${this.gatewayName}', 'default-backend-settings')]`,
        },
      },
    ];

    return {
      gatewayIPConfigurations,
      frontendIPConfigurations,
      frontendPorts,
      backendAddressPools,
      backendHttpSettingsCollection,
      httpListeners,
      requestRoutingRules,
    };
  }

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
  public addBackend(name: string, addresses: string[]): void {
    throw new Error(
      'addBackend() is not yet implemented. ' +
        'Configure backends via the L1 construct or create a new ApplicationGateway ' +
        'with the desired configuration. ' +
        'This helper method will be available in a future release.'
    );
  }

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
  public addListener(
    name: string,
    port: number,
    protocol: ApplicationGatewayProtocol
  ): void {
    throw new Error(
      'addListener() is not yet implemented. ' +
        'Configure listeners via the L1 construct. ' +
        'This helper method will be available in a future release.'
    );
  }

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
  public addRoutingRule(
    name: string,
    listenerName: string,
    backendPoolName: string
  ): void {
    throw new Error(
      'addRoutingRule() is not yet implemented. ' +
        'Configure routing rules via the L1 construct. ' +
        'This helper method will be available in a future release.'
    );
  }
}
