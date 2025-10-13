/**
 * GraphQL Resolver Types
 *
 * Defines type-safe GraphQL resolver interfaces following GraphQL specification.
 * Provides full TypeScript type inference for resolvers, context, and data loaders.
 *
 * @see ADR-011 GraphQL Resolver Architecture
 */

/**
 * GraphQL field resolver function
 *
 * @template TSource - Type of parent/source object
 * @template TContext - Type of resolver context
 * @template TArgs - Type of field arguments
 * @template TReturn - Type of resolver return value
 */
export type ResolverFunction<TSource = any, TContext = any, TArgs = any, TReturn = any> = (
  source: TSource,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TReturn> | TReturn;

/**
 * Subscription resolver for real-time updates
 *
 * @template TSource - Type of parent/source object
 * @template TContext - Type of resolver context
 * @template TArgs - Type of subscription arguments
 * @template TReturn - Type of subscription payload
 */
export type SubscriptionResolver<TSource = any, TContext = any, TArgs = any, TReturn = any> = {
  readonly subscribe: ResolverFunction<TSource, TContext, TArgs, AsyncIterable<TReturn>>;
  readonly resolve?: ResolverFunction<TSource, TContext, TArgs, TReturn>;
};

/**
 * Core GraphQL resolver interface
 *
 * @template TSource - Type of parent/source object
 * @template TContext - Type of resolver context
 * @template TArgs - Type of field arguments
 * @template TReturn - Type of resolver return value
 */
export interface IGraphQLResolver<TSource = any, TContext = any, TArgs = any, TReturn = any> {
  readonly fieldName: string;
  readonly typeName: string;
  readonly resolve: ResolverFunction<TSource, TContext, TArgs, TReturn>;
  readonly subscribe?: SubscriptionResolver<TSource, TContext, TArgs, TReturn>;
  readonly authorization?: FieldAuthorization;
  readonly caching?: FieldCachingStrategy;
  readonly complexity?: ComplexityCalculator;
  readonly description?: string;
  readonly deprecated?: boolean | string;
}

/**
 * GraphQL resolve info with Azure extensions
 */
export interface GraphQLResolveInfo {
  readonly fieldName: string;
  readonly fieldNodes: readonly FieldNode[];
  readonly returnType: GraphQLOutputType;
  readonly parentType: GraphQLObjectType;
  readonly path: Path;
  readonly schema: GraphQLSchema;
  readonly fragments: Record<string, FragmentDefinition>;
  readonly rootValue: any;
  readonly operation: OperationDefinition;
  readonly variableValues: Record<string, any>;
  readonly cacheControl?: CacheControlHint;
  readonly azure?: AzureResolveExtensions;
}

/**
 * Azure-specific resolver extensions
 */
export interface AzureResolveExtensions {
  readonly correlationId: string;
  readonly subscriptionId: string;
  readonly resourceGroup: string;
  readonly isGovernmentCloud: boolean;
  readonly managedIdentity?: ManagedIdentityToken;
  readonly dataLoaders: DataLoaderRegistry;
}

/**
 * Managed identity token for Azure resources
 */
export interface ManagedIdentityToken {
  readonly tokenType: string;
  readonly accessToken: string;
  readonly expiresOn: Date;
  readonly resource: string;
}

/**
 * Field-level authorization configuration
 */
export interface FieldAuthorization {
  readonly strategy: AuthorizationStrategy;
  readonly rules: readonly AuthorizationRule[];
  readonly errorMessage?: string;
  readonly errorCode?: string;
}

/**
 * Authorization strategy
 */
export type AuthorizationStrategy =
  | 'any'    // Any rule passes
  | 'all'    // All rules must pass
  | 'custom'; // Custom logic

/**
 * Authorization rule
 */
export interface AuthorizationRule {
  readonly type: AuthorizationType;
  readonly config: AuthorizationConfig;
}

/**
 * Authorization types
 */
export type AuthorizationType =
  | 'role'       // Role-based access control
  | 'claim'      // Claim-based access control
  | 'attribute'  // Attribute-based access control
  | 'policy'     // Azure Policy-based
  | 'custom';    // Custom authorization

/**
 * Authorization configuration (discriminated union)
 */
export type AuthorizationConfig =
  | RoleAuthorizationConfig
  | ClaimAuthorizationConfig
  | AttributeAuthorizationConfig
  | PolicyAuthorizationConfig
  | CustomAuthorizationConfig;

/**
 * Role-based authorization configuration
 */
export interface RoleAuthorizationConfig {
  readonly roles: readonly string[];
  readonly requireAll?: boolean;
}

/**
 * Claim-based authorization configuration
 */
export interface ClaimAuthorizationConfig {
  readonly claims: Record<string, any>;
  readonly match?: 'exact' | 'contains' | 'regex';
}

/**
 * Attribute-based authorization configuration
 */
export interface AttributeAuthorizationConfig {
  readonly attributes: readonly AttributeRule[];
  readonly combinator?: 'AND' | 'OR';
}

/**
 * Attribute rule for ABAC
 */
export interface AttributeRule {
  readonly subject: string;    // e.g., 'user.department'
  readonly operator: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'lt';
  readonly value: any;
}

/**
 * Policy-based authorization configuration
 */
export interface PolicyAuthorizationConfig {
  readonly policyId: string;
  readonly parameters?: Record<string, any>;
}

/**
 * Custom authorization configuration
 */
export interface CustomAuthorizationConfig {
  readonly handler: AuthorizationHandler;
}

/**
 * Authorization handler function
 */
export type AuthorizationHandler = (
  context: any,
  source: any,
  args: any,
  info: GraphQLResolveInfo
) => Promise<boolean> | boolean;

/**
 * Field-level caching strategy
 */
export interface FieldCachingStrategy {
  readonly ttl: number;              // Time to live in seconds
  readonly scope: CacheScope;        // private or public
  readonly key?: CacheKeyGenerator;  // Custom cache key
  readonly tags?: readonly string[]; // Cache tags for invalidation
  readonly vary?: readonly string[]; // Vary by headers/context
}

/**
 * Cache scope
 */
export type CacheScope = 'private' | 'public';

/**
 * Cache key generator function
 */
export type CacheKeyGenerator = (
  args: any,
  context: any,
  info: GraphQLResolveInfo
) => string;

/**
 * Complexity calculator function
 */
export type ComplexityCalculator = (
  args: any,
  childComplexity: number
) => number;

/**
 * Cache control hint
 */
export interface CacheControlHint {
  readonly maxAge?: number;
  readonly scope?: CacheScope;
}

/**
 * GraphQL AST node types (simplified - full definitions in graphql-js)
 */
export interface FieldNode {
  readonly kind: 'Field';
  readonly name: NameNode;
  readonly alias?: NameNode;
  readonly arguments?: readonly ArgumentNode[];
  readonly directives?: readonly DirectiveNode[];
  readonly selectionSet?: SelectionSetNode;
}

export interface NameNode {
  readonly kind: 'Name';
  readonly value: string;
}

export interface ArgumentNode {
  readonly kind: 'Argument';
  readonly name: NameNode;
  readonly value: ValueNode;
}

export interface DirectiveNode {
  readonly kind: 'Directive';
  readonly name: NameNode;
  readonly arguments?: readonly ArgumentNode[];
}

export interface SelectionSetNode {
  readonly kind: 'SelectionSet';
  readonly selections: readonly SelectionNode[];
}

export type SelectionNode = FieldNode | FragmentSpreadNode | InlineFragmentNode;

export interface FragmentSpreadNode {
  readonly kind: 'FragmentSpread';
  readonly name: NameNode;
  readonly directives?: readonly DirectiveNode[];
}

export interface InlineFragmentNode {
  readonly kind: 'InlineFragment';
  readonly typeCondition?: NamedTypeNode;
  readonly directives?: readonly DirectiveNode[];
  readonly selectionSet: SelectionSetNode;
}

export interface NamedTypeNode {
  readonly kind: 'NamedType';
  readonly name: NameNode;
}

export type ValueNode =
  | VariableNode
  | IntValueNode
  | FloatValueNode
  | StringValueNode
  | BooleanValueNode
  | NullValueNode
  | EnumValueNode
  | ListValueNode
  | ObjectValueNode;

export interface VariableNode {
  readonly kind: 'Variable';
  readonly name: NameNode;
}

export interface IntValueNode {
  readonly kind: 'IntValue';
  readonly value: string;
}

export interface FloatValueNode {
  readonly kind: 'FloatValue';
  readonly value: string;
}

export interface StringValueNode {
  readonly kind: 'StringValue';
  readonly value: string;
}

export interface BooleanValueNode {
  readonly kind: 'BooleanValue';
  readonly value: boolean;
}

export interface NullValueNode {
  readonly kind: 'NullValue';
}

export interface EnumValueNode {
  readonly kind: 'EnumValue';
  readonly value: string;
}

export interface ListValueNode {
  readonly kind: 'ListValue';
  readonly values: readonly ValueNode[];
}

export interface ObjectValueNode {
  readonly kind: 'ObjectValue';
  readonly fields: readonly ObjectFieldNode[];
}

export interface ObjectFieldNode {
  readonly kind: 'ObjectField';
  readonly name: NameNode;
  readonly value: ValueNode;
}

export interface FragmentDefinition {
  readonly kind: 'FragmentDefinition';
  readonly name: NameNode;
  readonly typeCondition: NamedTypeNode;
  readonly directives?: readonly DirectiveNode[];
  readonly selectionSet: SelectionSetNode;
}

export interface OperationDefinition {
  readonly kind: 'OperationDefinition';
  readonly operation: 'query' | 'mutation' | 'subscription';
  readonly name?: NameNode;
  readonly variableDefinitions?: readonly VariableDefinitionNode[];
  readonly directives?: readonly DirectiveNode[];
  readonly selectionSet: SelectionSetNode;
}

export interface VariableDefinitionNode {
  readonly kind: 'VariableDefinition';
  readonly variable: VariableNode;
  readonly type: TypeNode;
  readonly defaultValue?: ValueNode;
  readonly directives?: readonly DirectiveNode[];
}

export type TypeNode = NamedTypeNode | ListTypeNode | NonNullTypeNode;

export interface ListTypeNode {
  readonly kind: 'ListType';
  readonly type: TypeNode;
}

export interface NonNullTypeNode {
  readonly kind: 'NonNullType';
  readonly type: NamedTypeNode | ListTypeNode;
}

/**
 * GraphQL type system types (simplified)
 */
export interface GraphQLOutputType {
  readonly name?: string;
  readonly kind: string;
}

export interface GraphQLObjectType extends GraphQLOutputType {
  readonly kind: 'OBJECT';
  readonly name: string;
  readonly fields: Record<string, GraphQLField>;
}

export interface GraphQLField {
  readonly name: string;
  readonly type: GraphQLOutputType;
  readonly args: readonly GraphQLArgument[];
  readonly resolve?: ResolverFunction;
  readonly description?: string;
  readonly deprecationReason?: string;
}

export interface GraphQLArgument {
  readonly name: string;
  readonly type: GraphQLInputType;
  readonly defaultValue?: any;
  readonly description?: string;
}

export interface GraphQLInputType {
  readonly name?: string;
  readonly kind: string;
}

export interface GraphQLSchema {
  readonly queryType?: GraphQLObjectType;
  readonly mutationType?: GraphQLObjectType;
  readonly subscriptionType?: GraphQLObjectType;
  readonly types: readonly GraphQLOutputType[];
  readonly directives: readonly GraphQLDirective[];
}

export interface GraphQLDirective {
  readonly name: string;
  readonly description?: string;
  readonly locations: readonly DirectiveLocation[];
  readonly args: readonly GraphQLArgument[];
  readonly isRepeatable?: boolean;
}

export type DirectiveLocation =
  | 'QUERY'
  | 'MUTATION'
  | 'SUBSCRIPTION'
  | 'FIELD'
  | 'FRAGMENT_DEFINITION'
  | 'FRAGMENT_SPREAD'
  | 'INLINE_FRAGMENT'
  | 'VARIABLE_DEFINITION'
  | 'SCHEMA'
  | 'SCALAR'
  | 'OBJECT'
  | 'FIELD_DEFINITION'
  | 'ARGUMENT_DEFINITION'
  | 'INTERFACE'
  | 'UNION'
  | 'ENUM'
  | 'ENUM_VALUE'
  | 'INPUT_OBJECT'
  | 'INPUT_FIELD_DEFINITION';

/**
 * Path represents the key path from root to current field
 */
export interface Path {
  readonly prev: Path | undefined;
  readonly key: string | number;
}

/**
 * DataLoader registry for batching and caching
 */
export interface DataLoaderRegistry {
  get<K, V>(key: string): DataLoader<K, V> | undefined;
  set<K, V>(key: string, loader: DataLoader<K, V>): void;
  create<K, V>(
    key: string,
    batchFn: BatchLoadFn<K, V>,
    options?: DataLoaderOptions<K, V>
  ): DataLoader<K, V>;
}

/**
 * DataLoader interface
 */
export interface DataLoader<K, V> {
  load(key: K): Promise<V>;
  loadMany(keys: readonly K[]): Promise<ReadonlyArray<V | Error>>;
  clear(key: K): this;
  clearAll(): this;
  prime(key: K, value: V): this;
}

/**
 * Batch loading function for DataLoader
 */
export type BatchLoadFn<K, V> = (
  keys: readonly K[]
) => Promise<ReadonlyArray<V | Error>>;

/**
 * DataLoader options
 */
export interface DataLoaderOptions<K, V> {
  readonly cache?: boolean;
  readonly cacheKeyFn?: (key: K) => any;
  readonly cacheMap?: Map<any, Promise<V>>;
  readonly maxBatchSize?: number;
  readonly batchScheduleFn?: (callback: () => void) => void;
}

/**
 * Resolver map structure
 */
export interface ResolverMap {
  readonly [typeName: string]: {
    readonly [fieldName: string]: ResolverFunction | SubscriptionResolver;
  };
}

/**
 * Resolver module interface
 */
export interface IResolverModule {
  readonly name: string;
  readonly typeDefs?: string | DocumentNode;
  readonly resolvers: ResolverMap | (() => ResolverMap);
  readonly dataSources?: () => DataSources;
  readonly directives?: SchemaDirectives;
  readonly context?: (ctx: any) => any;
}

/**
 * Document node (GraphQL AST)
 */
export interface DocumentNode {
  readonly kind: 'Document';
  readonly definitions: readonly DefinitionNode[];
}

export type DefinitionNode =
  | OperationDefinition
  | FragmentDefinition
  | TypeSystemDefinitionNode;

export type TypeSystemDefinitionNode =
  | SchemaDefinitionNode
  | TypeDefinitionNode
  | DirectiveDefinitionNode;

export interface SchemaDefinitionNode {
  readonly kind: 'SchemaDefinition';
  readonly directives?: readonly DirectiveNode[];
  readonly operationTypes: readonly OperationTypeDefinitionNode[];
}

export interface OperationTypeDefinitionNode {
  readonly kind: 'OperationTypeDefinition';
  readonly operation: 'query' | 'mutation' | 'subscription';
  readonly type: NamedTypeNode;
}

export type TypeDefinitionNode =
  | ScalarTypeDefinitionNode
  | ObjectTypeDefinitionNode
  | InterfaceTypeDefinitionNode
  | UnionTypeDefinitionNode
  | EnumTypeDefinitionNode
  | InputObjectTypeDefinitionNode;

export interface ScalarTypeDefinitionNode {
  readonly kind: 'ScalarTypeDefinition';
  readonly name: NameNode;
  readonly description?: StringValueNode;
  readonly directives?: readonly DirectiveNode[];
}

export interface ObjectTypeDefinitionNode {
  readonly kind: 'ObjectTypeDefinition';
  readonly name: NameNode;
  readonly description?: StringValueNode;
  readonly interfaces?: readonly NamedTypeNode[];
  readonly directives?: readonly DirectiveNode[];
  readonly fields?: readonly FieldDefinitionNode[];
}

export interface FieldDefinitionNode {
  readonly kind: 'FieldDefinition';
  readonly name: NameNode;
  readonly description?: StringValueNode;
  readonly arguments?: readonly InputValueDefinitionNode[];
  readonly type: TypeNode;
  readonly directives?: readonly DirectiveNode[];
}

export interface InputValueDefinitionNode {
  readonly kind: 'InputValueDefinition';
  readonly name: NameNode;
  readonly description?: StringValueNode;
  readonly type: TypeNode;
  readonly defaultValue?: ValueNode;
  readonly directives?: readonly DirectiveNode[];
}

export interface InterfaceTypeDefinitionNode {
  readonly kind: 'InterfaceTypeDefinition';
  readonly name: NameNode;
  readonly description?: StringValueNode;
  readonly interfaces?: readonly NamedTypeNode[];
  readonly directives?: readonly DirectiveNode[];
  readonly fields?: readonly FieldDefinitionNode[];
}

export interface UnionTypeDefinitionNode {
  readonly kind: 'UnionTypeDefinition';
  readonly name: NameNode;
  readonly description?: StringValueNode;
  readonly directives?: readonly DirectiveNode[];
  readonly types?: readonly NamedTypeNode[];
}

export interface EnumTypeDefinitionNode {
  readonly kind: 'EnumTypeDefinition';
  readonly name: NameNode;
  readonly description?: StringValueNode;
  readonly directives?: readonly DirectiveNode[];
  readonly values?: readonly EnumValueDefinitionNode[];
}

export interface EnumValueDefinitionNode {
  readonly kind: 'EnumValueDefinition';
  readonly name: NameNode;
  readonly description?: StringValueNode;
  readonly directives?: readonly DirectiveNode[];
}

export interface InputObjectTypeDefinitionNode {
  readonly kind: 'InputObjectTypeDefinition';
  readonly name: NameNode;
  readonly description?: StringValueNode;
  readonly directives?: readonly DirectiveNode[];
  readonly fields?: readonly InputValueDefinitionNode[];
}

export interface DirectiveDefinitionNode {
  readonly kind: 'DirectiveDefinition';
  readonly name: NameNode;
  readonly description?: StringValueNode;
  readonly arguments?: readonly InputValueDefinitionNode[];
  readonly repeatable?: boolean;
  readonly locations: readonly NameNode[];
}

/**
 * Data sources registry
 */
export interface DataSources {
  readonly [name: string]: any;
}

/**
 * Schema directives
 */
export interface SchemaDirectives {
  readonly [name: string]: any;
}
