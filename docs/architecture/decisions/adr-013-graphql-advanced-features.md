# ADR-012: GraphQL Advanced Features

## Context

Building on the resolver architecture defined in ADR-011, we need to implement advanced GraphQL features that are essential for production-ready APIs. These features include field-level authorization, real-time subscriptions, query complexity limiting, caching strategies, and custom directives.

Azure API Management provides some of these capabilities natively, but we need to design how they integrate with our TypeScript-first approach and ensure they work seamlessly in both Government and Commercial clouds.

Current requirements:
- Field-level authorization beyond simple role-based access
- Real-time subscriptions using Azure WebSocket and SignalR
- Query complexity analysis to prevent expensive operations
- Intelligent caching at the field level
- DataLoader patterns for efficient data fetching
- Schema validation and code generation
- Custom directives for cross-cutting concerns
- Introspection control for security

## Decision

We will implement a comprehensive suite of GraphQL advanced features that leverage Azure services while maintaining type safety and developer ergonomics.

### 1. Field-Level Authorization and Permissions

Authorization at the field level with support for multiple providers:

```typescript
// Field authorization configuration
export interface FieldAuthorization {
  readonly strategy: AuthorizationStrategy;
  readonly rules: AuthorizationRule[];
  readonly errorMessage?: string;
  readonly errorCode?: string;
}

export type AuthorizationStrategy =
  | 'any'    // Any rule passes
  | 'all'    // All rules must pass
  | 'custom'; // Custom logic

export interface AuthorizationRule {
  readonly type: AuthorizationType;
  readonly config: AuthorizationConfig;
}

export type AuthorizationType =
  | 'role'       // Role-based access control
  | 'claim'      // Claim-based access control
  | 'attribute'  // Attribute-based access control
  | 'policy'     // Azure Policy-based
  | 'custom';    // Custom authorization

// Role-based authorization
export interface RoleAuthorization {
  readonly type: 'role';
  readonly config: {
    readonly roles: string[];
    readonly requireAll?: boolean;
  };
}

// Claim-based authorization
export interface ClaimAuthorization {
  readonly type: 'claim';
  readonly config: {
    readonly claims: Record<string, any>;
    readonly match?: 'exact' | 'contains' | 'regex';
  };
}

// Attribute-based authorization (ABAC)
export interface AttributeAuthorization {
  readonly type: 'attribute';
  readonly config: {
    readonly attributes: AttributeRule[];
    readonly combinator?: 'AND' | 'OR';
  };
}

export interface AttributeRule {
  readonly subject: string;    // user.department
  readonly operator: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'lt';
  readonly value: any;
}

// Policy-based authorization (Azure Policy)
export interface PolicyAuthorization {
  readonly type: 'policy';
  readonly config: {
    readonly policyId: string;
    readonly parameters?: Record<string, any>;
  };
}

// Custom authorization function
export interface CustomAuthorization {
  readonly type: 'custom';
  readonly config: {
    readonly handler: AuthorizationHandler;
  };
}

export type AuthorizationHandler = (
  context: GraphQLResolverContext,
  source: any,
  args: any,
  info: GraphQLResolveInfo
) => Promise<boolean> | boolean;

// Authorization directive implementation
export class AuthorizationDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    const authorization = this.args as FieldAuthorization;

    field.resolve = async (source, args, context, info) => {
      // Check authorization
      const authorized = await this.checkAuthorization(
        authorization,
        context,
        source,
        args,
        info
      );

      if (!authorized) {
        throw new GraphQLAzureError(
          authorization.errorMessage || 'Unauthorized',
          authorization.errorCode || 'UNAUTHORIZED',
          401
        );
      }

      return resolve(source, args, context, info);
    };
  }

  private async checkAuthorization(
    authorization: FieldAuthorization,
    context: GraphQLResolverContext,
    source: any,
    args: any,
    info: GraphQLResolveInfo
  ): Promise<boolean> {
    const results = await Promise.all(
      authorization.rules.map(rule =>
        this.checkRule(rule, context, source, args, info)
      )
    );

    switch (authorization.strategy) {
      case 'any':
        return results.some(r => r);
      case 'all':
        return results.every(r => r);
      case 'custom':
        // Custom strategy implementation
        return true;
      default:
        return false;
    }
  }

  private async checkRule(
    rule: AuthorizationRule,
    context: GraphQLResolverContext,
    source: any,
    args: any,
    info: GraphQLResolveInfo
  ): Promise<boolean> {
    switch (rule.type) {
      case 'role':
        return this.checkRoleAuthorization(rule.config as RoleAuthorization['config'], context);
      case 'claim':
        return this.checkClaimAuthorization(rule.config as ClaimAuthorization['config'], context);
      case 'attribute':
        return this.checkAttributeAuthorization(rule.config as AttributeAuthorization['config'], context, source);
      case 'policy':
        return this.checkPolicyAuthorization(rule.config as PolicyAuthorization['config'], context);
      case 'custom':
        return (rule.config as CustomAuthorization['config']).handler(context, source, args, info);
      default:
        return false;
    }
  }

  private checkRoleAuthorization(
    config: RoleAuthorization['config'],
    context: GraphQLResolverContext
  ): boolean {
    if (!context.user) return false;

    const userRoles = context.user.roles || [];
    if (config.requireAll) {
      return config.roles.every(role => userRoles.includes(role));
    }
    return config.roles.some(role => userRoles.includes(role));
  }

  private checkClaimAuthorization(
    config: ClaimAuthorization['config'],
    context: GraphQLResolverContext
  ): boolean {
    if (!context.user) return false;

    const userClaims = context.user.claims || {};

    for (const [key, value] of Object.entries(config.claims)) {
      const userValue = userClaims[key];

      switch (config.match) {
        case 'exact':
          if (userValue !== value) return false;
          break;
        case 'contains':
          if (!String(userValue).includes(String(value))) return false;
          break;
        case 'regex':
          if (!new RegExp(String(value)).test(String(userValue))) return false;
          break;
        default:
          if (userValue !== value) return false;
      }
    }

    return true;
  }

  private checkAttributeAuthorization(
    config: AttributeAuthorization['config'],
    context: GraphQLResolverContext,
    source: any
  ): boolean {
    const results = config.attributes.map(attr => {
      const value = this.getAttributeValue(attr.subject, context, source);
      return this.evaluateOperator(value, attr.operator, attr.value);
    });

    return config.combinator === 'OR'
      ? results.some(r => r)
      : results.every(r => r);
  }

  private async checkPolicyAuthorization(
    config: PolicyAuthorization['config'],
    context: GraphQLResolverContext
  ): Promise<boolean> {
    // Call Azure Policy evaluation
    // This would integrate with Azure Policy service
    return true; // Placeholder
  }

  private getAttributeValue(path: string, context: GraphQLResolverContext, source: any): any {
    const parts = path.split('.');
    let value: any;

    switch (parts[0]) {
      case 'user':
        value = context.user;
        break;
      case 'source':
        value = source;
        break;
      case 'context':
        value = context;
        break;
      default:
        return undefined;
    }

    for (let i = 1; i < parts.length; i++) {
      value = value?.[parts[i]];
    }

    return value;
  }

  private evaluateOperator(value: any, operator: string, target: any): boolean {
    switch (operator) {
      case 'eq': return value === target;
      case 'ne': return value !== target;
      case 'in': return Array.isArray(target) && target.includes(value);
      case 'nin': return Array.isArray(target) && !target.includes(value);
      case 'gt': return value > target;
      case 'lt': return value < target;
      default: return false;
    }
  }
}

// Usage in schema
const typeDefs = gql`
  type User {
    id: ID!
    email: String! @auth(role: "user")
    salary: Float @auth(role: "admin")
    ssn: String @auth(roles: ["admin", "hr"], requireAll: false)
  }
