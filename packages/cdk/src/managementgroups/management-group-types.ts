/**
 * Azure Management Group types and interfaces.
 *
 * @packageDocumentation
 */

/**
 * Properties for Management Group construct.
 *
 * @public
 *
 * @example
 * Create a top-level management group:
 * ```typescript
 * {
 *   name: 'mg-production',
 *   displayName: 'Production Management Group',
 *   description: 'Management group for all production subscriptions',
 *   parentId: '/providers/Microsoft.Management/managementGroups/root'
 * }
 * ```
 *
 * @example
 * Create a nested management group:
 * ```typescript
 * {
 *   name: 'mg-prod-app1',
 *   displayName: 'Production - Application 1',
 *   description: 'Subscriptions for Application 1 production workloads',
 *   parentId: productionMG.managementGroupId
 * }
 * ```
 */
export interface ManagementGroupProps {
  /**
   * Management group name (ID).
   *
   * @remarks
   * This is the technical name/ID used in ARM resource paths.
   * Maximum 90 characters.
   * Can contain alphanumeric, hyphen, underscore, period, and parentheses.
   *
   * **Best Practice**: Use a consistent naming pattern like:
   * - `mg-production`
   * - `mg-development`
   * - `mg-finance`
   * - `mg-engineering`
   */
  readonly name: string;

  /**
   * Display name for the management group.
   *
   * @remarks
   * Friendly name shown in Azure Portal.
   * Maximum 256 characters.
   */
  readonly displayName: string;

  /**
   * Parent management group ID.
   *
   * @remarks
   * Format: `/providers/Microsoft.Management/managementGroups/{parentId}`
   *
   * If not specified, defaults to the Tenant Root Group.
   * Use `'/providers/Microsoft.Management/managementGroups/root'` for root-level groups.
   *
   * **Management Group Hierarchy**:
   * ```
   * Tenant Root Group (root)
   * ├── mg-production
   * │   ├── mg-prod-app1
   * │   └── mg-prod-app2
   * ├── mg-development
   * │   ├── mg-dev-app1
   * │   └── mg-dev-app2
   * └── mg-sandbox
   * ```
   */
  readonly parentId?: string;

  /**
   * Description of the management group.
   *
   * @remarks
   * Optional. Helps document the purpose of the management group.
   * Maximum 1024 characters.
   */
  readonly description?: string;
}
