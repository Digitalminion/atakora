# Synthesis Pipeline - Root Cause Analysis

## Executive Summary

After deep-diving through the synthesis code, I've identified **3 critical bugs** causing template generation failures:

1. **Unresolved Placeholders**: `${cosmosEndpoint}`, `${managedIdentityClientId}` pass through as literal strings
2. **Duplicate App Settings**: Multiple `AzureWebJobsStorage` and `FUNCTIONS_WORKER_RUNTIME` entries
3. **Cross-Template dependsOn**: Child resources referencing parents in different templates

## Complete Synthesis Flow

```
User Code (packages/backend/src/crud-backend.ts)
  ↓
Component Package (packages/component/src/crud/function-generator.ts)
  ↓ Creates envVars with "${cosmosEndpoint}" placeholders (line 214-217)
  ↓
Backend Merger (packages/component/src/backend/providers/functions-provider.ts)
  ↓ Extracts envVars as literal strings (line 349)
  ↓
FunctionApp Constructor (packages/cdk/src/functions/function-app.ts)
  ↓ Stores in this.environment (line 219)
  ↓
FunctionApp.toArmTemplate() (line 266-321)
  ↓ Outputs envVars to ARM appSettings (line 287-289)
  ↓
ResourceTransformer.transform() (packages/lib/src/synthesis/transform/resource-transformer.ts)
  ↓ Calls toArmTemplate() (line 17)
  ↓ Calls replaceTokens() (line 19)
  ↓ ⚠️ BUG: replaceTokens() only handles {subscriptionId}, {resourceGroupName} (line 186-237)
  ↓ ⚠️ Does NOT handle ${cosmosEndpoint} syntax!
  ↓
Synthesizer.assembleV2() (packages/lib/src/synthesis/synthesizer.ts)
  ↓ JSON.stringify() outputs literal "${cosmosEndpoint}" (line 708)
  ↓
Result: Invalid ARM Template ❌
```

## Bug #1: Unresolved Placeholder Syntax

### Location
- **Source**: `packages/component/src/crud/function-generator.ts:214-217`
- **Processing**: `packages/lib/src/synthesis/transform/resource-transformer.ts:186-237`

### Root Cause
The code creates environment variables with `${...}` placeholder syntax:

```typescript
// function-generator.ts:214-217
const envVars: Record<string, string> = {
  COSMOS_ENDPOINT: '${cosmosEndpoint}',          // ⚠️ Literal string!
  AZURE_CLIENT_ID: '${managedIdentityClientId}', // ⚠️ Literal string!
  FUNCTIONS_WORKER_RUNTIME: 'node',
  AzureWebJobsStorage: '${storageConnectionString}', // ⚠️ Literal string!
};
```

These are passed through the entire pipeline and output as-is because:

**ResourceTransformer.replaceTokens()** only handles:
- `{subscriptionId}` → `[subscription().subscriptionId]`
- `{resourceGroupName}` → `[resourceGroup().name]`
- `00000000-0000-0000-0000-000000000000` → `[subscription().tenantId]`

It does NOT handle the `${...}` syntax at all!

```typescript
// resource-transformer.ts:186-237
private replaceTokens<T extends Record<string, any>>(obj: T): T {
  // ... code ...

  // Only handles {subscriptionId}, {resourceGroupName}
  replacedValue = replacedValue.replace(/\{subscriptionId\}/g, '[subscription().subscriptionId]');
  replacedValue = replacedValue.replace(/\{resourceGroupName\}/g, '[resourceGroup().name]');

  // ⚠️ NO HANDLER FOR ${cosmosEndpoint} or ${managedIdentityClientId}!

  return result as T;
}
```

### Evidence in Generated Template

```json
{
  "name": "COSMOS_ENDPOINT",
  "value": "${cosmosEndpoint}"  // ❌ Literal string in ARM template!
}
```

This causes JSON parsing errors because `${...}` is not valid ARM template syntax.

### Fix Required

**Option 1**: Add handler to `replaceTokens()`:
```typescript
// Replace ${cosmosEndpoint} with actual value or ARM expression
replacedValue = replacedValue.replace(/\$\{cosmosEndpoint\}/g, '[reference(...).documentEndpoint]');
```

**Option 2**: Don't use placeholder strings at all - pass actual ARM expressions:
```typescript
// function-generator.ts should create:
const envVars: Record<string, string> = {
  COSMOS_ENDPOINT: '[reference(resourceId(...), ...).documentEndpoint]',
  // ...
};
```

**Option 3** (Recommended - from manual fix): Extract as parameters in linked templates

## Bug #2: Duplicate App Settings

### Location
- **Source 1**: `packages/cdk/src/functions/function-app.ts:268-284`
- **Source 2**: `packages/component/src/crud/function-generator.ts:217`

### Root Cause

FunctionApp.toArmTemplate() always adds these app settings:

```typescript
// function-app.ts:268-284
const appSettings: Array<{ name: string; value: string }> = [
  {
    name: 'AzureWebJobsStorage',  // ⚠️ Added here
    value: `[concat('DefaultEndpointsProtocol=https;...')]`,
  },
  {
    name: 'FUNCTIONS_EXTENSION_VERSION',
    value: '~4',
  },
  {
    name: 'FUNCTIONS_WORKER_RUNTIME',  // ⚠️ Added here
    value: this.runtime,
  },
];

// Then adds user-provided environment variables
Object.entries(this.environment).forEach(([name, value]) => {
  appSettings.push({ name, value });  // ⚠️ May include duplicates!
});
```