`;
```

### 2. GraphQL Subscriptions with WebSockets

Real-time subscriptions using Azure WebSockets and SignalR:

```typescript
// Subscription configuration
export interface SubscriptionConfig {
  readonly transport: SubscriptionTransport;
  readonly connectionOptions?: ConnectionOptions;
  readonly authenticationOptions?: AuthenticationOptions;
  readonly scalingOptions?: ScalingOptions;
}

export type SubscriptionTransport =
  | 'websocket'    // Raw WebSocket
  | 'signalr'      // Azure SignalR Service
  | 'eventgrid'    // Azure Event Grid
  | 'servicebus';  // Azure Service Bus

// WebSocket subscription handler
export class WebSocketSubscriptionHandler {
  private connections: Map<string, SubscriptionConnection> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();

  constructor(
    private readonly config: SubscriptionConfig,
    private readonly pubsub: PubSubEngine
  ) {}

  // Handle new WebSocket connection
  async handleConnection(ws: WebSocket, request: IncomingMessage): Promise<void> {
    const connectionId = this.generateConnectionId();
    const context = await this.createConnectionContext(request);

    const connection: SubscriptionConnection = {
      id: connectionId,
      ws,
      context,
      subscriptions: new Set(),
      isAlive: true
    };

    this.connections.set(connectionId, connection);

    // Setup ping/pong for connection health
    this.setupHeartbeat(connection);

    // Handle messages
    ws.on('message', (data) => this.handleMessage(connectionId, data));
    ws.on('close', () => this.handleDisconnect(connectionId));
    ws.on('error', (error) => this.handleError(connectionId, error));

    // Send connection acknowledgment
    this.sendMessage(connectionId, {
      type: 'connection_ack',
      payload: { connectionId }
    });
  }

  // Handle subscription message
  private async handleMessage(connectionId: string, data: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'connection_init':
        await this.handleConnectionInit(connectionId, message.payload);
        break;
      case 'start':
        await this.handleSubscriptionStart(connectionId, message.id, message.payload);
        break;
      case 'stop':
        await this.handleSubscriptionStop(connectionId, message.id);
        break;
      case 'connection_terminate':
        await this.handleDisconnect(connectionId);
        break;
    }
  }

  // Start a subscription
  private async handleSubscriptionStart(
    connectionId: string,
    subscriptionId: string,
    payload: any
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      // Parse and validate subscription
      const { query, variables, operationName } = payload;
      const document = parse(query);

      // Execute subscription
      const result = await subscribe({
        schema: this.schema,
        document,
        variableValues: variables,
        operationName,
        contextValue: connection.context,
        rootValue: {}
      });

      if (isAsyncIterable(result)) {
        // Handle subscription iterator
        connection.subscriptions.add(subscriptionId);
        this.processSubscription(connectionId, subscriptionId, result);
      } else {
        // Send error
        this.sendMessage(connectionId, {
          id: subscriptionId,
          type: 'error',
          payload: result.errors
        });
      }
    } catch (error) {
      this.sendMessage(connectionId, {
        id: subscriptionId,
        type: 'error',
        payload: [{ message: error.message }]
      });
    }
  }

  // Process subscription events
  private async processSubscription(
    connectionId: string,
    subscriptionId: string,
    iterator: AsyncIterableIterator<ExecutionResult>
  ): Promise<void> {
    try {
      for await (const result of iterator) {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.subscriptions.has(subscriptionId)) {
          break;
        }

        this.sendMessage(connectionId, {
          id: subscriptionId,
          type: 'data',
          payload: result
        });
      }
    } catch (error) {
      this.sendMessage(connectionId, {
        id: subscriptionId,
        type: 'error',
        payload: [{ message: error.message }]
      });
    } finally {
      this.handleSubscriptionStop(connectionId, subscriptionId);
    }
  }

  // Stop a subscription
  private async handleSubscriptionStop(
    connectionId: string,
    subscriptionId: string
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.subscriptions.delete(subscriptionId);

    this.sendMessage(connectionId, {
      id: subscriptionId,
      type: 'complete'
    });
  }

  // Handle disconnection
  private async handleDisconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Clean up all subscriptions
    for (const subscriptionId of connection.subscriptions) {
      await this.handleSubscriptionStop(connectionId, subscriptionId);
    }

    // Close WebSocket
    connection.ws.close();
    this.connections.delete(connectionId);
  }

  // Send message to client
  private sendMessage(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.ws.send(JSON.stringify(message));
  }

  // Setup connection heartbeat
  private setupHeartbeat(connection: SubscriptionConnection): void {
    const interval = setInterval(() => {
      if (!connection.isAlive) {
        clearInterval(interval);
        this.handleDisconnect(connection.id);
        return;
      }

      connection.isAlive = false;
      connection.ws.ping();
    }, 30000);

    connection.ws.on('pong', () => {
      connection.isAlive = true;
    });
  }
}

// SignalR subscription handler
export class SignalRSubscriptionHandler {
  private hub: HubConnection;

  constructor(
    private readonly config: SignalRConfig,
    private readonly pubsub: PubSubEngine
  ) {
    this.hub = new HubConnectionBuilder()
      .withUrl(config.hubUrl, {
        accessTokenFactory: () => this.getAccessToken()
      })
      .withAutomaticReconnect()
      .build();
  }

  async start(): Promise<void> {
    await this.hub.start();
    this.setupSubscriptionHandlers();
  }

  private setupSubscriptionHandlers(): void {
    // Register GraphQL subscription handler
    this.hub.on('graphqlSubscription', async (subscriptionId: string, payload: any) => {
      const result = await this.executeSubscription(payload);

      if (isAsyncIterable(result)) {
        this.processSignalRSubscription(subscriptionId, result);
      }
    });
  }

  private async processSignalRSubscription(
    subscriptionId: string,
    iterator: AsyncIterableIterator<ExecutionResult>
  ): Promise<void> {
    for await (const result of iterator) {
      await this.hub.invoke('publishSubscriptionResult', subscriptionId, result);
    }
  }

  private async getAccessToken(): Promise<string> {
    // Get Azure AD token for SignalR
    return '';
  }
}

// PubSub implementation for subscriptions
export class AzurePubSub implements PubSubEngine {
  private eventHub?: EventHubProducerClient;
  private serviceBus?: ServiceBusClient;
  private subscribers: Map<string, Set<SubscriptionHandler>> = new Map();

  constructor(private readonly config: PubSubConfig) {
    this.initializeTransport();
  }

  private initializeTransport(): void {
    switch (this.config.transport) {
      case 'eventhub':
        this.eventHub = new EventHubProducerClient(
          this.config.connectionString,
          this.config.hubName
        );
        break;
      case 'servicebus':
        this.serviceBus = new ServiceBusClient(this.config.connectionString);
        break;
    }
  }

  async publish(triggerName: string, payload: any): Promise<void> {
    // Publish to Azure service
    if (this.eventHub) {
      await this.eventHub.sendBatch([{
        body: { trigger: triggerName, payload }
      }]);
    } else if (this.serviceBus) {
      const sender = this.serviceBus.createSender(this.config.topicName);
      await sender.sendMessages({
        subject: triggerName,
        body: payload
      });
    }

    // Local subscribers (for in-process subscriptions)
    const subscribers = this.subscribers.get(triggerName);
    if (subscribers) {
      for (const handler of subscribers) {
        handler(payload);
      }
    }
  }

  subscribe(
    triggerName: string,
    onMessage: SubscriptionHandler
  ): Promise<number> {
    if (!this.subscribers.has(triggerName)) {
      this.subscribers.set(triggerName, new Set());
    }

    this.subscribers.get(triggerName)!.add(onMessage);
    return Promise.resolve(this.subscribers.get(triggerName)!.size);
  }

  unsubscribe(subId: number): void {
    // Implementation for unsubscribe
  }
}
```

