# ADR-021: Attachment Point Implementation Strategy

**Status:** Proposed
**Date:** 2025-11-22
**Architect:** Becky (Staff Architect)
**Stakeholders:** Devon (Implementation), Grace (Synthesis), Charlie (Testing)

---

## Context

The backend system currently has placeholder attachment points that throw errors when accessed. Attachment points are the mechanism for users to customize infrastructure beyond the smart defaults. They enable:

- Custom resource configurations (storage, compute, networking)
- Override default settings based on specific requirements
- Progressive enhancement from simple to complex architectures

### Current State

```typescript
function createPlaceholderAttachmentPoint<T>(path: string, defaultConfig: T): AttachmentPoint<T> {
  return {
    attach: () => {
      throw new Error(`Attachment points not yet implemented. This will be available in Task 2.`);
    },
    isAttached: () => false,
    getConfig: () => defaultConfig,
    reset: () => {},
    _default: defaultConfig,
    _path: path,
  };
}
```

### Problem Statement

We need to implement a fully functional attachment point system that:

1. **Maintains Type Safety:** Attached configs must be type-safe
2. **Validates Early:** Catch configuration errors before synthesis
3. **Integrates with Synthesis:** Pass attached configs to ARM generation
4. **Handles Conflicts:** Merge user configs with defaults correctly
5. **Provides Feedback:** Clear error messages for invalid attachments
6. **Supports Testing:** Enable mocking and testing of attachments

### Constraints

- Must work with existing backend object structure
- Cannot break backward compatibility
- Must support both Government and Commercial cloud configurations
- Must integrate with existing synthesis pipeline in lib package
- Must maintain immutability of backend object

---

## Decision

We will implement a **two-phase validation hybrid approach** with the following architecture:

### Phase 1: Immediate Validation (at `attach()` time)

**Validates:**
- Type correctness (TypeScript enforces this)
- Required fields are present
- Field value ranges are valid
- Basic structural integrity

**Does NOT validate:**
- Azure-specific constraints (API version compatibility, SKU availability)
- Resource naming uniqueness
- Cross-resource dependencies
- Region-specific limitations

**Rationale:** Fast feedback for obvious errors while maintaining flexibility for iterative development.

### Phase 2: Deep Validation (at synthesis time)

**Validates:**
- Azure-specific rules and constraints
- Resource dependencies are satisfied
- Naming conventions are followed
- Region-specific SKU availability
- Government vs Commercial cloud compatibility
- Resource quotas and limits

**Rationale:** Azure-specific validation requires synthesis context (region, environment, other resources).

### Implementation Architecture

```typescript
/**
 * Attachment Point Implementation
 *
 * Manages user-provided infrastructure customizations with two-phase validation.
 */
export class AttachmentPointImpl<T> implements AttachmentPoint<T> {
  private _attached: boolean = false;
  private _config: T | null = null;
  private readonly _default: T;
  private readonly _path: string;
  private readonly _validator: AttachmentValidator<T>;
  private readonly _backendRef: BackendObjectRef;

  constructor(
    path: string,
    defaultConfig: T,
    validator: AttachmentValidator<T>,
    backendRef: BackendObjectRef
  ) {
    this._path = path;
    this._default = defaultConfig;
    this._validator = validator;
    this._backendRef = backendRef;
  }

  /**
   * Attach a custom configuration
   *
   * Performs Phase 1 validation immediately.
   * Throws if validation fails.
   */
  attach(config: T): void {
    // Phase 1: Immediate validation
    const validation = this._validator.validateImmediate(config, this._path);

    if (!validation.isValid) {
      throw new AttachmentValidationError(
        `Attachment validation failed for ${this._path}`,
        validation.errors
      );
    }

    // Store config
    this._config = Object.freeze({ ...config }); // Immutable
    this._attached = true;

    // Register with backend for synthesis
    this._backendRef.registerAttachment(this._path, this._config);

    // Emit warnings (non-blocking)
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        console.warn(`[Attachment Warning] ${this._path}: ${warning.message}`);
      });
    }
  }

  /**
   * Check if configuration has been attached
   */
  isAttached(): boolean {
    return this._attached;
  }

  /**
   * Get effective configuration
   *
   * Returns attached config if present, otherwise default.
   */
  getConfig(): T {
    return this._attached && this._config !== null
      ? this._config
      : this._default;
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this._config = null;
    this._attached = false;
    this._backendRef.unregisterAttachment(this._path);
  }

  /**
   * Get default configuration
   * @internal
   */
  get _defaultConfig(): T {
    return this._default;
  }

  /**
   * Perform Phase 2 validation
   * Called during synthesis with full context
   * @internal
   */
  async _validateDeep(context: SynthesisContext): Promise<ValidationResult> {
    if (!this._attached || this._config === null) {
      return { isValid: true, errors: [], warnings: [] };
    }

    return this._validator.validateDeep(this._config, this._path, context);
  }
}
```

