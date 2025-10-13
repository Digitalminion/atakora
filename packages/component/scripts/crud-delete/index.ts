/**
 * CRUD Delete Function Template
 *
 * Replacement Tokens:
 * - ATAKORA_ENTITY_NAME: Entity name (e.g., "User")
 * - ATAKORA_ENTITY_NAME_LOWER: Entity name lowercase (e.g., "user")
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
 * HTTP trigger function for deleting ATAKORA_ENTITY_NAME
 */
app.http('delete-ATAKORA_ENTITY_NAME_LOWER', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'ATAKORA_CONTAINER_NAME/{id}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const id = request.params.id;

      if (!id) {
        return {
          status: 400,
          jsonBody: {
            error: 'ID is required'
          }
        };
      }

      // Delete item from Cosmos DB
      await container.item(id, id).delete();

      return {
        status: 204
      };
    } catch (error: any) {
      context.error('Error deleting ATAKORA_ENTITY_NAME:', error);

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