### 3. Query Complexity and Depth Limiting

Prevent expensive or malicious queries:

```typescript
// Query complexity configuration
export interface ComplexityConfig {
  readonly maxComplexity: number;
  readonly scalarCost?: number;
  readonly objectCost?: number;
  readonly listFactor?: number;
  readonly introspectionCost?: number;
  readonly depthLimit?: number;
  readonly customCalculators?: Map<string, ComplexityCalculator>;
}

export type ComplexityCalculator = (
  args: any,
  childComplexity: number
) => number;

// Query complexity analyzer
export class QueryComplexityAnalyzer {
  constructor(private readonly config: ComplexityConfig) {}

  analyze(
    query: DocumentNode,
    schema: GraphQLSchema,
    variables?: Record<string, any>
  ): ComplexityResult {
    const typeInfo = new TypeInfo(schema);
    const context: ComplexityContext = {
      complexity: 0,
      depth: 0,
      maxDepth: 0,
      errors: []
    };

    visit(
      query,
      visitWithTypeInfo(typeInfo, {
        Field: {
          enter: (node) => this.enterField(node, typeInfo, context, variables),
          leave: (node) => this.leaveField(node, context)
        }
      })
    );

    return {
      complexity: context.complexity,
      depth: context.maxDepth,
      errors: context.errors,
      isValid: this.isValid(context)
    };
  }

  private enterField(
    node: FieldNode,
    typeInfo: TypeInfo,
    context: ComplexityContext,
    variables?: Record<string, any>
  ): void {
    context.depth++;
    context.maxDepth = Math.max(context.maxDepth, context.depth);

    // Check depth limit
    if (this.config.depthLimit && context.depth > this.config.depthLimit) {
      context.errors.push({
        message: `Query depth ${context.depth} exceeds maximum depth ${this.config.depthLimit}`,
        field: node.name.value
      });
    }

    // Calculate field complexity
    const fieldDef = typeInfo.getFieldDef();
    if (!fieldDef) return;

    let fieldComplexity = this.getFieldComplexity(
      fieldDef,
      node,
      variables
    );

    // Apply list factor for array types
    const fieldType = typeInfo.getType();
    if (isListType(fieldType)) {
      const listSize = this.getListSize(node, variables);
      fieldComplexity *= listSize * (this.config.listFactor || 10);
    }

    context.complexity += fieldComplexity;
  }

  private leaveField(node: FieldNode, context: ComplexityContext): void {
    context.depth--;
  }

  private getFieldComplexity(
    fieldDef: GraphQLFieldDefinition,
    node: FieldNode,
    variables?: Record<string, any>
  ): number {
    // Check for custom calculator
    const customCalculator = this.config.customCalculators?.get(
      `${fieldDef.astNode?.name.value}.${fieldDef.name}`
    );

    if (customCalculator) {
      const args = this.getArgumentValues(node, variables);
      return customCalculator(args, 0);
    }

    // Check for complexity directive
    const complexityDirective = fieldDef.astNode?.directives?.find(
      d => d.name.value === 'complexity'
    );

    if (complexityDirective) {
      return this.parseComplexityDirective(complexityDirective, node, variables);
    }

    // Default complexity based on type
    if (isScalarType(fieldDef.type)) {
      return this.config.scalarCost || 1;
    }

    return this.config.objectCost || 2;
  }

  private getListSize(node: FieldNode, variables?: Record<string, any>): number {
    // Check for 'first', 'last', or 'limit' arguments
    const args = this.getArgumentValues(node, variables);

    return args.first || args.last || args.limit || 10;
  }

  private getArgumentValues(
    node: FieldNode,
    variables?: Record<string, any>
  ): Record<string, any> {
    const args: Record<string, any> = {};

    node.arguments?.forEach(arg => {
      const value = arg.value;

      if (value.kind === 'Variable') {
        args[arg.name.value] = variables?.[value.name.value];
      } else {
        args[arg.name.value] = this.parseValue(value);
      }
    });

    return args;
  }

  private parseValue(value: ValueNode): any {
    switch (value.kind) {
      case 'IntValue':
        return parseInt(value.value);
      case 'FloatValue':
        return parseFloat(value.value);
      case 'StringValue':
        return value.value;
      case 'BooleanValue':
        return value.value;
      case 'NullValue':
        return null;
      case 'ListValue':
        return value.values.map(v => this.parseValue(v));
      case 'ObjectValue':
        const obj: Record<string, any> = {};
        value.fields.forEach(field => {
          obj[field.name.value] = this.parseValue(field.value);
        });
        return obj;
      default:
        return null;
    }
  }

  private parseComplexityDirective(
    directive: DirectiveNode,
    node: FieldNode,
    variables?: Record<string, any>
  ): number {
    const valueArg = directive.arguments?.find(a => a.name.value === 'value');
    if (!valueArg) return 1;

    if (valueArg.value.kind === 'IntValue') {
      return parseInt(valueArg.value.value);
    }

    // Support multiplier syntax
    const multiplierArg = directive.arguments?.find(a => a.name.value === 'multipliers');
    if (multiplierArg && multiplierArg.value.kind === 'ListValue') {
      const args = this.getArgumentValues(node, variables);
      let complexity = 1;

      multiplierArg.value.values.forEach(multiplier => {
        if (multiplier.kind === 'StringValue') {
          const argName = multiplier.value;
          complexity *= args[argName] || 1;
        }
      });

      return complexity;
    }

    return 1;
  }

  private isValid(context: ComplexityContext): boolean {
    if (context.errors.length > 0) return false;
    if (context.complexity > this.config.maxComplexity) return false;
    if (this.config.depthLimit && context.maxDepth > this.config.depthLimit) return false;
    return true;
  }
}

// Complexity directive for schema
export const complexityDirective = new GraphQLDirective({
  name: 'complexity',
  description: 'Specifies the complexity score for a field',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    value: {
      type: GraphQLInt,
      description: 'Static complexity value'
    },
    multipliers: {
      type: new GraphQLList(GraphQLString),
      description: 'Field arguments that multiply complexity'
    }
  }
});

// Usage in schema
const typeDefs = gql`
  type Query {
    # Simple field with static complexity
    user(id: ID!): User @complexity(value: 3)

    # List field with multiplier
    users(first: Int = 10): [User!]! @complexity(multipliers: ["first"])

    # Complex search with high cost
    searchUsers(query: String!, limit: Int = 100): [User!]! @complexity(value: 10, multipliers: ["limit"])
  }
