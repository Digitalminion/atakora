/**
 * Azure ARM Private Construct Library
 *
 * @remarks
 * Infrastructure as Code library for Azure Resource Manager (ARM) templates.
 * Provides type-safe constructs for defining Azure infrastructure with both
 * low-level (L1) and high-level (L2) abstractions.
 *
 * ## Architecture
 *
 * The library follows a layered construct model:
 *
 * - **L1 Constructs** (Arm prefix): Direct ARM template mapping with full control
 *   - Example: `ArmVirtualNetwork`, `ArmStorageAccount`
 *   - Provides 1:1 mapping to ARM resource properties
 *   - Maximum flexibility and control
 *
 * - **L2 Constructs** (no prefix): Intent-based API with sensible defaults
 *   - Example: `VirtualNetwork`, `StorageAccount`
 *   - Auto-generates resource names following conventions
 *   - Merges tags from parent constructs
 *   - Validates configuration at construct time
 *
 * ## Core Concepts
 *
 * - **App**: Root of the construct tree
 * - **Stack**: Deployment boundary (subscription or resource group scope)
 * - **Construct**: Base class for all infrastructure components
 * - **Resource**: Base class for ARM resources
 *
 * ## Usage
 *
 * @example
 * Basic usage with L2 constructs:
 * ```typescript
 * import { App, SubscriptionStack, ResourceGroup, StorageAccount } from '@atakora/lib';
 *
 * const app = new App();
 *
 * const stack = new SubscriptionStack(app, 'MyStack', {
 *   subscription: Subscription.fromId('...'),
 *   geography: Geography.fromValue('eastus'),
 *   organization: Organization.fromValue('engineering'),
 *   project: new Project('myapp'),
 *   environment: Environment.fromValue('prod'),
 *   instance: Instance.fromNumber(1)
 * });
 *
 * const rg = new ResourceGroup(stack, 'Resources', {
 *   location: 'eastus'
 * });
 *
 * const storage = new StorageAccount(rg, 'Data', {
 *   sku: { name: StorageAccountSkuName.STANDARD_LRS }
 * });
 *
 * app.synth();
 * ```
 *
 * @example
 * Advanced usage with L1 constructs:
 * ```typescript
 * import { ArmStorageAccount } from '@atakora/lib';
 *
 * const storage = new ArmStorageAccount(stack, 'Storage', {
 *   name: 'mystorageaccount',
 *   location: 'eastus',
 *   sku: { name: 'Standard_LRS' },
 *   kind: 'StorageV2',
 *   properties: {
 *     accessTier: 'Hot',
 *     minimumTlsVersion: 'TLS1_2',
 *     allowBlobPublicAccess: false
 *   }
 * });
 * ```
 *
 * @packageDocumentation
 */

// Core types and classes
export * from './core';

// Naming conventions and utilities
export * from './naming';

// Synthesis types (CloudAssembly, StackManifest, etc.)
export type { CloudAssembly, StackManifest } from './synthesis';
