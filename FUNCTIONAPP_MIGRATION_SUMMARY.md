# FunctionApp Migration to Context-Aware Synthesis Pipeline

## Task ID: 1211640749577354

## Summary

Successfully migrated the FunctionApp resource (`packages/cdk/src/functions/function-app.ts`) to implement the new context-aware synthesis pipeline methods and fixed critical bugs identified in SYNTHESIS_ISSUES_ANALYSIS.md.

## Changes Made

### 1. Implemented `toMetadata()` Method

Added the `toMetadata()` method to FunctionApp class (lines 258-342):

- **Dependencies Collection**: Tracks storage account and app service plan dependencies
- **Size Estimation**: Calculates base resource size (~2KB) plus inline function code sizes
- **Co-location Requirements**: Identifies child functions that must stay in same template via `requiresSameTemplate`
- **Template Preference**: Set to 'compute' tier for proper template assignment
- **Metadata Flags**: Marks resources with large inline content (>10KB) for splitting decisions

**Key Features**:
```typescript
return {
  id: this.node.id,
  type: this.resourceType,
  name: this.name,
  dependencies: [storageAccountName, planName],
  sizeEstimate: baseSize + codeSize,
  requiresSameTemplate: childFunctionIds,
  templatePreference: 'compute',
  metadata: {
    hasLargeInlineContent: codeSize > 10000,
  },
};
```

### 2. Updated `toArmTemplate()` to Accept Optional Context

Modified the `toArmTemplate()` method signature and implementation (lines 344-481):

- **Method Signature**: Changed from `toArmTemplate(): any` to `toArmTemplate(context?: SynthesisContext): any`
- **Context-Aware References**:
  - Uses `context.isInSameTemplate()` to check resource co-location
  - Uses `context.getCrossTemplateReference()` for cross-template storage references
  - Falls back to direct references when no context provided (backwards compatibility)
- **Conditional dependsOn**: Only includes same-template resources in dependsOn array
- **Clean Output**: Returns `undefined` for dependsOn when array is empty

**Context-Aware Logic**:
```typescript
if (context && this.storageAccountName) {
  if (context.isInSameTemplate(this.storageAccountName)) {
    // Same template - use direct reference
    storageAccountRef = `[resourceId('Microsoft.Storage/storageAccounts', '${this.storageAccountName}')]`;
  } else {
    // Cross-template - use deployment output reference
    storageAccountRef = context.getCrossTemplateReference(this.storageAccountName, 'id');
  }
}
```

### 3. Fixed Bug #2: Duplicate App Settings

**Problem**: FunctionApp was adding duplicate entries for `AzureWebJobsStorage` and `FUNCTIONS_WORKER_RUNTIME` - once from required settings and again from user environment variables.

**Solution** (lines 419-432):
```typescript
// Define reserved keys that should not be overridden
const reservedKeys = new Set([
  'AzureWebJobsStorage',
  'FUNCTIONS_EXTENSION_VERSION',
  'FUNCTIONS_WORKER_RUNTIME',
]);

// Add user-provided environment variables (skip reserved keys)
Object.entries(this.environment).forEach(([name, value]) => {
  if (!reservedKeys.has(name)) {
    appSettings.push({ name, value });
  }
});
```

**Result**: No more duplicate app settings in generated ARM templates.

### 4. Fixed Bug #4: API Version

**Problem**: Function App was using API version `2025-01-01` (which doesn't exist yet) in the `listKeys()` call for storage accounts.

**Solution** (lines 386-387, 396-397):
Changed all occurrences from:
```typescript
listKeys(..., '2025-01-01')
```
To:
```typescript
listKeys(..., '2023-01-01')
```

**Result**: Uses correct, existing API version for storage account key retrieval.

### 5. Added Type Exports to Library

Updated `packages/lib/src/index.ts` to export necessary types for context-aware synthesis:

- Added `SynthesisContext` to runtime exports (line 103)
- Added `ResourceMetadata`, `TemplateMetadata`, `TemplateAssignments`, `CrossTemplateDependency` to type exports (lines 119-122)

## Files Modified

1. **packages/cdk/src/functions/function-app.ts**
   - Added imports for ResourceMetadata and SynthesisContext
   - Implemented toMetadata() method
   - Updated toArmTemplate() to accept optional context parameter
   - Fixed duplicate app settings bug
   - Fixed API version bug

2. **packages/lib/src/index.ts**
   - Exported SynthesisContext class
   - Exported ResourceMetadata, TemplateMetadata, TemplateAssignments, CrossTemplateDependency types

## Testing Considerations

The migrated FunctionApp should be tested for:

1. **toMetadata() correctness**:
   - Verify dependencies are collected correctly
   - Check size estimation includes inline function code
   - Confirm child functions are identified in requiresSameTemplate

2. **toArmTemplate() context-aware behavior**:
   - Test with context when storage account is in same template
   - Test with context when storage account is in different template
   - Test without context (backwards compatibility)
   - Verify dependsOn only includes same-template resources

3. **Bug Fixes Validation**:
   - Confirm no duplicate app settings in generated ARM
   - Verify API version is 2023-01-01 in listKeys() calls
   - Test cross-template references use correct ARM expressions

4. **Integration Testing**:
   - Deploy function app with inline functions
   - Verify function app works with both single and split templates
   - Test cross-template storage account references resolve correctly

## Backwards Compatibility

The migration maintains full backwards compatibility:

- `toArmTemplate()` can be called without context parameter (existing code continues to work)
- When no context provided, generates direct references as before
- Existing FunctionApp usage in user code requires no changes

## Dependencies

This migration depends on:

- Phase 1 infrastructure (ResourceMetadata interface, SynthesisContext class)
- Updated Resource base class with toMetadata() abstract method
- Synthesis pipeline refactoring (TemplateAssignments, TemplateSplitter)

## Next Steps

1. Migrate InlineFunction to implement toMetadata() and context-aware toArmTemplate()
2. Fix Bug #3 in InlineFunction (remove cross-template dependsOn)
3. Continue migrating other resources (StorageAccount, AppServicePlan, etc.)
4. Add unit tests for FunctionApp toMetadata() and context-aware behavior
5. Perform integration testing with actual deployments

## References

- Task: Digital Minion #1211640749577354
- ADR-018: Context-Aware Synthesis Pipeline Refactoring
- `docs/design/architecture/synthesis-refactor-implementation-spec.md`
- `SYNTHESIS_ISSUES_ANALYSIS.md`
- `packages/lib/src/core/resource.ts` (Resource base class)
- `packages/lib/src/synthesis/context/synthesis-context.ts`