`;

// Complexity middleware
export function createComplexityMiddleware(config: ComplexityConfig) {
  return async (
    resolve: GraphQLFieldResolver<any, any>,
    parent: any,
    args: any,
    context: GraphQLResolverContext,
    info: GraphQLResolveInfo
  ) => {
    // Analyze query complexity
    const analyzer = new QueryComplexityAnalyzer(config);
    const result = analyzer.analyze(
      info.operation,
      info.schema,
      info.variableValues
    );

    if (!result.isValid) {
      throw new GraphQLAzureError(
        `Query exceeds maximum complexity of ${config.maxComplexity}`,
        'QUERY_TOO_COMPLEX',
        400,
        {
          complexity: result.complexity,
          maxComplexity: config.maxComplexity,
          depth: result.depth,
          errors: result.errors
        }
      );
    }

    // Log complexity metrics
    context.metrics.record('graphql.query.complexity', result.complexity, {
      operation: info.operation.name?.value,
      depth: result.depth
    });

    return resolve(parent, args, context, info);
  };
}
```

### 4. Field-Level Caching Strategies

Intelligent caching at the field level:

```typescript
// Field caching configuration
export interface FieldCachingStrategy {
  readonly ttl: number;              // Time to live in seconds
  readonly scope: CacheScope;        // private or public
  readonly key?: CacheKeyGenerator;  // Custom cache key
  readonly tags?: string[];          // Cache tags for invalidation
  readonly vary?: string[];          // Vary by headers/context
}

export type CacheScope = 'private' | 'public';

export type CacheKeyGenerator = (
  args: any,
  context: GraphQLResolverContext,
  info: GraphQLResolveInfo
) => string;

// Cache implementation with Redis
export class FieldLevelCache {
  private redis: RedisClient;
  private localCache: Map<string, CacheEntry> = new Map();

  constructor(private readonly config: CacheConfig) {
    this.redis = new RedisClient({
      host: config.redisHost,
      port: config.redisPort,
      password: config.redisPassword,
      db: config.redisDb
    });
  }

  async get<T>(key: string): Promise<T | null> {
    // Check local cache first
    const local = this.localCache.get(key);
    if (local && !this.isExpired(local)) {
      return local.value as T;
    }

    // Check Redis
    const cached = await this.redis.get(key);
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached);
      if (!this.isExpired(entry)) {
        // Update local cache
        this.localCache.set(key, entry);
        return entry.value as T;
      }
    }

    return null;
  }

  async set<T>(
    key: string,
    value: T,
    options: CacheSetOptions
  ): Promise<void> {
    const entry: CacheEntry = {
      value,
      ttl: options.ttl,
      timestamp: Date.now(),
      tags: options.tags || [],
      scope: options.scope || 'private'
    };

    // Set in Redis with TTL
    await this.redis.setex(
      key,
      options.ttl,
      JSON.stringify(entry)
    );

    // Set in local cache
    this.localCache.set(key, entry);

    // Index by tags
    if (options.tags) {
      for (const tag of options.tags) {
        await this.redis.sadd(`tag:${tag}`, key);
      }
    }
  }

  async invalidate(pattern: string): Promise<void> {
    // Invalidate by pattern
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      keys.forEach(key => this.localCache.delete(key));
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    // Get all keys with this tag
    const keys = await this.redis.smembers(`tag:${tag}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      keys.forEach(key => this.localCache.delete(key));
    }
    await this.redis.del(`tag:${tag}`);
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.timestamp + (entry.ttl * 1000);
  }
}

