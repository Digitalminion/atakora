/**
 * Enums for Azure Service Bus (Microsoft.ServiceBus).
 *
 * @remarks
 * Curated enums for Azure Service Bus namespace resources.
 *
 * **Resource Type**: Microsoft.ServiceBus/namespaces
 * **API Version**: 2021-11-01
 *
 * @packageDocumentation
 */

/**
 * Service Bus SKU tier.
 */
export enum ServiceBusSku {
  /**
   * Basic tier - shared messaging, up to 256KB messages.
   */
  BASIC = 'Basic',

  /**
   * Standard tier - shared messaging, topics/subscriptions, up to 256KB messages.
   */
  STANDARD = 'Standard',

  /**
   * Premium tier - dedicated resources, up to 1MB messages, geo-disaster recovery.
   */
  PREMIUM = 'Premium',
}

/**
 * Entity status for topics, queues, and subscriptions.
 */
export enum EntityStatus {
  /**
   * Entity is active and operational.
   */
  ACTIVE = 'Active',

  /**
   * Entity is disabled (cannot send or receive).
   */
  DISABLED = 'Disabled',

  /**
   * Entity cannot send messages (receive only).
   */
  SEND_DISABLED = 'SendDisabled',

  /**
   * Entity cannot receive messages (send only).
   */
  RECEIVE_DISABLED = 'ReceiveDisabled',
}

/**
 * Filter type for subscription rules.
 */
export enum FilterType {
  /**
   * SQL filter expression.
   */
  SQL_FILTER = 'SqlFilter',

  /**
   * Correlation filter based on message properties.
   */
  CORRELATION_FILTER = 'CorrelationFilter',
}
