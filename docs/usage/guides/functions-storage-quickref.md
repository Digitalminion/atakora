# Functions Storage Quick Reference

## Key Concepts at a Glance

### Storage Is Automatic

```typescript
// This is all you need - storage is created automatically
const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE
});

// Access the automatically created storage
console.log(functionsApp.storage.storageAccountName);
```

### What NOT to Do

```typescript
// WRONG - existingStorage parameter was removed
const storage = new StorageAccounts(...);
const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  existingStorage: storage  // This parameter no longer exists
});
```

## Why Dedicated Storage?

| Runtime Needs | Why It's Separate |
|---------------|-------------------|
| Function code packages | Isolated from application data |
| Trigger coordination | Dedicated queue operations |
| Execution history | Independent state tracking |
| Scale controller state | No impact on app performance |
| Distributed locks | Runtime-specific operations |

## Architecture Patterns

### Single Function App

```
┌─────────────────────┐
│   Functions App     │
├─────────────────────┤
│ Automatic Storage:  │
│ - Blob (code)       │
│ - Queue (triggers)  │
│ - Table (state)     │
└─────────────────────┘
```

### Multi-App with Shared Data

```
┌──────────────────┐         ┌─────────────────┐
│  App Data        │◄────────│  API Functions  │
│  Storage         │         │  + Runtime      │
│  (shared)        │         │    Storage      │
└──────────────────┘         │  (dedicated)    │
        ▲                    └─────────────────┘
        │
        │                    ┌─────────────────┐
        └────────────────────│ Worker Functions│
                             │  + Runtime      │
                             │    Storage      │
                             │  (dedicated)    │
                             └─────────────────┘
```

## Decision Tree

**Need to create a Functions App?**
- Just create `FunctionsApp` construct
- It handles storage automatically
- No additional storage needed

**Need storage for your application data?**
- Create separate `StorageAccounts`
- Pass connection string to Functions via environment variables
- Keep it separate from Functions runtime storage

**Have multiple Functions Apps?**
- Each gets its own runtime storage automatically
- They can share application data storage if needed
- Never share runtime storage between Functions Apps

## Quick Comparison

| Storage Type | Purpose | Created By | Can Share? |
|-------------|---------|------------|------------|
| Functions Runtime | Function code, triggers, state | FunctionsApp (automatic) | No - one per app |
| Application Data | Your business data | You (manual) | Yes - can be shared |

## Common Scenarios

### Scenario 1: Simple API

```typescript
// Just create the Functions App
const api = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE
});
// Storage created automatically - done!
```

### Scenario 2: API with Data Storage

```typescript
// Your application data
const dataStorage = new StorageAccounts(stack, 'Data', { ... });

// API Functions (gets automatic runtime storage)
const api = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  environment: {
    DATA_STORAGE: dataStorage.connectionString
  }
});
```

### Scenario 3: Multiple Apps

```typescript
// Each app gets its own runtime storage automatically
const api = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE
});

const worker = new FunctionsApp(stack, 'Worker', {
  runtime: FunctionRuntime.PYTHON
});

// Result: 2 Functions Apps + 2 runtime storage accounts
```

## Cost Implications

| Item | Cost | Notes |
|------|------|-------|
| Functions Runtime Storage | ~$20-30/month | Standard_LRS, modest usage |
| Additional Functions App | +$20-30/month | Each needs runtime storage |
| Application Data Storage | Varies | Based on your data size/ops |

**Bottom Line**: The cost of dedicated runtime storage is minimal and essential for proper operation.

## Migration Path

**If you have existingStorage in your code:**

1. Remove the `existingStorage` parameter:
   ```typescript
   // Before
   const api = new FunctionsApp(stack, 'Api', {
     existingStorage: dataStorage  // Remove this
   });

   // After
   const api = new FunctionsApp(stack, 'Api', {
     runtime: FunctionRuntime.NODE
   });
   ```

2. Deploy - new storage will be created automatically
3. Functions will start using new dedicated storage
4. Old storage can be removed if no longer needed

## Troubleshooting Checklist

- [ ] Not passing `existingStorage` parameter (it was removed)
- [ ] Not pre-creating storage for Functions
- [ ] Each Functions App creating its own storage
- [ ] Application data storage separate from Functions runtime
- [ ] Environment variables pointing to correct storage

## When to Access Storage Properties

**Rarely needed**, but available:

```typescript
const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE
});

// Storage account properties (if needed)
const storageId = functionsApp.storage.storageAccountId;
const storageName = functionsApp.storage.storageAccountName;
```

**Common use cases:**
- Debugging deployment issues
- Setting up monitoring/alerts
- Granting permissions (rare)

## Government Cloud Notes

- Same pattern applies in Azure Government
- Dedicated storage equally important
- May have additional compliance tags
- Network isolation may be stricter

## Remember

1. **Storage is automatic** - don't create it manually
2. **Each app needs its own** - no sharing runtime storage
3. **Application data is separate** - use dedicated storage for your data
4. **Trust the defaults** - the construct knows what it's doing

## See Also

- [Functions Storage Guide](functions-storage.md) - Detailed explanation
- [Basic Usage Examples](../examples/functions-basic-usage.md) - Working code
- [Getting Started](../getting-started/functions-app.md) - Step-by-step tutorial