// Cache directive implementation
export class CacheDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    const cacheConfig = this.args as FieldCachingStrategy;

    field.resolve = async (source, args, context, info) => {
      // Generate cache key
      const cacheKey = this.generateCacheKey(
        cacheConfig,
        args,
        context,
        info
      );

      // Check cache
      const cached = await context.cache.get(cacheKey);
      if (cached !== null) {
        context.metrics.increment('graphql.cache.hit', {
          field: `${info.parentType.name}.${info.fieldName}`
        });
        return cached;
      }

      // Execute resolver
      const result = await resolve(source, args, context, info);

      // Cache result
      if (result !== null && result !== undefined) {
        await context.cache.set(cacheKey, result, {
          ttl: cacheConfig.ttl,
          scope: cacheConfig.scope,
          tags: cacheConfig.tags
        });

        // Set cache control headers
        this.setCacheControlHeaders(context, cacheConfig);
      }

      context.metrics.increment('graphql.cache.miss', {
        field: `${info.parentType.name}.${info.fieldName}`
      });

      return result;
    };
  }

  private generateCacheKey(
    config: FieldCachingStrategy,
    args: any,
    context: GraphQLResolverContext,
    info: GraphQLResolveInfo
  ): string {
    if (config.key) {
      return config.key(args, context, info);
    }

    const parts = [
      info.parentType.name,
      info.fieldName,
      JSON.stringify(args)
    ];

    // Add vary parameters
    if (config.vary) {
      for (const vary of config.vary) {
        if (vary.startsWith('header.')) {
          const header = vary.substring(7);
          parts.push(context.headers?.[header] || '');
        } else if (vary === 'user') {
          parts.push(context.user?.id || 'anonymous');
        }
      }
    }

    // Add scope
    if (config.scope === 'private' && context.user) {
      parts.push(`user:${context.user.id}`);
    }

    return crypto
      .createHash('sha256')
      .update(parts.join(':'))
      .digest('hex');
  }

  private setCacheControlHeaders(
    context: GraphQLResolverContext,
    config: FieldCachingStrategy
  ): void {
    if (!context.response) return;

    const cacheControl = [];

    if (config.scope === 'public') {
      cacheControl.push('public');
    } else {
      cacheControl.push('private');
    }

    cacheControl.push(`max-age=${config.ttl}`);

    context.response.setHeader(
      'Cache-Control',
      cacheControl.join(', ')
    );
  }
}

// Cache invalidation patterns
export class CacheInvalidationManager {
  constructor(private readonly cache: FieldLevelCache) {}

  // Invalidate on mutation
  async invalidateOnMutation(
    mutationType: string,
    args: any
  ): Promise<void> {
    const patterns = this.getInvalidationPatterns(mutationType);

    for (const pattern of patterns) {
      await this.cache.invalidate(pattern);
    }
  }

  // Invalidate by entity
  async invalidateEntity(
    entityType: string,
    entityId: string
  ): Promise<void> {
    await this.cache.invalidateByTag(`${entityType}:${entityId}`);
  }

  // Time-based invalidation
  scheduleInvalidation(
    pattern: string,
    schedule: string // CRON expression
  ): void {
    // Schedule periodic cache invalidation
  }

  private getInvalidationPatterns(mutationType: string): string[] {
    // Map mutation types to cache patterns
    const patterns: Record<string, string[]> = {
      'createUser': ['Query.users*', 'Query.userCount*'],
      'updateUser': ['Query.user:*', 'User.*'],
      'deleteUser': ['Query.user:*', 'Query.users*', 'Query.userCount*']
    };

    return patterns[mutationType] || [];
  }
}
```

### 5. DataLoader Patterns for N+1 Prevention

Efficient data loading with batching and caching:

```typescript
// DataLoader factory for Azure data sources
export class DataLoaderFactory {
  private loaders: Map<string, DataLoader<any, any>> = new Map();

  // Create Cosmos DB loader
  createCosmosLoader<K, V>(
    container: Container,
    options?: CosmosLoaderOptions
  ): DataLoader<K, V> {
    const batchFn: BatchLoadFn<K, V> = async (keys) => {
      const query = this.buildCosmosQuery(keys, options);
      const { resources } = await container.items
        .query<V>(query)
        .fetchAll();

      // Map results back to keys
      const resultMap = new Map<K, V>();
      resources.forEach(item => {
        const key = options?.keyField
          ? item[options.keyField]
          : item.id;
        resultMap.set(key, item);
      });

      return keys.map(key => resultMap.get(key) || null);
    };

    return new DataLoader(batchFn, {
      cache: options?.cache !== false,
      maxBatchSize: options?.maxBatchSize || 100,
      batchScheduleFn: options?.batchScheduleFn
    });
  }

  // Create SQL loader
  createSqlLoader<K, V>(
    connection: SqlConnection,
    table: string,
    options?: SqlLoaderOptions
  ): DataLoader<K, V> {
    const batchFn: BatchLoadFn<K, V> = async (keys) => {
      const query = this.buildSqlQuery(keys, table, options);
      const result = await connection.query<V>(query);

      // Map results back to keys
      const resultMap = new Map<K, V>();
      result.forEach(row => {
        const key = options?.keyField
          ? row[options.keyField]
          : row.id;
        resultMap.set(key, row);
      });

      return keys.map(key => resultMap.get(key) || null);
    };

    return new DataLoader(batchFn, {
      cache: options?.cache !== false,
      maxBatchSize: options?.maxBatchSize || 1000
    });
  }

  // Create Storage blob loader
  createBlobLoader(
    containerClient: ContainerClient,
    options?: BlobLoaderOptions
  ): DataLoader<string, Buffer> {
    const batchFn: BatchLoadFn<string, Buffer> = async (keys) => {
      const results = await Promise.all(
        keys.map(async (key) => {
          try {
            const blobClient = containerClient.getBlobClient(key);
            const response = await blobClient.download();
            return await this.streamToBuffer(response.readableStreamBody!);
          } catch (error) {
            return null;
          }
        })
      );

      return results;
    };

    return new DataLoader(batchFn, {
      cache: options?.cache !== false,
      maxBatchSize: options?.maxBatchSize || 10
    });
  }

  // Create Service Bus message loader
  createServiceBusLoader(
    receiver: ServiceBusReceiver,
    options?: ServiceBusLoaderOptions
  ): DataLoader<string, ServiceBusMessage> {
    const batchFn: BatchLoadFn<string, ServiceBusMessage> = async (keys) => {
      // Peek messages by sequence numbers
      const messages = await receiver.peekMessages(keys.length);

      const messageMap = new Map<string, ServiceBusMessage>();
      messages.forEach(msg => {
        messageMap.set(msg.messageId!, msg);
      });

      return keys.map(key => messageMap.get(key) || null);
    };

    return new DataLoader(batchFn, {
      cache: false, // Messages should not be cached
      maxBatchSize: options?.maxBatchSize || 100
    });
  }

  // Helper to build Cosmos query
  private buildCosmosQuery(keys: readonly any[], options?: CosmosLoaderOptions): SqlQuerySpec {
    const keyField = options?.keyField || 'id';
    const parameters = keys.map((key, index) => ({
      name: `@key${index}`,
      value: key
    }));

    const parameterNames = parameters.map(p => p.name).join(', ');

    return {
      query: `SELECT * FROM c WHERE c.${keyField} IN (${parameterNames})`,
      parameters
    };
  }

