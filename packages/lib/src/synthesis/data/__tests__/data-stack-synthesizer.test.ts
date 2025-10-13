/**
 * Data Stack Synthesizer tests.
 */

import { DataStackSynthesizer } from '../data-stack-synthesizer';
import { synthesizeCosmosContainer } from '../cosmos-synthesizer';
import { synthesizeEventTopics } from '../event-synthesizer';
import { synthesizeResolvers } from '../resolver-synthesizer';
import {
  UserSchema,
  PostSchema,
  CommentSchema,
  CategorySchema,
  PostLikesSchema,
  PostCategoriesSchema,
} from '../../../schema/atakora/examples';

describe('DataStackSynthesizer', () => {
  describe('Individual Synthesizers', () => {
    it('should synthesize Cosmos container for UserSchema', () => {
      const config = synthesizeCosmosContainer(UserSchema);

      expect(config.containerName).toBe('User');
      expect(config.partitionKeyPath).toBe('/id');
      expect(config.indexingPolicy).toBeDefined();
      expect(config.indexingPolicy.automatic).toBe(true);

      // Should have unique key policy for email field
      expect(config.uniqueKeyPolicy).toBeDefined();
      expect(config.uniqueKeyPolicy?.uniqueKeys).toContainEqual({
        paths: ['/email'],
      });
    });

    it('should synthesize Cosmos container for PostSchema', () => {
      const config = synthesizeCosmosContainer(PostSchema);

      expect(config.containerName).toBe('Post');
      expect(config.partitionKeyPath).toBe('/id');

      // Should have unique key policy for slug field
      expect(config.uniqueKeyPolicy?.uniqueKeys).toContainEqual({
        paths: ['/slug'],
      });
    });

    it('should synthesize event topics for blog schemas', () => {
      const result = synthesizeEventTopics([UserSchema, PostSchema, CommentSchema]);

      expect(result.topics).toHaveLength(3);
      expect(result.topics.map((t) => t.entityName)).toEqual(
        expect.arrayContaining(['User', 'Post', 'Comment'])
      );

      // Should have subscriptions for relationships
      expect(result.subscriptions.length).toBeGreaterThan(0);

      // User should subscribe to Post events (User.posts relationship)
      const userPostSub = result.subscriptions.find(
        (s) => s.subscriberEntity === 'User' && s.relationshipName === 'posts'
      );
      expect(userPostSub).toBeDefined();
    });

    it('should synthesize resolvers for UserSchema', () => {
      const result = synthesizeResolvers(UserSchema);

      expect(result.stats.get).toBe(1);
      expect(result.stats.list).toBe(1);
      expect(result.stats.create).toBe(1);
      expect(result.stats.update).toBe(1);
      expect(result.stats.delete).toBe(1);

      // Should have relationship resolvers
      expect(result.stats.relationship).toBeGreaterThan(0);

      // Should have computed field resolvers
      expect(result.stats.computed).toBeGreaterThan(0);

      // Check specific resolver
      const getResolver = result.resolvers.find((r) => r.resolverName === 'getUser');
      expect(getResolver).toBeDefined();
      expect(getResolver?.operation).toBe('get');
      expect(getResolver?.requiresAuth).toBe(true);
    });
  });

  describe('Full Stack Synthesis', () => {
    it('should synthesize complete data stack for blog platform', () => {
      const synthesizer = new DataStackSynthesizer();
      const manifest = synthesizer.synthesize(
        [UserSchema, PostSchema, CommentSchema, CategorySchema, PostLikesSchema, PostCategoriesSchema],
        {
          outdir: './cdk.out',
          databaseName: 'BlogDB',
          enableEvents: true,
          enableGraphQL: true,
        }
      );

      // Verify Cosmos DB configuration
      expect(manifest.cosmos.databaseName).toBe('BlogDB');
      expect(manifest.cosmos.containers).toHaveLength(6);
      expect(manifest.cosmos.containers.map((c) => c.containerName)).toEqual(
        expect.arrayContaining(['User', 'Post', 'Comment', 'Category', 'PostLikes', 'PostCategories'])
      );

      // Verify Service Bus configuration
      expect(manifest.serviceBus.topics).toHaveLength(6);
      expect(manifest.serviceBus.subscriptions.length).toBeGreaterThan(0);

      // Verify GraphQL resolvers
      expect(manifest.resolvers.configs.length).toBeGreaterThan(0);
      expect(manifest.resolvers.stats.get).toBe(6); // One for each schema
      expect(manifest.resolvers.stats.create).toBe(6);

      // Verify dependency graph
      expect(manifest.dependencies.nodes.length).toBeGreaterThan(0);
      expect(manifest.dependencies.sortedIds.length).toBeGreaterThan(0);

      // Database should be first in sorted order (no dependencies)
      expect(manifest.dependencies.sortedIds[0]).toBe('database:BlogDB');

      // Verify metadata
      expect(manifest.metadata.schemaCount).toBe(6);
      expect(manifest.metadata.entityNames).toEqual(
        expect.arrayContaining(['User', 'Post', 'Comment', 'Category', 'PostLikes', 'PostCategories'])
      );
    });

    it('should handle incremental synthesis', () => {
      const synthesizer = new DataStackSynthesizer();
      const manifest = synthesizer.synthesize(
        [UserSchema, PostSchema, CommentSchema, CategorySchema, PostLikesSchema, PostCategoriesSchema],
        {
          outdir: './cdk.out',
          databaseName: 'BlogDB',
          incremental: true,
          changedSchemas: ['Post'], // Only Post schema changed
          enableEvents: true,
          enableGraphQL: true,
        }
      );

      // Should only synthesize Post and its dependents
      // In this case, User depends on Post (User.posts relationship)
      // So both Post and User should be synthesized
      expect(manifest.cosmos.containers.length).toBeGreaterThan(0);
    });

    it('should validate dependency graph has no circular dependencies', () => {
      const synthesizer = new DataStackSynthesizer();
      const manifest = synthesizer.synthesize(
        [UserSchema, PostSchema, CommentSchema, CategorySchema, PostLikesSchema, PostCategoriesSchema],
        {
          outdir: './cdk.out',
          databaseName: 'BlogDB',
          enableEvents: true,
          enableGraphQL: true,
        }
      );

      // Verify topological sort succeeded (no circular dependencies)
      expect(manifest.dependencies.sortedIds).toHaveLength(
        manifest.dependencies.nodes.length
      );
    });

    it('should respect enableEvents flag', () => {
      const synthesizer = new DataStackSynthesizer();
      const manifest = synthesizer.synthesize([UserSchema, PostSchema, PostLikesSchema, PostCategoriesSchema], {
        outdir: './cdk.out',
        enableEvents: false,
        enableGraphQL: true,
      });

      expect(manifest.serviceBus.topics).toHaveLength(0);
      expect(manifest.serviceBus.subscriptions).toHaveLength(0);
    });

    it('should respect enableGraphQL flag', () => {
      const synthesizer = new DataStackSynthesizer();
      const manifest = synthesizer.synthesize([UserSchema, PostSchema, PostLikesSchema, PostCategoriesSchema], {
        outdir: './cdk.out',
        enableEvents: true,
        enableGraphQL: false,
      });

      expect(manifest.resolvers.configs).toHaveLength(0);
      expect(manifest.resolvers.stats.get).toBe(0);
    });
  });

  describe('Validation', () => {
    it('should validate schemas before synthesis', () => {
      const synthesizer = new DataStackSynthesizer();

      // Create invalid schema (no name)
      const invalidSchema: any = {
        name: '', // Invalid: empty name
        fields: {} as any,
      };

      expect(() => {
        synthesizer.synthesize([invalidSchema], {
          outdir: './cdk.out',
        });
      }).toThrow(/Schema validation failed/);
    });

    it('should validate cross-schema relationships', () => {
      const synthesizer = new DataStackSynthesizer();

      // Post references User, but User is not in the list
      expect(() => {
        synthesizer.synthesize([PostSchema], {
          outdir: './cdk.out',
        });
      }).toThrow(/relationship validation failed/);
    });
  });
});
