# Authorization Patterns Cookbook

> Practical authorization patterns for common access control scenarios

## What You'll Learn

- How authorization rules work
- Owner-only access patterns
- Group-based permissions
- Public and authenticated access
- Multi-tenant isolation
- Admin override patterns
- How to combine multiple rules
- Security best practices

## Prerequisites

Before you begin, you should understand:

- [CRUD models basics](./crud-models.md)
- [Field types](../reference/field-types.md)
- Basic authentication concepts (users, roles, groups)

## How Authorization Works

Authorization rules control **who** can perform **what operations** on **which records**.

### The Authorization Builder

All authorization rules use the `allow` builder:

```typescript
.authorization(allow => [
  // Rules go here
])
```

### Available Rule Types

| Rule Type               | Description                          | Use Case          |
| ----------------------- | ------------------------------------ | ----------------- |
| `allow.owner()`         | Record owner can access              | User-owned data   |
| `allow.groups()`        | Specific groups can access           | Role-based access |
| `allow.authenticated()` | Any logged-in user can access        | Protected content |
| `allow.public()`        | Anyone can access (no auth required) | Public content    |

### Available Operations

Each rule can specify which operations are allowed:

- `create` - Create new records
- `read` - Read individual records
- `update` - Update existing records
- `delete` - Delete records
- `list` - Query/list multiple records

**Examples:**

```typescript
// All operations (default)
allow.owner('userId');

// Specific operations
allow.authenticated(['read', 'list']);

// Single operation
allow.groups(['admin']).delete();
```

### Rule Evaluation

Rules are evaluated in order:

1. First matching rule grants access
2. If no rules match, access is denied
3. Rules are OR'd together (any matching rule grants access)

## Pattern 1: Owner-Only Access

Users can only access their own records.

### Basic Owner Access

```typescript
UserProfile: c.model({
  id: a.id(),
  userId: a.string().required(),
  bio: a.string().optional(),
  avatar: a.string().url().optional(),
}).authorization((allow) => [
  allow.owner('userId'), // Users can only access their own profile
]);
```

**How it works:**

- The authenticated user's ID is compared to the `userId` field
- If they match, all operations (create, read, update, delete, list) are allowed
- If they don't match, access is denied

### Owner with ID Field

