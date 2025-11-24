# ADR-025: Unified CRUD Definition Pattern

## Status

Proposed

## Context

The Gen 2 design introduced two overlapping patterns for defining CRUD APIs:

1. **Data Schema Pattern**: `c.model()` in the universal data layer that generates CRUD REST endpoints
2. **API Definition Pattern**: `defineCrudApi()` that configures API-specific settings

This creates redundancy where developers must define CRUD operations in two places:

- First in `data/schema.ts` using `c.model()`
- Then again in `apis/feedback.ts` using `defineCrudApi()`

This violates our core principles:

- **Zero boilerplate** - We're requiring extra definitions
- **Single source of truth** - CRUD logic is split across files
- **Convention over configuration** - Unclear when to use which pattern
- **Progressive enhancement** - No clear path from simple to complex

## Decision

**Eliminate `defineCrudApi()` and make `c.model()` the single source of truth for CRUD APIs.**

The `c.model()` definition will handle:

- Schema definition
- Validation rules
- Authorization policies
- API configuration (when needed)
- Hooks and customization
- Custom endpoints

## Implementation

### Basic CRUD (Zero Config)

```typescript
// data/schema.ts
export const data = defineData({
  schema: a.schema({
    // Simple CRUD - just works with defaults
    Feedback: c
      .model({
        id: a.id(),
        text: a.string().required(),
        rating: a.number().min(1).max(5),
        userId: a.string().required(),
        createdAt: a.datetime().default(a.datetime.now()),
      })
      .authorization((allow) => [allow.owner('userId'), allow.groups(['admins'])]),
  }),
});
```

This automatically generates:

- POST /api/feedback
- GET /api/feedback/:id
- PUT /api/feedback/:id
- DELETE /api/feedback/:id
- GET /api/feedback (with filtering, sorting, pagination)

### Enhanced CRUD (Progressive Enhancement)

When you need API-specific features, enhance the model definition:

```typescript
// data/schema.ts
export const data = defineData({
  schema: a.schema({
    Feedback: c.model({
      // Schema fields...
    })
    .authorization(allow => [...])

    // API configuration (optional)
    .api({
      // Rate limiting
      rateLimit: {
        requests: 100,
        window: '1m'
      },

      // Caching
      cache: {
        ttl: 300,
        invalidateOn: ['create', 'update']
      },

      // Query options
      queryOptions: {
        filterableFields: ['status', 'category'],
        sortableFields: ['createdAt', 'rating'],
        searchableFields: ['text'],
        defaultSort: [{ field: 'createdAt', order: 'desc' }],
      },

      // Pagination
      pagination: {
        defaultLimit: 20,
        maxLimit: 100,
      },
    })

    // Hooks for custom logic
    .hooks({
      beforeCreate: async (data, context) => {
        // Auto-analyze sentiment
        if (!data.sentiment && data.text) {
          data.sentiment = await context.services.sentimentAnalysis.analyze(data.text);
        }
        return data;
      },

      afterCreate: async (record, context) => {
        // Send notifications
        if (record.priority === 'high') {
          await context.notifications.send({
            to: 'admins',
            template: 'high-priority-feedback',
            data: record,
          });
        }
      },
    })

    // Custom endpoints beyond CRUD
    .endpoints({
      'PUT /bulk-status': {
        handler: async (req, context) => {
          const { ids, status } = req.body;
          const results = await context.db.updateMany('Feedback', ids, { status });
          return { updated: results.length };
        },
        authorization: allow => [allow.groups(['admins'])],
      },

      'GET /stats': {
        handler: async (req, context) => {
          return context.db.aggregate('Feedback', [
            { $group: { _id: null, avgRating: { $avg: '$rating' } } }
          ]);
        },
        cache: { ttl: 3600 },
      },
    }),
  }),
});
```

### When to Use `defineFunction()` Instead

Use `defineFunction()` for operations that are NOT CRUD:

```typescript
// functions/analyze-sentiment/resource.ts
export const analyzeSentiment = defineFunction({
  name: 'analyze-sentiment',
  trigger: { type: 'http', route: 'api/analyze' },
  handler: './handler.ts',
});
```

