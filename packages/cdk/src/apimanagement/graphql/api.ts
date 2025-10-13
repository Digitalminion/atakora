/**
 * GraphQL API for Azure API Management
 *
 * Implements L1 (ARM) and L2 (intent-based) constructs for GraphQL APIs in Azure API Management.
 * Supports both pass-through and synthetic GraphQL APIs with resolver configuration.
 *
 * @module @atakora/cdk/apimanagement
 * @see ADR-011 GraphQL Resolver Architecture
 * @see ADR-012 GraphQL Advanced Features
 */

import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import {
  GraphQLApiType,
  type ArmGraphQLApiProps,
  type GraphQLApiProps,
  type IGraphQLApi,
  type GraphQLSchemaDefinition,
  type GraphQLObjectTypeDefinition,
  type GraphQLTypeDefinition,
} from './types';
import { ApiProtocol } from '../core/types';

/**
 * L1 construct for GraphQL API in Azure API Management.
 *
 * @remarks
 * Direct mapping to Microsoft.ApiManagement/service/apis ARM resource with GraphQL type.
 * This is a child resource of API Management service.
 *
 * **ARM Resource Type**: `Microsoft.ApiManagement/service/apis`
 * **API Version**: `2024-05-01`
 * **Deployment Scope**: ResourceGroup (as child resource)
 *
 * @example
 * ```typescript
 * const graphqlApi = new ArmGraphQLApi(apimService, 'GraphQLAPI', {
 *   apiManagementService: apimService,
 *   apiName: 'my-graphql-api',
 *   properties: {
 *     displayName: 'My GraphQL API',
 *     path: 'graphql',
 *     type: GraphQLApiType.GRAPHQL_SYNTHETIC,
 *     graphQLSchema: `
 *       type Query {
 *         hello: String
 *         user(id: ID!): User
 *       }
 *       type User {
 *         id: ID!
 *         name: String!
 *         email: String!
 *       }
 *     `
 *   }
 * });
 * ```
 */
export class ArmGraphQLApi extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.ApiManagement/service/apis';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-05-01';

  /**
   * Deployment scope.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Parent API Management service.
   */
  public readonly apiManagementService: any;

  /**
   * API name.
   */
  public readonly apiName: string;

  /**
   * Resource name (same as apiName).
   */
  public readonly name: string;

  /**
   * Display name.
   */
  public readonly displayName: string;

  /**
   * Description.
   */
  public readonly description?: string;

  /**
   * API path.
   */
  public readonly path: string;

  /**
   * GraphQL schema in SDL format.
   */
  public readonly graphQLSchema?: string;

  /**
   * GraphQL API type.
   */
  public readonly type: GraphQLApiType;

  /**
   * Backend service URL (for pass-through mode).
   */
  public readonly serviceUrl?: string;

  /**
   * Protocols.
   */
  public readonly protocols?: readonly ApiProtocol[];

  /**
   * Subscription required.
   */
  public readonly subscriptionRequired?: boolean;

  /**
   * API version string.
   */
  public readonly apiVersionStr?: string;

  /**
   * API version set ID.
   */
  public readonly apiVersionSetId?: string;

  /**
   * ARM resource ID.
   */
  public readonly resourceId: string;

  /**
   * API ID (alias for resourceId).
   */
  public readonly apiId: string;

  constructor(scope: Construct, id: string, props: ArmGraphQLApiProps) {
    super(scope, id);

    this.validateProps(props);

    this.apiManagementService = props.apiManagementService;
    this.apiName = props.apiName;
    this.name = props.apiName;
    this.displayName = props.properties.displayName;
    this.description = props.properties.description;
    this.path = props.properties.path;
    this.graphQLSchema = props.properties.graphQLSchema;
    this.type = props.properties.type;
    this.serviceUrl = props.properties.serviceUrl;
    this.protocols = props.properties.protocols;
    this.subscriptionRequired = props.properties.subscriptionRequired;
    this.apiVersionStr = props.properties.apiVersion;
    this.apiVersionSetId = props.properties.apiVersionSetId;

    this.resourceId = `${this.apiManagementService.apiManagementId}/apis/${this.apiName}`;
    this.apiId = this.resourceId;
  }

  protected validateProps(props: ArmGraphQLApiProps): void {
    if (!props.apiName || props.apiName.trim() === '') {
      throw new Error('API name cannot be empty');
    }

    if (!props.properties.displayName || props.properties.displayName.trim() === '') {
      throw new Error('Display name cannot be empty');
    }

    if (!props.properties.path || props.properties.path.trim() === '') {
      throw new Error('Path cannot be empty');
    }

    // Validate GraphQL schema is provided for synthetic APIs
    if (props.properties.type === 'graphql-synthetic' && !props.properties.graphQLSchema) {
      throw new Error('GraphQL schema is required for synthetic GraphQL APIs');
    }

    // Validate service URL is provided for pass-through APIs
    if (props.properties.type === 'graphql' && !props.properties.serviceUrl) {
      throw new Error('Service URL is required for pass-through GraphQL APIs');
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: any = {
      displayName: this.displayName,
      path: this.path,
      type: this.type,
    };

    if (this.description) {
      properties.description = this.description;
    }

    if (this.graphQLSchema) {
      properties.format = 'graphql-link';
      properties.value = this.graphQLSchema;
    }

    if (this.serviceUrl) {
      properties.serviceUrl = this.serviceUrl;
    }

    if (this.protocols && this.protocols.length > 0) {
      properties.protocols = [...this.protocols];
    }

    if (this.subscriptionRequired !== undefined) {
      properties.subscriptionRequired = this.subscriptionRequired;
    }

    if (this.apiVersionStr) {
      properties.apiVersion = this.apiVersionStr;
    }

    if (this.apiVersionSetId) {
      properties.apiVersionSetId = this.apiVersionSetId;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: `${this.apiManagementService.serviceName}/${this.apiName}`,
      properties,
      dependsOn: [this.apiManagementService.apiManagementId],
    } as ArmResource;
  }
}