Most common pattern - use the `id` field:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  name: a.string().required(),
}).authorization((allow) => [
  allow.owner('id'), // Users can only access their own record
]);
```

### Owner with Specific Operations

Limit what owners can do:

```typescript
Document: c.model({
  id: a.id(),
  ownerId: a.string().required(),
  title: a.string().required(),
  content: a.string().required(),
}).authorization((allow) => [
  allow.owner('ownerId').read(), // Can read own documents
  allow.owner('ownerId').update(), // Can update own documents
  // Cannot delete own documents
]);
```

### Real-World Example: Personal Settings

```typescript
UserSettings: c.model({
  id: a.id(),
  userId: a.ref('User').required(),

  // Preferences
  emailNotifications: a.boolean().default(true),
  theme: a.enum(['light', 'dark']).default('light'),
  language: a.string().default('en'),

  // Privacy
  profileVisibility: a.enum(['public', 'private']).default('public'),
}).authorization((allow) => [
  allow.owner('userId'), // Only the user can manage their settings
]);
```

## Pattern 2: Group-Based Permissions

Grant access based on user roles or groups.

### Basic Group Access

```typescript
AdminPanel: c.model({
  id: a.id(),
  configKey: a.string().required(),
  configValue: a.json().required(),
}).authorization((allow) => [
  allow.groups(['admin']).all(), // Only admins can access
]);
```

### Multiple Groups

Allow multiple groups with different permissions:

```typescript
Document: c.model({
  id: a.id(),
  title: a.string().required(),
  content: a.string().required(),
}).authorization((allow) => [
  allow.groups(['admin', 'editor']).all(), // Full access
  allow.groups(['viewer']).read(), // Read-only access
]);
```

### Groups with Operation Control

Fine-grained control per group:

```typescript
Article: c.model({
  id: a.id(),
  title: a.string().required(),
  content: a.string().required(),
  status: a.enum(['draft', 'published']).default('draft'),
}).authorization((allow) => [
  allow.groups(['admin']).all(), // Admins can do anything
  allow.groups(['editor']).create(), // Editors can create
  allow.groups(['editor']).update(), // Editors can update
  allow.groups(['moderator']).delete(), // Moderators can delete
  allow.groups(['viewer']).read(), // Viewers can read
]);
```

### Real-World Example: Content Management

```typescript
BlogPost: c.model({
  id: a.id(),
  authorId: a.ref('User').required(),
  title: a.string().required().min(1).max(200),
  content: a.string().required(),
  status: a.enum(['draft', 'review', 'published', 'archived']).default('draft'),
  publishedAt: a.datetime().optional(),
}).authorization((allow) => [
  // Admins have full control
  allow.groups(['admin']).all(),

  // Editors can publish and unpublish
  allow.groups(['editor']).update(),
  allow.groups(['editor']).create(),

  // Authors can manage their own drafts
  allow.owner('authorId').create(),
  allow.owner('authorId').update(),
  allow.owner('authorId').delete(),

  // Anyone can read published posts
  allow.public(['read', 'list']),
]);
```

## Pattern 3: Public Read, Authenticated Write

Common pattern for content platforms and social networks.

### Basic Pattern

```typescript
Article: c.model({
  id: a.id(),
  title: a.string().required(),
  content: a.string().required(),
}).authorization((allow) => [
  allow.public(['read', 'list']), // Anyone can read
  allow.authenticated(['create']), // Logged-in users can create
]);
```

### With Owner Management

```typescript
Post: c.model({
  id: a.id(),
  authorId: a.ref('User').required(),
  title: a.string().required(),
  content: a.string().required(),
}).authorization((allow) => [
  allow.public(['read', 'list']), // Anyone can read
  allow.authenticated(['create']), // Anyone logged in can create
  allow.owner('authorId').update(), // Authors can update their posts
  allow.owner('authorId').delete(), // Authors can delete their posts
]);
```

### Real-World Example: Community Forum

```typescript
ForumPost: c.model({
  id: a.id(),
  userId: a.ref('User').required(),
  title: a.string().required().min(5).max(200),
  content: a.string().required().min(10),
  categoryId: a.ref('Category').required(),
  upvotes: a.number().integer().min(0).default(0),
  downvotes: a.number().integer().min(0).default(0),
  isPinned: a.boolean().default(false),
  isLocked: a.boolean().default(false),
}).authorization((allow) => [
  // Public can read all posts
  allow.public(['read', 'list']),

  // Authenticated users can create posts
  allow.authenticated(['create']),

  // Post authors can edit their own posts
  allow.owner('userId').update(),

  // Post authors can delete their own posts
  allow.owner('userId').delete(),

  // Moderators can do anything
  allow.groups(['moderator', 'admin']).all(),
]);
```

## Pattern 4: Multi-Tenant Isolation

Ensure data isolation between organizations or tenants.

### Basic Multi-Tenant

```typescript
Task: c.model({
  id: a.id(),
  organizationId: a.string().required(),
  title: a.string().required(),
  assignedTo: a.ref('User').optional(),
})
  .partitionKey('organizationId') // Physical isolation
  .indexes(['organizationId']) // Fast tenant queries
  .authorization((allow) => [
    // Users can access tasks in their organization
    allow.authenticated(['read', 'list', 'create', 'update']),

    // Organization admins have full control
    allow.groups(['org_admin']).all(),
  ]);
