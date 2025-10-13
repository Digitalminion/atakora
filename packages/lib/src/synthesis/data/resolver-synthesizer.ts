/**
 * Resolver Synthesizer - Generates GraphQL resolvers from Atakora schemas.
 *
 * @remarks
 * Transforms schema definitions into GraphQL resolver configurations:
 * - CRUD resolvers (get, list, create, update, delete)
 * - Relationship resolvers
 * - Computed field resolvers
 * - Authorization middleware integration
 *
 * @packageDocumentation
 */

import type { SchemaDefinition, AuthorizationRule } from '../../schema/atakora/schema-types';
import {
  getPrimaryKeyField,
  getRelationshipsByType,
} from '../../schema/atakora/define-schema';

/**
 * Resolver operation type.
 */
export enum ResolverOperation {
  GET = 'get',
  LIST = 'list',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  RELATIONSHIP = 'relationship',
  COMPUTED = 'computed',
  SUBSCRIPTION = 'subscription',
}

/**
 * Resolver configuration.
 */
export interface ResolverConfig {
  /**
   * Resolver name (e.g., 'getUser', 'listPosts', 'User.posts').
   */
  readonly resolverName: string;

  /**
   * Entity name this resolver is for.
   */
  readonly entityName: string;

  /**
   * Operation type.
   */
  readonly operation: ResolverOperation;

  /**
   * GraphQL field path (e.g., 'Query.getUser', 'User.posts').
   */
  readonly fieldPath: string;

  /**
   * Function handler name.
   */
  readonly handlerName: string;

  /**
   * Authorization rule (optional).
   */
  readonly authorization?: AuthorizationRule;

  /**
   * Cosmos DB query configuration (for direct DB access).
   */
  readonly cosmosQuery?: {
    readonly query: string;
    readonly parameters?: Record<string, string>;
  };

  /**
   * Relationship configuration (for relationship resolvers).
   */
  readonly relationship?: {
    readonly type: 'hasOne' | 'hasMany' | 'belongsTo' | 'manyToMany';
    readonly targetEntity: string;
    readonly foreignKey: string;
  };

  /**
   * Computed field configuration.
   */
  readonly computed?: {
    readonly returnType: string;
    readonly dependencies?: string[];
  };

  /**
   * Input type name (for mutations).
   */
  readonly inputType?: string;

  /**
   * Return type name.
   */
  readonly returnType: string;

  /**
   * Whether this resolver requires authentication.
   */
  readonly requiresAuth: boolean;

  /**
   * Middleware to apply.
   */
  readonly middleware?: string[];
}

/**
 * Resolver synthesis result.
 */
export interface ResolverSynthesisResult {
  /**
   * Resolver configurations.
   */
  readonly resolvers: ResolverConfig[];

  /**
   * Input types generated for mutations.
   */
  readonly inputTypes: Map<string, any>;

  /**
   * Resolver count by operation.
   */
  readonly stats: {
    readonly get: number;
    readonly list: number;
    readonly create: number;
    readonly update: number;
    readonly delete: number;
    readonly relationship: number;
    readonly computed: number;
    readonly subscription: number;
  };
}

/**
 * Synthesize GraphQL resolvers from schema.
 *
 * @param schema - Schema definition
 * @returns Resolver synthesis result
 *
 * @example
 * ```typescript
 * const result = synthesizeResolvers(UserSchema);
 * // Returns {
 * //   resolvers: [
 * //     { resolverName: 'getUser', operation: 'get', ... },
 * //     { resolverName: 'listUsers', operation: 'list', ... },
 * //     { resolverName: 'createUser', operation: 'create', ... },
 * //     ...
 * //   ],
 * //   inputTypes: Map { ... },
 * //   stats: { get: 1, list: 1, create: 1, ... }
 * // }
 * ```
 */