But function-generator.ts ALSO provides:

```typescript
// function-generator.ts:216-217
const envVars: Record<string, string> = {
  FUNCTIONS_WORKER_RUNTIME: 'node',  // ⚠️ Duplicate!
  AzureWebJobsStorage: '${storageConnectionString}',  // ⚠️ Duplicate!
};
```

### Evidence in Generated Template

```json
{
  "siteConfig": {
    "appSettings": [
      {
        "name": "AzureWebJobsStorage",
        "value": "[concat('DefaultEndpointsProtocol=https;AccountName=storage...')]"
      },
      {
        "name": "FUNCTIONS_WORKER_RUNTIME",
        "value": "node"
      },
      // ... other settings ...
      {
        "name": "FUNCTIONS_WORKER_RUNTIME",  // ❌ DUPLICATE!
        "value": "node"
      },
      {
        "name": "AzureWebJobsStorage",  // ❌ DUPLICATE!
        "value": "${storageConnectionString}"
      }
    ]
  }
}
```

### Fix Required

FunctionApp.toArmTemplate() should check for duplicate keys before adding user envVars:

```typescript
// Add user-provided environment variables (avoid duplicates)
const reservedKeys = new Set(['AzureWebJobsStorage', 'FUNCTIONS_EXTENSION_VERSION', 'FUNCTIONS_WORKER_RUNTIME']);

Object.entries(this.environment).forEach(([name, value]) => {
  if (!reservedKeys.has(name)) {
    appSettings.push({ name, value });
  }
});
```

## Bug #3: Cross-Template dependsOn in Child Resources

### Location
- `packages/cdk/src/functions/inline-function.ts:242-244, 261-263`

### Root Cause

InlineFunction.toArmTemplate() adds `dependsOn` referencing parent Function App:

```typescript
// inline-function.ts:242-244
return {
  type: 'Microsoft.Web/sites/functions',
  apiVersion: '2023-01-01',
  name: `${this.functionAppName}/${this.functionName}`,
  properties: { ... },
  dependsOn: [
    `[resourceId('Microsoft.Web/sites', '${this.functionAppName}')]`,  // ⚠️ Parent reference
  ],
};
```

When templates are split:
- Parent `Microsoft.Web/sites` → `Foundation-compute-6.json`
- Child `Microsoft.Web/sites/functions` → `Foundation-application-7.json`

ARM validation fails: "The resource 'Microsoft.Web/sites/functions-...' is not defined in the template"

### Fix Required

Remove the `dependsOn` from child resources in linked templates. Template splitter already handles cross-template dependencies at the parent level.

```typescript
// inline-function.ts should NOT add dependsOn - let template splitter handle it
return {
  type: 'Microsoft.Web/sites/functions',
  apiVersion: '2023-01-01',
  name: `${this.functionAppName}/${this.functionName}`,
  properties: { ... },
  // NO dependsOn here!
};
```

## Bug #4: API Version Mismatch (Minor)

### Location
- `packages/cdk/src/functions/function-app.ts:272`

### Issue

Uses API version `2025-01-01` which doesn't exist yet:

```typescript
listKeys(resourceId('Microsoft.Storage/storageAccounts', '${this.storageAccountName}'), '2025-01-01')
```

Should use `2023-01-01` or `2023-04-01`.

## Recommended Fix Order

1. **Immediate**: Remove `dependsOn` from InlineFunction.toArmTemplate() (Bug #3)
2. **Immediate**: Fix duplicate app settings in FunctionApp.toArmTemplate() (Bug #2)
3. **Short-term**: Decide on placeholder strategy (Bug #1):
   - Option A: Stop using `${...}` syntax in function-generator.ts
   - Option B: Implement `${...}` replacement in resource-transformer.ts
   - Option C: Implement parameter extraction in template-splitter.ts (like manual fix)
4. **Cleanup**: Fix API version (Bug #4)

## Manual Template Fixes Applied

To work around these bugs, we manually edited the generated templates:

1. **Foundation-compute-6.json**:
   - Added parameters for `storageConnectionString` and `cosmosEndpoint`
   - Removed duplicate app settings
   - Removed unresolved placeholders

2. **Foundation.json**:
   - Pass `listKeys()` and `reference()` evaluations as parameters

3. **Foundation-application-*.json** (7-16):
   - Removed cross-template `dependsOn` clauses

These manual fixes work, but need to be implemented in the synthesis code for sustainable operation.

## Testing After Fixes

After implementing fixes, test with:

```bash
# Synthesize templates
npx @atakora/cli synth

# Expected: No JSON parsing errors
# Expected: No duplicate app settings
# Expected: Valid ARM templates generated

# Validate templates
az deployment group validate \
  --resource-group <rg-name> \
  --template-file .atakora/arm.out/backend/Foundation.json \
  --parameters ...
```

## Files to Modify

1. ✅ `packages/cdk/src/functions/inline-function.ts` - Remove dependsOn
2. ✅ `packages/cdk/src/functions/function-app.ts` - Fix duplicates, API version
3. ⚠️ `packages/component/src/crud/function-generator.ts` - Fix placeholder strategy
4. ⚠️ `packages/lib/src/synthesis/transform/resource-transformer.ts` - Add ${...} handling OR
5. ⚠️ `packages/lib/src/synthesis/assembly/template-splitter.ts` - Add parameter extraction

---

*Analysis completed: 2025-10-14*
