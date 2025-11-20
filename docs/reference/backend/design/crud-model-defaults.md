# CRUD Model Default Configuration

This document describes the default behavior for CRUD models (`c.model`) including REST API endpoints, database operations, and access control.

## Overview

CRUD models (`c.model`) automatically generate full REST APIs with database backing. Each model gets 5 endpoints with complete validation, authorization, and error handling.

## Default Endpoints

### Generated for Each Model

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  name: a.string().required(),
})
```

**Generates 5 Endpoints:**
```
POST   /api/users           Create
GET    /api/users/:id       Read
PUT    /api/users/:id       Update
DELETE /api/users/:id       Delete
GET    /api/users           List/Search
```

---

## Create Operation

### Default Behavior

**Endpoint:** `POST /api/users`

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Processing Steps:**
```typescript
async function createUser(req: HttpRequest): Promise<HttpResponse> {
  // 1. Validate input against schema
  const validation = validateInput('User', req.body);
  if (!validation.valid) {
    return {
      statusCode: 400,
      body: { error: 'Validation Error', details: validation.errors },
    };
  }

  // 2. Check authentication
  const user = await authenticate(req);
  if (!user) {
    return { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  // 3. Check authorization (can user create?)
  const authorized = await authorizeCreate('User', user, req.body);
  if (!authorized) {
    return { statusCode: 403, body: { error: 'Forbidden' } };
  }

  // 4. Run beforeCreate hooks (if defined)
  const preprocessed = await runHooks('beforeCreate', req.body, user);

  // 5. Add auto-generated fields
  const record = {
    ...preprocessed,
    id: generateId(),                    // UUID v4
    createdAt: new Date().toISOString(), // ISO 8601
    updatedAt: new Date().toISOString(), // ISO 8601
  };

  // 6. Insert into database
  await cosmosContainer.items.create(record);

  // 7. Run afterCreate hooks (if defined)
  await runHooks('afterCreate', record, user);

  // 8. Return response
  return {
    statusCode: 201,  // Created
    headers: {
      'Location': `/api/users/${record.id}`,
    },
    body: record,
  };
}
```

**Response:**
```http
HTTP/1.1 201 Created
Location: /api/users/user_abc123def456
Content-Type: application/json

{
  "id": "user_abc123def456",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Cost:** ~5-10 RU (depends on document size and indexes)

---

## Read Operation

### Default Behavior

**Endpoint:** `GET /api/users/:id`

**Request:**
```http
GET /api/users/user_abc123def456
Authorization: Bearer <token>
```

**Processing Steps:**
```typescript
async function getUser(req: HttpRequest): Promise<HttpResponse> {
  // 1. Check authentication
  const user = await authenticate(req);
  if (!user) {
    return { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  // 2. Get record from database (point read)
  const record = await cosmosContainer.item(
    req.params.id,
    req.params.id  // id is also partition key
  ).read();

  if (!record) {
    return { statusCode: 404, body: { error: 'Not Found' } };
  }

  // 3. Check authorization (can user read this record?)
  const authorized = await authorizeRead('User', user, record);
  if (!authorized) {
    return { statusCode: 403, body: { error: 'Forbidden' } };
  }

  // 4. Return response
  return {
    statusCode: 200,
    body: record,
  };
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "user_abc123def456",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Cost:** 1 RU (point read)

---

## Update Operation

### Default Behavior

**Endpoint:** `PUT /api/users/:id`

**Request:**
```http
PUT /api/users/user_abc123def456
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Doe"
}
```

**Processing Steps:**
```typescript
async function updateUser(req: HttpRequest): Promise<HttpResponse> {
  // 1. Validate input (partial schema validation)
  const validation = validatePartial('User', req.body);
  if (!validation.valid) {
    return {
      statusCode: 400,
      body: { error: 'Validation Error', details: validation.errors },
    };
  }

  // 2. Check authentication
  const user = await authenticate(req);
  if (!user) {
    return { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  // 3. Get existing record
  const existing = await cosmosContainer.item(
    req.params.id,
    req.params.id
  ).read();

  if (!existing) {
    return { statusCode: 404, body: { error: 'Not Found' } };
  }

  // 4. Check authorization (can user update?)
  const authorized = await authorizeUpdate('User', user, existing, req.body);
  if (!authorized) {
    return { statusCode: 403, body: { error: 'Forbidden' } };
  }

  // 5. Run beforeUpdate hooks (if defined)
  const updates = await runHooks('beforeUpdate', req.body, user, existing);

  // 6. Merge updates with existing
  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),  // Update timestamp
    // id, createdAt never change
  };

  // 7. Update in database (with optimistic concurrency)
  await cosmosContainer.item(req.params.id, req.params.id).replace(updated, {
    accessCondition: {
      type: 'IfMatch',
      condition: existing._etag,  // Optimistic concurrency check
    },
  });

  // 8. Run afterUpdate hooks (if defined)
  await runHooks('afterUpdate', updated, user);

  // 9. Return response
  return {
    statusCode: 200,
    body: updated,
  };
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "user_abc123def456",
  "email": "user@example.com",
  "name": "Jane Doe",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T11:45:00Z"
}
```

**Optimistic Concurrency:**
```http
# If record was updated by someone else:
HTTP/1.1 412 Precondition Failed
Content-Type: application/json

{
  "error": "Conflict",
  "message": "Record was modified by another user. Please refresh and try again."
}
```

**Cost:** ~5-10 RU (depends on document size and indexes)

---

## Delete Operation

### Default Behavior

**Endpoint:** `DELETE /api/users/:id`

**Request:**
```http
DELETE /api/users/user_abc123def456
Authorization: Bearer <token>
```

**Processing Steps:**
```typescript
async function deleteUser(req: HttpRequest): Promise<HttpResponse> {
  // 1. Check authentication
  const user = await authenticate(req);
  if (!user) {
    return { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  // 2. Get existing record
  const existing = await cosmosContainer.item(
    req.params.id,
    req.params.id
  ).read();

  if (!existing) {
    return { statusCode: 404, body: { error: 'Not Found' } };
  }

  // 3. Check authorization (can user delete?)
  const authorized = await authorizeDelete('User', user, existing);
  if (!authorized) {
    return { statusCode: 403, body: { error: 'Forbidden' } };
  }

  // 4. Run beforeDelete hooks (if defined)
  await runHooks('beforeDelete', existing, user);

  // 5. Delete from database (or soft delete if enabled)
  if (model.softDelete) {
    // Soft delete: set deletedAt timestamp
    await cosmosContainer.item(req.params.id, req.params.id).replace({
      ...existing,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    // Hard delete: remove from database
    await cosmosContainer.item(req.params.id, req.params.id).delete();
  }

  // 6. Run afterDelete hooks (if defined)
  await runHooks('afterDelete', req.params.id, user);

  // 7. Return response
  return {
    statusCode: 204,  // No Content
  };
}
```

**Response:**
```http
HTTP/1.1 204 No Content
```

**Cost:** ~5 RU

---

## List/Search Operation

### Default Behavior

**Endpoint:** `GET /api/users`

**Request Examples:**

**Basic List:**
```http
GET /api/users
Authorization: Bearer <token>
```

**With Filters:**
```http
GET /api/users?role=admin&isActive=true
```

**With Pagination:**
```http
GET /api/users?page=2&pageSize=20
```

**With Sorting:**
```http
GET /api/users?sortBy=createdAt&sortOrder=desc
```

**Combined:**
```http
GET /api/users?role=admin&page=1&pageSize=10&sortBy=name&sortOrder=asc
```

**Processing Steps:**
```typescript
async function listUsers(req: HttpRequest): Promise<HttpResponse> {
  // 1. Check authentication
  const user = await authenticate(req);
  if (!user) {
    return { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  // 2. Parse query parameters
  const filters = parseFilters(req.query);      // { role: 'admin', isActive: true }
  const pagination = parsePagination(req.query); // { page: 1, pageSize: 20 }
  const sorting = parseSorting(req.query);      // { sortBy: 'name', sortOrder: 'asc' }

  // 3. Apply authorization filters
  const authzFilters = await getAuthzFilters('User', user);
  const allFilters = { ...filters, ...authzFilters };
  // Example: Non-admin users can only see their own records
  // { ...filters, userId: user.id }

  // 4. Build SQL query
  const query = buildQuery('users', allFilters, sorting, pagination);
  // SELECT * FROM users u
  // WHERE u.role = @role AND u.isActive = @isActive AND u.userId = @userId
  // ORDER BY u.name ASC
  // OFFSET @skip LIMIT @limit

  // 5. Execute query
  const { resources, hasMore, continuationToken } = await cosmosContainer
    .items
    .query(query, {
      maxItemCount: pagination.pageSize,
      continuationToken: pagination.continuationToken,
    })
    .fetchAll();

  // 6. Get total count (if not using continuation tokens)
  const totalQuery = buildCountQuery('users', allFilters);
  const { count } = await cosmosContainer.items.query(totalQuery).fetchAll();

  // 7. Return response with pagination metadata
  return {
    statusCode: 200,
    body: {
      data: resources,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: count,
        totalPages: Math.ceil(count / pagination.pageSize),
        hasMore,
        continuationToken: hasMore ? continuationToken : null,
      },
    },
  };
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "user_abc123",
      "email": "admin@example.com",
      "name": "Admin User",
      "role": "admin",
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    },
    {
      "id": "user_def456",
      "email": "another@example.com",
      "name": "Another Admin",
      "role": "admin",
      "createdAt": "2025-01-14T09:15:00Z",
      "updatedAt": "2025-01-14T09:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3,
    "hasMore": true,
    "continuationToken": "abc123..."
  }
}
```

**Cost:** ~2-5 RU per result (depends on query complexity and indexes)

---

## Default Query Features

### Supported Filter Operators

**Equality:**
```http
GET /api/users?role=admin
→ WHERE u.role = 'admin'
```

**Comparison:**
```http
GET /api/users?age[gte]=18&age[lte]=65
→ WHERE u.age >= 18 AND u.age <= 65
```

**Array Contains:**
```http
GET /api/users?tags[contains]=vip
→ WHERE ARRAY_CONTAINS(u.tags, 'vip')
```

**String Contains:**
```http
GET /api/users?name[contains]=john
→ WHERE CONTAINS(u.name, 'john', true)
```

**Null/Undefined:**
```http
GET /api/users?phone[null]=true
→ WHERE IS_NULL(u.phone) OR NOT IS_DEFINED(u.phone)
```

### Pagination Strategies

**Page-Based (Default):**
```http
GET /api/users?page=2&pageSize=20
```
- Simple, predictable
- Can jump to any page
- Count query required (expensive for large datasets)
- Cost: ~3-5 RU per page

**Continuation Token-Based:**
```http
GET /api/users?pageSize=20&continuationToken=abc123...
```
- No count query needed
- Cannot jump to arbitrary page
- Best for large datasets
- Cost: ~1-2 RU per page

**Default Choice:** Page-based for < 10K records, continuation token for > 10K

---

## Default Authorization

### No Authorization Rules

If no `.authorization()` is specified:

```typescript
User: c.model({...})  // No .authorization()
```

**Default Behavior:**
- ❌ All endpoints require authentication
- ❌ All operations admin-only
- ❌ Regular users cannot access

**Why?**
- Secure by default
- Forces explicit authorization decisions
- Prevents accidental data exposure

**Enable for all users:**
```typescript
User: c.model({...})
  .authorization(allow => [
    allow.authenticated().all(),  // All authenticated users
  ])
```

---

### With Authorization Rules

```typescript
User: c.model({...})
  .authorization(allow => [
    allow.owner('id'),              // Users can manage their own record
    allow.groups(['admin']).all(),  // Admins can do everything
  ])
```

**Create:** Check if user can create
```typescript
// Admin: ✅ Can create any user
// Regular user: ✅ Can create (will auto-set id = user.id)
```

**Read:** Check if user can read specific record
```typescript
// Admin: ✅ Can read any user
// Owner: ✅ Can read own record (record.id === user.id)
// Other user: ❌ 403 Forbidden
```

**Update:** Check if user can update specific record
```typescript
// Admin: ✅ Can update any user
// Owner: ✅ Can update own record
// Other user: ❌ 403 Forbidden
```

**Delete:** Check if user can delete specific record
```typescript
// Admin: ✅ Can delete any user
// Owner: ✅ Can delete own record
// Other user: ❌ 403 Forbidden
```

**List:** Auto-filter based on permissions
```typescript
// Admin: Returns all users
// Regular user: Returns only own record
// Query: WHERE u.id = @userId
```

---

## Automatic Features

### Timestamps

**Default: Enabled**

Automatically adds:
```json
{
  "createdAt": "2025-01-15T10:30:00Z",  // Set on create, never changes
  "updatedAt": "2025-01-15T11:45:00Z"   // Set on create, updated on update
}
```

**Disable:**
```typescript
User: c.model({...})
  .timestamps(false)
```

**Custom Names:**
```typescript
User: c.model({...})
  .timestamps({
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
```

---

### Soft Deletes

**Default: Disabled (hard delete)**

**Enable:**
```typescript
User: c.model({...})
  .softDelete(true)
```

**Behavior:**
```http
DELETE /api/users/user123
→ Sets deletedAt timestamp instead of removing record

{
  "id": "user123",
  "email": "user@example.com",
  "deletedAt": "2025-01-15T12:00:00Z",  // Added
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T12:00:00Z"
}
```

**List endpoint automatically excludes soft-deleted:**
```http
GET /api/users
→ WHERE IS_NULL(u.deletedAt)
```

**Include deleted (admin only):**
```http
GET /api/users?includeDeleted=true
→ Returns all records, including soft-deleted
```

---

### Optimistic Concurrency

**Default: Enabled**

Uses Cosmos DB `_etag` for conflict detection:

```http
# Get record
GET /api/users/user123
→ { "id": "user123", "_etag": "v1", ... }

# Update record (someone else updates meanwhile)
PUT /api/users/user123
If-Match: "v1"
→ 412 Precondition Failed (etag doesn't match)

# Client must re-fetch and retry
GET /api/users/user123
→ { "id": "user123", "_etag": "v2", ... }

PUT /api/users/user123
If-Match: "v2"
→ 200 OK (success)
```

---

## Performance Characteristics

### Latency

**Point Operations (by ID):**
```
Create: 10-30ms
Read: 5-15ms
Update: 10-30ms
Delete: 10-20ms
```

**List/Search:**
```
< 100 results: 20-50ms
< 1000 results: 50-200ms
< 10000 results: 200-500ms
> 10000 results: Use continuation tokens
```

### Throughput

**With Default Cosmos DB Settings:**
```
Development (Serverless):
  - Max: 5000 RU/s
  - ~500 operations/second

Production (Autoscale 4000 RU/s):
  - Sustained: 400-800 operations/second
  - Burst: 4000 operations/second
```

---

## When to Override Defaults

### Use Defaults When:
- ✅ Standard CRUD operations
- ✅ Simple authorization (owner/admin)
- ✅ Dataset < 100K records
- ✅ Queries return < 100 results
- ✅ No special business logic needed

### Override When:
- ⚠️ Complex authorization logic
- ⚠️ Need custom validation
- ⚠️ Need lifecycle hooks
- ⚠️ Need custom partition key
- ⚠️ Need soft deletes
- ⚠️ Need custom indexes
- ⚠️ Need to exclude fields from API

### Override Example:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  password: a.string().required(),  // Never return in API
  name: a.string().required(),
  organizationId: a.string().required(),
})
  // Custom partition key for multi-tenancy
  .partitionKey('organizationId')

  // Specific indexes for common queries
  .indexes(['email', 'organizationId'])

  // Authorization
  .authorization(allow => [
    allow.owner('id'),
    allow.groups(['admin']).all(),
    allow.groups(['orgAdmin'])
      .read()
      .update(['name', 'email'])  // Can't change password
      .when((record, user) => record.organizationId === user.organizationId),
  ])

  // Exclude password from responses
  .exclude(['password'])

  // Lifecycle hooks
  .hooks({
    beforeCreate: async (input, context) => {
      // Hash password
      return {
        ...input,
        password: await hash(input.password),
      };
    },
    afterCreate: async (record, context) => {
      // Send welcome email
      await sendEmail(record.email, 'welcome');
    },
  })

  // Enable soft deletes
  .softDelete(true)

  // Custom timestamps
  .timestamps({
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
```

---

## Related Documentation

- [Cosmos DB Defaults](./cosmos-db-defaults.md) - Database configuration
- [Function App Defaults](./function-app-defaults.md) - API function configuration
- [Authorization Defaults](./authorization-defaults.md) - Access control
- [Schema CRUD Models](../schema-crud.md) - Model definition
- [Authorization Patterns](../authorization.md) - Authorization guide
