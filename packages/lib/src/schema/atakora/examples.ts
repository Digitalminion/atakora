/**
 * Example schema definitions using Atakora Data Schema DSL.
 *
 * @remarks
 * Complete examples showing how to define data models with relationships,
 * authorization, indexes, hooks, and computed fields.
 *
 * @packageDocumentation
 */

import { defineSchema, Fields, allow, hasMany, belongsTo, manyToMany, z } from './index';
import type { InferSchemaType } from './schema-types';

// ============================================================================
// BLOG PLATFORM EXAMPLE
// ============================================================================

/**
 * User schema with full features.
 */
export const UserSchema = defineSchema('User', {
  fields: z.object({
    id: Fields.id(),
    email: Fields.email().unique().build(),
    name: z.string().min(2).max(100),
    bio: z.string().max(500).optional(),
    role: z.enum(['admin', 'author', 'reader']).default('reader'),
    avatarUrl: z.string().url().optional(),
    createdAt: Fields.createdAt(),
    updatedAt: Fields.updatedAt(),
  }),

  authorization: {
    create: allow.public(), // Anyone can register
    read: allow.public(), // Public profiles
    update: allow.owner('id'),
    delete: allow.role('admin'),
    fields: {
      email: allow.owner('id'), // Email is private
    },
  },

  indexes: {
    byEmail: { fields: ['email'], unique: true },
    byRole: { fields: ['role', 'createdAt'] },
  },

  relationships: {
    posts: hasMany('Post', 'authorId', {
      cascade: { onDelete: 'set null' },
    }),
    comments: hasMany('Comment', 'userId'),
    likedPosts: manyToMany('Post', 'PostLikes'),
  },

  hooks: {
    beforeCreate: async (data, context) => {
      // Normalize email
      data.email = data.email.toLowerCase().trim();
      return data;
    },
    afterCreate: async (data, context) => {
      // Send welcome email (placeholder)
      console.log(`Welcome email sent to: ${data.email}`);
    },
  },

  computed: {
    postCount: {
      type: 'number',
      compute: async (user, context) => {
        // Would query posts table
        return context.related?.posts?.length ?? 0;
      },
      cache: true,
      cacheTtl: 300, // 5 minutes
    },
    isAdmin: {
      type: 'boolean',
      compute: (user) => user.role === 'admin',
    },
  },

  metadata: {
    displayName: 'User',
    pluralName: 'Users',
    description: 'User accounts for the blog platform',
    icon: '👤',
    tags: ['authentication', 'users'],
  },
});

/**
 * Post schema with authorization and relationships.
 */
