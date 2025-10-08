/**
 * Azure Resource Group constructs.
 *
 * @remarks
 * Provides both L1 (ARM direct mapping) and L2 (intent-based) constructs
 * for creating Azure resource groups.
 *
 * **Resource Type**: Microsoft.Resources/resourceGroups
 * **API Version**: 2025-04-01
 * **Deployment Scope**: Subscription
 *
 * @packageDocumentation
 *
 * @example
 * L1 usage (explicit control):
 * ```typescript
 * import { ArmResourceGroup } from '@atakora/lib';
 *
 * const rg = new ArmResourceGroup(stack, 'RG', {
 *   resourceGroupName: 'rg-explicit-name',
 *   location: 'eastus',
 *   tags: { env: 'prod' }
 * });
 * ```
 *
 * @example
 * L2 usage (auto-generation):
 * ```typescript
 * import { ResourceGroup } from '@atakora/lib';
 *
 * const rg = new ResourceGroup(stack, 'DataRG');
 * // Auto-generates name, location, tags from stack context
 * ```
 */

// L1 construct (ARM direct mapping)
export { ArmResourceGroup } from './arm-resource-group';

// L2 construct (intent-based)
export { ResourceGroup } from './resource-group';

// Type definitions
export type { ArmResourceGroupProps, ResourceGroupProps, IResourceGroup } from './types';
