/**
 * CRUD List Function Template
 *
 * Replacement Tokens:
 * - ATAKORA_ENTITY_NAME: Entity name (e.g., "User")
 * - ATAKORA_ENTITY_NAME_PLURAL: Entity name plural (e.g., "Users")
 * - ATAKORA_ENTITY_NAME_PLURAL_LOWER: Entity name plural lowercase (e.g., "users")
 * - ATAKORA_DATABASE_NAME: Cosmos DB database name
 * - ATAKORA_CONTAINER_NAME: Cosmos DB container name
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

/**
 * HTTP trigger function for listing ATAKORA_ENTITY_NAME_PLURAL
 */
app.http('list-ATAKORA_ENTITY_NAME_PLURAL_LOWER', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ATAKORA_CONTAINER_NAME',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const queryParams = request.query;
      const limit = parseInt(queryParams.get('limit') || '100', 10);
      const continuationToken = queryParams.get('continuationToken');

      // Query all items with pagination
      const querySpec = {
        query: 'SELECT * FROM c ORDER BY c.createdAt DESC',
        parameters: []
      };

      const queryOptions = {
        maxItemCount: Math.min(limit, 1000),
        continuationToken: continuationToken || undefined
      };

      const { resources, continuationToken: nextToken } = await container.items
        .query(querySpec, queryOptions)
        .fetchNext();

      return {
        status: 200,
        jsonBody: {
          items: resources,
          continuationToken: nextToken || null,
          hasMore: !!nextToken
        }
      };
    } catch (error: any) {
      context.error('Error listing ATAKORA_ENTITY_NAME_PLURAL:', error);

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
