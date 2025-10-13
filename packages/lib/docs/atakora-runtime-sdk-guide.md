# Atakora Runtime SDK & Code Generation Guide

Complete guide for using the Atakora runtime SDK and code generators to build type-safe data applications.

## Table of Contents

- [Overview](#overview)
- [Runtime SDK](#runtime-sdk)
  - [Query Builder](#query-builder)
  - [Mutation Builder](#mutation-builder)
  - [Relationship Loader](#relationship-loader)
- [Code Generation](#code-generation)
  - [TypeScript Types](#typescript-types)
  - [Client SDK](#client-sdk)
  - [React Hooks](#react-hooks)
- [Complete Example](#complete-example)

## Overview

The Atakora Runtime SDK provides:

1. **Type-safe Query Builder** - Build queries with full TypeScript support
2. **Mutation Builder** - Create, update, delete with validation
3. **Relationship Loader** - Efficient loading with batching to prevent N+1 queries
4. **Code Generators** - Generate types, SDKs, and React hooks from schemas

## Runtime SDK

### Query Builder

The query builder provides a fluent API for building type-safe queries:

```typescript
import { createQueryBuilder } from '@atakora/lib';
import { PostSchema } from './schemas';

// Create query builder
const postQuery = createQueryBuilder(PostSchema);

// Get by ID
const getQuery = postQuery.get('post-123').toGraphQL();
// {
//   query: "query getPost($id: ID!) { ... }",
//   variables: { id: "post-123" }
// }

// List with filters
const listQuery = postQuery
  .where('status', 'eq', 'published')
  .where('viewCount', 'gt', 1000)
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .toGraphQL();

// Complex filters
const complexQuery = postQuery
  .or([
    { field: 'status', operator: 'eq', value: 'published' },
    { field: 'status', operator: 'eq', value: 'archived' }
  ])
  .and([
    { field: 'featured', operator: 'eq', value: true },
    { field: 'viewCount', operator: 'gte', value: 100 }
  ])
  .toGraphQL();

// Include relationships
const withRelations = postQuery
  .get('post-123')
  .include('author', 'comments', 'categories')
  .toGraphQL();

// Select specific fields
const projection = postQuery
  .select('id', 'title', 'excerpt')
  .list({ limit: 20 })
  .toGraphQL();

// Pagination
const paginated = postQuery
  .orderBy('createdAt', 'desc')
  .limit(20)
  .offset(40)
  .toGraphQL();

// Cursor-based pagination
const cursorBased = postQuery
  .cursor('next-page-token')
  .limit(20)
  .toGraphQL();
```

### Mutation Builder

The mutation builder handles create, update, and delete operations with validation:

```typescript
import { createMutationBuilder } from '@atakora/lib';
import { PostSchema } from './schemas';

// Create mutation builder
const postMutation = createMutationBuilder(PostSchema, authContext);

// Create
const createResult = await postMutation.create({
  title: 'My First Post',
  content: 'Post content here...',
  status: 'draft'
});

if (createResult.success) {
  console.log('Created:', createResult.data);
} else {
  console.error('Errors:', createResult.errors);
}

// Update
const updateResult = await postMutation.update('post-123', {
  title: 'Updated Title',
  status: 'published'
});

// Delete
const deleteResult = await postMutation.delete('post-123');

// Generate GraphQL mutations
const createMutation = postMutation.toGraphQLCreate({
  title: 'New Post',
  content: 'Content...'
});
// {
//   mutation: "mutation createPost($input: CreatePostInput!) { ... }",
//   variables: { input: { ... } }
// }

const updateMutation = postMutation.toGraphQLUpdate('post-123', {
  title: 'Updated'
});

const deleteMutation = postMutation.toGraphQLDelete('post-123');
```

### Relationship Loader

The relationship loader efficiently loads related data with batching:

```typescript
import { createRelationshipLoader } from '@atakora/lib';
import { PostSchema, globalSchemaRegistry } from './schemas';

// Create loader
const loader = createRelationshipLoader(PostSchema, {
  schemaRegistry: globalSchemaRegistry,
  batchOptions: {
    maxBatchSize: 100,
    batchDelay: 10,
    cache: true,
    cacheTtl: 60000
  }
});

// Register custom loaders
loader.registerLoader('User', 'id', async (userIds) => {
  const users = await database.query(
    'SELECT * FROM users WHERE id IN (?)',
    [userIds]
  );
  const map = new Map();
  users.forEach(user => map.set(user.id, user));
  return map;
});

// Load relationships
const post = await postQuery.get('post-123').execute();

// Load has-many relationship
const comments = await loader.loadHasMany('comments', post);

// Load belongs-to relationship
const author = await loader.loadBelongsTo('author', post);

// Load many-to-many relationship
const categories = await loader.loadManyToMany('categories', post);

// Load multiple relationships
const withRelations = await loader.loadMany(
  ['author', 'comments', 'categories'],
  post
);

// Load for multiple records (batched automatically)
const posts = await postQuery.list().execute();
const allWithRelations = await loader.loadManyForRecords(
  ['author'],
  posts.data
);
```

## Code Generation

### TypeScript Types

Generate TypeScript interfaces from schemas:

```typescript
import { generateTypes } from '@atakora/lib';
import { UserSchema, PostSchema, CommentSchema } from './schemas';

// Generate types for a single schema
const { code } = generateTypes(UserSchema, {
  includeJsDoc: true,
  generateFilters: true,
  generateInputs: true,
  includeRelationships: true,
  includeComputed: true
});

console.log(code);
```

Generated output:

```typescript
/**
 * Auto-generated types for User schema.
 *
 * User accounts for the blog platform
 *
 * DO NOT EDIT MANUALLY - This file is generated.
 */

/**
 * User entity.
 *
 * User accounts for the blog platform
 */
export interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  role: 'admin' | 'author' | 'reader';
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relationships
  posts?: Post[];
  comments?: Comment[];
  likedPosts?: Post[];

  // Computed fields
  /**
   * Estimated reading time in minutes
   */
  postCount?: number;
  isAdmin?: boolean;
}

/**
 * Filter options for User queries.
 */
export interface UserFilter {
  email?: { equals?: string; contains?: string; startsWith?: string; endsWith?: string; in?: string[]; notIn?: string[] };
  name?: { equals?: string; contains?: string; startsWith?: string; endsWith?: string; in?: string[]; notIn?: string[] };
  role?: { equals?: 'admin' | 'author' | 'reader'; in?: ('admin' | 'author' | 'reader')[]; notIn?: ('admin' | 'author' | 'reader')[] };

  // Logical operators
  AND?: UserFilter[];
  OR?: UserFilter[];
  NOT?: UserFilter;
}

/**
 * Input type for creating a User.
 */
export interface CreateUserInput {
  email: string;
  name: string;
  bio?: string;
  role: 'admin' | 'author' | 'reader';
  avatarUrl?: string;
}

/**
 * Input type for updating a User.
 */
export interface UpdateUserInput {
  email?: string;
  name?: string;
  bio?: string;
  role?: 'admin' | 'author' | 'reader';
  avatarUrl?: string;
}

/**
 * Sortable fields for User.
 */
export type UserSortField =
  | 'id'
  | 'email'
  | 'name'
  | 'bio'
  | 'role'
  | 'avatarUrl'
  | 'createdAt'
  | 'updatedAt';
```

### Client SDK

Generate type-safe client SDKs:

```typescript
import { generateSDK, generateManySDK } from '@atakora/lib';
import { UserSchema, PostSchema, CommentSchema } from './schemas';

// Generate SDK for multiple schemas
const { code } = generateManySDK([UserSchema, PostSchema, CommentSchema], {
  clientType: 'fetch',
  includeRetry: true,
  includeCache: false,
  baseUrl: '/api'
});

// Save to file
await fs.writeFile('generated/sdk.ts', code);
```

Usage of generated SDK:

```typescript
import { AtakoraSDK } from './generated/sdk';

// Initialize SDK
const sdk = new AtakoraSDK('/api');

// Use entity clients
const user = await sdk.users.get('user-123');
const posts = await sdk.posts.list({ limit: 10 });

const createResult = await sdk.posts.create({
  title: 'New Post',
  content: 'Content...',
  status: 'draft'
});

const updateResult = await sdk.posts.update('post-123', {
  title: 'Updated Title'
});

const deleteResult = await sdk.posts.delete('post-123');

// Query with filters
const filteredPosts = await sdk.posts.query(
  { status: { equals: 'published' } },
  [{ field: 'publishedAt', direction: 'desc' }],
  { limit: 20 }
);
```

### React Hooks

Generate React hooks with React Query:

```typescript
import { generateHooks, generateManyHooks } from '@atakora/lib';
import { UserSchema, PostSchema, CommentSchema } from './schemas';

// Generate hooks for multiple schemas
const { code } = generateManyHooks([UserSchema, PostSchema, CommentSchema], {
  stateLibrary: 'react-query',
  includeOptimistic: true,
  includeSuspense: false
});

// Save to file
await fs.writeFile('generated/hooks.ts', code);
```

Usage of generated hooks:

```typescript
import { useUser, usePostList, usePostQuery, useCreatePost, useUpdatePost, useDeletePost } from './generated/hooks';

function UserProfile({ userId }: { userId: string }) {
  // Get single user
  const { data: user, isLoading, error } = useUser(userId, {
    include: ['posts', 'comments']
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{user.name}</div>;
}

function PostList() {
  // List posts
  const { data, isLoading } = usePostList({ limit: 10 });

  return (
    <div>
      {data?.data.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}

function PostFilters() {
  // Query with filters
  const { data } = usePostQuery(
    { status: { equals: 'published' } },
    [{ field: 'publishedAt', direction: 'desc' }],
    { limit: 20 }
  );

  return <div>...</div>;
}

function CreatePostForm() {
  const { mutate, isPending } = useCreatePost();

  const handleSubmit = (formData: any) => {
    mutate({
      title: formData.title,
      content: formData.content,
      status: 'draft'
    }, {
      onSuccess: (result) => {
        console.log('Created:', result.data);
      },
      onError: (error) => {
        console.error('Error:', error);
      }
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}

function EditPostForm({ postId }: { postId: string }) {
  const { mutate: updatePost } = useUpdatePost();
  const { mutate: deletePost } = useDeletePost();

  const handleUpdate = (data: any) => {
    updatePost({ id: postId, data }, {
      onSuccess: () => {
        console.log('Updated!');
      }
    });
  };

  const handleDelete = () => {
    deletePost(postId, {
      onSuccess: () => {
        console.log('Deleted!');
      }
    });
  };

  return <div>...</div>;
}
```

## Complete Example

Here's a complete example workflow:

```typescript
// 1. Define schemas
import { defineSchema, Fields, allow, hasMany, belongsTo, z } from '@atakora/lib';

const UserSchema = defineSchema('User', {
  fields: z.object({
    id: Fields.id(),
    email: Fields.email().unique().build(),
    name: z.string(),
    role: z.enum(['admin', 'user']),
    createdAt: Fields.createdAt(),
    updatedAt: Fields.updatedAt(),
  }),
  authorization: {
    create: allow.authenticated(),
    read: allow.public(),
    update: allow.owner('id'),
    delete: allow.role('admin'),
  },
  relationships: {
    posts: hasMany('Post', 'authorId'),
  },
});

const PostSchema = defineSchema('Post', {
  fields: z.object({
    id: Fields.id(),
    title: z.string(),
    content: z.string(),
    status: z.enum(['draft', 'published']),
    authorId: z.string().uuid(),
    createdAt: Fields.createdAt(),
    updatedAt: Fields.updatedAt(),
  }),
  authorization: {
    create: allow.authenticated(),
    read: allow.public(),
    update: allow.owner('authorId'),
    delete: allow.owner('authorId'),
  },
  relationships: {
    author: belongsTo('User', 'authorId'),
  },
});

// 2. Generate types
import { generateManyTypes } from '@atakora/lib';

const { code: types } = generateManyTypes([UserSchema, PostSchema]);
await fs.writeFile('generated/types.ts', types);

// 3. Generate SDK
import { generateManySDK } from '@atakora/lib';

const { code: sdk } = generateManySDK([UserSchema, PostSchema]);
await fs.writeFile('generated/sdk.ts', sdk);

// 4. Generate React hooks
import { generateManyHooks } from '@atakora/lib';

const { code: hooks } = generateManyHooks([UserSchema, PostSchema]);
await fs.writeFile('generated/hooks.ts', hooks);

// 5. Use in application
import { usePostQuery, useCreatePost } from './generated/hooks';

function MyComponent() {
  const { data: posts } = usePostQuery(
    { status: { equals: 'published' } },
    [{ field: 'createdAt', direction: 'desc' }]
  );

  const { mutate: createPost } = useCreatePost();

  return <div>...</div>;
}

// 6. Use query builder directly
import { createQueryBuilder } from '@atakora/lib';

const postQuery = createQueryBuilder(PostSchema);
const { query, variables } = postQuery
  .where('status', 'eq', 'published')
  .include('author')
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .toGraphQL();

// Execute with your GraphQL client
const result = await graphqlClient.query(query, variables);

// 7. Use mutation builder
import { createMutationBuilder } from '@atakora/lib';

const postMutation = createMutationBuilder(PostSchema, authContext);
const result = await postMutation.create({
  title: 'My Post',
  content: 'Content here...',
  status: 'draft'
});

// 8. Use relationship loader
import { createRelationshipLoader } from '@atakora/lib';

const loader = createRelationshipLoader(PostSchema, {
  schemaRegistry: globalSchemaRegistry,
});

const posts = await fetchPosts();
const postsWithAuthors = await loader.loadManyForRecords(['author'], posts);
```

## Best Practices

1. **Code Generation**: Run code generation as part of your build process
2. **Type Safety**: Always use the generated types for maximum type safety
3. **Batching**: Use relationship loader for efficient data loading
4. **Validation**: Leverage Zod schemas for runtime validation
5. **Caching**: Enable caching in relationship loader for performance
6. **Authorization**: Always provide auth context to mutation builder

## Next Steps

- Explore [Schema DSL Guide](./atakora-schema-dsl-guide.md)
- Learn about [Authorization Rules](./authorization-guide.md)
- Check [API Reference](../reference/api/)
