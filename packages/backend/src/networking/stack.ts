import { Construct, type IResourceGroup } from '@atakora/cdk';
import {
  VirtualNetworks,
  NetworkSecurityGroups,
  SecurityRuleProtocol,
  SecurityRuleAccess,
  SecurityRuleDirection,
  type SecurityRule,
  type InlineSubnetProps,
  type ISubnet,
} from '@atakora/cdk/network';

export interface NetworkingStackProps {
  resourceGroup: IResourceGroup;
  vnetName?: string;
  addressSpace: string;
  subnets: SubnetConfig[];
  tags?: Record<string, string>;
}

export interface SubnetConfig {
  name: string;
  addressPrefix: string;
  delegations?: Array<{
    name: string;
    serviceName: string;
  }>;
  networkSecurityGroup?: {
    name: string;
    securityRules?: SecurityRule[];
  };
}

/**
 * Interface representing a subnet for external reference.
 * Since we're using inline subnets, this provides compatibility with code
 * that expects to reference subnets. Implements ISubnet for full compatibility.
 */
export interface SubnetReference extends ISubnet {
  readonly virtualNetworkName: string;
}

export class NetworkingStack {
  public readonly vnet: VirtualNetworks;
  public readonly subnets: Map<string, SubnetReference> = new Map();
  public readonly nsgs: Map<string, NetworkSecurityGroups> = new Map();
  public readonly vnetName: string;

  constructor(scope: Construct, id: string, props: NetworkingStackProps) {
    const { vnetName, addressSpace, subnets, tags } = props;

    /**
     * DEPLOYMENT ORDER STRATEGY: Inline Subnets to Prevent Concurrent Modification
     *
     * This implementation uses inline subnet definitions within the VNet resource
     * instead of separate Microsoft.Network/virtualNetworks/subnets resources.
     *
     * WHY THIS APPROACH:
     * Azure throws "AnotherOperationInProgress" errors when multiple operations
     * attempt to modify a VNet concurrently. Creating subnets as separate resources
     * causes Azure to:
     * 1. Create the VNet with no subnets
     * 2. Update the VNet to add subnet 1 (concurrent operation)
     * 3. Update the VNet to add subnet 2 (concurrent operation)
     * 4. Update the VNet to add subnet 3 (concurrent operation)
     * ...resulting in conflicts.
     *
     * INLINE SUBNET BENEFITS:
     * 1. NSGs are created first as independent resources
     * 2. VNet is created once with ALL subnets defined inline
     * 3. Azure processes the VNet creation atomically (single operation)
     * 4. No concurrent modifications to the VNet = no conflicts
     * 5. Deployment is faster (one operation instead of N+1)
     *
     * DEPLOYMENT ORDER:
     * Step 1: Create all NSGs as separate resources
     * Step 2: Create VNet with subnets inline, referencing NSGs via dependsOn
     * Step 3: VNet waits for NSGs to exist before deploying
     */

    // STEP 1: Create NSGs first (they must exist before VNet references them)
    const inlineSubnets: InlineSubnetProps[] = [];

    subnets.forEach((subnetConfig) => {
      let nsgResourceIdExpression: string | undefined;

      // Create NSG as a separate resource if specified
      // These will be created before the VNet due to ARM's dependency resolution
      if (subnetConfig.networkSecurityGroup) {
        const nsg = new NetworkSecurityGroups(scope, `${id}-${subnetConfig.name}-nsg`, {
          networkSecurityGroupName: subnetConfig.networkSecurityGroup.name,
          securityRules: subnetConfig.networkSecurityGroup.securityRules,
          tags: tags,
        });
        this.nsgs.set(subnetConfig.name, nsg);

        // Generate ARM resourceId() expression for inline subnet NSG reference
        // CRITICAL: ARM does NOT evaluate literal strings with brackets in properties.subnets
        // Must use resourceId() function which gets evaluated at deployment time
        nsgResourceIdExpression = `[resourceId('Microsoft.Network/networkSecurityGroups', '${subnetConfig.networkSecurityGroup.name}')]`;
      }

      // Build inline subnet definition for the VNet
      // These will be embedded in the VNet's properties.subnets array
      const inlineSubnet: InlineSubnetProps = {
        name: subnetConfig.name,
        addressPrefix: subnetConfig.addressPrefix,
        delegations: subnetConfig.delegations,
        networkSecurityGroup: nsgResourceIdExpression ? { id: nsgResourceIdExpression } : undefined,
      };

      inlineSubnets.push(inlineSubnet);
    });

    // STEP 2: Create Virtual Network with inline subnets
    // The VNet will automatically depend on all NSGs referenced in the subnets
    this.vnet = new VirtualNetworks(scope, id, {
      virtualNetworkName: vnetName,
      addressSpace: addressSpace,
      tags: tags,
    });

    this.vnetName = this.vnet.virtualNetworkName;

    // STEP 3: Add inline subnets to the underlying ARM resource
    // This is a direct manipulation until VirtualNetwork.addSubnet() is implemented
    // The ARM template will include these subnets in properties.subnets[]
    const armVnet = (this.vnet as any).armVirtualNetwork;
    if (armVnet) {
      (armVnet as any).subnets = inlineSubnets;
    }

    // Create subnet references for compatibility
    inlineSubnets.forEach((inlineSubnet) => {
      const subnetRef: SubnetReference = {
        subnetName: inlineSubnet.name,
        addressPrefix: inlineSubnet.addressPrefix,
        subnetId: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/${this.vnetName}/subnets/${inlineSubnet.name}`,
        virtualNetworkName: this.vnetName,
      };
      this.subnets.set(inlineSubnet.name, subnetRef);
    });
  }

  public getSubnet(name: string): SubnetReference | undefined {
    return this.subnets.get(name);
  }

  public getNsg(subnetName: string): NetworkSecurityGroups | undefined {
    return this.nsgs.get(subnetName);
  }

  public getDeployedConfig() {
    return {
      virtualNetwork: {
        name: this.vnetName,
        addressSpace: this.vnet.addressSpace,
      },
      subnets: Array.from(this.subnets.entries()).map(([name, subnet]) => ({
        name,
        id: subnet.subnetId,
        addressPrefix: subnet.addressPrefix,
      })),
      networkSecurityGroups: Array.from(this.nsgs.entries()).map(([name, nsg]) => ({
        subnetName: name,
        id: nsg.networkSecurityGroupId,
        name: nsg.networkSecurityGroupName,
      })),
    };
  }
}

// Re-export types for convenience
export { SecurityRuleProtocol, SecurityRuleAccess, SecurityRuleDirection, type SecurityRule };