  // Helper to build SQL query
  private buildSqlQuery(keys: readonly any[], table: string, options?: SqlLoaderOptions): string {
    const keyField = options?.keyField || 'id';
    const placeholders = keys.map(() => '?').join(', ');

    return `SELECT * FROM ${table} WHERE ${keyField} IN (${placeholders})`;
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}

// DataLoader integration in resolvers
export function createDataLoaderContext(): DataLoaderRegistry {
  const factory = new DataLoaderFactory();
  const registry = new Map<string, DataLoader<any, any>>();

  return {
    get<K, V>(key: string): DataLoader<K, V> | undefined {
      return registry.get(key) as DataLoader<K, V>;
    },

    set<K, V>(key: string, loader: DataLoader<K, V>): void {
      registry.set(key, loader);
    },

    create<K, V>(
      key: string,
      batchFn: BatchLoadFn<K, V>,
      options?: DataLoaderOptions<K, V>
    ): DataLoader<K, V> {
      const loader = new DataLoader(batchFn, options);
      registry.set(key, loader);
      return loader;
    },

    // Azure-specific loaders
    cosmos<K, V>(
      container: Container,
      options?: CosmosLoaderOptions
    ): DataLoader<K, V> {
      const key = `cosmos:${container.id}`;
      let loader = registry.get(key) as DataLoader<K, V>;

      if (!loader) {
        loader = factory.createCosmosLoader<K, V>(container, options);
        registry.set(key, loader);
      }

      return loader;
    },

    sql<K, V>(
      connection: SqlConnection,
      table: string,
      options?: SqlLoaderOptions
    ): DataLoader<K, V> {
      const key = `sql:${table}`;
      let loader = registry.get(key) as DataLoader<K, V>;

      if (!loader) {
        loader = factory.createSqlLoader<K, V>(connection, table, options);
        registry.set(key, loader);
      }

      return loader;
    }
  };
}
```

### 6. Schema Validation and Code Generation

Build-time schema validation and TypeScript generation:

```typescript
// Schema validation configuration
export interface SchemaValidationConfig {
  readonly schemaPath: string;
  readonly resolversPath: string;
  readonly outputPath: string;
  readonly strict?: boolean;
  readonly customScalars?: Record<string, string>;
  readonly plugins?: CodegenPlugin[];
}

// Schema validator
export class GraphQLSchemaValidator {
  constructor(private readonly config: SchemaValidationConfig) {}

  async validate(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Load and parse schema
    const schema = await this.loadSchema();

    // Validate schema syntax
    const syntaxErrors = validateSchema(schema);
    if (syntaxErrors.length > 0) {
      errors.push(...syntaxErrors.map(e => ({
        type: 'syntax',
        message: e.message,
        location: e.locations?.[0]
      })));
    }

    // Load resolvers
    const resolvers = await this.loadResolvers();

    // Validate resolver completeness
    this.validateResolverCompleteness(schema, resolvers, errors, warnings);

    // Validate resolver types
    this.validateResolverTypes(schema, resolvers, errors, warnings);

    // Check for breaking changes
    if (this.config.strict) {
      await this.checkBreakingChanges(schema, errors);
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }

  private validateResolverCompleteness(
    schema: GraphQLSchema,
    resolvers: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const typeMap = schema.getTypeMap();

    for (const [typeName, type] of Object.entries(typeMap)) {
      if (isObjectType(type) && !typeName.startsWith('__')) {
        const fields = type.getFields();
        const typeResolvers = resolvers[typeName] || {};

        for (const [fieldName, field] of Object.entries(fields)) {
          // Check if resolver exists
          if (!typeResolvers[fieldName] && !this.hasDefaultResolver(field)) {
            warnings.push({
              type: 'missing-resolver',
              message: `Missing resolver for ${typeName}.${fieldName}`,
              location: { type: typeName, field: fieldName }
            });
          }
        }
      }
    }
  }

  private validateResolverTypes(
    schema: GraphQLSchema,
    resolvers: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Type checking would be done at compile time with generated types
    // This is a runtime check for additional validation
  }

  private async checkBreakingChanges(
    schema: GraphQLSchema,
    errors: ValidationError[]
  ): Promise<void> {
    // Load previous schema version
    const previousSchema = await this.loadPreviousSchema();
    if (!previousSchema) return;

    const changes = findBreakingChanges(previousSchema, schema);

    for (const change of changes) {
      errors.push({
        type: 'breaking-change',
        message: change.description,
        location: { type: change.type }
      });
    }
  }

  private hasDefaultResolver(field: GraphQLFieldDefinition): boolean {
    // Check if field can use default resolver
    return isScalarType(field.type) || isEnumType(field.type);
  }
}

// TypeScript code generator
export class GraphQLTypeGenerator {
  constructor(private readonly config: SchemaValidationConfig) {}

  async generate(): Promise<void> {
    const schema = await this.loadSchema();

    // Generate TypeScript types
    const typeDefinitions = this.generateTypes(schema);
    const resolverTypes = this.generateResolverTypes(schema);
    const contextType = this.generateContextType();

    // Write to file
    const output = `
      // Auto-generated GraphQL types
      // Do not edit manually

      ${this.generateImports()}

      ${typeDefinitions}

      ${resolverTypes}

      ${contextType}

      export type Resolvers<TContext = GraphQLResolverContext> = ${this.generateResolversType(schema)};
    `;

    await fs.writeFile(this.config.outputPath, output);
  }

  private generateTypes(schema: GraphQLSchema): string {
    const types: string[] = [];
    const typeMap = schema.getTypeMap();

    for (const [typeName, type] of Object.entries(typeMap)) {
      if (typeName.startsWith('__')) continue;

      if (isObjectType(type)) {
        types.push(this.generateObjectType(type));
      } else if (isInputObjectType(type)) {
        types.push(this.generateInputType(type));
      } else if (isEnumType(type)) {
        types.push(this.generateEnumType(type));
      } else if (isUnionType(type)) {
        types.push(this.generateUnionType(type));
      } else if (isInterfaceType(type)) {
        types.push(this.generateInterfaceType(type));
      }
    }

    return types.join('\n\n');
  }

  private generateObjectType(type: GraphQLObjectType): string {
    const fields = type.getFields();
    const fieldTypes: string[] = [];

    for (const [fieldName, field] of Object.entries(fields)) {
      const fieldType = this.getTypeScriptType(field.type);
      const nullable = !isNonNullType(field.type);

      fieldTypes.push(
        `  ${fieldName}${nullable ? '?' : ''}: ${fieldType};`
      );
    }

    return `export interface ${type.name} {\n${fieldTypes.join('\n')}\n}`;
  }