```

**Important:** Authorization doesn't enforce tenant isolation - your application code must filter by `organizationId`.

### Tenant-Scoped Authorization

```typescript
Project: c.model({
  id: a.id(),
  organizationId: a.string().required(),
  name: a.string().required(),
  ownerId: a.ref('User').required(),
  memberIds: a.array(a.string()).default([]),
})
  .partitionKey('organizationId')
  .authorization((allow) => [
    // Project owner has full control
    allow.owner('ownerId'),

    // Organization admins have full control
    allow.groups(['org_admin']).all(),

    // Authenticated users in org can read
    allow.authenticated(['read', 'list']),
  ]);
```

### Real-World Example: SaaS Application

```typescript
Customer: c.model({
  id: a.id(),
  tenantId: a.string().required(), // The organization this customer belongs to

  // Customer details
  companyName: a.string().required(),
  email: a.string().email().required(),
  phoneNumber: a.string().phone().optional(),

  // Account management
  accountManagerId: a.ref('User').optional(),
  tier: a.enum(['free', 'pro', 'enterprise']).default('free'),
  status: a.enum(['active', 'inactive', 'suspended']).default('active'),

  // Business data
  industry: a.string().optional(),
  revenue: a.number().positive().optional(),
  employeeCount: a.number().integer().positive().optional(),
})
  .partitionKey('tenantId')
  .indexes(['tenantId', 'accountManagerId', 'tier', 'status'])
  .authorization((allow) => [
    // Tenant admins have full access to their customers
    allow.groups(['tenant_admin']).all(),

    // Account managers can manage assigned customers
    allow.owner('accountManagerId'),

    // Sales team can read all customers in their tenant
    allow.groups(['sales']).read(),
    allow.groups(['sales']).list(),

    // Platform admins (super admins) have full access
    allow.groups(['platform_admin']).all(),
  ]);
