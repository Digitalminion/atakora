/**
 * Azure Budget - L1 ARM construct.
 *
 * @packageDocumentation
 */

import { Resource, ArmResource, ResourceProps, Construct } from '@atakora/lib';
import {
  BudgetTimeGrain,
  BudgetCategory,
  BudgetFilter,
  BudgetNotification,
} from './budget-types';

/**
 * ARM-level properties for budgets.
 *
 * @internal
 */
export interface BudgetArmProps extends ResourceProps {
  readonly budgetName: string;
  readonly amount: number;
  readonly timeGrain: BudgetTimeGrain;
  readonly timePeriod: {
    readonly startDate: string;
    readonly endDate?: string;
  };
  readonly category?: BudgetCategory;
  readonly filter?: BudgetFilter;
  readonly notifications?: Record<string, BudgetNotification>;
}

/**
 * L1 ARM construct for Azure Budgets.
 *
 * @remarks
 * Creates Microsoft.CostManagement/budgets resources at subscription scope.
 *
 * **Deployment Scope**: Subscription
 *
 * **ARM Resource Type**: `Microsoft.CostManagement/budgets`
 * **API Version**: `2023-11-01`
 *
 * @internal
 */
export class BudgetArm extends Resource {
  public readonly resourceType = 'Microsoft.CostManagement/budgets';
  public readonly apiVersion = '2023-11-01'; // Latest stable API
  public readonly name: string;
  public readonly resourceId: string;

  private readonly props: BudgetArmProps;

  constructor(scope: Construct, id: string, props: BudgetArmProps) {
    super(scope, id, props);
    this.validateProps(props);
    this.props = props;

    this.name = props.budgetName;

    // Budgets are subscription-scoped
    this.resourceId = `[concat(subscription().id, '/providers/Microsoft.CostManagement/budgets/', '${this.name}')]`;
  }

  protected validateProps(props: BudgetArmProps): void {
    // Validate budget name
    if (!props.budgetName) {
      throw new Error('Budget requires a name');
    }

    if (props.budgetName.length > 63) {
      throw new Error(
        `Budget name cannot exceed 63 characters (current: ${props.budgetName.length})`
      );
    }

    // Budget name must contain only alphanumeric, underscore, hyphen, and period
    const namePattern = /^[a-zA-Z0-9_.-]+$/;
    if (!namePattern.test(props.budgetName)) {
      throw new Error(
        'Budget name must contain only alphanumeric, underscore, hyphen, and period characters'
      );
    }

    // Validate amount
    if (!props.amount || props.amount <= 0) {
      throw new Error('Budget amount must be greater than 0');
    }

    // Validate time period
    if (!props.timePeriod || !props.timePeriod.startDate) {
      throw new Error('Budget requires a time period with start date');
    }

    // Validate date format (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(props.timePeriod.startDate)) {
      throw new Error('Budget start date must be in ISO 8601 format (YYYY-MM-DD)');
    }

    if (props.timePeriod.endDate && !datePattern.test(props.timePeriod.endDate)) {
      throw new Error('Budget end date must be in ISO 8601 format (YYYY-MM-DD)');
    }

    // Validate time grain
    if (!props.timeGrain) {
      throw new Error('Budget requires a time grain');
    }

    // Validate monthly budget dates (must be first/last of month)
    if (props.timeGrain === BudgetTimeGrain.MONTHLY) {
      const startDate = new Date(props.timePeriod.startDate);
      if (startDate.getDate() !== 1) {
        throw new Error(
          'Monthly budget start date must be the first day of the month'
        );
      }

      if (props.timePeriod.endDate) {
        const endDate = new Date(props.timePeriod.endDate);
        // Check if it's the last day of the month
        const nextDay = new Date(endDate);
        nextDay.setDate(endDate.getDate() + 1);
        if (nextDay.getDate() !== 1) {
          throw new Error(
            'Monthly budget end date must be the last day of the month'
          );
        }
      }
    }

