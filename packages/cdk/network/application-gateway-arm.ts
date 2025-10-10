import { Construct, Resource, DeploymentScope, ValidationResult, ValidationResultBuilder } from '@atakora/cdk';
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
export class ArmApplicationGateway extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Network/applicationGateways';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2023-11-01';

  /**
   * Deployment scope for application gateways.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the application gateway.
   */
  public readonly gatewayName: string;

  /**
   * Resource name (same as gatewayName).
   */
  public readonly name: string;

  /**
   * Azure region where the application gateway is located.
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
   * Tags applied to the application gateway.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/applicationGateways/{gatewayName}`
   */
  public readonly resourceId: string;

  /**
   * Gateway IP configurations.
   */
  public readonly gatewayIPConfigurations: any[];

  /**
   * Frontend IP configurations.
   */
  public readonly frontendIPConfigurations: any[];

  /**
   * Frontend ports.
   */
  public readonly frontendPorts: any[];

  /**
   * Backend address pools.
   */
  public readonly backendAddressPools: any[];

  /**
   * Backend HTTP settings collection.
   */
  public readonly backendHttpSettingsCollection: any[];

  /**
   * HTTP listeners.
   */
  public readonly httpListeners: any[];

  /**
   * Request routing rules.
   */
  public readonly requestRoutingRules: any[];

  /**
   * Probes.
   */
  public readonly probes?: any[];

  /**
   * SSL certificates.
   */
  public readonly sslCertificates?: any[];

  /**
   * Redirect configurations.
   */
  public readonly redirectConfigurations?: any[];

  /**
   * Web Application Firewall configuration.
   */
  public readonly webApplicationFirewallConfiguration?: any;

  /**
   * Firewall policy reference.
   */
  public readonly firewallPolicy?: { id: string };

  /**
   * Enable HTTP/2.
   */
  public readonly enableHttp2?: boolean;

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
  constructor(scope: Construct, id: string, props: ArmApplicationGatewayProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.gatewayName = props.gatewayName;
    this.name = props.gatewayName;
    this.location = props.location;
    this.resourceGroupName = props.resourceGroupName;
    this.sku = props.sku;
    this.tags = props.tags ?? {};
    this.gatewayIPConfigurations = props.gatewayIPConfigurations;
    this.frontendIPConfigurations = props.frontendIPConfigurations;
    this.frontendPorts = props.frontendPorts;
    this.backendAddressPools = props.backendAddressPools;
    this.backendHttpSettingsCollection = props.backendHttpSettingsCollection;
    this.httpListeners = props.httpListeners;
    this.requestRoutingRules = props.requestRoutingRules;
    this.probes = props.probes;
    this.sslCertificates = props.sslCertificates;
    this.redirectConfigurations = props.redirectConfigurations;
    this.webApplicationFirewallConfiguration = props.webApplicationFirewallConfiguration;
    this.firewallPolicy = props.firewallPolicy;
    this.enableHttp2 = props.enableHttp2;

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/${this.resourceGroupName}/providers/Microsoft.Network/applicationGateways/${this.gatewayName}`;
  }

  /**
   * Validates application gateway properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  protected validateProps(props: ArmApplicationGatewayProps): void {
    // Validate gateway name
    if (!props.gatewayName || props.gatewayName.trim() === '') {
      throw new Error('Application gateway name cannot be empty');
    }

    if (props.gatewayName.length > 80) {
      throw new Error('Application gateway name must be 80 characters or less');
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate resource group name
    if (!props.resourceGroupName || props.resourceGroupName.trim() === '') {
      throw new Error('Resource group name cannot be empty');
    }

    // Validate SKU
    if (!props.sku) {
      throw new Error('SKU must be specified');
    }

    if (!props.sku.name || !props.sku.tier) {
      throw new Error('SKU name and tier must be specified');
    }

    // Validate required collections
    if (!props.gatewayIPConfigurations || props.gatewayIPConfigurations.length === 0) {
      throw new Error('At least one gateway IP configuration must be specified');
    }

    if (!props.frontendIPConfigurations || props.frontendIPConfigurations.length === 0) {
      throw new Error('At least one frontend IP configuration must be specified');
    }

    if (!props.frontendPorts || props.frontendPorts.length === 0) {
      throw new Error('At least one frontend port must be specified');
    }

    if (!props.backendAddressPools || props.backendAddressPools.length === 0) {
      throw new Error('At least one backend address pool must be specified');
    }

    if (!props.backendHttpSettingsCollection || props.backendHttpSettingsCollection.length === 0) {
      throw new Error('At least one backend HTTP settings must be specified');
    }

    if (!props.httpListeners || props.httpListeners.length === 0) {
      throw new Error('At least one HTTP listener must be specified');
    }

    if (!props.requestRoutingRules || props.requestRoutingRules.length === 0) {
      throw new Error('At least one request routing rule must be specified');
    }

    // Validate gateway IP configurations
    props.gatewayIPConfigurations.forEach((config) => {
      if (!config.name || config.name.trim() === '') {
        throw new Error('Gateway IP configuration name cannot be empty');
      }

      if (!config.subnet || !config.subnet.id) {
        throw new Error('Gateway IP configuration must have a subnet ID');
      }
    });

    // Validate frontend ports
    props.frontendPorts.forEach((port) => {
      if (!port.name || port.name.trim() === '') {
        throw new Error('Frontend port name cannot be empty');
      }

      if (!port.port || port.port < 1 || port.port > 65535) {
        throw new Error('Frontend port must be between 1 and 65535');
      }
    });

    // Validate request routing rules
    props.requestRoutingRules.forEach((rule) => {
      if (!rule.name || rule.name.trim() === '') {
        throw new Error('Request routing rule name cannot be empty');
      }

      if (!rule.priority || rule.priority < 1 || rule.priority > 20000) {
        throw new Error('Request routing rule priority must be between 1 and 20000');
      }

      if (!rule.httpListener || !rule.httpListener.id) {
        throw new Error('Request routing rule must have an HTTP listener');
      }

      // Must have either backend pool + settings, redirect, or URL path map
      const hasBackend = rule.backendAddressPool && rule.backendHttpSettings;
      const hasRedirect = rule.redirectConfiguration;
      const hasPathMap = rule.urlPathMap;

      if (!hasBackend && !hasRedirect && !hasPathMap) {
        throw new Error(
          'Request routing rule must have either backend pool + settings, redirect configuration, or URL path map'
        );
      }
    });
  }

  /**
   * Validates the ARM structure of this resource.
   *
   * @remarks
   * Called during synthesis to validate the ARM template structure.
   * Ensures all required properties are present and properly formatted.
   *
   * @returns Validation result with any errors or warnings
   */
  public validateArmStructure(): ValidationResult {
    const builder = new ValidationResultBuilder();
    // Basic ARM structure validation - constructor already validates props
    return builder.build();
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): ArmResource {
    const template: any = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.gatewayName,
      location: this.location,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
      properties: {
        sku: {
          name: this.sku.name,
          tier: this.sku.tier,
          capacity: this.sku.capacity,
        },
        gatewayIPConfigurations: this.gatewayIPConfigurations.map((config) => ({
          name: config.name,
          properties: {
            subnet: {
              id: config.subnet.id,
            },
          },
        })),
        frontendIPConfigurations: this.frontendIPConfigurations.map((config) => {
          const properties: any = {};

          if (config.publicIPAddress) {
            properties.publicIPAddress = {
              id: config.publicIPAddress.id,
            };
          }

          if (config.privateIPAddress) {
            properties.privateIPAddress = config.privateIPAddress;
            properties.privateIPAllocationMethod = config.privateIPAllocationMethod || 'Dynamic';
          }

          if (config.subnet) {
            properties.subnet = {
              id: config.subnet.id,
            };
          }

          return {
            name: config.name,
            properties,
          };
        }),
        frontendPorts: this.frontendPorts.map((port) => ({
          name: port.name,
          properties: {
            port: port.port,
          },
        })),
        backendAddressPools: this.backendAddressPools.map((pool) => ({
          name: pool.name,
          properties: {
            backendAddresses: pool.backendAddresses || [],
          },
        })),
        backendHttpSettingsCollection: this.backendHttpSettingsCollection.map((settings) => {
          const properties: any = {
            port: settings.port,
            protocol: settings.protocol,
            cookieBasedAffinity: settings.cookieBasedAffinity,
            requestTimeout: settings.requestTimeout,
          };

          if (settings.probe) {
            properties.probe = settings.probe;
          }

          if (settings.pickHostNameFromBackendAddress !== undefined) {
            properties.pickHostNameFromBackendAddress = settings.pickHostNameFromBackendAddress;
          }

          if (settings.hostName) {
            properties.hostName = settings.hostName;
          }

          return {
            name: settings.name,
            properties,
          };
        }),
        httpListeners: this.httpListeners.map((listener) => {
          const properties: any = {
            frontendIPConfiguration: listener.frontendIPConfiguration,
            frontendPort: listener.frontendPort,
            protocol: listener.protocol,
          };

          if (listener.hostName) {
            properties.hostName = listener.hostName;
          }

          if (listener.requireServerNameIndication !== undefined) {
            properties.requireServerNameIndication = listener.requireServerNameIndication;
          }

          if (listener.sslCertificate) {
            properties.sslCertificate = listener.sslCertificate;
          }

          return {
            name: listener.name,
            properties,
          };
        }),
        requestRoutingRules: this.requestRoutingRules.map((rule) => {
          const properties: any = {
            ruleType: rule.ruleType,
            priority: rule.priority,
            httpListener: rule.httpListener,
          };

          if (rule.backendAddressPool) {
            properties.backendAddressPool = rule.backendAddressPool;
          }

          if (rule.backendHttpSettings) {
            properties.backendHttpSettings = rule.backendHttpSettings;
          }

          if (rule.redirectConfiguration) {
            properties.redirectConfiguration = rule.redirectConfiguration;
          }

          if (rule.urlPathMap) {
            properties.urlPathMap = rule.urlPathMap;
          }

          return {
            name: rule.name,
            properties,
          };
        }),
      },
    };

    // Add optional properties
    if (this.probes && this.probes.length > 0) {
      template.properties.probes = this.probes.map((probe) => {
        const properties: any = {
          protocol: probe.protocol,
          path: probe.path,
          interval: probe.interval,
          timeout: probe.timeout,
          unhealthyThreshold: probe.unhealthyThreshold,
        };

        if (probe.pickHostNameFromBackendHttpSettings !== undefined) {
          properties.pickHostNameFromBackendHttpSettings =
            probe.pickHostNameFromBackendHttpSettings;
        }

        if (probe.minServers !== undefined) {
          properties.minServers = probe.minServers;
        }

        if (probe.host) {
          properties.host = probe.host;
        }

        if (probe.match) {
          properties.match = probe.match;
        }

        return {
          name: probe.name,
          properties,
        };
      });
    }

    if (this.sslCertificates && this.sslCertificates.length > 0) {
      template.properties.sslCertificates = this.sslCertificates.map((cert) => {
        const properties: any = {};

        if (cert.keyVaultSecretId) {
          properties.keyVaultSecretId = cert.keyVaultSecretId;
        }

        if (cert.data) {
          properties.data = cert.data;
        }

        if (cert.password) {
          properties.password = cert.password;
        }

        return {
          name: cert.name,
          properties,
        };
      });
    }

    if (this.redirectConfigurations && this.redirectConfigurations.length > 0) {
      template.properties.redirectConfigurations = this.redirectConfigurations.map((redirect) => {
        const properties: any = {
          redirectType: redirect.redirectType,
        };

        if (redirect.targetListener) {
          properties.targetListener = redirect.targetListener;
        }

        if (redirect.targetUrl) {
          properties.targetUrl = redirect.targetUrl;
        }

        if (redirect.includePath !== undefined) {
          properties.includePath = redirect.includePath;
        }

        if (redirect.includeQueryString !== undefined) {
          properties.includeQueryString = redirect.includeQueryString;
        }

        return {
          name: redirect.name,
          properties,
        };
      });
    }

    if (this.webApplicationFirewallConfiguration) {
      template.properties.webApplicationFirewallConfiguration =
        this.webApplicationFirewallConfiguration;
    }

    if (this.firewallPolicy) {
      template.properties.firewallPolicy = {
        id: this.firewallPolicy.id,
      };
    }

    if (this.enableHttp2 !== undefined) {
      template.properties.enableHttp2 = this.enableHttp2;
    }

    // Build dependsOn array for explicit dependencies
    const dependsOn: string[] = [];
    const uniqueDeps = new Set<string>();

    // Add subnet dependencies from gateway IP configurations
    // Subnets in gatewayIPConfigurations have their IDs transformed to resourceId() expressions
    // by the L2 construct before being passed to the L1
    for (const config of this.gatewayIPConfigurations) {
      if (config.subnet?.id) {
        uniqueDeps.add(config.subnet.id);
      }
    }

    // Add subnet dependencies from frontend IP configurations
    for (const config of this.frontendIPConfigurations) {
      if (config.subnet?.id) {
        uniqueDeps.add(config.subnet.id);
      }
      if (config.publicIPAddress?.id) {
        uniqueDeps.add(config.publicIPAddress.id);
      }
    }

    // Add WAF policy dependency
    if (this.firewallPolicy?.id) {
      uniqueDeps.add(this.firewallPolicy.id);
    }

    // Convert set to array
    dependsOn.push(...Array.from(uniqueDeps));

    // Only include dependsOn if there are dependencies
    if (dependsOn.length > 0) {
      template.dependsOn = dependsOn;
    }

    return template;
  }
}