export const PostSchema = defineSchema('Post', {
  fields: z.object({
    id: Fields.id(),
    title: z.string().min(1).max(200),
    slug: Fields.slug(),
    content: z.string().min(10),
    excerpt: z.string().max(300).optional(),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
    authorId: z.string().uuid(),
    publishedAt: z.date().optional(),
    featuredImage: Fields.image(),
    tags: Fields.tags(),
    metadata: Fields.metadata(),
    viewCount: z.number().int().nonnegative().default(0),
    createdAt: Fields.createdAt(),
    updatedAt: Fields.updatedAt(),
  }),

  authorization: {
    create: allow.authenticated(),
    read: allow.if((context, post) => {
      if (post.status === 'published') return true;
      if (post.authorId === context.user?.id) return true;
      if (context.user?.roles?.includes('admin')) return true;
      return false;
    }),
    update: allow.owner('authorId'),
    delete: allow.owner('authorId'),
  },

  indexes: {
    bySlug: { fields: ['slug'], unique: true },
    byAuthor: { fields: ['authorId', 'status', 'publishedAt'] },
    byStatus: { fields: ['status', 'publishedAt'] },
    byTags: { fields: ['tags'] },
  },

  relationships: {
    author: belongsTo('User', 'authorId'),
    comments: hasMany('Comment', 'postId', {
      cascade: { onDelete: 'cascade' },
    }),
    likes: manyToMany('User', 'PostLikes'),
    categories: manyToMany('Category', 'PostCategories'),
  },

  hooks: {
    beforeCreate: async (data, context) => {
      // Auto-generate slug if not provided
      if (!data.slug) {
        data.slug = data.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      // Set authorId from context
      data.authorId = context.auth.user?.id;
      return data;
    },
    beforeUpdate: async (data, context) => {
      // Set publishedAt when status changes to published
      if (data.status === 'published' && !context.existing?.publishedAt) {
        data.publishedAt = new Date();
      }
      return data;
    },
    afterUpdate: async (data, context) => {
      // Invalidate search index
      console.log(`Search index updated for post: ${data.id}`);
    },
  },

  computed: {
    commentCount: {
      type: 'number',
      compute: async (post, context) => {
        return context.related?.comments?.length ?? 0;
      },
      cache: true,
      cacheTtl: 60,
    },
    likeCount: {
      type: 'number',
      compute: async (post, context) => {
        return context.related?.likes?.length ?? 0;
      },
      cache: true,
      cacheTtl: 60,
    },
    readTime: {
      type: 'number',
      description: 'Estimated reading time in minutes',
      compute: (post) => {
        const wordsPerMinute = 200;
        const wordCount = post.content.split(/\s+/).length;
        return Math.ceil(wordCount / wordsPerMinute);
      },
    },
  },

  validation: {
    slug: async (value, record, context) => {
      // Check slug uniqueness (would query database)
      const exists = false; // Placeholder
      return {
        valid: !exists,
        message: exists ? 'Slug is already taken' : undefined,
        code: exists ? 'SLUG_EXISTS' : undefined,
      };
    },
  },

  metadata: {
    displayName: 'Post',
    pluralName: 'Posts',
    description: 'Blog posts',
    icon: '📝',
    tags: ['content', 'blog'],
  },
});

/**
 * Comment schema with polymorphic relationships.
 */
export const CommentSchema = defineSchema('Comment', {
  fields: z.object({
    id: Fields.id(),
    content: z.string().min(1).max(1000),
    userId: z.string().uuid(),
    postId: z.string().uuid(),
    parentId: z.string().uuid().optional(),
    edited: z.boolean().default(false),
    createdAt: Fields.createdAt(),
    updatedAt: Fields.updatedAt(),
  }),

  authorization: {
    create: allow.authenticated(),
    read: allow.public(),
    update: allow.owner('userId'),
    delete: allow.owner('userId'),
  },

  indexes: {
    byPost: { fields: ['postId', 'createdAt'] },
    byUser: { fields: ['userId', 'createdAt'] },
    byParent: { fields: ['parentId', 'createdAt'] },
  },

  relationships: {
    user: belongsTo('User', 'userId'),
    post: belongsTo('Post', 'postId'),
    parent: belongsTo('Comment', 'parentId'),
    replies: hasMany('Comment', 'parentId'),
  },

  hooks: {
    beforeUpdate: async (data, context) => {
      data.edited = true;
      return data;
    },
  },

  metadata: {
    displayName: 'Comment',
    pluralName: 'Comments',
    icon: '💬',
  },
});

/**
 * Category schema with hierarchical relationships.
 */
export const CategorySchema = defineSchema('Category', {
  fields: z.object({
    id: Fields.id(),
    name: z.string().min(1).max(100),
    slug: Fields.slug(),
    description: z.string().max(500).optional(),
    parentId: z.string().uuid().optional(),
    createdAt: Fields.createdAt(),
    updatedAt: Fields.updatedAt(),
  }),

  authorization: {
    create: allow.role('admin'),
    read: allow.public(),
    update: allow.role('admin'),
    delete: allow.role('admin'),
  },

  indexes: {
    bySlug: { fields: ['slug'], unique: true },
    byParent: { fields: ['parentId'] },
  },

  relationships: {
    posts: manyToMany('Post', 'PostCategories'),
    parent: belongsTo('Category', 'parentId'),
    children: hasMany('Category', 'parentId'),
  },

  metadata: {
    displayName: 'Category',
    pluralName: 'Categories',
    icon: '🗂️',
  },
});

// ============================================================================
// TYPE INFERENCE EXAMPLES
// ============================================================================

/**
 * Inferred User type.
 */
export type User = InferSchemaType<typeof UserSchema>;

/**
 * Inferred Post type.
 */
export type Post = InferSchemaType<typeof PostSchema>;

/**
 * Inferred Comment type.
 */
export type Comment = InferSchemaType<typeof CommentSchema>;

/**
 * Inferred Category type.
 */
export type Category = InferSchemaType<typeof CategorySchema>;

// ============================================================================
// SCHEMA REGISTRY EXAMPLE
// ============================================================================

/**
 * Register all blog schemas.
 */
export function registerBlogSchemas(): void {
  const { globalSchemaRegistry } = require('./define-schema');

  globalSchemaRegistry.register(UserSchema);
  globalSchemaRegistry.register(PostSchema);
  globalSchemaRegistry.register(CommentSchema);
  globalSchemaRegistry.register(CategorySchema);

  // Validate all relationships
  const validation = globalSchemaRegistry.validateRelationships();
  if (!validation.valid) {
    throw new Error(`Schema validation failed:\n${validation.errors.join('\n')}`);
  }
}
