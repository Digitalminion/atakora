/**
 * Azure RBAC grant system - IGrantResult interface.
 *
 * @remarks
 * This module defines the result type returned by grant operations.
 * It provides access to the created role assignment and enables further
 * configuration such as descriptions and conditions.
 *
 * @packageDocumentation
 */

import { IGrantable } from './igrantable';

/**
 * Result of a grant operation.
 *
 * @remarks
 * Returned by all grant methods to provide access to the created
 * role assignment for further configuration or dependency management.
 *
 * **Purpose**:
 * - Access the underlying role assignment resource
 * - Add descriptions for documentation and auditing
 * - Configure ABAC (Attribute-Based Access Control) conditions
 * - Establish dependencies in the construct tree
 *
 * **Fluent API Pattern**:
 * Methods like `addDescription` and `addCondition` support method chaining
 * for convenient configuration.
 *
 * @public
 *
 * @example
 * Basic grant with description:
 * ```typescript
 * const grant = storageAccount.grantRead(appService);
 * grant.addDescription('Allow App Service to read blob storage for user uploads');
 * ```
 *
 * @example
 * Grant with ABAC condition:
 * ```typescript
 * const grant = storageAccount.grantWrite(vm);
 * grant.addCondition(
 *   `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringEquals 'logs'`,
 *   '2.0'
 * );
 * grant.addDescription('VM can only write to logs container');
 * ```
 *
 * @example
 * Establishing dependencies:
 * ```typescript
 * const grant = keyVault.grantSecretRead(functionApp);
 *
 * // Ensure function doesn't start until it has Key Vault access
 * const config = new AppConfiguration(stack, 'Config', {
 *   dependsOn: [grant.roleAssignment]
 * });
 * ```
 *
 * @example
 * Method chaining:
 * ```typescript
 * storageAccount
 *   .grantReadWrite(dataProcessor)
 *   .addDescription('Data processor needs read/write access for ETL pipeline')
 *   .addCondition(
 *     `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringStartsWith 'data-'`,
 *     '2.0'
 *   );
 * ```
 */
export interface IGrantResult {
  /**
   * The role assignment resource created by the grant.
   *
   * @remarks
   * This is the underlying Azure role assignment construct.
   * Use this property to:
   * - Establish dependencies between resources
   * - Access role assignment metadata
   * - Reference the assignment in other constructs
   *
   * The exact type will be defined in Phase 2 when the RoleAssignment
   * construct is implemented.
   *
   * @example
   * ```typescript
   * const grant = storageAccount.grantRead(vm);
   *
   * // Use in dependencies
   * someOtherResource.node.addDependency(grant.roleAssignment);
   * ```
   */
  readonly roleAssignment: any; // Will be RoleAssignment type from Phase 2

  /**
   * The role definition ID that was granted.
   *
   * @remarks
   * This is the full Azure role definition ID in the format:
   * `/subscriptions/{subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/{roleId}`
   *
   * For built-in roles, this uses well-known role IDs.
   * For custom roles, this references the custom role definition.
   *
   * @example
   * ```typescript
   * const grant = storageAccount.grantRead(vm);
   * console.log(grant.roleDefinitionId);
   * // Output: "/subscriptions/.../providers/Microsoft.Authorization/roleDefinitions/2a2b9908-6b94-4a9d-a88b-7c9e1c2c8d3e"
   * ```
   */
  readonly roleDefinitionId: string;

  /**
   * The identity that was granted access.
   *
   * @remarks
   * Reference to the IGrantable that received the permissions.
   * Useful for:
   * - Auditing who has access
   * - Programmatically inspecting grants
   * - Building access control reports
   *
   * @example
   * ```typescript
   * const grant = keyVault.grantSecretRead(appService);
   * console.log(`Granted to: ${grant.grantee.principalId}`);
   * console.log(`Principal type: ${grant.grantee.principalType}`);
   * ```
   */
  readonly grantee: IGrantable;

  /**
   * The scope where access was granted.
   *
   * @remarks
   * The Azure resource ID where the role assignment was created.
   * Permissions apply to this resource and (depending on the role)
   * may cascade to child resources.
   *
   * **Scope Levels**:
   * - Management Group: `/providers/Microsoft.Management/managementGroups/{id}`
   * - Subscription: `/subscriptions/{subscriptionId}`
   * - Resource Group: `/subscriptions/{subscriptionId}/resourceGroups/{rgName}`
   * - Resource: Full resource ID
   *
   * @example
   * ```typescript
   * const grant = resourceGroup.grantBuiltInRole(group, 'Contributor');
   * console.log(grant.scope);
   * // Output: "/subscriptions/.../resourceGroups/my-rg"
   * ```
   */
  readonly scope: string;

  /**
   * Adds a description to the role assignment.
   *
   * @remarks
   * Descriptions are important for:
   * - Documentation and knowledge transfer
   * - Security audits and compliance
   * - Understanding permission intent
   *
   * **Best Practices**:
   * - Explain why the permission is needed
   * - Reference tickets or requirements
   * - Note any time-based or conditional aspects
   * - Keep descriptions under 512 characters
   *
   * @param description - Human-readable description of the role assignment
   *
   * @example
   * ```typescript
   * storageAccount
   *   .grantRead(vm)
   *   .addDescription('VM needs read access to download application configs on startup');
   * ```
   *
   * @example
   * With reference numbers:
   * ```typescript
   * keyVault
   *   .grantSecretRead(functionApp)
   *   .addDescription('JIRA-1234: Function app requires database connection string from Key Vault');
   * ```
   */
  addDescription(description: string): void;

  /**
   * Adds an Azure ABAC condition to the role assignment.
   *
   * @remarks
   * ABAC (Attribute-Based Access Control) conditions add fine-grained
   * access control based on resource attributes, request context, or
   * principal attributes.
   *
   * **Condition Language**:
   * - Uses Azure ABAC expression syntax
   * - Version 2.0 is currently supported
   * - Conditions are evaluated at runtime
   *
   * **Common Use Cases**:
   * - Limit access to specific containers in storage
   * - Restrict access based on resource tags
   * - Time-based access restrictions
   * - Environment-specific permissions
   *
   * **Important Notes**:
   * - Not all roles support conditions (only data plane roles)
   * - Conditions don't reduce permissions, they filter them
   * - Test conditions thoroughly before production use
   *
   * @param condition - ABAC expression defining the access condition
   * @param version - ABAC condition version (default: '2.0')
   *
   * @see {@link https://docs.microsoft.com/en-us/azure/role-based-access-control/conditions-format}
   *
   * @example
   * Limit to specific storage container:
   * ```typescript
   * storageAccount
   *   .grantRead(vm)
   *   .addCondition(
   *     `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringEquals 'public'`,
   *     '2.0'
   *   );
   * ```
   *
   * @example
   * Tag-based access:
   * ```typescript
   * resourceGroup
   *   .grantBuiltInRole(user, 'Reader')
   *   .addCondition(
   *     `@Resource[Microsoft.Resources/tags:environment] StringEquals 'development'`,
   *     '2.0'
   *   );
   * ```
   *
   * @example
   * Multiple conditions:
   * ```typescript
   * storageAccount
   *   .grantWrite(app)
   *   .addCondition(
   *     `(
   *       @Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringStartsWith 'data-' AND
   *       @Request[Microsoft.Storage/storageAccounts/blobServices/containers/blobs:path] StringEndsWith '.json'
   *     )`,
   *     '2.0'
   *   );
   * ```
   */
  addCondition(condition: string, version?: '2.0'): void;
}