/**
 * L2 construct for GraphQL API in Azure API Management.
 *
 * @remarks
 * Intent-based GraphQL API with sensible defaults and helper methods.
 * Supports both SDL string schemas and programmatic schema definitions.
 *
 * @example
 * **Simple GraphQL API with SDL schema:**
 * ```typescript
 * const graphqlApi = new GraphQLApi(apimService, 'MyAPI', {
 *   apiManagementService: apimService,
 *   displayName: 'My GraphQL API',
 *   schema: `
 *     type Query {
 *       hello: String
 *       users: [User!]!
 *     }
 *     type User {
 *       id: ID!
 *       name: String!
 *       email: String!
 *     }
 *   `
 * });
 * ```
 *
 * @example
 * **Pass-through GraphQL API (proxy to backend):**
 * ```typescript
 * const graphqlApi = new GraphQLApi(apimService, 'BackendAPI', {
 *   apiManagementService: apimService,
 *   displayName: 'Backend GraphQL API',
 *   type: GraphQLApiType.GRAPHQL,
 *   serviceUrl: 'https://my-backend.azurewebsites.net/graphql',
 *   schema: '' // Schema will be fetched from backend
 * });
 * ```
 *
 * @example
 * **Synthetic GraphQL API with programmatic schema:**
 * ```typescript
 * const graphqlApi = new GraphQLApi(apimService, 'SyntheticAPI', {
 *   apiManagementService: apimService,
 *   displayName: 'Synthetic GraphQL API',
 *   schema: {
 *     query: {
 *       name: 'Query',
 *       fields: {
 *         hello: {
 *           type: 'String',
 *           description: 'Returns a greeting'
 *         },
 *         user: {
 *           type: 'User',
 *           args: {
 *             id: { type: 'ID!' }
 *           }
 *         }
 *       }
 *     },
 *     types: [
 *       {
 *         name: 'User',
 *         fields: {
 *           id: { type: 'ID!' },
 *           name: { type: 'String!' },
 *           email: { type: 'String!' }
 *         }
 *       }
 *     ]
 *   }
 * });
 * ```
 */
export class GraphQLApi extends Construct implements IGraphQLApi {
  private readonly armApi: ArmGraphQLApi;

  /**
   * API name.
   */
  public readonly apiName: string;

  /**
   * API path.
   */
  public readonly path: string;

  /**
   * API resource ID.
   */
  public readonly apiId: string;

  /**
   * GraphQL schema in SDL format.
   */
  public readonly graphQLSchema?: string;

  constructor(scope: Construct, id: string, props: GraphQLApiProps) {
    super(scope, id);

    this.apiName = props.apiName ?? this.sanitizeApiName(id);
    this.path = props.path ?? this.apiName;
    this.graphQLSchema = this.normalizeSchema(props.schema);

    this.armApi = new ArmGraphQLApi(scope, `${id}-Resource`, {
      apiManagementService: props.apiManagementService,
      apiName: this.apiName,
      properties: {
        displayName: props.displayName,
        description: props.description,
        path: this.path,
        graphQLSchema: this.graphQLSchema,
        type: props.type ?? GraphQLApiType.GRAPHQL_SYNTHETIC,
        serviceUrl: props.serviceUrl,
        protocols: props.protocols ?? [ApiProtocol.HTTPS],
        subscriptionRequired: props.subscriptionRequired ?? true,
        apiVersion: props.apiVersion,
        apiVersionSetId: props.apiVersionSetId,
      },
    });

    this.apiId = this.armApi.apiId;
  }