### Validation Strategy

```typescript
/**
 * Two-Phase Attachment Validator
 */
export interface AttachmentValidator<T> {
  /**
   * Phase 1: Immediate validation
   *
   * Fast validation performed at attach() time.
   * Only validates structure and basic constraints.
   */
  validateImmediate(config: T, path: string): ValidationResult;

  /**
   * Phase 2: Deep validation
   *
   * Comprehensive validation performed at synthesis time.
   * Validates Azure-specific rules with full context.
   */
  validateDeep(config: T, path: string, context: SynthesisContext): Promise<ValidationResult>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error (blocks attachment/synthesis)
 */
export interface ValidationError {
  path: string;
  field?: string;
  message: string;
  code: string;
  suggestion?: string;
}

/**
 * Validation warning (non-blocking)
 */
export interface ValidationWarning {
  path: string;
  field?: string;
  message: string;
  code: string;
}
```

### Integration with Backend Object

```typescript
/**
 * Backend object reference for attachment registration
 */
export interface BackendObjectRef {
  /**
   * Register an attachment for synthesis
   */
  registerAttachment(path: string, config: any): void;

  /**
   * Unregister an attachment
   */
  unregisterAttachment(path: string): void;

  /**
   * Get all registered attachments
   */
  getAttachments(): Map<string, any>;
}

/**
 * Updated backend object with attachment tracking
 */
export interface BackendObject<TSchema, TAuth> {
  // ... existing fields ...

  /**
   * Internal attachment registry
   * @internal
   */
  _attachments: Map<string, any>;

  /**
   * Register attachment (called by AttachmentPointImpl)
   * @internal
   */
  _registerAttachment(path: string, config: any): void;

  /**
   * Unregister attachment
   * @internal
   */
  _unregisterAttachment(path: string): void;
}
```

### Synthesis Integration

