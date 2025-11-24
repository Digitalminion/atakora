# ADR-025: Builder Validation Strategy

**Status**: Proposed
**Date**: 2025-11-22
**Author**: Becky (Staff Architect)
**Relates to**: STUB_IMPLEMENTATION_PLAN.md Phases 2 & 3

---

## Context

The builder APIs (storage, events, compute, network, performance, monitoring) provide fluent interfaces for configuring Azure infrastructure. We need a consistent validation strategy that provides good developer experience while catching errors early.

**Key Design Challenges:**

1. **When to Validate**: Validate on each method call vs. only at build()?
2. **Error Messages**: How to provide clear, actionable error messages?
3. **Type Safety**: How to enforce constraints via TypeScript vs. runtime?
4. **Performance**: Validation overhead should be minimal
5. **Consistency**: All builders should behave similarly

**Current State**: We have extensive validation functions but stub builders:

```typescript
// Validation functions exist and are comprehensive
export function validateStorageAccountConfig(config: StorageAccountConfig): string[] {
  const errors: string[] = [];

  if (config.name) {
    if (config.name.length < 3 || config.name.length > 24) {
      errors.push('Storage account name must be between 3 and 24 characters');
    }
    if (!/^[a-z0-9]+$/.test(config.name)) {
      errors.push('Storage account name must contain only lowercase letters and numbers');
    }
  }

  // ... more validations
  return errors;
}

// But builders are stubs
export class StorageAccountBuilder {
  private config: any = {};

  name(name: string): this {
    this.config.name = name;
    return this;
  }

  _build(): any {
    return this.config;
  }
}
```

**Usage Example from Real Code:**

```typescript
// From backend/src/storage/resource.ts
storage
  .account()
  .name('dataplatformstorage')
  .redundancy(isProd ? 'GRS' : 'LRS')
  .tier(isProd ? 'Premium' : 'Standard')
  .performance((perf) => perf.largeFileShares(isProd).disablePublicAccess())
  .container('datasets', (c) => c.private().immutable(7))
  .encryption((enc) =>
    enc
      .keySource(isProd ? 'Microsoft.KeyVault' : 'Microsoft.Storage')
      .when(isProd, (e) => e.keyVaultKey(process.env.STORAGE_ENCRYPTION_KEY!))
  );
```

**Questions:**

1. When should `.name('dataplatformstorage')` validate the name format?
2. What if `.tier('Premium')` is incompatible with later `.redundancy('LRS')`?
3. How do nested builders (`.encryption(...)`) validate their constraints?
4. Should `.build()` re-run all validations or trust incremental validation?

---

## Decision

We will implement a **hybrid validation strategy** with three validation tiers:

### Tier 1: Immediate Validation (Format & Type)

**When**: On each method call
**What**: Simple, fast validations (format, type, range)
**Why**: Catch obvious errors immediately with clear context

```typescript
export class StorageAccountBuilder {
  private config: Partial<StorageAccountConfig> = {};

  name(name: string): this {
    // Immediate validation: format check
    if (name.length < 3 || name.length > 24) {
      throw new BuilderValidationError(
        'Storage account name must be between 3 and 24 characters',
        'name',
        name
      );
    }

    if (!/^[a-z0-9]+$/.test(name)) {
      throw new BuilderValidationError(
        'Storage account name must contain only lowercase letters and numbers',
        'name',
        name
      );
    }

    this.config.name = name;
    return this;
  }

  tier(tier: 'Standard' | 'Premium'): this {
    // Type is enforced by TypeScript
    // No additional runtime validation needed
    this.config.tier = tier;
    return this;
  }

  redundancy(redundancy: 'LRS' | 'ZRS' | 'GRS' | 'RAGRS'): this {
    // Type is enforced by TypeScript
    this.config.redundancy = redundancy;
    return this;
  }
}
```

**Error Format:**

```typescript
class BuilderValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: any,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'BuilderValidationError';
  }
}

// Usage
throw new BuilderValidationError(
  'Storage account name must be lowercase',
  'name',
  'MyStorage',
  'Try: mystorage'
);
```

---

### Tier 2: Cross-Field Validation (Compatibility)

**When**: On build()
**What**: Validations requiring multiple fields (SKU + tier compatibility)
**Why**: Can't validate until all related fields are set

