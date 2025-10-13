/**
 * Azure Budget constructs for cost management.
 *
 * @remarks
 * This module provides constructs for creating and managing Azure Cost Management budgets
 * at subscription scope to track and control Azure spending.
 *
 * **Budget vs Cost Analysis**:
 * - **Budget**: Proactive cost control with alerts (this module)
 * - **Cost Analysis**: Reactive cost reporting and analysis
 *
 * **Key Features**:
 * - Track actual or forecasted costs
 * - Multiple notification thresholds (up to 5)
 * - Email and Action Group alerts
 * - Filter by resource groups, tags, or resource types
 * - Monthly, Quarterly, or Annual time periods
 *
 * @packageDocumentation
 */

// L2 constructs
export * from './budget';

// Types
export * from './budget-types';

// L1 constructs (typically not used directly)
export * from './budget-arm';