  private generateResolverTypes(schema: GraphQLSchema): string {
    const types: string[] = [];
    const typeMap = schema.getTypeMap();

    for (const [typeName, type] of Object.entries(typeMap)) {
      if (typeName.startsWith('__')) continue;
      if (!isObjectType(type)) continue;

      const fields = type.getFields();
      const resolverFields: string[] = [];

      for (const [fieldName, field] of Object.entries(fields)) {
        const args = this.generateArgs(field.args);
        const returnType = this.getTypeScriptType(field.type);

        resolverFields.push(
          `  ${fieldName}?: ResolverFn<${returnType}, Parent${typeName}, TContext, ${args}>;`
        );
      }

      types.push(`export interface ${typeName}Resolvers<TContext = GraphQLResolverContext> {
${resolverFields.join('\n')}
}`);
    }

    return types.join('\n\n');
  }

  private getTypeScriptType(type: GraphQLType): string {
    if (isNonNullType(type)) {
      return this.getTypeScriptType(type.ofType);
    }

    if (isListType(type)) {
      const innerType = this.getTypeScriptType(type.ofType);
      return `Array<${innerType}>`;
    }

    if (isScalarType(type)) {
      return this.getScalarType(type.name);
    }

    return type.toString();
  }

  private getScalarType(name: string): string {
    const scalarMap: Record<string, string> = {
      ID: 'string',
      String: 'string',
      Int: 'number',
      Float: 'number',
      Boolean: 'boolean',
      ...this.config.customScalars
    };

    return scalarMap[name] || 'any';
  }
}
```

### 7. Introspection Control

Security-focused introspection management:

```typescript
// Introspection configuration
export interface IntrospectionConfig {
  readonly enabled: boolean;
  readonly allowedEnvironments?: Environment[];
  readonly allowedRoles?: string[];
  readonly hiddenTypes?: string[];
  readonly hiddenFields?: Record<string, string[]>;
  readonly rateLimit?: RateLimitConfig;
}

// Introspection middleware
export class IntrospectionMiddleware {
  constructor(private readonly config: IntrospectionConfig) {}

  apply(schema: GraphQLSchema): GraphQLSchema {
    if (!this.config.enabled) {
      return this.disableIntrospection(schema);
    }

    return this.applyPartialIntrospection(schema);
  }

  private disableIntrospection(schema: GraphQLSchema): GraphQLSchema {
    return new GraphQLSchema({
      ...schema.toConfig(),
      query: this.wrapQueryType(schema.getQueryType()!, false)
    });
  }

  private applyPartialIntrospection(schema: GraphQLSchema): GraphQLSchema {
    const config = schema.toConfig();

    // Filter types
    if (this.config.hiddenTypes) {
      config.types = config.types?.filter(
        type => !this.config.hiddenTypes!.includes(type.name)
      );
    }

    // Filter fields
    if (this.config.hiddenFields) {
      for (const [typeName, fields] of Object.entries(this.config.hiddenFields)) {
        const type = schema.getType(typeName);
        if (isObjectType(type)) {
          this.filterFields(type, fields);
        }
      }
    }

    return new GraphQLSchema(config);
  }

  private wrapQueryType(
    queryType: GraphQLObjectType,
    allowIntrospection: boolean
  ): GraphQLObjectType {
    const fields = queryType.getFields();
    const wrappedFields: GraphQLFieldConfigMap<any, any> = {};

    for (const [fieldName, field] of Object.entries(fields)) {
      if (fieldName.startsWith('__') && !allowIntrospection) {
        continue; // Skip introspection fields
      }

      wrappedFields[fieldName] = {
        ...field,
        resolve: this.wrapResolver(field.resolve || defaultFieldResolver)
      };
    }

    return new GraphQLObjectType({
      name: queryType.name,
      fields: wrappedFields
    });
  }

  private wrapResolver(resolver: GraphQLFieldResolver<any, any>) {
    return async (source: any, args: any, context: any, info: any) => {
      // Check if introspection is allowed for this request
      if (info.fieldName.startsWith('__')) {
        if (!this.isIntrospectionAllowed(context)) {
          throw new GraphQLAzureError(
            'Introspection is not allowed',
            'INTROSPECTION_DISABLED',
            403
          );
        }

        // Apply rate limiting
        if (this.config.rateLimit) {
          await this.checkRateLimit(context);
        }
      }

      return resolver(source, args, context, info);
    };
  }

  private isIntrospectionAllowed(context: GraphQLResolverContext): boolean {
    // Check environment
    if (this.config.allowedEnvironments) {
      const currentEnv = process.env.NODE_ENV as Environment;
      if (!this.config.allowedEnvironments.includes(currentEnv)) {
        return false;
      }
    }

    // Check roles
    if (this.config.allowedRoles && context.user) {
      const hasRole = this.config.allowedRoles.some(
        role => context.user!.roles.includes(role)
      );
      if (!hasRole) {
        return false;
      }
    }

    return true;
  }

  private async checkRateLimit(context: GraphQLResolverContext): Promise<void> {
    // Implement rate limiting for introspection queries
  }

  private filterFields(type: GraphQLObjectType, hiddenFields: string[]): void {
    const config = type.toConfig();
    const fields = config.fields as GraphQLFieldConfigMap<any, any>;

    for (const fieldName of hiddenFields) {
      delete fields[fieldName];
    }
  }
}
```

### 8. Custom Directives

Extensible directive system for cross-cutting concerns:

```typescript
// Custom directive registry
export class DirectiveRegistry {
  private directives: Map<string, GraphQLDirective> = new Map();
  private implementations: Map<string, SchemaDirectiveVisitor> = new Map();

  // Register built-in directives
  registerBuiltInDirectives(): void {
    this.register('auth', AuthorizationDirective, authDirectiveDefinition);
    this.register('cache', CacheDirective, cacheDirectiveDefinition);
    this.register('deprecated', DeprecatedDirective, deprecatedDirectiveDefinition);
    this.register('rateLimit', RateLimitDirective, rateLimitDirectiveDefinition);
    this.register('complexity', ComplexityDirective, complexityDirectiveDefinition);
    this.register('validate', ValidateDirective, validateDirectiveDefinition);
    this.register('transform', TransformDirective, transformDirectiveDefinition);
  }

  register(
    name: string,
    implementation: typeof SchemaDirectiveVisitor,
    definition: GraphQLDirective
  ): void {
    this.directives.set(name, definition);
    this.implementations.set(name, implementation);
  }

  getDefinitions(): GraphQLDirective[] {
    return Array.from(this.directives.values());
  }

  apply(schema: GraphQLSchema): GraphQLSchema {
    const schemaDirectives: Record<string, typeof SchemaDirectiveVisitor> = {};

    for (const [name, implementation] of this.implementations) {
      schemaDirectives[name] = implementation;
    }

    return SchemaDirectiveVisitor.visitSchemaDirectives(
      schema,
      schemaDirectives
    );
  }
}

// Rate limit directive
export class RateLimitDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    const { limit, window } = this.args;

