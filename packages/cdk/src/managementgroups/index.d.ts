/**
 * Azure Management Group constructs.
 *
 * @remarks
 * This module provides constructs for creating and managing Azure management groups.
 *
 * **Management Groups**:
 * Organizational containers that hold subscriptions and enable hierarchical policy
 * and access management at scale.
 *
 * **Use Cases**:
 * - Organize subscriptions by department, team, or environment
 * - Apply policies across multiple subscriptions
 * - Grant RBAC access to groups of subscriptions
 * - Track costs by organizational unit
 *
 * **Hierarchy Example**:
 * ```
 * Root Management Group
 * ├── Production MG
 * │   ├── Subscription A
 * │   └── Subscription B
 * ├── Development MG
 * │   ├── Subscription C
 * │   └── Subscription D
 * └── Sandbox MG
 *     └── Subscription E
 * ```
 *
 * @packageDocumentation
 */
export * from './management-group';
export * from './management-group-types';
export * from './management-group-arm';
//# sourceMappingURL=index.d.ts.map