```

## Pattern 5: Admin Override

Admins can access anything, regardless of ownership.

### Basic Admin Override

```typescript
Document: c.model({
  id: a.id(),
  ownerId: a.string().required(),
  content: a.string().required(),
}).authorization((allow) => [
  allow.owner('ownerId'), // Owners manage their documents
  allow.groups(['admin']).all(), // Admins can access any document
]);
```

### Hierarchical Admin Access

```typescript
Project: c.model({
  id: a.id(),
  ownerId: a.ref('User').required(),
  organizationId: a.string().required(),
  name: a.string().required(),
}).authorization((allow) => [
  // Project owner has full control
  allow.owner('ownerId'),

  // Organization admins can manage org projects
  allow.groups(['org_admin']).all(),

  // Platform admins can manage any project
  allow.groups(['platform_admin']).all(),

  // Authenticated users can read
  allow.authenticated(['read', 'list']),
]);
```

### Real-World Example: Support System

```typescript
Ticket: c.model({
  id: a.id(),
  customerId: a.ref('User').required(),
  assignedTo: a.ref('User').optional(),

  // Ticket details
  subject: a.string().required().min(5).max(200),
  description: a.string().required().min(10),
  status: a.enum(['open', 'in_progress', 'resolved', 'closed']).default('open'),
  priority: a.enum(['low', 'medium', 'high', 'urgent']).default('medium'),

  // Metadata
  category: a.enum(['billing', 'technical', 'general']).required(),
  tags: a.array(a.string()).default([]),
}).authorization((allow) => [
  // Customer can view and update their own tickets
  allow.owner('customerId').read(),
  allow.owner('customerId').update(),
  allow.owner('customerId').create(),

  // Assigned support agent can manage the ticket
  allow.owner('assignedTo'),

  // Support team can see all tickets
  allow.groups(['support']).read(),
  allow.groups(['support']).list(),
  allow.groups(['support']).update(),

  // Support managers have full access
  allow.groups(['support_manager']).all(),

  // Platform admins have full access
  allow.groups(['admin']).all(),
]);
```

## Pattern 6: Combining Multiple Rules

Complex scenarios often require multiple authorization rules.

### Layered Access Control

```typescript
Article: c.model({
  id: a.id(),
  authorId: a.ref('User').required(),
  organizationId: a.string().required(),
  status: a.enum(['draft', 'published', 'archived']).default('draft'),
  visibility: a.enum(['public', 'private', 'unlisted']).default('private'),
}).authorization((allow) => [
  // Public can read published public articles
  allow.public(['read']),

  // Authenticated users can read published articles
  allow.authenticated(['read', 'list']),

  // Authors can manage their own articles
  allow.owner('authorId'),

  // Organization editors can edit org articles
  allow.groups(['org_editor']).update(),
  allow.groups(['org_editor']).read(),

  // Organization admins have full control over org articles
  allow.groups(['org_admin']).all(),

  // Platform admins have full control
  allow.groups(['platform_admin']).all(),
]);
```

### Conditional Access Based on Status

```typescript
Invoice: c.model({
  id: a.id(),
  customerId: a.ref('Customer').required(),
  createdBy: a.ref('User').required(),
  approvedBy: a.ref('User').optional(),

  // Invoice details
  invoiceNumber: a.string().required(),
  amount: a.number().positive().required(),
  status: a.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),
  dueDate: a.datetime().required(),
}).authorization((allow) => [
  // Creator can manage draft invoices
  allow.owner('createdBy').update(),
  allow.owner('createdBy').delete(),

  // Customer can view their invoices
  allow.owner('customerId').read(),

  // Accountants can manage all invoices
  allow.groups(['accountant']).all(),

  // Managers can approve and view
  allow.groups(['manager']).read(),
  allow.groups(['manager']).update(),

  // Admins have full control
  allow.groups(['admin']).all(),
]);
```

### Real-World Example: Approval Workflow

```typescript
PurchaseOrder: c.model({
  id: a.id(),
  organizationId: a.string().required(),
  requestedBy: a.ref('User').required(),
  approvedBy: a.ref('User').optional(),

  // Order details
  description: a.string().required(),
  vendor: a.string().required(),
  amount: a.number().positive().required(),

  // Workflow
  status: a
    .enum(['draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'completed'])
    .default('draft'),

  // Dates
  submittedAt: a.datetime().optional(),
  approvedAt: a.datetime().optional(),
})
  .partitionKey('organizationId')
  .authorization((allow) => [
    // Requester can create and manage drafts
    allow.owner('requestedBy').create(),
    allow.owner('requestedBy').update(), // Can update while draft
    allow.owner('requestedBy').read(),

    // Approvers can approve orders
    allow.groups(['approver']).read(),
    allow.groups(['approver']).update(), // To change status to approved/rejected

    // Finance team can view all orders
    allow.groups(['finance']).read(),
    allow.groups(['finance']).list(),

    // Finance managers can manage all orders
    allow.groups(['finance_manager']).all(),

    // Organization admins have full control
    allow.groups(['org_admin']).all(),

    // Platform admins have full control
    allow.groups(['platform_admin']).all(),
  ]);
```

## Security Best Practices

### 1. Always Define Authorization

Never leave authorization undefined:

```typescript
// Bad - no authorization rules
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
});

// Good - explicit authorization
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
}).authorization((allow) => [allow.owner('id'), allow.groups(['admin']).all()]);
```

### 2. Principle of Least Privilege

Grant minimal necessary permissions:

```typescript
// Bad - too permissive
.authorization(allow => [
  allow.authenticated().all()  // Any logged-in user can do anything
])

// Good - specific permissions
.authorization(allow => [
  allow.authenticated(['read', 'list']),  // Users can only read
  allow.owner('userId'),                   // Owners can manage their own
  allow.groups(['admin']).all(),           // Only admins have full access
])
```

### 3. Use Groups for Role-Based Access

Instead of checking user IDs, use groups:

```typescript
// Bad - hardcoded user IDs
.authorization(allow => [
  // Don't do this!
])

