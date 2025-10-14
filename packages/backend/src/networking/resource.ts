import { Construct, type SubscriptionStack, type IResourceGroup } from '@atakora/cdk';
import {
  NetworkingStack,
  type SubnetConfig,
  SecurityRuleProtocol,
  SecurityRuleAccess,
  SecurityRuleDirection,
} from './stack';

/**
 * Gets the SubscriptionStack from the construct tree.
 *
 * @param scope - Any construct in the tree
 * @returns The subscription stack
 */
function getSubscriptionStack(scope: Construct): SubscriptionStack {
  let current: Construct | undefined = scope;

  while (current) {
    // Check if current is a SubscriptionStack using duck typing
    const candidate = current as unknown as { generateResourceName?: unknown; subscriptionId?: unknown; environment?: unknown };
    if (
      current &&
      typeof candidate.generateResourceName === 'function' &&
      typeof candidate.subscriptionId === 'string' &&
      typeof candidate.environment === 'object'
    ) {
      return current as SubscriptionStack;
    }
    current = current.node.scope;
  }

  throw new Error(
    'Could not find SubscriptionStack in construct tree. Ensure this resource is created within a SubscriptionStack or ResourceGroupStack.'
  );
}

/**
 * Creates the Virtual Network for ColorAI
 *
 * @remarks
 * This function instantiates the NetworkingStack with ColorAI-specific configuration:
 * - Nonprod: 10.4.0.0/16 address space
 * - Prod: 10.5.0.0/16 address space
 * - Subnets: PrivateEndpoint (10.x.10.0/24)
 * - NSGs configured per subnet with restrictive rules
 *
 * The resource group is created by the SubscriptionStack and passed in.
 * This stack can be created within any scope (SubscriptionStack or ResourceGroupStack).
 *
 * @param scope - Parent scope (SubscriptionStack or ResourceGroupStack)
 * @param platformRG - Platform resource group (created by SubscriptionStack)
 * @returns Configured NetworkingStack instance
 */
export function createVirtualNetwork(scope: Construct, platformRG: IResourceGroup): NetworkingStack {
  // Get environment from the SubscriptionStack in the construct tree
  const subscriptionStack = getSubscriptionStack(scope);
  const environment = subscriptionStack.environment;

  // Determine environment-specific configuration
  const isProd = environment.value === 'prod';
  const addressSpace = isProd ? '10.5.0.0/16' : '10.4.0.0/16';
  const secondOctet = isProd ? '5' : '4';

  // Define subnets with NSGs
  const subnets: SubnetConfig[] = [
    {
      name: 'PrivateEndpointSubnet',
      addressPrefix: `10.${secondOctet}.10.0/24`,
      networkSecurityGroup: {
        name: 'PrivateEndpointSubnet-nsg',
        securityRules: [
          {
            name: 'AllowVnetInbound',
            priority: 100,
            direction: SecurityRuleDirection.INBOUND,
            access: SecurityRuleAccess.ALLOW,
            protocol: SecurityRuleProtocol.ANY,
            sourcePortRange: '*',
            destinationPortRange: '*',
            sourceAddressPrefix: 'VirtualNetwork',
            destinationAddressPrefix: '*',
          },
          {
            name: 'DenyAllInbound',
            priority: 4096,
            direction: SecurityRuleDirection.INBOUND,
            access: SecurityRuleAccess.DENY,
            protocol: SecurityRuleProtocol.ANY,
            sourcePortRange: '*',
            destinationPortRange: '*',
            sourceAddressPrefix: '*',
            destinationAddressPrefix: '*',
          },
        ],
      },
    },
  ];

  // Create the Networking Stack
  const networkingStack = new NetworkingStack(scope, 'VNet', {
    resourceGroup: platformRG,
    addressSpace: addressSpace,
    subnets: subnets,
    tags: {
      purpose: 'colorai-networking',
      'data-classification': 'confidential',
    },
  });

  return networkingStack;
}

/**
 * Export for use in backend.ts
 *
 * @remarks
 * This will be imported in backend.ts like:
 * ```typescript
 * import { vnet } from './networking/resource';
 * const network = vnet(foundation, platformRG);
 * ```
 */
export { createVirtualNetwork as vnet };
