/**
 * Data Component - Schema-driven infrastructure for GraphQL APIs
 *
 * @remarks
 * The Data component provides a complete GraphQL API infrastructure stack
 * automatically generated from Atakora schema definitions. It synthesizes:
 * - Cosmos DB databases and containers
 * - Service Bus topics and subscriptions for events
 * - GraphQL resolvers and Azure Functions
 * - Authorization middleware
 * - Type-safe client SDKs
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
 * import { DataStack } from '@atakora/component/data';
 * import { defineSchema, Fields, allow, hasMany, z } from '@atakora/lib/schema/atakora';
 *
 * // Define your data schema
 * const UserSchema = defineSchema('User', {
 *   fields: z.object({
 *     id: Fields.id(),
 *     email: Fields.email().unique().build(),
 *     name: z.string().min(1).max(100),
 *     role: z.enum(['admin', 'user']).default('user')
 *   }),
 *   authorization: {
 *     create: allow.authenticated(),
 *     read: allow.public(),
 *     update: allow.owner('id'),
 *     delete: allow.role('admin')
 *   },
 *   relationships: {
 *     posts: hasMany('Post', 'authorId')
 *   }
 * });
 *
 * // Create infrastructure automatically
 * const dataStack = new DataStack(stack, 'MyData', {
 *   schemas: [UserSchema, PostSchema],
 *   cosmosAccount,
 *   serviceBusNamespace,
 *   signalRService,
 *   functionApp
 * });
 *
 * // Access synthesized resources
 * const userContainer = dataStack.getContainer('User');
 * const userTopic = dataStack.getTopic('User');
 * const resolvers = dataStack.getResolvers();
 * ```
 *
 * ## Features
 *
 * - **Schema-Driven**: Define once, generate everything
 * - **Type-Safe**: Full TypeScript inference from schemas to generated code
 * - **Authorization**: Declarative auth rules (public, authenticated, owner, role, group)
 * - **Relationships**: hasOne, hasMany, belongsTo, manyToMany, polymorphic
 * - **Events**: Automatic pub/sub for mutations
 * - **Real-Time**: WebSocket subscriptions via SignalR
 * - **Validation**: Zod-based runtime validation
 * - **Hooks**: Lifecycle hooks (beforeCreate, afterUpdate, etc.)
 * - **Computed Fields**: Derived fields with caching
 *
 * @packageDocumentation
 */

export { DataStack } from './data-stack';
export type {
  DataStackProps,
  IDataStack,
  ICosmosContainer,
  IServiceBusTopic,
  IGraphQLResolver,
  ISignalRService,
} from './data-stack-types';

// CRUD data resources (entity-based CRUD operations)
export * from './crud';
