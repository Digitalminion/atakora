/**
 * CRUD Create Function Template
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
 * Validates request body against schema
 */
function validateRequest(body: any): string[] {
  const errors: string[] = [];

  for (const [field, def] of Object.entries(schema)) {
    const fieldDef = typeof def === 'string' ? { type: def } : (def as any);
    const value = body[field];

    // Check required fields
    if (fieldDef.required && (value === undefined || value === null)) {
      errors.push(`Field '${field}' is required`);
      continue;
    }

    // Type checking (if value is provided)
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
 * HTTP trigger function for creating ATAKORA_ENTITY_NAME
 */
app.http('create-ATAKORA_ENTITY_NAME_LOWER', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await request.json();

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

      // Generate ID and timestamps
      const now = new Date().toISOString();
      const item = {
        ...body,
        id: body.id || crypto.randomUUID(),
        ATAKORA_PARTITION_KEY: body.ATAKORA_PARTITION_KEY || body.id || crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      };

      // Create item in Cosmos DB
      const { resource } = await container.items.create(item);

      return {
        status: 201,
        jsonBody: resource
      };
    } catch (error: any) {
      context.error('Error creating ATAKORA_ENTITY_NAME:', error);

      if (error.code === 409) {
        return {
          status: 409,
          jsonBody: {
            error: 'ATAKORA_ENTITY_NAME already exists'
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