    // Validate notifications
    if (props.notifications) {
      const notificationCount = Object.keys(props.notifications).length;
      if (notificationCount > 5) {
        throw new Error(
          `Budget cannot have more than 5 notifications (current: ${notificationCount})`
        );
      }

      for (const [name, notification] of Object.entries(props.notifications)) {
        this.validateNotification(name, notification);
      }
    }
  }

  /**
   * Validates a single notification configuration.
   *
   * @param name - Notification name
   * @param notification - Notification configuration
   * @internal
   */
  private validateNotification(name: string, notification: BudgetNotification): void {
    // Validate notification name
    if (name.length === 0 || name.length > 260) {
      throw new Error(
        `Notification name must be 1-260 characters (current: ${name.length})`
      );
    }

    const namePattern = /^[a-zA-Z0-9_.-]+$/;
    if (!namePattern.test(name)) {
      throw new Error(
        `Notification name '${name}' must contain only alphanumeric, underscore, hyphen, and period characters`
      );
    }

    // Validate threshold
    if (notification.threshold < 0 || notification.threshold > 1000) {
      throw new Error(
        `Notification threshold must be between 0 and 1000 (current: ${notification.threshold})`
      );
    }

    // Validate contact emails
    if (!notification.contactEmails || notification.contactEmails.length === 0) {
      throw new Error(`Notification '${name}' requires at least one contact email`);
    }

    if (notification.contactEmails.length > 50) {
      throw new Error(
        `Notification '${name}' cannot have more than 50 contact emails (current: ${notification.contactEmails.length})`
      );
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of notification.contactEmails) {
      if (!emailPattern.test(email)) {
        throw new Error(`Invalid email address in notification '${name}': ${email}`);
      }
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: Record<string, unknown> = {
      amount: this.props.amount,
      timeGrain: this.props.timeGrain,
      timePeriod: {
        startDate: this.props.timePeriod.startDate,
      },
      category: this.props.category || BudgetCategory.COST,
    };

    // Add optional end date
    if (this.props.timePeriod.endDate) {
      (properties.timePeriod as any).endDate = this.props.timePeriod.endDate;
    }

    // Add filter if specified
    if (this.props.filter) {
      properties.filter = this.buildFilterObject(this.props.filter);
    }

    // Add notifications if specified
    if (this.props.notifications && Object.keys(this.props.notifications).length > 0) {
      properties.notifications = this.buildNotificationsObject(this.props.notifications);
    }

    const resource: ArmResource = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      properties,
    };

    return resource;
  }

  /**
   * Builds ARM filter object from BudgetFilter.
   *
   * @param filter - Budget filter
   * @returns ARM filter object
   * @internal
   */
  private buildFilterObject(filter: BudgetFilter): Record<string, unknown> {
    const filterObj: Record<string, unknown> = {};

    if (filter.dimensions) {
      filterObj.dimensions = {
        name: filter.dimensions.name,
        operator: filter.dimensions.operator,
        values: filter.dimensions.values,
      };
    }

    if (filter.tags) {
      filterObj.tags = {
        name: filter.tags.name,
        operator: filter.tags.operator,
        values: filter.tags.values,
      };
    }

    return filterObj;
  }

  /**
   * Builds ARM notifications object.
   *
   * @param notifications - Notification configurations
   * @returns ARM notifications object
   * @internal
   */
  private buildNotificationsObject(
    notifications: Record<string, BudgetNotification>
  ): Record<string, unknown> {
    const notificationsObj: Record<string, unknown> = {};

    for (const [name, notification] of Object.entries(notifications)) {
      notificationsObj[name] = {
        enabled: notification.enabled,
        operator: notification.operator,
        threshold: notification.threshold,
        thresholdType: notification.thresholdType,
        contactEmails: notification.contactEmails,
      };

      // Add optional properties
      if (notification.contactRoles && notification.contactRoles.length > 0) {
        (notificationsObj[name] as any).contactRoles = notification.contactRoles;
      }

      if (notification.contactGroups && notification.contactGroups.length > 0) {
        (notificationsObj[name] as any).contactGroups = notification.contactGroups;
      }

      if (notification.locale) {
        (notificationsObj[name] as any).locale = notification.locale;
      }
    }

    return notificationsObj;
  }
}