```typescript
/**
 * Synthesis adapter processes attachments
 */
export class BackendSynthesisAdapter {
  async synthesize(backend: BackendObject, context: SynthesisContext): Promise<ARMTemplate> {
    // Phase 2 validation for all attachments
    await this.validateAttachments(backend, context);

    // Synthesize resources with merged configs
    const resources = await this.synthesizeResources(backend, context);

    return {
      $schema: '...',
      contentVersion: '1.0.0.0',
      resources,
    };
  }

  private async validateAttachments(
    backend: BackendObject,
    context: SynthesisContext
  ): Promise<void> {
    const validationErrors: ValidationError[] = [];

    // Validate all attachment points
    for (const [path, attachmentPoint] of this.findAttachmentPoints(backend)) {
      const result = await attachmentPoint._validateDeep(context);

      if (!result.isValid) {
        validationErrors.push(...result.errors);
      }

      // Log warnings
      result.warnings.forEach(warning => {
        context.logger.warn(`[Synthesis Warning] ${warning.path}: ${warning.message}`);
      });
    }

    if (validationErrors.length > 0) {
      throw new SynthesisValidationError(
        'Attachment validation failed during synthesis',
        validationErrors
      );
    }
  }

  private async synthesizeResources(
    backend: BackendObject,
    context: SynthesisContext
  ): Promise<ARMResource[]> {
    const resources: ARMResource[] = [];

    // Synthesize storage resources
    resources.push(...await this.synthesizeStorage(backend, context));

    // Synthesize compute resources
    resources.push(...await this.synthesizeCompute(backend, context));

    // Synthesize networking (if enabled)
    if (backend.settings.features.networking && backend.network) {
      resources.push(...await this.synthesizeNetworking(backend, context));
    }

    // Synthesize monitoring (if enabled)
    if (backend.settings.features.monitoring && backend.monitoring) {
      resources.push(...await this.synthesizeMonitoring(backend, context));
    }

    return resources;
  }

  private async synthesizeStorage(
    backend: BackendObject,
    context: SynthesisContext
  ): Promise<ARMResource[]> {
    // Get effective config (merged default + attachment)
    const accountConfig = backend.storage.account.getConfig();
    const databaseConfig = backend.storage.database.getConfig();
    const blobsConfig = backend.storage.blobs.getConfig();

    // Synthesize with merged configs
    return [
      await this.storageAccountSynthesizer.synthesize(accountConfig, context),
      await this.cosmosDatabaseSynthesizer.synthesize(databaseConfig, context),
      await this.blobContainerSynthesizer.synthesize(blobsConfig, context),
    ];
  }
}
```

---

## Alternatives Considered

### Alternative 1: Immediate-Only Validation

**Approach:** Validate everything at `attach()` time, fail immediately on any error.

**Pros:**
- Simplest mental model
- Fastest feedback
- No deferred errors

**Cons:**
- Requires Azure-specific knowledge at attach time
- Blocks iterative development
- Cannot validate cross-resource dependencies
- Needs synthesis context at attach time (complex)

**Rejected because:** Too rigid, blocks progressive enhancement, requires synthesis context too early.

---

### Alternative 2: Lazy-Only Validation

**Approach:** No validation at `attach()` time, validate everything during synthesis.

**Pros:**
- Maximum flexibility
- Simple attach implementation
- All validation has full context

**Cons:**
- Errors appear late in pipeline
- Poor developer experience
- Typos not caught until synthesis
- Harder to debug

**Rejected because:** Developer experience suffers, errors are too late to be useful.

---

### Alternative 3: Builder Pattern with Fluent Validation

**Approach:** Use builder pattern for attachment configuration with incremental validation.

```typescript
backend.storage.database
  .attach()
  .name('my-cosmos-db')
  .region('eastus')
  .throughput(1000)
  .validate()
  .apply();
```

**Pros:**
- Fluent, discoverable API
- Can validate incrementally
- Clear separation of concerns

**Cons:**
- More complex API surface
- Builder state management
- Doesn't match existing attachment API
- Breaking change to current design

**Rejected because:** Breaking change, complexity doesn't justify benefits for this use case.

---

### Alternative 4: Schema-Based Validation

**Approach:** Define JSON schemas for all attachment configs, validate against schema.

```typescript
const storageAccountSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', pattern: '^[a-z0-9]{3,24}$' },
    sku: { enum: ['Standard_LRS', 'Standard_GRS', ...] },
  },
  required: ['name'],
};
```

**Pros:**
- Declarative validation rules
- Can generate TypeScript types from schemas
- Validation logic is data-driven
- Could expose schemas for tooling

**Cons:**
- Schema maintenance overhead
- Doesn't capture Azure-specific rules well
- Schema language less expressive than code
- Adds dependency on schema validator library

**Partially adopted:** We'll use schema-based validation for Phase 1 where it makes sense, but Phase 2 will be code-based for Azure-specific rules.

---

## Consequences

### Positive Consequences