```typescript
export class StorageAccountBuilder {
  build(): StorageAccountConfig {
    // Collect all cross-field validations
    const errors: string[] = [];

    // Required fields
    if (!this.config.tier) {
      errors.push('Storage tier is required');
    }

    if (!this.config.redundancy) {
      errors.push('Storage redundancy is required');
    }

    // Cross-field constraints
    if (this.config.tier === 'Premium' && this.config.redundancy !== 'LRS') {
      errors.push('Premium tier only supports LRS redundancy');
    }

    if (
      this.config.networkRules?.defaultAction === 'Deny' &&
      !this.config.networkRules.allowAzureServices
    ) {
      errors.push('When network access is denied, consider allowing Azure services');
    }

    // Throw if any errors
    if (errors.length > 0) {
      throw new BuilderValidationError(
        `Storage account configuration is invalid:\n${errors.join('\n')}`,
        'build',
        this.config
      );
    }

    // Use existing comprehensive validation as final check
    const additionalErrors = validateStorageAccountConfig(this.config as StorageAccountConfig);
    if (additionalErrors.length > 0) {
      throw new BuilderValidationError(
        `Storage account configuration is invalid:\n${additionalErrors.join('\n')}`,
        'build',
        this.config
      );
    }

    return this.config as StorageAccountConfig;
  }
}
```

---

### Tier 3: Contextual Warnings (Best Practices)

**When**: On build()
**What**: Non-blocking warnings for best practices
**Why**: Inform users of potential issues without blocking

```typescript
export class StorageAccountBuilder {
  build(): StorageAccountConfig {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ... validation logic ...

    // Best practice warnings (non-blocking)
    if (!this.config.httpsOnly) {
      warnings.push('HTTPS-only is recommended for production');
    }

    if (this.config.allowBlobPublicAccess) {
      warnings.push('Public blob access is not recommended for production');
    }

    if (this.config.minimumTlsVersion !== '1.2') {
      warnings.push('TLS 1.2 is recommended for production');
    }

    // Log warnings but don't throw
    if (warnings.length > 0) {
      console.warn('Storage account configuration warnings:', warnings);
    }

    // Throw only for errors
    if (errors.length > 0) {
      throw new BuilderValidationError(
        `Storage account configuration is invalid:\n${errors.join('\n')}`,
        'build',
        this.config
      );
    }

    return this.config as StorageAccountConfig;
  }
}
```

---

### Nested Builder Validation

Nested builders follow the same pattern:

```typescript
interface EncryptionBuilder {
  keySource(source: 'Microsoft.Storage' | 'Microsoft.KeyVault'): this;
  keyVaultKey(keyUrl: string): this;
  requireInfrastructureEncryption(): this;
  _build(): EncryptionConfig;
}

export class StorageAccountBuilder {
  encryption(configure: (builder: EncryptionBuilder) => void): this {
    const encBuilder = new EncryptionBuilderImpl();

    // User configures the nested builder
    configure(encBuilder);

    // Validate and store result
    this.config.encryption = encBuilder._build(); // Throws if invalid

    return this;
  }
}

class EncryptionBuilderImpl implements EncryptionBuilder {
  private config: Partial<EncryptionConfig> = {};

  keySource(source: 'Microsoft.Storage' | 'Microsoft.KeyVault'): this {
    this.config.keySource = source;
    return this;
  }

  keyVaultKey(keyUrl: string): this {
    // Immediate validation: URL format
    if (!keyUrl.startsWith('https://')) {
      throw new BuilderValidationError('Key Vault key URL must be HTTPS', 'keyVaultKey', keyUrl);
    }

    this.config.keyVaultKey = keyUrl;
    return this;
  }

  _build(): EncryptionConfig {
    // Cross-field validation
    if (!this.config.keySource) {
      throw new BuilderValidationError('Encryption key source is required', 'keySource', undefined);
    }

    if (this.config.keySource === 'Microsoft.KeyVault' && !this.config.keyVaultKey) {
      throw new BuilderValidationError(
        'Key Vault key URL is required when using Microsoft.KeyVault key source',
        'keyVaultKey',
        undefined
      );
    }

    return this.config as EncryptionConfig;
  }
}
```

---

### Conditional Validation (.when())

The `.when()` method allows conditional configuration:

```typescript
export class StorageAccountBuilder {
  when(condition: boolean, configure: (builder: this) => void): this {
    if (condition) {
      configure(this);
    }
    return this;
  }
}

// Usage
storage
  .account()
  .name('storage')
  .when(isProd, (b) => b.tier('Premium').redundancy('GRS'))
  .when(!isProd, (b) => b.tier('Standard').redundancy('LRS'));
```

