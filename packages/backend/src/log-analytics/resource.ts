import { Construct, type IResourceGroup, type SubscriptionStack } from '@atakora/cdk';
import { LogAnalyticsStack } from './stack';

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
 * Creates the Log Analytics workspace for ColorAI
 *
 * @remarks
 * This function instantiates the LogAnalyticsStack with ColorAI-specific configuration:
 * - Nonprod: 30 day retention, 5 GB daily quota
 * - Prod: 90 day retention, 100 GB daily quota
 * - Public network access disabled
 *
 * The resource group is created by the SubscriptionStack and passed in.
 * This stack can be created within any scope (SubscriptionStack or ResourceGroupStack).
 *
 * @param scope - Parent scope (SubscriptionStack or ResourceGroupStack)
 * @param platformRG - Platform resource group (created by SubscriptionStack)
 * @returns Configured LogAnalyticsStack instance
 */
export function createLogAnalyticsWorkspace(
  scope: Construct,
  platformRG: IResourceGroup
): LogAnalyticsStack {
  // Get environment from the SubscriptionStack in the construct tree
  const subscriptionStack = getSubscriptionStack(scope);
  const environment = subscriptionStack.environment;

  // Determine environment-specific configuration
  const isProd = environment.value === 'prod';
  const retentionInDays = isProd ? 90 : 30;
  const dailyQuotaGb = isProd ? 100 : 5;

  // Create the Log Analytics Stack
  const logAnalyticsStack = new LogAnalyticsStack(scope, 'Logs', {
    resourceGroup: platformRG,
    retentionInDays: retentionInDays,
    dailyQuotaGb: dailyQuotaGb,
    disablePublicNetworkAccess: true,
    tags: {
      purpose: 'centralized-logging',
      'data-classification': 'confidential',
    },
  });

  return logAnalyticsStack;
}

/**
 * Export for use in backend.ts
 *
 * @remarks
 * This will be imported in backend.ts like:
 * ```typescript
 * import { logAnalytics } from './log-analytics/resource';
 * const workspace = logAnalytics(foundation, platformRG);
 * ```
 */
export { createLogAnalyticsWorkspace as logAnalytics };
