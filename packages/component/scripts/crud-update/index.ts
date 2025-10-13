/**
 * CRUD Update Function Template
 *
 * Replacement Tokens:
 * - ATAKORA_ENTITY_NAME: Entity name (e.g., "User")
 * - ATAKORA_ENTITY_NAME_LOWER: Entity name lowercase (e.g., "user")
 * - ATAKORA_DATABASE_NAME: Cosmos DB database name
 * - ATAKORA_CONTAINER_NAME: Cosmos DB container name
 * - ATAKORA_PARTITION_KEY: Partition key field name (without leading slash)
 * - ATAKORA_SCHEMA_JSON: JSON string of schema definition
 */

// @ts-nocheck
import { CosmosClient } from '@azure/cosmos';
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DefaultAzureCredential } from '@azure/identity';

// Initialize Cosmos DB client with managed identity
const credential = new DefaultAzureCredential({
  managedIdentityClientId: process.env.AZURE_CLIENT_ID
});

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  aadCredentials: credential
});

const database = cosmosClient.database('ATAKORA_DATABASE_NAME');
const container = database.container('ATAKORA_CONTAINER_NAME');

// Schema definition for validation
const schema: any = ATAKORA_SCHEMA_JSON;

/**
 * Validates request body against schema (for updates)
 */
function validateRequest(body: any): string[] {
  const errors: string[] = [];

  for (const [field, def] of Object.entries(schema)) {
    if (field === 'id' || field === 'createdAt') continue; // Skip immutable fields

    const fieldDef = typeof def === 'string' ? { type: def } : (def as any);
    const value = body[field];

    // For updates, fields are optional unless explicitly updating
    if (value !== undefined && value !== null) {
      const expectedType = fieldDef.type;
      const actualType = typeof value;

      if (expectedType === 'timestamp') {
        if (typeof value !== 'string' || isNaN(Date.parse(value))) {
          errors.push(`Field '${field}' must be a valid ISO 8601 timestamp`);
        }
      } else if (expectedType !== actualType) {
        errors.push(`Field '${field}' must be of type ${expectedType}`);
      }

      // Additional validation rules
      if (fieldDef.validation) {
        const rules = fieldDef.validation;

        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`Field '${field}' must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`Field '${field}' must be at most ${rules.maxLength} characters`);
        }
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`Field '${field}' must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`Field '${field}' must be at most ${rules.max}`);
        }
        if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
          errors.push(`Field '${field}' does not match required pattern`);
        }
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`Field '${field}' must be one of: ${rules.enum.join(', ')}`);
        }
      }
    }
  }

  return errors;
}

/**
 * HTTP trigger function for updating ATAKORA_ENTITY_NAME
 */
app.http('update-ATAKORA_ENTITY_NAME_LOWER', {
  methods: ['PUT', 'PATCH'],
  authLevel: 'anonymous',
  route: 'ATAKORA_CONTAINER_NAME/{id}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const id = request.params.id;
      const body = await request.json();

      if (!id) {
        return {
          status: 400,
          jsonBody: {
            error: 'ID is required'
          }
        };
      }

      // Validate request
      const errors = validateRequest(body);
      if (errors.length > 0) {
        return {
          status: 400,
          jsonBody: {
            error: 'Validation failed',
            details: errors
          }
        };
      }

      // Read existing item
      const { resource: existing } = await container.item(id, id).read();

      if (!existing) {
        return {
          status: 404,
          jsonBody: {
            error: 'ATAKORA_ENTITY_NAME not found'
          }
        };
      }

      // Merge updates (preserve id, createdAt, and partition key)
      const updated = {
        ...existing,
        ...body,
        id: existing.id,
        ATAKORA_PARTITION_KEY: existing.ATAKORA_PARTITION_KEY,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString()
      };

      // Replace item in Cosmos DB
      const { resource } = await container.item(id, id).replace(updated);

      return {
        status: 200,
        jsonBody: resource
      };
    } catch (error: any) {
      context.error('Error updating ATAKORA_ENTITY_NAME:', error);

      if (error.code === 404) {
        return {
          status: 404,
          jsonBody: {
            error: 'ATAKORA_ENTITY_NAME not found'
          }
        };
      }

      return {
        status: 500,
        jsonBody: {
          error: 'Internal server error',
          message: error.message
        }
      };
    }
  }
});