export function synthesizeResolvers(
  schema: SchemaDefinition<any>
): ResolverSynthesisResult {
  const resolvers: ResolverConfig[] = [];
  const inputTypes = new Map<string, any>();

  // Generate CRUD resolvers
  resolvers.push(buildGetResolver(schema));
  resolvers.push(buildListResolver(schema));
  resolvers.push(buildCreateResolver(schema, inputTypes));
  resolvers.push(buildUpdateResolver(schema, inputTypes));
  resolvers.push(buildDeleteResolver(schema));

  // Generate relationship resolvers
  if (schema.relationships) {
    for (const [relName, rel] of Object.entries(schema.relationships)) {
      const relResolver = buildRelationshipResolver(schema, relName, rel);
      resolvers.push(relResolver);
    }
  }

  // Generate computed field resolvers
  if (schema.computed) {
    for (const [fieldName, computed] of Object.entries(schema.computed)) {
      const computedResolver = buildComputedResolver(schema, fieldName, computed);
      resolvers.push(computedResolver);
    }
  }

  // Calculate statistics
  const stats = {
    get: resolvers.filter((r) => r.operation === ResolverOperation.GET).length,
    list: resolvers.filter((r) => r.operation === ResolverOperation.LIST).length,
    create: resolvers.filter((r) => r.operation === ResolverOperation.CREATE).length,
    update: resolvers.filter((r) => r.operation === ResolverOperation.UPDATE).length,
    delete: resolvers.filter((r) => r.operation === ResolverOperation.DELETE).length,
    relationship: resolvers.filter((r) => r.operation === ResolverOperation.RELATIONSHIP)
      .length,
    computed: resolvers.filter((r) => r.operation === ResolverOperation.COMPUTED).length,
    subscription: resolvers.filter((r) => r.operation === ResolverOperation.SUBSCRIPTION)
      .length,
  };

  return {
    resolvers,
    inputTypes,
    stats,
  };
}

/**
 * Build get resolver configuration.
 */
function buildGetResolver(schema: SchemaDefinition<any>): ResolverConfig {
  const entityName = schema.name;
  const primaryKey = getPrimaryKeyField(schema) || 'id';

  return {
    resolverName: `get${entityName}`,
    entityName,
    operation: ResolverOperation.GET,
    fieldPath: `Query.get${entityName}`,
    handlerName: `get${entityName}Handler`,
    authorization: schema.authorization?.read,
    cosmosQuery: {
      query: `SELECT * FROM c WHERE c.${primaryKey} = @${primaryKey}`,
      parameters: { [primaryKey]: `@${primaryKey}` },
    },
    returnType: entityName,
    requiresAuth: !!schema.authorization?.read,
    middleware: ['cors', 'logging'],
  };
}

/**
 * Build list resolver configuration.
 */
function buildListResolver(schema: SchemaDefinition<any>): ResolverConfig {
  const entityName = schema.name;

  return {
    resolverName: `list${entityName}s`,
    entityName,
    operation: ResolverOperation.LIST,
    fieldPath: `Query.list${entityName}s`,
    handlerName: `list${entityName}sHandler`,
    authorization: schema.authorization?.list || schema.authorization?.read,
    cosmosQuery: {
      query: `SELECT * FROM c ORDER BY c._ts DESC OFFSET @offset LIMIT @limit`,
      parameters: { offset: '@offset', limit: '@limit' },
    },
    returnType: `${entityName}Connection`,
    requiresAuth: !!(schema.authorization?.list || schema.authorization?.read),
    middleware: ['cors', 'logging', 'pagination'],
  };
}

/**
 * Build create resolver configuration.
 */
function buildCreateResolver(
  schema: SchemaDefinition<any>,
  inputTypes: Map<string, any>
): ResolverConfig {
  const entityName = schema.name;
  const inputTypeName = `Create${entityName}Input`;

  // Generate input type
  inputTypes.set(inputTypeName, {
    name: inputTypeName,
    fields: schema.fields,
  });

  return {
    resolverName: `create${entityName}`,
    entityName,
    operation: ResolverOperation.CREATE,
    fieldPath: `Mutation.create${entityName}`,
    handlerName: `create${entityName}Handler`,
    authorization: schema.authorization?.create,
    inputType: inputTypeName,
    returnType: entityName,
    requiresAuth: !!schema.authorization?.create,
    middleware: ['cors', 'logging', 'validation'],
  };
}

/**
 * Build update resolver configuration.
 */
function buildUpdateResolver(
  schema: SchemaDefinition<any>,
  inputTypes: Map<string, any>
): ResolverConfig {
  const entityName = schema.name;
  const inputTypeName = `Update${entityName}Input`;
  const primaryKey = getPrimaryKeyField(schema) || 'id';

  // Generate input type (partial)
  inputTypes.set(inputTypeName, {
    name: inputTypeName,
    fields: schema.fields,
    partial: true,
  });

  return {
    resolverName: `update${entityName}`,
    entityName,
    operation: ResolverOperation.UPDATE,
    fieldPath: `Mutation.update${entityName}`,
    handlerName: `update${entityName}Handler`,
    authorization: schema.authorization?.update,
    inputType: inputTypeName,
    returnType: entityName,
    requiresAuth: !!schema.authorization?.update,
    middleware: ['cors', 'logging', 'validation'],
  };
}