1. **Fast Feedback:** Phase 1 validation catches obvious errors immediately
2. **Flexibility:** Phase 2 validation allows iterative development
3. **Type Safety:** TypeScript types enforced at compile time
4. **Clear Errors:** Two-phase approach enables specific, actionable error messages
5. **Testability:** Can test Phase 1 without synthesis, Phase 2 with mocked context
6. **Progressive Enhancement:** Users can attach configs incrementally
7. **Synthesis Integration:** Clean integration with existing synthesis pipeline

### Negative Consequences

1. **Complexity:** Two validation phases is more complex than one
2. **Testing:** Need to test both validation phases
3. **Mental Model:** Developers need to understand two-phase validation
4. **Error Timing:** Some errors still deferred to synthesis
5. **Validator Maintenance:** Need to maintain validators for each config type

### Trade-offs

**Fast Feedback vs. Flexibility:**
- We optimize for fast feedback on obvious errors
- But maintain flexibility for complex scenarios
- Two-phase validation balances both concerns

**Simplicity vs. Power:**
- More complex than immediate-only validation
- But enables progressive enhancement
- Complexity is justified by capability

**Type Safety vs. Runtime Validation:**
- TypeScript provides compile-time safety
- Runtime validation provides Azure-specific checks
- Both are necessary for robustness

---

## Success Criteria

### Functional Requirements

1. ✅ Attach custom configuration to any attachment point
2. ✅ Validation errors prevent invalid configurations
3. ✅ Clear error messages with suggestions
4. ✅ Warnings are non-blocking but visible
5. ✅ Synthesis integrates attached configs correctly
6. ✅ Reset clears attachments

### Non-Functional Requirements

1. ✅ Phase 1 validation completes in < 10ms
2. ✅ Type safety maintained end-to-end
3. ✅ 95%+ test coverage for validators
4. ✅ Zero breaking changes to existing API
5. ✅ Memory overhead < 1KB per attachment

### Developer Experience

1. ✅ Attach syntax is intuitive
2. ✅ Error messages are actionable
3. ✅ IDE autocomplete works for configs
4. ✅ Can mock attachments for testing
5. ✅ Documentation covers common scenarios

---

## Implementation Plan

### Phase 1: Core Implementation (Week 1, Days 3-5)

**Day 3:**
- Implement `AttachmentPointImpl` class
- Implement `BackendObjectRef` interface
- Update `defineBackend` to create real attachment points
- Add basic unit tests

**Day 4:**
- Implement attachment validators for storage configs
- Implement attachment validators for compute configs
- Add validation error types
- Add validator unit tests

**Day 5:**
- Implement attachment validators for networking (if enabled)
- Implement attachment validators for monitoring (if enabled)
- Add integration tests for attachment lifecycle
- Add conflict handling tests

### Phase 2: Synthesis Integration (Week 3, Days 1-3)

**Day 1:**
- Create `BackendSynthesisAdapter` in lib package
- Implement attachment discovery
- Implement Phase 2 validation orchestration
- Add synthesis adapter tests

**Day 2:**
- Implement storage resource synthesis with attachments
- Implement compute resource synthesis with attachments
- Add synthesis integration tests

**Day 3:**
- Implement networking resource synthesis (if enabled)
- Implement monitoring resource synthesis (if enabled)
- Add end-to-end synthesis tests

---

## Migration Path

### Current Users

No breaking changes. Existing code continues to work:

```typescript
// Before: This throws error
backend.storage.database.attach({ ... });

// After: This works
backend.storage.database.attach({ ... });
```

### New Users

New users get full attachment functionality immediately:

