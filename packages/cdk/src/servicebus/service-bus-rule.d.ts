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
import { FilterType } from './service-bus-topic-types';
import type { ArmServiceBusRuleProps, ServiceBusRuleProps, IServiceBusRule } from './service-bus-topic-types';
/**
 * L1 construct for Service Bus Subscription Rule.
 *
 * @remarks
 * Direct mapping to Microsoft.ServiceBus/namespaces/topics/subscriptions/rules ARM resource.
 *
 * **ARM Resource Type**: `Microsoft.ServiceBus/namespaces/topics/subscriptions/rules`
 * **API Version**: `2021-11-01`
 */
export declare class ArmServiceBusRule extends Resource implements IServiceBusRule {
    readonly resourceType: string;
    readonly apiVersion: string;
    readonly scope: DeploymentScope.ResourceGroup;
    readonly subscription: any;
    readonly ruleName: string;
    readonly name: string;
    readonly filterType: FilterType;
    readonly sqlFilter?: any;
    readonly correlationFilter?: any;
    readonly action?: any;
    readonly resourceId: string;
    readonly ruleId: string;
    constructor(scope: Construct, id: string, props: ArmServiceBusRuleProps);
    protected validateProps(props: ArmServiceBusRuleProps): void;
    toArmTemplate(): ArmResource;
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
export declare class ServiceBusRule extends Construct implements IServiceBusRule {
    private readonly armRule;
    readonly ruleName: string;
    readonly ruleId: string;
    readonly subscription: any;
    constructor(scope: Construct, id: string, props: ServiceBusRuleProps);
    private generateRuleName;
}
//# sourceMappingURL=service-bus-rule.d.ts.map