/**
 * Build delete resolver configuration.
 */
function buildDeleteResolver(schema: SchemaDefinition<any>): ResolverConfig {
  const entityName = schema.name;
  const primaryKey = getPrimaryKeyField(schema) || 'id';

  return {
    resolverName: `delete${entityName}`,
    entityName,
    operation: ResolverOperation.DELETE,
    fieldPath: `Mutation.delete${entityName}`,
    handlerName: `delete${entityName}Handler`,
    authorization: schema.authorization?.delete,
    returnType: entityName,
    requiresAuth: !!schema.authorization?.delete,
    middleware: ['cors', 'logging'],
  };
}

/**
 * Build relationship resolver configuration.
 */
function buildRelationshipResolver(
  schema: SchemaDefinition<any>,
  relationshipName: string,
  relationship: any
): ResolverConfig {
  const entityName = schema.name;

  return {
    resolverName: relationshipName,
    entityName,
    operation: ResolverOperation.RELATIONSHIP,
    fieldPath: `${entityName}.${relationshipName}`,
    handlerName: `${entityName}_${relationshipName}Handler`,
    relationship: {
      type: relationship.type,
      targetEntity: relationship.target || relationship.targets?.[0],
      foreignKey: relationship.foreignKey,
    },
    returnType:
      relationship.type === 'hasMany' || relationship.type === 'manyToMany'
        ? `[${relationship.target}]`
        : relationship.target,
    requiresAuth: !!schema.authorization?.read,
    middleware: ['cors', 'logging', 'dataLoader'],
  };
}

/**
 * Build computed field resolver configuration.
 */
function buildComputedResolver(
  schema: SchemaDefinition<any>,
  fieldName: string,
  computed: any
): ResolverConfig {
  const entityName = schema.name;

  return {
    resolverName: fieldName,
    entityName,
    operation: ResolverOperation.COMPUTED,
    fieldPath: `${entityName}.${fieldName}`,
    handlerName: `${entityName}_${fieldName}Handler`,
    computed: {
      returnType: computed.type,
      dependencies: computed.dependencies,
    },
    returnType: mapComputedType(computed.type),
    requiresAuth: false,
    middleware: computed.cache ? ['cors', 'logging', 'cache'] : ['cors', 'logging'],
  };
}

/**
 * Map computed field type to GraphQL type.
 */
function mapComputedType(type: string): string {
  switch (type) {
    case 'string':
      return 'String';
    case 'number':
      return 'Float';
    case 'boolean':
      return 'Boolean';
    case 'date':
      return 'DateTime';
    case 'array':
      return '[JSON]';
    case 'object':
      return 'JSON';
    default:
      return 'JSON';
  }
}

/**
 * Validate resolver synthesis result.
 */
