/**
 * Service Bus Subscription Rule constructs.
 *
 * @remarks
 * Rules define message filters and actions for subscriptions.
 *
 * @packageDocumentation
 */

import { Resource, Construct, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import { constructIdToPurpose } from '@atakora/lib';
import {
  FilterType,
} from './service-bus-topic-types';
import type {
  ArmServiceBusRuleProps,
  ServiceBusRuleProps,
  IServiceBusRule,
  SqlFilter,
  CorrelationFilter,
} from './service-bus-topic-types';

/**
 * L1 construct for Service Bus Subscription Rule.
 *
 * @remarks
 * Direct mapping to Microsoft.ServiceBus/namespaces/topics/subscriptions/rules ARM resource.
 *
 * **ARM Resource Type**: `Microsoft.ServiceBus/namespaces/topics/subscriptions/rules`
 * **API Version**: `2021-11-01`
 */
export class ArmServiceBusRule extends Resource implements IServiceBusRule {
  public readonly resourceType: string = 'Microsoft.ServiceBus/namespaces/topics/subscriptions/rules';
  public readonly apiVersion: string = '2021-11-01';
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  public readonly subscription: any;
  public readonly ruleName: string;
  public readonly name: string;
  public readonly filterType: FilterType;
  public readonly sqlFilter?: any;
  public readonly correlationFilter?: any;
  public readonly action?: any;

  public readonly resourceId: string;
  public readonly ruleId: string;

  constructor(scope: Construct, id: string, props: ArmServiceBusRuleProps) {
    super(scope, id);

    this.validateProps(props);

    this.subscription = props.subscription;
    this.ruleName = props.ruleName;
    this.name = props.ruleName;
    this.filterType = props.filterType;
    this.sqlFilter = props.sqlFilter;
    this.correlationFilter = props.correlationFilter;
    this.action = props.action;

    this.resourceId = `${this.subscription.subscriptionId}/rules/${this.ruleName}`;
    this.ruleId = this.resourceId;
  }

  protected validateProps(props: ArmServiceBusRuleProps): void {
    if (!props.ruleName || props.ruleName.trim() === '') {
      throw new Error('Rule name cannot be empty');
    }
    if (!props.subscription) {
      throw new Error('Subscription reference is required');
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: any = {
      filterType: this.filterType,
    };

    if (this.sqlFilter) {
      properties.sqlFilter = {
        sqlExpression: this.sqlFilter.sqlExpression,
        compatibilityLevel: this.sqlFilter.compatibilityLevel,
        requiresPreprocessing: this.sqlFilter.requiresPreprocessing,
      };
    }

    if (this.correlationFilter) {
      properties.correlationFilter = { ...this.correlationFilter };
    }

    if (this.action) {
      properties.action = {
        sqlExpression: this.action.sqlExpression,
        compatibilityLevel: this.action.compatibilityLevel,
        requiresPreprocessing: this.action.requiresPreprocessing,
      };
    }

    const topic = this.subscription.topic;
    const namespace = topic.namespace;

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: `${namespace.namespaceName}/${topic.topicName}/${this.subscription.subscriptionName}/${this.ruleName}`,
      properties,
      dependsOn: [this.subscription.subscriptionId],
    } as ArmResource;
  }
}

/**
 * L2 construct for Service Bus Subscription Rule.
 *
 * @remarks
 * Intent-based API for creating subscription rules with filters and actions.
 *
 * @example
 * **SQL filter rule:**
 * ```typescript
 * const rule = new ServiceBusRule(subscription, 'HighPriorityRule', {
 *   subscription: subscription,
 *   filter: {
 *     sqlExpression: "Priority = 'High' AND Amount > 1000"
 *   }
 * });
 * ```
 *
 * @example
 * **Correlation filter rule:**
 * ```typescript
 * const rule = new ServiceBusRule(subscription, 'OrderRule', {
 *   subscription: subscription,
 *   filter: {
 *     correlationId: 'order-123',
 *     label: 'OrderCreated',
 *     properties: {
 *       'CustomerId': 'cust-456'
 *     }
 *   }
 * });
 * ```
 *
 * @example
 * **With rule action:**
 * ```typescript
 * const rule = new ServiceBusRule(subscription, 'EnrichRule', {
 *   subscription: subscription,
 *   filter: {
 *     sqlExpression: "Amount > 10000"
 *   },
 *   action: {
 *     sqlExpression: "SET Priority = 'VeryHigh'"
 *   }
 * });
 * ```
 */
export class ServiceBusRule extends Construct implements IServiceBusRule {
  private readonly armRule: ArmServiceBusRule;

  public readonly ruleName: string;
  public readonly ruleId: string;
  public readonly subscription: any;

  constructor(scope: Construct, id: string, props: ServiceBusRuleProps) {
    super(scope, id);

    this.subscription = props.subscription;
    this.ruleName = props.ruleName ?? this.generateRuleName(id);

    const isSqlFilter = 'sqlExpression' in props.filter;
    const filterType = isSqlFilter ? FilterType.SQL_FILTER : FilterType.CORRELATION_FILTER;

    this.armRule = new ArmServiceBusRule(scope, `${id}-Resource`, {
      subscription: props.subscription,
      ruleName: this.ruleName,
      filterType,
      sqlFilter: isSqlFilter ? (props.filter as SqlFilter) : undefined,
      correlationFilter: !isSqlFilter ? (props.filter as CorrelationFilter) : undefined,
      action: props.action,
    });

    this.ruleId = this.armRule.ruleId;
  }

  private generateRuleName(id: string): string {
    const purpose = constructIdToPurpose(id, 'rule', ['rule']);
    return `${purpose}`.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  }
}
