/**
 * Schema modules for Atakora.
 *
 * @remarks
 * Contains two main schema categories:
 * - **microsoft**: Azure resource type definitions and enums (Microsoft.* namespaces)
 * - **atakora**: Atakora data schema DSL for defining data models
 *
 * @packageDocumentation
 */

// ============================================================================
// MICROSOFT AZURE RESOURCE SCHEMAS
// Azure resource type definitions organized by namespace
// ============================================================================

// Export documentdb schema
export * as documentdb from './microsoft/documentdb';

// Export servicebus schema
export * as servicebus from './microsoft/servicebus';

// Export sql schema
export * as sql from './microsoft/sql';

// Export operationalinsights schema
export * as operationalinsights from './microsoft/operationalinsights';

// Export cognitiveservices schema
export * as cognitiveservices from './microsoft/cognitiveservices';

// Export search schema
export * as search from './microsoft/search';

// Export network schema
export * as network from './microsoft/network';

// Export web schema
export * as web from './microsoft/web';

// Export insights schema
export * as insights from './microsoft/insights';

// Export keyvault schema
export * as keyvault from './microsoft/keyvault';

// Export apimanagement schema
export * as apimanagement from './microsoft/apimanagement';

// Export storage schema
export * as storage from './microsoft/storage';

// Export cache schema
export * as cache from './microsoft/cache';

// Export cdn schema
export * as cdn from './microsoft/cdn';

// Export signalr schema
export * as signalr from './microsoft/signalr';

// Export authorization schema
export * as authorization from './microsoft/authorization';

// Export consumption schema
export * as consumption from './microsoft/consumption';

// Export resources schema
export * as resources from './microsoft/resources';

// Export eventhub schema
export * as eventhub from './microsoft/eventhub';

// Export managedidentity schema
export * as managedidentity from './microsoft/managedidentity';

// Export aad schema
export * as aad from './microsoft/aad';

// Export azureactivedirectory schema
export * as azureactivedirectory from './microsoft/azureactivedirectory';

// Export purview schema
export * as purview from './microsoft/purview';

// Export dbforpostgresql schema
export * as dbforpostgresql from './microsoft/dbforpostgresql';

// Export dbformysql schema
export * as dbformysql from './microsoft/dbformysql';

// Export dbformariadb schema
export * as dbformariadb from './microsoft/dbformariadb';

// ============================================================================
// ATAKORA DATA SCHEMA DSL
// Data model definition system
// ============================================================================

// Export atakora data schema
export * as atakora from './atakora';