  /**
   * Sanitizes a construct ID to create a valid API name.
   *
   * @param id - Construct ID
   * @returns Sanitized API name
   */
  private sanitizeApiName(id: string): string {
    return id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }

  /**
   * Normalizes schema input to SDL string.
   *
   * @param schema - Schema definition (string or object)
   * @returns SDL string or undefined
   */
  private normalizeSchema(schema: string | GraphQLSchemaDefinition): string | undefined {
    if (typeof schema === 'string') {
      return schema || undefined;
    }

    // If schema object has SDL property, use it
    if (schema.sdl) {
      return schema.sdl;
    }

    // Generate SDL from programmatic schema definition
    return this.generateSDL(schema);
  }

  /**
   * Generates GraphQL SDL from programmatic schema definition.
   *
   * @param schema - Schema definition object
   * @returns SDL string
   */
  private generateSDL(schema: GraphQLSchemaDefinition): string {
    const sdlParts: string[] = [];

    // Add directives
    if (schema.directives && schema.directives.length > 0) {
      schema.directives.forEach(directive => {
        sdlParts.push(this.generateDirectiveSDL(directive));
      });
      sdlParts.push('');
    }

    // Add schema definition if needed
    if (schema.query || schema.mutation || schema.subscription) {
      const schemaDef: string[] = ['schema {'];
      if (schema.query) {
        schemaDef.push(`  query: ${schema.query.name}`);
      }
      if (schema.mutation) {
        schemaDef.push(`  mutation: ${schema.mutation.name}`);
      }
      if (schema.subscription) {
        schemaDef.push(`  subscription: ${schema.subscription.name}`);
      }
      schemaDef.push('}');
      sdlParts.push(schemaDef.join('\n'));
      sdlParts.push('');
    }

    // Add query type
    if (schema.query) {
      sdlParts.push(this.generateObjectTypeSDL(schema.query));
      sdlParts.push('');
    }

    // Add mutation type
    if (schema.mutation) {
      sdlParts.push(this.generateObjectTypeSDL(schema.mutation));
      sdlParts.push('');
    }

    // Add subscription type
    if (schema.subscription) {
      sdlParts.push(this.generateObjectTypeSDL(schema.subscription));
      sdlParts.push('');
    }

    // Add additional types
    if (schema.types && schema.types.length > 0) {
      schema.types.forEach(type => {
        sdlParts.push(this.generateTypeSDL(type));
        sdlParts.push('');
      });
    }

    return sdlParts.join('\n').trim();
  }

  /**
   * Generates SDL for a directive definition.
   */
  private generateDirectiveSDL(directive: any): string {
    const parts: string[] = [];

    if (directive.description) {
      parts.push(`"""${directive.description}"""`);
    }

    let directiveLine = `directive @${directive.name}`;

    if (directive.args && Object.keys(directive.args).length > 0) {
      const args = Object.entries(directive.args)
        .map(([name, arg]: [string, any]) => {
          return `${name}: ${arg.type}${arg.defaultValue !== undefined ? ` = ${JSON.stringify(arg.defaultValue)}` : ''}`;
        })
        .join(', ');
      directiveLine += `(${args})`;
    }

    if (directive.repeatable) {
      directiveLine += ' repeatable';
    }

    directiveLine += ` on ${directive.locations.join(' | ')}`;

    parts.push(directiveLine);

    return parts.join('\n');
  }

  /**
   * Generates SDL for an object type definition.
   */
  private generateObjectTypeSDL(type: GraphQLObjectTypeDefinition): string {
    const parts: string[] = [];

    if (type.description) {
      parts.push(`"""${type.description}"""`);
    }

    let typeLine = `type ${type.name}`;

    if (type.interfaces && type.interfaces.length > 0) {
      typeLine += ` implements ${type.interfaces.join(' & ')}`;
    }

    typeLine += ' {';
    parts.push(typeLine);

    // Add fields
    Object.entries(type.fields).forEach(([fieldName, field]) => {
      const fieldLines: string[] = [];

      if (field.description) {
        fieldLines.push(`  """${field.description}"""`);
      }

      let fieldDef = `  ${fieldName}`;

      if (field.args && Object.keys(field.args).length > 0) {
        const args = Object.entries(field.args)
          .map(([argName, arg]) => {
            let argDef = `${argName}: ${arg.type}`;
            if (arg.defaultValue !== undefined) {
              argDef += ` = ${JSON.stringify(arg.defaultValue)}`;
            }
            return argDef;
          })
          .join(', ');
        fieldDef += `(${args})`;
      }

      fieldDef += `: ${field.type}`;

      if (field.deprecationReason) {
        fieldDef += ` @deprecated(reason: "${field.deprecationReason}")`;
      }

      fieldLines.push(fieldDef);
      parts.push(fieldLines.join('\n'));
    });

    parts.push('}');

    return parts.join('\n');
  }