    field.resolve = async (source, args, context, info) => {
      const key = this.getRateLimitKey(context, info);
      const limiter = context.rateLimiter;

      const allowed = await limiter.check(key, limit, window);
      if (!allowed) {
        throw GraphQLAzureError.rateLimitExceeded(limit, window);
      }

      return resolve(source, args, context, info);
    };
  }

  private getRateLimitKey(
    context: GraphQLResolverContext,
    info: GraphQLResolveInfo
  ): string {
    const parts = [
      info.parentType.name,
      info.fieldName,
      context.user?.id || context.requestId
    ];

    return parts.join(':');
  }
}

// Validation directive
export class ValidateDirective extends SchemaDirectiveVisitor {
  visitArgumentDefinition(argument: GraphQLArgument) {
    const { pattern, min, max, required } = this.args;

    // Add validation metadata
    argument.extensions = {
      ...argument.extensions,
      validation: { pattern, min, max, required }
    };
  }

  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;

    field.resolve = async (source, args, context, info) => {
      // Validate arguments
      for (const [argName, argValue] of Object.entries(args)) {
        const argDef = field.args.find(a => a.name === argName);
        if (!argDef) continue;

        const validation = argDef.extensions?.validation;
        if (!validation) continue;

        this.validateValue(argName, argValue, validation);
      }

      return resolve(source, args, context, info);
    };
  }

  private validateValue(name: string, value: any, validation: any): void {
    const errors: string[] = [];

    if (validation.required && value == null) {
      errors.push(`${name} is required`);
    }

    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        errors.push(`${name} does not match pattern ${validation.pattern}`);
      }
    }

    if (validation.min != null) {
      if (typeof value === 'number' && value < validation.min) {
        errors.push(`${name} must be at least ${validation.min}`);
      }
      if (typeof value === 'string' && value.length < validation.min) {
        errors.push(`${name} must be at least ${validation.min} characters`);
      }
    }

    if (validation.max != null) {
      if (typeof value === 'number' && value > validation.max) {
        errors.push(`${name} must be at most ${validation.max}`);
      }
      if (typeof value === 'string' && value.length > validation.max) {
        errors.push(`${name} must be at most ${validation.max} characters`);
      }
    }

    if (errors.length > 0) {
      throw GraphQLAzureError.validationFailed(
        errors.map(message => ({ field: name, message }))
      );
    }
  }
}

// Transform directive
export class TransformDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    const { format, transform } = this.args;

    field.resolve = async (source, args, context, info) => {
      const result = await resolve(source, args, context, info);

      if (format) {
        return this.formatValue(result, format);
      }

      if (transform) {
        return this.transformValue(result, transform);
      }

      return result;
    };
  }

  private formatValue(value: any, format: string): any {
    switch (format) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'date':
        return new Date(value).toISOString();
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      default:
        return value;
    }
  }

  private transformValue(value: any, transform: string): any {
    // Custom transformation logic
    return value;
  }
}

// Directive definitions
const authDirectiveDefinition = new GraphQLDirective({
  name: 'auth',
  description: 'Requires authentication and authorization',
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
  args: {
    role: { type: GraphQLString },
    roles: { type: new GraphQLList(GraphQLString) },
    requireAll: { type: GraphQLBoolean }
  }
});

const cacheDirectiveDefinition = new GraphQLDirective({
  name: 'cache',
  description: 'Enables field-level caching',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    ttl: { type: new GraphQLNonNull(GraphQLInt) },
    scope: { type: GraphQLString },
    tags: { type: new GraphQLList(GraphQLString) }
  }
});

const rateLimitDirectiveDefinition = new GraphQLDirective({
  name: 'rateLimit',
  description: 'Applies rate limiting to a field',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    limit: { type: new GraphQLNonNull(GraphQLInt) },
    window: { type: new GraphQLNonNull(GraphQLString) }
  }
});
```

## Alternatives Considered

### Alternative 1: Azure API Management Native Features Only

Rely entirely on Azure API Management's built-in GraphQL features:

**Rejected because:**
- Limited customization options
- No TypeScript type safety
- Difficult to test locally
- Less control over advanced features

### Alternative 2: Third-Party GraphQL Solutions

Use Apollo Server or similar third-party GraphQL frameworks:

**Rejected because:**
- Not optimized for Azure services
- Additional dependencies and complexity
- May not support Government cloud
- Integration overhead with Azure API Management

### Alternative 3: Minimal Feature Set

Implement only basic GraphQL features without advanced capabilities:

**Rejected because:**
- Insufficient for production use cases
- Security vulnerabilities without proper authorization
- Performance issues without caching and batching
- Poor developer experience

## Consequences

### Positive Consequences

1. **Production Ready**: Complete feature set for enterprise GraphQL APIs
2. **Security**: Field-level authorization and introspection control
3. **Performance**: Caching, batching, and complexity limiting
4. **Real-time**: WebSocket subscriptions for live data
5. **Developer Experience**: Custom directives and code generation
6. **Azure Native**: Optimized for Azure services and clouds

### Negative Consequences

1. **Complexity**: Many moving parts to understand and maintain
2. **Learning Curve**: Developers need to understand advanced concepts
3. **Resource Usage**: Caching and subscriptions increase memory/compute needs
4. **Testing Overhead**: More features require more comprehensive testing

## Success Criteria

1. **Authorization Coverage**: 100% of sensitive fields protected
2. **Query Performance**: < 100ms p95 for typical queries
3. **Subscription Latency**: < 50ms for real-time updates
4. **Cache Hit Rate**: > 80% for frequently accessed data
5. **Type Safety**: 100% TypeScript coverage
6. **Introspection Security**: Zero unauthorized schema leaks

## Implementation Roadmap

### Phase 1: Authorization & Security (Week 1)
- Field-level authorization
- Introspection control
- Basic security directives

### Phase 2: Performance Features (Week 2)
- Query complexity analysis
- Field-level caching
- DataLoader implementation

### Phase 3: Real-time & Subscriptions (Week 3)
- WebSocket handler
- SignalR integration
- PubSub implementation

### Phase 4: Developer Tools (Week 4)
- Schema validation
- Code generation
- Custom directives

## Related Decisions

- **ADR-011**: GraphQL Resolver Architecture - Foundation for these features
- **ADR-010**: API Stack Architecture - Integration with GraphQLApiStack
- **Azure Functions API Design**: Function-based resolver implementation

## References

- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Azure API Management GraphQL](https://docs.microsoft.com/en-us/azure/api-management/graphql-api)
- [DataLoader Specification](https://github.com/graphql/dataloader)
- [GraphQL Subscriptions](https://www.apollographql.com/docs/apollo-server/data/subscriptions/)
- [GraphQL Security](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)