## Alternatives Considered

### Alternative 1: Keep Both Patterns

**Pros:**

- Separation of concerns (data vs API)
- Flexibility to define APIs independently

**Cons:**

- Redundancy and confusion
- Violates single source of truth
- More boilerplate code
- Unclear when to use which

### Alternative 2: Make `defineCrudApi()` Primary

**Pros:**

- Consistent with other `define*` patterns
- Clear file organization

**Cons:**

- Loses connection to data schema
- Requires duplicate field definitions
- More verbose for simple cases

### Alternative 3: Schema References in `defineCrudApi()`

```typescript
// This approach - reference the model
export const feedbackApi = defineCrudApi({
  model: 'Feedback', // Reference to schema
  // ... API config
});
```

**Cons:**

- Still requires two definitions
- Indirect connection between schema and API
- Extra file for each CRUD API

## Consequences

### Positive

1. **Simpler mental model** - One place for CRUD definition
2. **Zero boilerplate** - Basic CRUD needs no extra config
3. **Progressive enhancement** - Add complexity only when needed
4. **Type safety** - API config is directly tied to schema
5. **Better DX** - Clear pattern: `c.model()` = REST, `g.model()` = GraphQL
6. **Fewer files** - No separate API definition files for basic CRUD

### Negative

1. **Large schema file** - All CRUD config in one place (mitigated by proper organization)
2. **Migration effort** - Existing `defineCrudApi()` usage must be migrated
3. **Learning curve** - Developers must unlearn the dual pattern

### Neutral

1. **File organization** - CRUD APIs no longer have separate files
2. **Custom endpoints** - Defined inline with the model

## Success Criteria

1. **Developer satisfaction** - Easier to understand and use
2. **Reduced boilerplate** - 50% less code for CRUD APIs
3. **Faster development** - CRUD APIs work immediately
4. **Type safety** - No loss of type checking
5. **Migration success** - Clean migration path for existing code

## Migration Strategy

### Phase 1: Update Schema Builder

Add `.api()`, `.hooks()`, and `.endpoints()` methods to `c.model()`:

```typescript
// packages/data/src/builders/crud-model.ts
export class CrudModel {
  api(config: ApiConfig): this { ... }
  hooks(hooks: Hooks): this { ... }
  endpoints(endpoints: CustomEndpoints): this { ... }
}
```

### Phase 2: Migrate Examples

Update Gen 2 examples to use unified pattern:

1. Remove separate `apis/*.ts` files
2. Move API config to schema definitions
3. Update imports in `index.ts`

### Phase 3: Update Documentation

1. Update `atakora-gen2-data-layer.md` with enhanced examples
2. Remove `defineCrudApi()` from `atakora-gen2-define-api.md`
3. Add migration guide

### Phase 4: Deprecation Path

1. Mark `defineCrudApi()` as deprecated
2. Add console warnings with migration instructions
3. Remove in next major version

## Example Migration

### Before (Gen 2 Current)

```typescript
// data/schema.ts
Feedback: c.model({
  text: a.string().required(),
  rating: a.number(),
}),

// apis/feedback.ts
export const feedbackApi = defineCrudApi({
  model: 'Feedback',
  rateLimit: { requests: 100, window: '1m' },
  hooks: { ... },
});

// index.ts
const backend = defineBackend({
  data,
  feedbackApi, // Redundant!
});
```

### After (Unified Pattern)

```typescript
// data/schema.ts
Feedback: c.model({
  text: a.string().required(),
  rating: a.number(),
})
.api({
  rateLimit: { requests: 100, window: '1m' },
})
.hooks({ ... }),

// index.ts
const backend = defineBackend({
  data, // That's it!
});
```

## Related Decisions

- ADR-017: Backend API redesign (this simplifies it further)
- ADR-016: Linked templates (no impact)
- Universal Data Layer design (this enhances it)

## References

- [Gen 2 Data Layer Design](../Atakora-Gen2-Data-Layer.md)
- [Gen 2 Define API Pattern](../Atakora-Gen2-Define-Api.md)
- [AWS Amplify Data](https://docs.amplify.aws/gen2/build-a-backend/data/) - Similar unified approach
