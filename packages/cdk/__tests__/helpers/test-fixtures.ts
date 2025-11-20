/**
 * Shared test fixtures and utilities for CDK tests.
 *
 * This module provides reusable test constructs and helpers to maintain
 * consistency across the test suite and reduce duplication.
 */

import { Construct } from '@atakora/lib';
import type { IResourceGroup } from '@atakora/lib';

/**
 * Mock ResourceGroup for testing.
 *
 * @remarks
 * Provides a lightweight implementation of IResourceGroup interface
 * without requiring full stack setup. Use this in unit tests that need
 * a resource group parent but don't need to test the actual ResourceGroup
 * implementation.
 *
 * @example
 * ```typescript
 * import { createMockResourceGroup } from '../helpers/test-fixtures';
 *
 * const rg = createMockResourceGroup();
 * const vnet = new VirtualNetworks(rg, 'VNet', { addressSpace: '10.0.0.0/16' });
 * ```
 */
export class MockResourceGroup extends Construct implements IResourceGroup {
  public readonly resourceGroupName: string;
  public readonly location: string;
  public readonly tags: Record<string, string>;
  public readonly resourceId: string;

  constructor(
    scope?: Construct,
    id: string = 'MockRG',
    options?: {
      resourceGroupName?: string;
      location?: string;
      tags?: Record<string, string>;
    }
  ) {
    // Allow scope to be undefined for standalone test fixtures
    super(scope ?? ({} as any), id);

    this.resourceGroupName = options?.resourceGroupName ?? 'test-rg';
    this.location = options?.location ?? 'eastus';
    this.tags = options?.tags ?? { environment: 'test' };
    this.resourceId = `[resourceId('Microsoft.Resources/resourceGroups', '${this.resourceGroupName}')]`;
  }
}

/**
 * Creates a mock ResourceGroup with default test values.
 *
 * @param options - Optional overrides for default values
 * @returns MockResourceGroup instance
 *
 * @example
 * ```typescript
 * const rg = createMockResourceGroup({ location: 'westus2' });
 * ```
 */
export function createMockResourceGroup(options?: {
  resourceGroupName?: string;
  location?: string;
  tags?: Record<string, string>;
}): MockResourceGroup {
  return new MockResourceGroup(undefined, 'MockRG', options);
}

/**
 * Mock App Service Plan reference for Function App tests.
 */
export interface MockPlan {
  planId: string;
  location: string;
}

/**
 * Creates a mock App Service Plan reference.
 *
 * @param options - Optional overrides
 * @returns Mock plan object
 */
export function createMockPlan(options?: {
  planId?: string;
  location?: string;
}): MockPlan {
  return {
    planId: options?.planId ?? '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Web/serverfarms/test-plan',
    location: options?.location ?? 'eastus',
  };
}

/**
 * Mock Storage Account reference for Function App tests.
 */
export interface MockStorage {
  storageAccountId: string;
  storageAccountName: string;
}

/**
 * Creates a mock Storage Account reference.
 *
 * @param options - Optional overrides
 * @returns Mock storage object
 */
export function createMockStorage(options?: {
  storageAccountId?: string;
  storageAccountName?: string;
}): MockStorage {
  return {
    storageAccountId: options?.storageAccountId ?? '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststorage',
    storageAccountName: options?.storageAccountName ?? 'teststorage',
  };
}

/**
 * Default test subscription ID for consistent testing.
 */
export const TEST_SUBSCRIPTION_ID = '12345678-1234-1234-1234-123456789abc';

/**
 * Default test tenant ID for consistent testing.
 */
export const TEST_TENANT_ID = '87654321-4321-4321-4321-cba987654321';