```typescript
import { defineBackend } from '@atakora/component';

const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});

// Attach custom Cosmos DB config
backend.storage.database.attach({
  name: 'my-custom-cosmos',
  throughput: 1000,
  consistencyLevel: 'Session',
});

// Synthesize
const template = await synthesize(backend);
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('AttachmentPointImpl', () => {
  it('should attach valid configuration', () => {
    const point = new AttachmentPointImpl(
      'storage.database',
      defaultConfig,
      validator,
      backendRef
    );

    expect(() => {
      point.attach(validConfig);
    }).not.toThrow();

    expect(point.isAttached()).toBe(true);
    expect(point.getConfig()).toEqual(validConfig);
  });

  it('should reject invalid configuration', () => {
    const point = new AttachmentPointImpl(...);

    expect(() => {
      point.attach(invalidConfig);
    }).toThrow(AttachmentValidationError);

    expect(point.isAttached()).toBe(false);
  });

  it('should emit warnings for suboptimal configs', () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    const point = new AttachmentPointImpl(...);

    point.attach(configWithWarnings);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Attachment Warning]')
    );
  });

  it('should reset to default config', () => {
    const point = new AttachmentPointImpl(...);
    point.attach(customConfig);
    point.reset();

    expect(point.isAttached()).toBe(false);
    expect(point.getConfig()).toEqual(defaultConfig);
  });
});
```

### Integration Tests

```typescript
describe('Backend Attachment Integration', () => {
  it('should register attachments with backend', () => {
    const backend = defineBackend({ ... });

    backend.storage.database.attach(customConfig);

    expect(backend._attachments.has('storage.database')).toBe(true);
    expect(backend._attachments.get('storage.database')).toEqual(customConfig);
  });

  it('should synthesize with attached configs', async () => {
    const backend = defineBackend({ ... });
    backend.storage.database.attach({ name: 'custom-db' });

    const template = await synthesize(backend);

    const cosmosDb = template.resources.find(r => r.type === 'Microsoft.DocumentDB/databaseAccounts');
    expect(cosmosDb.name).toBe('custom-db');
  });
});
```

### Synthesis Tests

```typescript
describe('Synthesis with Attachments', () => {
  it('should validate attachments during synthesis', async () => {
    const backend = defineBackend({ ... });
    backend.storage.database.attach({ invalidAzureConfig });

    await expect(synthesize(backend)).rejects.toThrow(SynthesisValidationError);
  });

  it('should merge attached config with defaults', async () => {
    const backend = defineBackend({ ... });
    backend.storage.database.attach({
      throughput: 2000, // Override
      // Other fields use defaults
    });

    const template = await synthesize(backend);

    const cosmosDb = template.resources.find(r => r.type === 'Microsoft.DocumentDB/databaseAccounts');
    expect(cosmosDb.properties.throughput).toBe(2000);
    expect(cosmosDb.properties.consistencyLevel).toBe('Session'); // Default
  });
});
```

---

## Documentation Requirements

### User Documentation

1. **Attachment Point Guide:**
   - What are attachment points?
   - When to use attachments vs defaults
   - How to attach configurations
   - Validation and error handling

2. **API Reference:**
   - `AttachmentPoint<T>` interface
   - `attach(config)` method
   - `isAttached()` method
   - `getConfig()` method
   - `reset()` method

3. **Examples:**
   - Attaching custom Cosmos DB config
   - Attaching custom Function App config
   - Attaching networking config
   - Handling validation errors

### Developer Documentation

1. **Architecture:**
   - Two-phase validation design
   - Synthesis integration
   - Type safety approach

2. **Testing:**
   - Mocking attachment points
   - Testing custom configs
   - Synthesis testing

---

## Related ADRs

- **ADR-001:** Schema-Centric Architecture (foundational)
- **ADR-020:** Component Auth System (attachment pattern influence)
- **ADR-023:** Synthesis Strategy (synthesis integration)

---

## Approval

**Architect:** Becky _________________ Date: _______

**Lead Developer:** Devon _____________ Date: _______

**Synthesis Lead:** Grace _____________ Date: _______

**QA Lead:** Charlie _________________ Date: _______

---

**ADR Status:** Proposed
**Next Review:** After POC implementation
**Implementation Target:** Week 1 of Sprint
