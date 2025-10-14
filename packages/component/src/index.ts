/**
 * @atakora/component - Infrastructure Component Library
 *
 * @remarks
 * Higher-level, opinionated components and patterns built on Atakora CDK.
 * These components provide production-ready infrastructure patterns with
 * sensible defaults, reducing boilerplate and enforcing best practices.
 *
 * ## Philosophy
 *
 * - **Opinionated Defaults**: Smart defaults based on Azure best practices
 * - **Composable Patterns**: Components that work together seamlessly
 * - **Type Safety**: Full TypeScript support with intelligent inference
 * - **Production Ready**: Security, monitoring, and reliability built-in
 *
 * ## Installation
 *
 * ```bash
 * npm install @atakora/component
 * ```
 *
 * ## Usage
 *
 * ```typescript
 * import { CrudApi } from '@atakora/component/crud';
 * import { ResourceGroupStack } from '@atakora/cdk';
 *
 * const stack = new ResourceGroupStack(app, 'MyStack', {
 *   resourceGroupName: 'rg-myapp-prod',
 *   location: 'eastus'
 * });
 *
 * const api = new CrudApi(stack, 'UserApi', {
 *   entityName: 'User',
 *   schema: {
 *     id: 'string',
 *     name: 'string',
 *     email: 'string'
 *   },
 *   partitionKey: '/id'
 * });
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// COMPONENT EXPORTS
// High-level patterns and components
// ============================================================================

// Backend pattern - Resource sharing and orchestration
export * from './backend';

// CRUD API components
export * from './crud';

// Functions App components
export * from './functions';

// Data components - Schema-driven GraphQL APIs
export * from './data';

// Web application components
export * from './web';

// Messaging components
export * from './messaging';

// Microservice components (planned)
// export * from './microservice';

// ============================================================================
// VERSION INFORMATION
// ============================================================================

/**
 * Package version
 */
export const VERSION = '0.0.2';

// ============================================================================
// CDK IMPORTS
// ============================================================================

/**
 * Note: CDK types are not re-exported to avoid naming conflicts.
 * Import CDK types directly from '@atakora/cdk' when needed.
 *
 * @example
 * ```typescript
 * import { ResourceGroupStack } from '@atakora/cdk';
 * import { CrudApi } from '@atakora/component';
 * ```
 */
