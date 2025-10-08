/**
 * Type definitions for Resource Group constructs.
 *
 * @packageDocumentation
 */

/**
 * Properties for ArmResourceGroup (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Resources/resourceGroups ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2025-04-01
 *
 * @example
 * ```typescript
 * const props: ArmResourceGroupProps = {
 *   resourceGroupName: 'rg-digital-minion-authr-data-nonprod-eastus-01',
 *   location: 'eastus',
 *   tags: {
 *     environment: 'nonprod',
 *     project: 'authr'
 *   }
 * };
 * ```
 */
export interface ArmResourceGroupProps {
  /**
   * Name of the resource group.
   *
   * @remarks
   * - Must match pattern: ^[-\w\._\(\)]+$
   * - Maximum length: 90 characters
   * - Must be unique within the subscription
   */
  readonly resourceGroupName: string;

  /**
   * Azure region where the resource group will be created.
   *
   * @remarks
   * Examples: 'eastus', 'westus2', 'centralus'
   */
  readonly location: string;

  /**
   * Tags to apply to the resource group.
   *
   * @remarks
   * Tags are key-value pairs for organizing and tracking resources.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for ResourceGroup (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses stack location
 * const rg = new ResourceGroup(stack, 'DataRG');
 *
 * // Custom name and location
 * const rg = new ResourceGroup(stack, 'DataRG', {
 *   resourceGroupName: 'my-custom-rg-name',
 *   location: 'westus2',
 *   tags: { department: 'engineering' }
 * });
 * ```
 */
export interface ResourceGroupProps {
  /**
   * Name of the resource group.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context:
   * - Format: `rg-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
   * - Example: `rg-digital-minion-authr-data-nonprod-eus-00`
   *
   * The `purpose` is derived from the construct ID (e.g., 'DataRG' -> 'data').
   */
  readonly resourceGroupName?: string;

  /**
   * Azure region where the resource group will be created.
   *
   * @remarks
   * If not provided, defaults to the parent stack's geography location.
   */
  readonly location?: string;

  /**
   * Tags to apply to the resource group.
   *
   * @remarks
   * These tags will be merged with the parent stack's tags.
   * Tags specified here take precedence over stack tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Resource Group reference.
 *
 * @remarks
 * Allows resources to reference a resource group without depending on the construct class.
 */
export interface IResourceGroup {
  /**
   * Name of the resource group.
   */
  readonly resourceGroupName: string;

  /**
   * Location of the resource group.
   */
  readonly location: string;
}
