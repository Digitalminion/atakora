import { Validator, ValidationContext, ValidationResult, ValidationSeverity } from '../types';

// Types for NSG validation
interface SecurityRuleProperties {
  protocol?: string;
  sourcePortRange?: string;
  destinationPortRange?: string;
  sourceAddressPrefix?: string;
  destinationAddressPrefix?: string;
  access?: string;
  priority?: number;
  direction?: string;
  sourcePortRanges?: string[];
  destinationPortRanges?: string[];
  sourceAddressPrefixes?: string[];
  destinationAddressPrefixes?: string[];
}

interface SecurityRule {
  name: string;
  properties?: SecurityRuleProperties;
}

interface NetworkSecurityGroupProperties {
  securityRules?: SecurityRule[];
}

interface NetworkSecurityGroup {
  type: string;
  name?: string;
  properties?: NetworkSecurityGroupProperties;
}

/**
 * Valid Azure service tags for NSG rules
 * Source: https://learn.microsoft.com/en-us/azure/virtual-network/service-tags-overview
 */
const VALID_SERVICE_TAGS = new Set([
  'ActionGroup',
  'ApiManagement',
  'AppConfiguration',
  'AppService',
  'AppServiceManagement',
  'AzureActiveDirectory',
  'AzureActiveDirectoryDomainServices',
  'AzureArcInfrastructure',
  'AzureAttestation',
  'AzureBackup',
  'AzureBotService',
  'AzureCloud',
  'AzureCognitiveSearch',
  'AzureConnectors',
  'AzureContainerRegistry',
  'AzureCosmosDB',
  'AzureDatabricks',
  'AzureDataExplorerManagement',
  'AzureDataLake',
  'AzureDevOps',
  'AzureDevSpaces',
  'AzureDigitalTwins',
  'AzureEventGrid',
  'AzureFrontDoor.Backend',
  'AzureFrontDoor.Frontend',
  'AzureHealthcareAPIs',
  'AzureInformationProtection',
  'AzureIoTHub',
  'AzureKeyVault',
  'AzureLoadBalancer',
  'AzureMachineLearning',
  'AzureMonitor',
  'AzureOpenDatasets',
  'AzurePlatformDNS',
  'AzurePlatformIMDS',
  'AzurePlatformLKM',
  'AzureResourceManager',
  'AzureSecurityCenter',
  'AzureSignalR',
  'AzureSiteRecovery',
  'AzureSphere',
  'AzureStorage',
  'AzureTrafficManager',
  'AzureUpdateDelivery',
  'BatchNodeManagement',
  'ChaosStudio',
  'CognitiveServicesManagement',
  'DataFactory',
  'Dynamics365ForMarketingEmail',
  'EventHub',
  'GatewayManager',
  'GuestAndHybridManagement',
  'HDInsight',
  'Internet',
  'LogicApps',
  'M365ManagementActivityApi',
  'MicrosoftCloudAppSecurity',
  'MicrosoftContainerRegistry',
  'PowerBI',
  'PowerPlatformInfra',
  'PowerPlatformPlex',
  'PowerQueryOnline',
  'ServiceBus',
  'ServiceFabric',
  'Sql',
  'SqlManagement',
  'Storage',
  'StorageSyncService',
  'VirtualNetwork',
  'WindowsVirtualDesktop',
]);

/**
 * Validates Network Security Group rules
 */
export class NsgValidator implements Validator {
  name = 'NsgValidator';

  validate(context: ValidationContext): ValidationResult[] {
    const results: ValidationResult[] = [];
    const resources = Array.isArray(context.template.resources) ? context.template.resources : [];

    for (const resource of resources) {
      // Type guard to check if resource matches our expected structure
      if (
        typeof resource === 'object' &&
        resource !== null &&
        'type' in resource &&
        resource.type === 'Microsoft.Network/networkSecurityGroups'
      ) {
        this.validateNsg(resource as NetworkSecurityGroup, results);
      }
    }

    return results;
  }

  private validateNsg(nsg: NetworkSecurityGroup, results: ValidationResult[]): void {
    const rules = nsg.properties?.securityRules || [];

    for (const rule of rules) {
      const props = rule.properties || {};

      // Validate port ranges
      this.validatePortRange(rule, props, results);

      // Validate service tags
      this.validateServiceTags(rule, props, results);

      // Validate protocol
      this.validateProtocol(rule, props, results);

      // Validate priority
      this.validatePriority(rule, props, results);
    }
  }