  /**
   * Generates SDL for a type definition.
   */
  private generateTypeSDL(type: GraphQLTypeDefinition): string {
    if ('kind' in type) {
      switch (type.kind) {
        case 'INPUT_OBJECT':
          return this.generateInputObjectTypeSDL(type);
        case 'ENUM':
          return this.generateEnumTypeSDL(type);
        case 'UNION':
          return this.generateUnionTypeSDL(type);
        case 'INTERFACE':
          return this.generateInterfaceTypeSDL(type);
      }
    }

    // Default: treat as object type
    return this.generateObjectTypeSDL(type as GraphQLObjectTypeDefinition);
  }

  /**
   * Generates SDL for an input object type.
   */
  private generateInputObjectTypeSDL(type: any): string {
    const parts: string[] = [];

    if (type.description) {
      parts.push(`"""${type.description}"""`);
    }

    parts.push(`input ${type.name} {`);

    Object.entries(type.fields).forEach(([fieldName, field]: [string, any]) => {
      const fieldLines: string[] = [];

      if (field.description) {
        fieldLines.push(`  """${field.description}"""`);
      }

      let fieldDef = `  ${fieldName}: ${field.type}`;

      if (field.defaultValue !== undefined) {
        fieldDef += ` = ${JSON.stringify(field.defaultValue)}`;
      }

      fieldLines.push(fieldDef);
      parts.push(fieldLines.join('\n'));
    });

    parts.push('}');

    return parts.join('\n');
  }

  /**
   * Generates SDL for an enum type.
   */
  private generateEnumTypeSDL(type: any): string {
    const parts: string[] = [];

    if (type.description) {
      parts.push(`"""${type.description}"""`);
    }

    parts.push(`enum ${type.name} {`);

    Object.entries(type.values).forEach(([valueName, value]: [string, any]) => {
      const valueLines: string[] = [];

      if (value.description) {
        valueLines.push(`  """${value.description}"""`);
      }

      let valueDef = `  ${valueName}`;

      if (value.deprecationReason) {
        valueDef += ` @deprecated(reason: "${value.deprecationReason}")`;
      }

      valueLines.push(valueDef);
      parts.push(valueLines.join('\n'));
    });

    parts.push('}');

    return parts.join('\n');
  }

  /**
   * Generates SDL for a union type.
   */
  private generateUnionTypeSDL(type: any): string {
    const parts: string[] = [];

    if (type.description) {
      parts.push(`"""${type.description}"""`);
    }

    parts.push(`union ${type.name} = ${type.types.join(' | ')}`);

    return parts.join('\n');
  }

  /**
   * Generates SDL for an interface type.
   */
  private generateInterfaceTypeSDL(type: any): string {
    const parts: string[] = [];

    if (type.description) {
      parts.push(`"""${type.description}"""`);
    }

    let typeLine = `interface ${type.name}`;

    if (type.interfaces && type.interfaces.length > 0) {
      typeLine += ` implements ${type.interfaces.join(' & ')}`;
    }

    typeLine += ' {';
    parts.push(typeLine);

    // Add fields (same as object type)
    Object.entries(type.fields).forEach(([fieldName, field]: [string, any]) => {
      const fieldLines: string[] = [];

      if (field.description) {
        fieldLines.push(`  """${field.description}"""`);
      }

      let fieldDef = `  ${fieldName}`;

      if (field.args && Object.keys(field.args).length > 0) {
        const args = Object.entries(field.args)
          .map(([argName, arg]: [string, any]) => {
            let argDef = `${argName}: ${arg.type}`;
            if (arg.defaultValue !== undefined) {
              argDef += ` = ${JSON.stringify(arg.defaultValue)}`;
            }
            return argDef;
          })
          .join(', ');
        fieldDef += `(${args})`;
      }

      fieldDef += `: ${field.type}`;

      if (field.deprecationReason) {
        fieldDef += ` @deprecated(reason: "${field.deprecationReason}")`;
      }

      fieldLines.push(fieldDef);
      parts.push(fieldLines.join('\n'));
    });

    parts.push('}');

    return parts.join('\n');
  }
}
