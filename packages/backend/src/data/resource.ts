import {
  Construct,
  type IResourceGroup,
  type SubscriptionStack,
} from '@atakora/cdk';
import { type ISubnet } from '@atakora/cdk/network';
import {
  StorageStack,
  KeyVaultStack,
  CosmosDbStack,
  SearchStack,
  OpenAIStack,
} from './index';

/**
 * Return type for data services containing all capability stacks
 */
export interface DataServices {
  storage: StorageStack;
  keyVault: KeyVaultStack;
  cosmosDb: CosmosDbStack;
  search: SearchStack;
  openai: OpenAIStack;
}

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
 * Creates the Data Services for ColorAI using capability-focused stacks
 *
 * @remarks
 * This function creates individual capability stacks for each data service:
 * - Storage Account (blob storage with private endpoint)
 * - Key Vault (secrets management with private endpoint)
 * - Cosmos DB (NoSQL database with private endpoint)
 * - Azure AI Search (vector search with private endpoint)
 * - Azure OpenAI (GPT models with private endpoint)
 *
 * Each service is created as an independent, self-contained stack that includes:
 * - The primary service resource
 * - Private endpoint for secure connectivity
 * - Private DNS Zone for DNS resolution
 *
 * All services are configured with:
 * - Public network access disabled
 * - Private endpoints for secure connectivity
 * - DNS integration via private DNS zones
 * - Environment-specific tags and configuration
 *
 * The resource group is created by the SubscriptionStack and passed in.
 * Each stack can be deployed and tested independently.
 *
 * @param scope - Parent scope (SubscriptionStack or ResourceGroupStack)
 * @param platformRG - Platform resource group (created by SubscriptionStack)
 * @param privateEndpointSubnet - Subnet for private endpoints
 * @param logAnalyticsWorkspaceId - Log Analytics Workspace ID for diagnostic settings
 * @param tenantId - Azure Tenant ID (optional - will use default tenant if not specified)
 * @returns Object containing all data service capability stacks
 *
 * @example
 * ```typescript
 * const data = createDataServices(
 *   foundation,
 *   platformRG,
 *   privateEndpointSubnet,
 *   logAnalyticsWorkspaceId,
 *   tenantId
 * );
 *
 * // Access individual services
 * const storageAccountName = data.storage.storageAccount.storageAccountName;
 * const keyVaultUri = data.keyVault.keyVault.vaultUri;
 * const cosmosEndpoint = data.cosmosDb.databaseAccount.endpoint;
 * ```
 */
export function createDataServices(
  scope: Construct,
  platformRG: IResourceGroup,
  privateEndpointSubnet: ISubnet,
  logAnalyticsWorkspaceId: string,
  tenantId?: string
): DataServices {
  // Get environment from the SubscriptionStack in the construct tree
  const subscriptionStack = getSubscriptionStack(scope);
  const environment = subscriptionStack.environment;

  // Common tags for all data services
  const commonTags = {
    purpose: 'data-services',
    'data-classification': 'confidential',
    environment: environment.value,
  };

  // Create Storage Account capability stack
  // Creates privatelink.blob.core.windows.net DNS zone
  const storage = new StorageStack(scope, 'Storage', {
    resourceGroup: platformRG,
    privateEndpointSubnet,
    createPrivateDnsZone: true,
    privateEndpointGroupId: 'blob',
    tags: commonTags,
  });

  // Create Key Vault capability stack
  // Creates privatelink.vaultcore.azure.net DNS zone
  const keyVault = new KeyVaultStack(scope, 'KeyVault', {
    resourceGroup: platformRG,
    privateEndpointSubnet,
    createPrivateDnsZone: true,
    enableSoftDelete: true,
    softDeleteRetentionInDays: 90,
    enablePurgeProtection: false,
    enableRbacAuthorization: true,
    tenantId,
    logAnalyticsWorkspaceId,
    tags: commonTags,
  });

  // Create Cosmos DB capability stack
  // Creates privatelink.documents.azure.com DNS zone
  const cosmosDb = new CosmosDbStack(scope, 'CosmosDb', {
    resourceGroup: platformRG,
    privateEndpointSubnet,
    createPrivateDnsZone: true,
    enableServerless: true,
    logAnalyticsWorkspaceId,
    tags: commonTags,
  });

  // Create Azure AI Search capability stack
  // Creates privatelink.search.windows.net DNS zone
  const search = new SearchStack(scope, 'Search', {
    resourceGroup: platformRG,
    privateEndpointSubnet,
    createPrivateDnsZone: true,
    logAnalyticsWorkspaceId,
    tags: commonTags,
  });

  // Create Azure OpenAI capability stack
  // Creates privatelink.openai.azure.com DNS zone
  const openai = new OpenAIStack(scope, 'OpenAI', {
    resourceGroup: platformRG,
    privateEndpointSubnet,
    createPrivateDnsZone: true,
    logAnalyticsWorkspaceId,
    tags: commonTags,
  });

  return {
    storage,
    keyVault,
    cosmosDb,
    search,
    openai,
  };
}

/**
 * Export for use in index.ts
 *
 * @remarks
 * This will be imported in index.ts like:
 * ```typescript
 * import { dataServices } from './data/resource';
 * const data = dataServices(
 *   foundation,
 *   platformRG,
 *   privateEndpointSubnet,
 *   logAnalyticsWorkspace.id
 * );
 *
 * // Access individual service stacks
 * const storageAccount = data.storage.storageAccount;
 * const keyVault = data.keyVault.keyVault;
 * const cosmosDb = data.cosmosDb.databaseAccount;
 * const searchService = data.search.searchService;
 * const openaiAccount = data.openai.openAIAccount;
 * ```
 */
export { createDataServices as dataServices };
