/**
 * Represents an Azure Subscription.
 *
 * @remarks
 * Subscriptions are the billing and deployment boundary in Azure.
 * They contain resource groups and have a default location.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const subscription = new Subscription({
 *   subscriptionId: '12345678-1234-1234-1234-123456789abc',
 *   displayName: 'NonProd Subscription',
 *   tenantId: '87654321-4321-4321-4321-cba987654321'
 * });
 *
 * console.log(subscription.subscriptionId);  // Full GUID
 * console.log(subscription.abbreviation);    // 'sub01' for naming
 * console.log(subscription.resourceName);    // 'sub-nonprod'
 * ```
 *
 * @example
 * From ID only:
 * ```typescript
 * const sub = Subscription.fromId('12345678-1234-1234-1234-123456789abc');
 * ```
 */
export class Subscription {
  /**
   * Azure subscription ID (GUID format).
   */
  readonly subscriptionId: string;

  /**
   * Display name for the subscription.
   */
  readonly displayName?: string;

  /**
   * Azure AD tenant ID this subscription belongs to.
   */
  readonly tenantId?: string;

  /**
   * Abbreviated form for use in resource names.
   * @example 'sub01', 'sub02'
   */
  readonly abbreviation: string;

  /**
   * Resource name format for naming conventions.
   * @example 'sub-nonprod', 'sub-prod'
   */
  readonly resourceName: string;

  /**
   * Creates a new Subscription instance.
   *
   * @param props - Subscription configuration
   * @throws {Error} If subscription ID is invalid
   *
   * @example
   * ```typescript
   * const sub = new Subscription({
   *   subscriptionId: '12345678-1234-1234-1234-123456789abc',
   *   displayName: 'Production Subscription',
   *   abbreviation: 'prod'
   * });
   * ```
   */
  constructor(props: {
    subscriptionId: string;
    displayName?: string;
    tenantId?: string;
    abbreviation?: string;
    resourceName?: string;
  }) {
    // Validate subscription ID format
    if (!Subscription.validateSubscriptionId(props.subscriptionId)) {
      throw new Error(
        `Invalid subscription ID format: ${props.subscriptionId}. Must be a valid GUID.`
      );
    }

    this.subscriptionId = props.subscriptionId;
    this.displayName = props.displayName;
    this.tenantId = props.tenantId;

    // Auto-generate abbreviation if not provided
    this.abbreviation = props.abbreviation ?? this.generateAbbreviation();

    // Auto-generate resource name if not provided
    this.resourceName = props.resourceName ?? this.generateResourceName(props.displayName);
  }

  /**
   * Create a Subscription from subscription ID only.
   *
   * @param subscriptionId - Azure subscription GUID
   * @returns Subscription instance
   *
   * @example
   * ```typescript
   * const sub = Subscription.fromId('12345678-1234-1234-1234-123456789abc');
   * ```
   */
  public static fromId(subscriptionId: string): Subscription {
    return new Subscription({ subscriptionId });
  }

  /**
   * Validate subscription ID format (GUID).
   *
   * @param id - Subscription ID to validate
   * @returns True if valid GUID format
   *
   * @example
   * ```typescript
   * Subscription.validateSubscriptionId('12345678-1234-1234-1234-123456789abc'); // true
   * Subscription.validateSubscriptionId('invalid'); // false
   * ```
   */
  public static validateSubscriptionId(id: string): boolean {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidRegex.test(id);
  }

  /**
   * Generate a default abbreviation from subscription ID.
   * Uses last 2 characters of the GUID for uniqueness.
   *
   * @returns Abbreviated form
   */
  private generateAbbreviation(): string {
    const lastSegment = this.subscriptionId.split('-').pop() ?? '';
    return `sub${lastSegment.slice(-2)}`;
  }

  /**
   * Generate resource name from display name or subscription ID.
   *
   * @param displayName - Optional display name
   * @returns Resource name
   */
  private generateResourceName(displayName?: string): string {
    if (displayName) {
      // Convert display name to kebab-case
      return `sub-${displayName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')}`;
    }

    // Use abbreviation as fallback
    return `sub-${this.abbreviation}`;
  }
}