// Good - use groups
.authorization(allow => [
  allow.groups(['admin', 'editor']).all()
])
```

### 4. Protect Sensitive Operations

Require elevated privileges for sensitive operations:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  isAdmin: a.boolean().default(false),
}).authorization((allow) => [
  allow.owner('id').read(), // Users can read their profile
  allow.owner('id').update(), // Users can update their profile
  allow.groups(['admin']).all(), // Only admins can delete or grant admin
]);
```

### 5. Validate on Both Client and Server

Authorization rules are enforced server-side, but validate on the client too for better UX:

```typescript
// Server-side (automatic via authorization rules)
.authorization(allow => [
  allow.owner('userId'),
])

// Client-side (check before making request)
if (currentUser.id === record.userId || currentUser.isAdmin) {
  // Show edit button
}
```

### 6. Audit Authorization Changes

Log authorization-related actions:

```typescript
// In your application code (not schema)
async function updateRecord(recordId, changes, user) {
  // Authorization check happens automatically

  // Log the action
  await auditLog.create({
    action: 'update',
    recordId,
    userId: user.id,
    timestamp: new Date(),
  });
}
```

### 7. Test Authorization Rules

Write tests to verify authorization works correctly:

```typescript
// Example test
it('should allow owner to update their own post', async () => {
  const post = await createPost({ authorId: user.id });
  const result = await updatePost(post.id, { title: 'New Title' }, user);
  expect(result.success).toBe(true);
});

it('should deny non-owner from updating post', async () => {
  const post = await createPost({ authorId: user1.id });
  const result = await updatePost(post.id, { title: 'Hacked' }, user2);
  expect(result.success).toBe(false);
});
```

## Testing Authorization

To test if your authorization rules are working:

1. **Create test users with different roles:**

```typescript
const regularUser = { id: 'user-1', roles: ['user'] };
const editor = { id: 'user-2', roles: ['editor'] };
const admin = { id: 'user-3', roles: ['admin'] };
```

2. **Test each operation:**

```typescript
// Test read access
const canRead = await checkAccess('read', record, regularUser);

// Test update access
const canUpdate = await checkAccess('update', record, editor);

// Test delete access
const canDelete = await checkAccess('delete', record, admin);
```

3. **Test edge cases:**

- Unauthenticated users
- Users with no roles
- Records with no owner
- Deleted records
- Suspended users

## Common Pitfalls

### Pitfall 1: Forgetting Authorization

Always add authorization rules:

```typescript
// Missing authorization - DANGEROUS!
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
});
```

### Pitfall 2: Too Permissive Public Access

Be careful with public access:

```typescript
// Dangerous - anyone can modify
.authorization(allow => [
  allow.public().all()  // Bad!
])

// Better - public read only
.authorization(allow => [
  allow.public(['read', 'list'])  // Good
])
```

### Pitfall 3: Not Validating Owner Field Exists

Make sure the owner field is required:

```typescript
// Bad - ownerId might be null
Post: c.model({
  id: a.id(),
  ownerId: a.string().optional(), // Problem!
}).authorization((allow) => [
  allow.owner('ownerId'), // Won't work if ownerId is null
]);

// Good - ownerId is required
Post: c.model({
  id: a.id(),
  ownerId: a.string().required(), // Correct
}).authorization((allow) => [allow.owner('ownerId')]);
```

## Next Steps

- [CRUD models guide](./crud-models.md) - Build complete data models
- [Authentication setup](../getting-started/authentication-setup.md) - Configure auth providers
- [Troubleshooting auth errors](../troubleshooting/auth-errors.md) - Debug authorization issues

## Summary

You've learned:

- How authorization rules work and are evaluated
- Owner-only access patterns
- Group-based permission patterns
- Public and authenticated access patterns
- Multi-tenant data isolation
- Admin override patterns
- How to combine multiple rules for complex scenarios
- Security best practices for authorization
- Common pitfalls to avoid

Authorization is critical for securing your application. Apply the principle of least privilege, test thoroughly, and always define explicit authorization rules.