**Validation Behavior**: Validation happens normally inside `.when()` blocks. If the condition is false, no validation occurs (because methods aren't called).

---

## Alternatives Considered

### Alternative 1: Validate Only on build()

**Approach**: No validation during builder construction, all at build().

```typescript
export class StorageAccountBuilder {
  name(name: string): this {
    // No validation, just store
    this.config.name = name;
    return this;
  }

  build(): StorageAccountConfig {
    // All validation here
    const errors = validateStorageAccountConfig(this.config);
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
    return this.config as StorageAccountConfig;
  }
}
```

**Pros:**

- Simple implementation
- No validation overhead during construction
- Single validation point

**Cons:**

- Errors discovered late (potentially many lines after mistake)
- Error context is lost (which method caused the error?)
- Poor developer experience (no immediate feedback)

**Example Problem:**

```typescript
storage
  .account()
  .name('dataplatformstorage')
  .tier('Premium')
  .redundancy('LRS')
  // ... 50 more lines ...
  .build(); // ERROR: "Premium tier only supports LRS redundancy"
// Which line is the problem? tier() or redundancy()?
```

**Rejected**: Poor developer experience.

---

### Alternative 2: Validate on Every Method

**Approach**: Run full validation after each method call.

```typescript
export class StorageAccountBuilder {
  name(name: string): this {
    this.config.name = name;

    // Full validation after every change
    const errors = validateStorageAccountConfig(this.config);
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }

    return this;
  }

  tier(tier: 'Standard' | 'Premium'): this {
    this.config.tier = tier;

    // Full validation again
    const errors = validateStorageAccountConfig(this.config);
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }

    return this;
  }
}
```

**Pros:**

- Immediate error feedback
- Clear error context

**Cons:**

- Spurious errors for incomplete configurations
  - `.name('storage')` fails because tier not set yet
  - Requires all required fields set before any method
- Slow (O(n²) validations for n method calls)
- Confusing error messages

**Example Problem:**

```typescript
storage.account().name('storage'); // ERROR: "tier is required"
// Can't proceed because tier not set yet
```

**Rejected**: Too strict, prevents normal builder usage patterns.

---

### Alternative 3: Type-State Pattern

**Approach**: Use TypeScript types to enforce valid builder state.

```typescript
class StorageAccountBuilder<TState extends BuilderState> {
  name(name: string): StorageAccountBuilder<TState & { name: true }> {
    // Type system tracks what's been set
    return this as any;
  }

  tier(tier: 'Standard' | 'Premium'): StorageAccountBuilder<TState & { tier: true }> {
    return this as any;
  }

  build(this: StorageAccountBuilder<{ name: true; tier: true }>): StorageAccountConfig {
    // Can only call build() if name and tier are set
    return this.config as StorageAccountConfig;
  }
}
```

**Pros:**

- Compile-time validation
- No runtime overhead
- Very type-safe

**Cons:**

- Extremely complex type signatures
- Poor IntelliSense experience
- Doesn't handle cross-field constraints well
- TypeScript compiler limitations with complex types

**Example Problem:**

```typescript
// Type errors are cryptic
storage.account().name('storage').build(); // ERROR: Type 'StorageAccountBuilder<{ name: true }>' is not
//        assignable to type 'StorageAccountBuilder<{ name: true; tier: true }>'
```

**Rejected**: Too complex, poor developer experience.

---

## Consequences

### Positive

1. **Immediate Feedback**: Simple errors caught immediately with clear context
2. **Delayed Cross-Field**: Complex validations happen when all data available
3. **Clear Messages**: Error messages include field, value, and suggestions
4. **Performance**: Minimal validation overhead (simple checks only)
5. **Consistency**: All builders follow same pattern
6. **Type Safety**: TypeScript enforces types, runtime validates values
7. **Best Practices**: Warnings guide users without blocking

### Negative

1. **Two Validation Points**: Must validate in methods AND build()
2. **Duplication**: Some validations duplicated (once in method, once in comprehensive validator)
3. **Testing**: Must test both immediate and delayed validation
4. **Maintenance**: Changes require updating multiple places

### Mitigations

**Duplication**: Extract common validation helpers:

```typescript
// Validation helpers
const validators = {
  storageAccountName(name: string): void {
    if (name.length < 3 || name.length > 24) {
      throw new BuilderValidationError(
        'Storage account name must be between 3 and 24 characters',
        'name',
        name
      );
    }
    if (!/^[a-z0-9]+$/.test(name)) {
      throw new BuilderValidationError(
        'Storage account name must contain only lowercase letters and numbers',
        'name',
        name
      );
    }
  },
};

// Used in builder method
name(name: string): this {
  validators.storageAccountName(name);
  this.config.name = name;
  return this;
}

// And in comprehensive validation
export function validateStorageAccountConfig(config: StorageAccountConfig): string[] {
  const errors: string[] = [];

  if (config.name) {
    try {
      validators.storageAccountName(config.name);
    } catch (error) {
      errors.push(error.message);
    }
  }

  // ... more validations
  return errors;
}
```

**Testing**: Separate test suites for each validation tier:

```typescript
describe('StorageAccountBuilder', () => {
  describe('Immediate Validation', () => {
    it('validates name format immediately', () => {
      expect(() => {
        storage.account().name('INVALID');
      }).toThrow(BuilderValidationError);
    });
  });

  describe('Cross-Field Validation', () => {
    it('validates tier/redundancy compatibility at build', () => {
      expect(() => {
        storage.account().tier('Premium').redundancy('GRS').build();
      }).toThrow(BuilderValidationError);
    });
  });

  describe('Warnings', () => {
    it('warns about best practices', () => {
      const consoleSpy = jest.spyOn(console, 'warn');

      storage.account().tier('Standard').redundancy('LRS').httpsOnly(false).build();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('HTTPS-only is recommended'));
    });
  });
});
```

---

## Success Criteria

### Developer Experience

- [ ] IntelliSense provides helpful completions
- [ ] Error messages are clear and actionable
- [ ] Errors include suggestions for fixes
- [ ] Warnings don't block but inform

### Correctness

- [ ] All invalid configurations rejected
- [ ] No false positives (valid configs always work)
- [ ] TypeScript prevents type errors at compile time
- [ ] Runtime catches value errors

### Performance

- [ ] <1ms overhead per method call
- [ ] <5ms for build() validation
- [ ] No O(n²) behavior

### Consistency

- [ ] All builders follow same pattern
- [ ] Error format consistent across builders
- [ ] Validation behavior predictable

---

## Implementation Pattern

Every builder should follow this template:

```typescript
export class XyzBuilder {
  private config: Partial<XyzConfig> = {};

  // TIER 1: Immediate validation (format/type)
  simpleMethod(value: string): this {
    // Validate format/type immediately
    if (!isValidFormat(value)) {
      throw new BuilderValidationError(
        'Value must be...',
        'simpleMethod',
        value,
        'Try: validValue'
      );
    }

    this.config.simpleValue = value;
    return this;
  }

  // TypeScript handles type validation
  typedMethod(value: 'Option1' | 'Option2'): this {
    this.config.typedValue = value;
    return this;
  }

  // Nested builders
  nested(configure: (builder: NestedBuilder) => void): this {
    const builder = new NestedBuilderImpl();
    configure(builder);
    this.config.nested = builder._build(); // Validates on build
    return this;
  }

  // Conditional configuration
  when(condition: boolean, configure: (builder: this) => void): this {
    if (condition) {
      configure(this);
    }
    return this;
  }

  // TIER 2 & 3: Cross-field validation + warnings
  build(): XyzConfig {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!this.config.requiredField) {
      errors.push('Required field is required');
    }

    // Cross-field constraints
    if (this.config.field1 === 'A' && this.config.field2 === 'B') {
      errors.push('Field1=A is incompatible with Field2=B');
    }

    // Best practices
    if (!this.config.bestPracticeField) {
      warnings.push('Best practice field is recommended');
    }

    // Log warnings
    if (warnings.length > 0) {
      console.warn(`Xyz configuration warnings:`, warnings);
    }

    // Throw errors
    if (errors.length > 0) {
      throw new BuilderValidationError(
        `Xyz configuration is invalid:\n${errors.join('\n')}`,
        'build',
        this.config
      );
    }

    // Final comprehensive validation
    const additionalErrors = validateXyzConfig(this.config as XyzConfig);
    if (additionalErrors.length > 0) {
      throw new BuilderValidationError(
        `Xyz configuration is invalid:\n${additionalErrors.join('\n')}`,
        'build',
        this.config
      );
    }

    return this.config as XyzConfig;
  }
}
```

---

## Related Decisions

- ADR-024: Function Context Architecture (uses similar error handling)
- ADR-020: Fluent Queue API (established builder pattern)

---

## References

- [Builder Pattern Best Practices](https://refactoring.guru/design-patterns/builder)
- [TypeScript Type Guards](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types)
- [Error Handling Patterns](https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript)

---

**Document Control:**

- **Status**: Proposed
- **Decision Date**: Pending team review
- **Review Date**: Before Phase 2 implementation
- **Supersedes**: None (new decision)
