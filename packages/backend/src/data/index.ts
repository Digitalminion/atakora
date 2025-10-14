/**
 * Data Capability Stacks
 *
 * @remarks
 * This module exports capability-focused stacks for data services.
 * Each stack is self-contained and includes all resources needed for that capability:
 * - Service resource (Storage, KeyVault, CosmosDB, Search, OpenAI)
 * - Private Endpoint for secure connectivity
 * - Private DNS Zone for DNS resolution
 *
 * ## Architecture Pattern
 *
 * Each capability stack follows the Single Responsibility Principle:
 * - Creates one primary service with all its dependencies
 * - Independently deployable and testable
 * - Reusable across different projects
 * - Clear, explicit dependencies
 *
 * ## Usage Example
 *
 * ```typescript
 * import { CosmosDbStack, StorageStack } from './data';
 *
 * // Create a Cosmos DB capability
 * const cosmosDb = new CosmosDbStack(scope, 'CosmosDb', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet,
 *   createPrivateDnsZone: true,
 *   enableServerless: true
 * });
 *
 * // Create a Storage capability
 * const storage = new StorageStack(scope, 'Storage', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet,
 *   privateEndpointGroupId: 'blob'
 * });
 * ```
 *
 * ## Migration from Monolithic DataStack
 *
 * The old DataStack created all data services in one construct.
 * The new capability stacks provide:
 * - Better modularity and testability
 * - Independent deployment of services
 * - Clearer dependencies
 * - Easier to understand and maintain
 */

// CosmosDB capability stack
export { CosmosDbStack } from './cosmosdb/stack';
export type { CosmosDbStackProps } from './cosmosdb/stack';

// Azure AI Search capability stack
export { SearchStack } from './search/stack';
export type { SearchStackProps } from './search/stack';

// Storage Account capability stack
export { StorageStack } from './storage/stack';
export type { StorageStackProps, StoragePrivateEndpointGroupId } from './storage/stack';

// Key Vault capability stack
export { KeyVaultStack } from './keyvault/stack';
export type { KeyVaultStackProps } from './keyvault/stack';

// Azure OpenAI capability stack
export { OpenAIStack } from './openai/stack';
export type { OpenAIStackProps } from './openai/stack';

// Helper function to create all data services
export { createDataServices as dataServices, type DataServices } from './resource';

// CRUD Resources (DEPRECATED - Use @atakora/component defineBackend instead)
// The old FeedbackCrud and LabDatasetCrud have been replaced by the backend pattern
// which provides resource sharing, better performance, and 50% cost reduction.
// See packages/backend/src/crud-backend.ts for the new implementation.
// export { FeedbackCrud, LabDatasetCrud } from './crud';
