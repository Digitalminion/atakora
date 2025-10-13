/**
 * Microsoft.DocumentDB resources for Azure CDK.
 *
 * This module provides constructs for Azure Cosmos DB.
 *
 * @packageDocumentation
 */

// Database Account
export * from './cosmos-db-types';
export * from './cosmos-db-arm';
export * from './cosmos-db';

// Database
export * from './cosmos-db-database-types';
export * from './cosmos-db-database-arm';
export * from './cosmos-db-database';

// Container
export * from './cosmos-db-container-types';
export * from './cosmos-db-container-arm';
export * from './cosmos-db-container';