export function validateResolverSynthesis(
  result: ResolverSynthesisResult
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate each resolver
  for (const resolver of result.resolvers) {
    if (!resolver.resolverName || resolver.resolverName.trim() === '') {
      errors.push(`Resolver for entity '${resolver.entityName}' has no name`);
    }

    if (!resolver.handlerName || resolver.handlerName.trim() === '') {
      errors.push(
        `Resolver '${resolver.resolverName}' for entity '${resolver.entityName}' has no handler name`
      );
    }

    // Validate authorization if required
    if (resolver.requiresAuth && !resolver.authorization) {
      errors.push(
        `Resolver '${resolver.resolverName}' requires auth but has no authorization config`
      );
    }
  }

  // Check for duplicate resolver names
  const resolverNames = new Set<string>();
  for (const resolver of result.resolvers) {
    const key = resolver.fieldPath;
    if (resolverNames.has(key)) {
      errors.push(`Duplicate resolver found: ${key}`);
    }
    resolverNames.add(key);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate resolver function code.
 *
 * @param config - Resolver configuration
 * @returns Function handler code as string
 */
export function generateResolverCode(config: ResolverConfig): string {
  const { resolverName, operation, entityName } = config;

  switch (operation) {
    case ResolverOperation.GET:
      return generateGetResolverCode(config);
    case ResolverOperation.LIST:
      return generateListResolverCode(config);
    case ResolverOperation.CREATE:
      return generateCreateResolverCode(config);
    case ResolverOperation.UPDATE:
      return generateUpdateResolverCode(config);
    case ResolverOperation.DELETE:
      return generateDeleteResolverCode(config);
    case ResolverOperation.RELATIONSHIP:
      return generateRelationshipResolverCode(config);
    case ResolverOperation.COMPUTED:
      return generateComputedResolverCode(config);
    default:
      return `// TODO: Implement ${resolverName} resolver`;
  }
}

function generateGetResolverCode(config: ResolverConfig): string {
  return `
export async function ${config.handlerName}(
  parent: any,
  args: { id: string },
  context: any
): Promise<${config.returnType} | null> {
  const { cosmosClient } = context;
  const container = cosmosClient.database('${config.entityName}DB').container('${config.entityName}');

  const { resource } = await container.item(args.id, args.id).read();
  return resource;
}
`.trim();
}

function generateListResolverCode(config: ResolverConfig): string {
  return `
export async function ${config.handlerName}(
  parent: any,
  args: { limit?: number; nextToken?: string },
  context: any
): Promise<${config.returnType}> {
  const { cosmosClient } = context;
  const container = cosmosClient.database('${config.entityName}DB').container('${config.entityName}');

  const limit = args.limit || 100;
  const query = 'SELECT * FROM c ORDER BY c._ts DESC OFFSET @offset LIMIT @limit';

  const { resources } = await container.items
    .query({ query, parameters: [{ name: '@offset', value: 0 }, { name: '@limit', value: limit }] })
    .fetchAll();

  return {
    items: resources,
    nextToken: undefined, // Implement pagination token logic
  };
}
`.trim();
}

function generateCreateResolverCode(config: ResolverConfig): string {
  return `
export async function ${config.handlerName}(
  parent: any,
  args: { input: ${config.inputType} },
  context: any
): Promise<${config.returnType}> {
  const { cosmosClient } = context;
  const container = cosmosClient.database('${config.entityName}DB').container('${config.entityName}');

  const now = new Date().toISOString();
  const item = {
    ...args.input,
    id: args.input.id || uuidv4(),
    createdAt: now,
    updatedAt: now,
  };

  const { resource } = await container.items.create(item);
  return resource;
}
`.trim();
}

function generateUpdateResolverCode(config: ResolverConfig): string {
  return `
export async function ${config.handlerName}(
  parent: any,
  args: { id: string; input: ${config.inputType} },
  context: any
): Promise<${config.returnType}> {
  const { cosmosClient } = context;
  const container = cosmosClient.database('${config.entityName}DB').container('${config.entityName}');

  const { resource: existing } = await container.item(args.id, args.id).read();
  if (!existing) {
    throw new Error('${config.entityName} not found');
  }

  const updated = {
    ...existing,
    ...args.input,
    updatedAt: new Date().toISOString(),
  };

  const { resource } = await container.item(args.id, args.id).replace(updated);
  return resource;
}
`.trim();
}

function generateDeleteResolverCode(config: ResolverConfig): string {
  return `
export async function ${config.handlerName}(
  parent: any,
  args: { id: string },
  context: any
): Promise<${config.returnType}> {
  const { cosmosClient } = context;
  const container = cosmosClient.database('${config.entityName}DB').container('${config.entityName}');

  const { resource } = await container.item(args.id, args.id).read();
  if (!resource) {
    throw new Error('${config.entityName} not found');
  }

  await container.item(args.id, args.id).delete();
  return resource;
}
`.trim();
}

function generateRelationshipResolverCode(config: ResolverConfig): string {
  const { relationship } = config;
  if (!relationship) return '';

  return `
export async function ${config.handlerName}(
  parent: ${config.entityName},
  args: any,
  context: any
): Promise<${config.returnType}> {
  const { cosmosClient } = context;
  const container = cosmosClient.database('${relationship.targetEntity}DB').container('${relationship.targetEntity}');

  const query = 'SELECT * FROM c WHERE c.${relationship.foreignKey} = @parentId';
  const { resources } = await container.items
    .query({ query, parameters: [{ name: '@parentId', value: parent.id }] })
    .fetchAll();

  ${relationship.type === 'hasMany' || relationship.type === 'manyToMany' ? 'return resources;' : 'return resources[0] || null;'}
}
`.trim();
}

function generateComputedResolverCode(config: ResolverConfig): string {
  return `
export async function ${config.handlerName}(
  parent: ${config.entityName},
  args: any,
  context: any
): Promise<${config.returnType}> {
  // TODO: Implement computed field logic
  return null;
}
`.trim();
}