  private validatePortRange(
    rule: SecurityRule,
    props: SecurityRuleProperties,
    results: ValidationResult[]
  ): void {
    const portRange = props.destinationPortRange;
    const portRanges = props.destinationPortRanges;

    // Check for invalid comma-separated ports
    if (portRange && typeof portRange === 'string' && portRange.includes(',')) {
      results.push({
        severity: ValidationSeverity.ERROR,
        code: 'SecurityRuleInvalidPortRange',
        message: `Security rule '${rule.name}' has invalid port range: '${portRange}'. Use destinationPortRanges array for multiple ports.`,
        target: `${rule.name}`,
        suggestion: `Change to destinationPortRanges: ['${portRange.split(',').join("', '")}']`,
      });
    }

    // Validate port range format
    if (portRange && portRange !== '*') {
      const rangeMatch = portRange.match(/^(\d+)-(\d+)$/);
      const singlePort = portRange.match(/^(\d+)$/);

      if (!rangeMatch && !singlePort) {
        results.push({
          severity: ValidationSeverity.ERROR,
          code: 'SecurityRuleInvalidPortRange',
          message: `Security rule '${rule.name}' has invalid port range format: '${portRange}'`,
          target: `${rule.name}`,
          suggestion: 'Use single port (443), range (1-65535), or * for all',
        });
      }

      // Validate port numbers are in valid range
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (start < 0 || start > 65535 || end < 0 || end > 65535) {
          results.push({
            severity: ValidationSeverity.ERROR,
            code: 'SecurityRuleInvalidPortRange',
            message: `Security rule '${rule.name}' has port range outside valid range (0-65535): ${portRange}`,
            target: `${rule.name}`,
          });
        }
      }
    }

    // Validate port ranges array
    if (portRanges && Array.isArray(portRanges)) {
      for (const port of portRanges) {
        if (port !== '*' && !port.match(/^\d+$/) && !port.match(/^\d+-\d+$/)) {
          results.push({
            severity: ValidationSeverity.ERROR,
            code: 'SecurityRuleInvalidPortRange',
            message: `Security rule '${rule.name}' has invalid port in destinationPortRanges: '${port}'`,
            target: `${rule.name}`,
          });
        }
      }
    }
  }

  private validateServiceTags(
    rule: SecurityRule,
    props: SecurityRuleProperties,
    results: ValidationResult[]
  ): void {
    const sourcePrefix = props.sourceAddressPrefix;
    const destPrefix = props.destinationAddressPrefix;

    // Validate source address prefix
    if (sourcePrefix && !this.isValidAddressPrefix(sourcePrefix)) {
      results.push({
        severity: ValidationSeverity.ERROR,
        code: 'SecurityRuleInvalidAddressPrefix',
        message: `Security rule '${rule.name}' has invalid source address prefix: '${sourcePrefix}'`,
        target: `${rule.name}`,
        suggestion: this.suggestValidServiceTag(sourcePrefix),
      });
    }

    // Validate destination address prefix
    if (destPrefix && !this.isValidAddressPrefix(destPrefix)) {
      results.push({
        severity: ValidationSeverity.ERROR,
        code: 'SecurityRuleInvalidAddressPrefix',
        message: `Security rule '${rule.name}' has invalid destination address prefix: '${destPrefix}'`,
        target: `${rule.name}`,
        suggestion: this.suggestValidServiceTag(destPrefix),
      });
    }
  }

  private isValidAddressPrefix(prefix: string): boolean {
    // Allow wildcard
    if (prefix === '*') return true;

    // Allow CIDR notation
    if (prefix.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/)) return true;

    // Allow IP address
    if (prefix.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) return true;

    // Check if it's a valid service tag
    return VALID_SERVICE_TAGS.has(prefix);
  }

  private suggestValidServiceTag(invalidTag: string): string {
    // Common mistakes
    const suggestions: Record<string, string> = {
      AzureBastion: 'VirtualNetwork (Bastion traffic comes from VNet)',
      Bastion: 'VirtualNetwork',
      AzureBastionSubnet: 'VirtualNetwork',
    };

    if (suggestions[invalidTag]) {
      return `Did you mean '${suggestions[invalidTag]}'?`;
    }

    return 'Use a valid service tag, CIDR notation, or IP address';
  }

  private validateProtocol(
    rule: SecurityRule,
    props: SecurityRuleProperties,
    results: ValidationResult[]
  ): void {
    const protocol = props.protocol;
    const validProtocols = ['Tcp', 'Udp', 'Icmp', 'Esp', 'Ah', '*'];

    if (protocol && !validProtocols.includes(protocol)) {
      results.push({
        severity: ValidationSeverity.ERROR,
        code: 'SecurityRuleInvalidProtocol',
        message: `Security rule '${rule.name}' has invalid protocol: '${protocol}'`,
        target: `${rule.name}`,
        suggestion: `Valid protocols: ${validProtocols.join(', ')}`,
      });
    }
  }

  private validatePriority(
    rule: SecurityRule,
    props: SecurityRuleProperties,
    results: ValidationResult[]
  ): void {
    const priority = props.priority;

    if (priority !== undefined && (priority < 100 || priority > 4096)) {
      results.push({
        severity: ValidationSeverity.ERROR,
        code: 'SecurityRuleInvalidPriority',
        message: `Security rule '${rule.name}' has invalid priority: ${priority}`,
        target: `${rule.name}`,
        suggestion: 'Priority must be between 100 and 4096',
      });
    }
  }
}
