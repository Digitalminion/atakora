# Troubleshooting Schema Errors

> Common schema error messages and how to fix them

## Overview

This guide covers the most common errors you'll encounter when defining schemas, along with their causes and solutions.

## Error Categories

- [Field Configuration Errors](#field-configuration-errors)
- [Validation Errors](#validation-errors)
- [Authorization Errors](#authorization-errors)
- [Reference Errors](#reference-errors)
- [Index and Partition Key Errors](#index-and-partition-key-errors)
- [Type Inference Errors](#type-inference-errors)

---

## Field Configuration Errors

### "Field cannot be both required and optional"

**Error Message:**

```
Error: Field "email" cannot be both required and optional
```

**Cause:**
You called both `.required()` and `.optional()` on the same field.

**Bad Code:**

```typescript
email: a.string().required().optional(); // Contradictory!
```

**Solution:**
Choose one or the other:

```typescript
// Either required
email: a.string().required();

// Or optional
email: a.string().optional();

// Or nothing (fields are optional by default)
email: a.string();
```

---

### "Field cannot be both required and nullable"

**Error Message:**

```
Error: Field "userId" cannot be both required and nullable
```

**Cause:**
A field that's required must have a value - it can't be null.

**Bad Code:**

```typescript
userId: a.string().required().nullable(); // Contradictory!
```

**Solution:**
Choose the appropriate combination:

```typescript
// Required field (must have a value)
userId: a.string().required();

// Optional field that can be null
userId: a.string().optional().nullable();

// Optional field that defaults to null
userId: a.string().nullable().default(null);
```

---

### "Field cannot have both default value and be required"

**Error Message:**

```
Error: Field "status" cannot have a default value and be required
```

**Cause:**
Required fields must be explicitly provided - they can't have defaults.

**Bad Code:**

```typescript
status: a.enum(['active', 'inactive']).required().default('active');
```

**Solution:**
Remove either `.required()` or `.default()`:

```typescript
// Required (no default)
status: a.enum(['active', 'inactive']).required();

// Optional with default
status: a.enum(['active', 'inactive']).default('active');
```

---

### "Invalid default value for field type"

**Error Message:**

```
Error: Default value "invalid-email" is not valid for field "email"
```

**Cause:**
The default value doesn't match the field's validation rules.

**Bad Code:**

```typescript
email: a.string().email().default('not-an-email');
```

**Solution:**
Provide a valid default value:

```typescript
email: a.string().email().default('user@example.com');

// Or don't provide a default
email: a.string().email();
```

---

## Validation Errors

### "Minimum value cannot be greater than maximum value"

**Error Message:**

```
Error: Field "age" minimum value (120) cannot be greater than maximum value (18)
```

**Cause:**
The `.min()` value is greater than the `.max()` value.

**Bad Code:**

```typescript
age: a.number().min(120).max(18); // Backwards!
```

**Solution:**
Correct the min/max order:

```typescript
age: a.number().min(18).max(120); // Correct
```

---

### "Invalid regex pattern"

**Error Message:**

```
Error: Invalid regex pattern for field "zipCode"
```

**Cause:**
The regex pattern has invalid syntax.

**Bad Code:**

```typescript
zipCode: a.string().regex(/^\d{5(-\d{4})?$/); // Missing closing }
```

**Solution:**
Fix the regex pattern:

```typescript
zipCode: a.string().regex(/^\d{5}(-\d{4})?$/); // Correct
```

---

### "MinItems cannot be greater than maxItems"

**Error Message:**

```
Error: Field "tags" minItems (10) cannot be greater than maxItems (5)
```

**Cause:**
Array minimum size is greater than maximum size.

**Bad Code:**

```typescript
tags: a.array(a.string()).minItems(10).maxItems(5); // Backwards!
```

**Solution:**
Correct the min/max order:

```typescript
tags: a.array(a.string()).minItems(1).maxItems(10); // Correct
```

---

## Authorization Errors

### "Authorization owner field does not exist in model"

**Error Message:**

```
Error: Authorization owner field "userId" does not exist in model "Post"
```

**Cause:**
The field specified in `.owner()` doesn't exist in the model.

**Bad Code:**

```typescript
Post: c.model({
  id: a.id(),
  authorId: a.string().required(), // Field is "authorId"
  title: a.string().required(),
}).authorization((allow) => [
  allow.owner('userId'), // But we're checking "userId"
]);
```

**Solution:**
Use the correct field name:

```typescript
Post: c.model({
  id: a.id(),
  authorId: a.string().required(),
  title: a.string().required(),
}).authorization((allow) => [
  allow.owner('authorId'), // Correct field name
]);
```

---

### "Empty authorization groups array"

**Error Message:**

```
Error: Authorization groups cannot be empty
```

**Cause:**
You passed an empty array to `.groups()`.

**Bad Code:**

```typescript
.authorization(allow => [
  allow.groups([]).all()  // Empty array!
])
```

**Solution:**
Provide at least one group:

```typescript
.authorization(allow => [
  allow.groups(['admin', 'editor']).all()
])
```

---

### "Invalid authorization operation"

**Error Message:**

```
Error: Invalid operation "modify" for authorization rule
```

**Cause:**
You specified an invalid operation name.

**Bad Code:**

```typescript
.authorization(allow => [
  allow.authenticated(['read', 'modify'])  // "modify" is not valid
])
```

**Solution:**
Use valid operation names:

```typescript
.authorization(allow => [
  allow.authenticated(['read', 'update'])  // "update" is correct
])
```

**Valid operations:** `create`, `read`, `update`, `delete`, `list`

---

## Reference Errors

### "Reference field must specify a valid model name"

**Error Message:**

```
Error: Reference field "userId" must specify a valid model name
```

**Cause:**
You didn't provide a model name to `a.ref()`, or provided an empty string.

**Bad Code:**

```typescript
userId: a.ref(''); // Empty model name
// or
userId: a.ref(); // No model name
```

**Solution:**
Provide the referenced model name:

```typescript
userId: a.ref('User'); // Correct
```

---

### "Reference field with onDelete('set_null') must be nullable"

**Error Message:**

```
Error: Reference field "projectId" with onDelete('set_null') must be nullable
```

**Cause:**
When a reference can be set to null on delete, it must be marked as nullable.

**Bad Code:**

```typescript
projectId: a.ref('Project').onDelete('set_null'); // Not nullable!
```

**Solution:**
Add `.nullable()`:

```typescript
projectId: a.ref('Project').onDelete('set_null').nullable(); // Correct
```

---

### "Reference field cannot be both required and have onDelete('set_null')"

**Error Message:**

```
Error: Reference field "userId" cannot be both required and have onDelete('set_null')
```

**Cause:**
A required field can't be set to null.

**Bad Code:**

```typescript
userId: a.ref('User').required().onDelete('set_null'); // Contradictory!
```

**Solution:**
Choose appropriate delete behavior:

```typescript
// If the field is required, use cascade or restrict
userId: a.ref('User').required().onDelete('cascade');

// Or make it optional and nullable
userId: a.ref('User').optional().nullable().onDelete('set_null');
```

---

### "Referenced model not found in schema"

**Error Message:**

```
Error: Referenced model "Organization" not found in schema
```

**Cause:**
The model referenced by `a.ref()` doesn't exist in your schema.

**Bad Code:**

```typescript
schema: a.schema({
  User: c.model({
    id: a.id(),
    organizationId: a.ref('Organization'), // Organization not defined!
  }),
});
```

**Solution:**
Define the referenced model:

```typescript
schema: a.schema({
  Organization: c.model({
    id: a.id(),
    name: a.string().required(),
  }),

  User: c.model({
    id: a.id(),
    organizationId: a.ref('Organization'), // Now it exists
  }),
});
```

---

## Index and Partition Key Errors

### "Partition key field does not exist in model"

**Error Message:**

```
Error: Partition key field "tenantId" does not exist in model "Task"
```

**Cause:**
The field specified as partition key doesn't exist in the model.

**Bad Code:**

```typescript
Task: c.model({
  id: a.id(),
  organizationId: a.string().required(), // Field is "organizationId"
  title: a.string().required(),
}).partitionKey('tenantId'); // But we're using "tenantId"
```

**Solution:**
Use the correct field name:

```typescript
Task: c.model({
  id: a.id(),
  organizationId: a.string().required(),
  title: a.string().required(),
}).partitionKey('organizationId'); // Correct
```

---

### "Index field does not exist in model"

**Error Message:**

```
Error: Index field "email" does not exist in model "User"
```

**Cause:**
One of the fields in the `.indexes()` array doesn't exist.

**Bad Code:**

```typescript
User: c.model({
  id: a.id(),
  emailAddress: a.string().required().email(), // Field is "emailAddress"
}).indexes(['email']); // But we're indexing "email"
```

**Solution:**
Use the correct field name:

```typescript
User: c.model({
  id: a.id(),
  emailAddress: a.string().required().email(),
}).indexes(['emailAddress']); // Correct
```

---

### "Reserved field name cannot be used"

**Error Message:**

```
Error: Field name "_id" is reserved and cannot be used
```

**Cause:**
You're using a Cosmos DB reserved field name.

**Bad Code:**

```typescript
User: c.model({
  id: a.id(),
  _id: a.string(), // Reserved!
  _etag: a.string(), // Reserved!
  __typename: a.string(), // Reserved!
});
```

**Solution:**
Use different field names:

```typescript
User: c.model({
  id: a.id(),
  externalId: a.string(), // Use this instead of _id
  version: a.string(), // Use this instead of _etag
  type: a.string(), // Use this instead of __typename
});
```

**Reserved names:** `_id`, `_etag`, `_rid`, `_self`, `_ts`, `_attachments`, `__typename`

---

## Type Inference Errors

### "Cannot infer type from field builder"

**Error Message:**

```
Error: Cannot infer TypeScript type from field definition
```

**Cause:**
Usually occurs when using advanced TypeScript features incorrectly.

**Solution:**
Explicitly type your schema:

```typescript
// Instead of relying on inference
const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      name: a.string().required(),
    }),
  }),
});

// Explicitly type it
const schema: SchemaObject = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      name: a.string().required(),
    }),
  }),
});
```

---

### "Type 'unknown' is not assignable to type"

**Error Message:**

```
Type 'unknown' is not assignable to type 'string'
```

**Cause:**
TypeScript can't infer the field type correctly.

**Solution:**
Use the correct field type method:

```typescript
// Bad - TypeScript can't infer
const emailField = a.string();
const user = {
  email: emailField, // Type: unknown
};

// Good - use in model definition
User: c.model({
  email: a.string().required().email(), // Type: string
});
```

---

## Build-Time vs Runtime Errors

### Build-Time Errors

Errors caught during TypeScript compilation:

```typescript
// TypeScript catches this at build time
User: c.model({
  age: a.number().min(18).max(10), // Error: min > max
});
```

**When they occur:** During `npm run build` or `tsc`

**How to fix:** Check your code editor for TypeScript errors

### Runtime Errors

Errors caught when the schema is actually used:

```typescript
// This might not error until runtime
User: c.model({
  userId: a.string().required(),
}).authorization((allow) => [
  allow.owner('user_id'), // Typo - won't error until used
]);
```

**When they occur:** When defining the schema or making API calls

**How to fix:** Check server logs and error messages

---

## Debugging Tips

### 1. Enable Verbose Logging

Set logging level to see more details:

```typescript
// In your backend configuration
backend.setLogLevel('debug');
```

### 2. Validate Schema Early

Call `._build()` on models during development to catch errors:

```typescript
const User = c
  .model({
    id: a.id(),
    email: a.string().required().email(),
  })
  .authorization((allow) => [allow.owner('id')])
  ._build(); // This will throw errors immediately

console.log('User model validated successfully');
```

### 3. Use TypeScript Strict Mode

Enable strict TypeScript checking:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 4. Check Schema Metadata

Inspect schema structure to understand what was built:

```typescript
const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().required().email(),
    }),
  }),
});

// Inspect metadata
console.log('Schema version:', schema._metadata.version);
console.log('CRUD models:', schema._metadata.models.crud);
console.log('User fields:', Object.keys(schema.models.User.fields));
```

### 5. Validate Field Configurations

Check field configs to ensure they're correct:

```typescript
const User = c.model({
  email: a.string().required().email(),
});

const config = User._build();

// Check email field config
const emailField = config.fields.email;
console.log('Type:', emailField.type); // 'string'
console.log('Required:', emailField.required); // true
console.log('Format:', emailField.format); // 'email'
console.log('Validations:', emailField.validations);
```

---

## Common Patterns That Cause Errors

### Pattern 1: Circular References

**Problem:**

```typescript
// This can cause issues
schema: a.schema({
  User: c.model({
    id: a.id(),
    bestFriendId: a.ref('User'), // Self-reference
  }),
});
```

**Solution:**
Self-references are allowed, but be careful with delete cascades:

```typescript
User: c.model({
  id: a.id(),
  bestFriendId: a.ref('User').optional().onDelete('set_null').nullable(),
});
```

### Pattern 2: Missing Required Fields in Objects

**Problem:**

```typescript
address: a.object({
  street: a.string().required(),
  city: a.string().required(),
});
```

When creating a record, you must provide all required nested fields.

**Solution:**
Either make nested fields optional or ensure they're always provided:

```typescript
// Option 1: Make nested fields optional
address: a.object({
  street: a.string().optional(),
  city: a.string().optional(),
});

// Option 2: Make the entire object optional
address: a.object({
  street: a.string().required(),
  city: a.string().required(),
}).optional();

// Option 3: Provide default values
address: a.object({
  street: a.string().default(''),
  city: a.string().default(''),
});
```

### Pattern 3: Enum Values Mismatch

**Problem:**

```typescript
status: a.enum(['active', 'inactive']).default('pending'); // 'pending' not in enum!
```

**Solution:**
Ensure default value is in the enum:

```typescript
status: a.enum(['active', 'inactive', 'pending']).default('pending');
```

---

## Getting Help

If you encounter an error not covered here:

1. **Check the error message carefully** - it usually tells you exactly what's wrong
2. **Look at the stack trace** - it shows where the error occurred
3. **Search the documentation** - check other guides for examples
4. **Simplify your schema** - remove complexity until the error goes away, then add back piece by piece
5. **Ask for help** - include the error message, your schema definition, and what you've tried

---

## Quick Reference

### Common Fixes

| Error                                  | Quick Fix                                 |
| -------------------------------------- | ----------------------------------------- |
| "Cannot be both required and optional" | Remove one modifier                       |
| "Field does not exist"                 | Check spelling and field names            |
| "Invalid operation"                    | Use: create, read, update, delete, list   |
| "Must be nullable"                     | Add `.nullable()`                         |
| "Reserved field name"                  | Rename field (avoid `_id`, `_etag`, etc.) |
| "Referenced model not found"           | Define the model in schema                |
| "Min cannot be greater than max"       | Swap min/max values                       |

### Validation Order

When adding validations, this order works well:

```typescript
field: a.string()
  .required() // 1. Required/optional
  .nullable() // 2. Nullable
  .email() // 3. Format validation
  .min(3) // 4. Min constraint
  .max(255) // 5. Max constraint
  .regex(/pattern/) // 6. Pattern matching
  .default('value'); // 7. Default value (last)
```

---

## Next Steps

- [Field Types Reference](../reference/field-types.md) - Complete field type documentation
- [CRUD Models Guide](../guides/crud-models.md) - Learn about model configuration
- [Authorization Patterns](../guides/authorization-patterns.md) - Common authorization patterns
- [Authentication Errors](./auth-errors.md) - Troubleshoot authentication issues
