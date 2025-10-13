/**
 * Azure Service Bus (Microsoft.ServiceBus) schema module.
 *
 * @remarks
 * Centralized type definitions and enums for Azure Service Bus resources.
 *
 * @packageDocumentation
 */

// Export all enums
export { ServiceBusSku, EntityStatus, FilterType } from './enums';

// Export all types
export type {
  NamespaceSku,
  ServiceBusIdentity,
  KeyVaultProperties,
  Encryption,
  PrivateEndpointConnection,
  NamespaceProperties,
  QueueProperties,
  TopicProperties,
  SubscriptionProperties,
  SqlFilter,
  CorrelationFilter,
  SqlRuleAction,
  RuleProperties,
  AccessRights,
  AuthorizationRuleProperties,
  AccessKeys,
  NWRuleSetIpRules,
  NWRuleSetVirtualNetworkRules,
  NetworkRuleSetProperties,
  AliasProperties,
  MigrationConfigProperties,
} from './types';
