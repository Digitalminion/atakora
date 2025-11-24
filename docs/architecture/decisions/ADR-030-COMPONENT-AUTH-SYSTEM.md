# ADR-020: Component Package Authentication System Architecture

## Context

The @atakora/component package needs an authentication system to support the schema-driven backend pattern. Phase 1 successfully delivered the core schema system with field types, model builders (CRUD, Event, Function), and authorization rules. Phase 2 must now add authentication capabilities that integrate seamlessly with the existing authorization system.

Key requirements:

- Support multiple authentication providers (Azure Entra ID, API Keys, Custom)
- Integrate with Phase 1's schema authorization rules (allow.owner(), allow.groups(), etc.)
- Enable token validation and role mapping
- Provide type-safe builder APIs consistent with Phase 1 patterns
- Support both Government and Commercial cloud environments

The authentication system must be declarative (configuration-based) rather than imperative (code-based) to maintain consistency with the schema-first approach.

## Decision

We will implement a **multi-provider authentication system** with the following architecture:

### 1. Core Pattern: defineAuth() Function

Similar to defineSchema(), we'll provide a defineAuth() function that accepts authentication provider configurations:

```typescript
export const authentication = defineAuth({
  Primary: auth.entra()...,
  ApiKeys: auth.apiKeys()...,
  Custom: auth.custom()...
});
```

### 2. Provider Architecture

Each authentication provider will:

- Implement a fluent builder API (consistent with Phase 1 patterns)
- Return a configuration object (no runtime code in definitions)
- Support provider-specific features (e.g., MFA for Entra, rotation for API keys)
- Include token validation and role mapping hooks

### 3. Integration Strategy

Authentication integrates with authorization through:

- **User Context Creation**: Auth middleware creates user context from validated tokens
- **Authorization Evaluation**: Schema authorization rules evaluate against user context
- **Runtime Flow**: Request → Auth Validation → User Context → Authorization Check → Handler

### 4. Type System Design

Leverage TypeScript's advanced type features:

- Full type inference for auth configurations
- Provider-specific configuration types
- User context types for runtime integration
- Conditional types for provider selection

## Alternatives Considered

### Alternative 1: Single Provider System

- **Pros**: Simpler implementation, less complexity
- **Cons**: Doesn't meet real-world needs, no fallback options
- **Decision**: Rejected - Multiple providers are essential for production scenarios

### Alternative 2: Class-Based Providers

- **Pros**: Traditional OOP patterns, inheritance possibilities
- **Cons**: Inconsistent with Phase 1's builder pattern, more complex type inference
- **Decision**: Rejected - Fluent builders are more consistent and type-safe

### Alternative 3: Runtime Provider Registration

- **Pros**: Dynamic provider addition, plugin-like architecture
- **Cons**: Less type safety, harder to validate at build time
- **Decision**: Rejected - Static configuration provides better type safety and validation

### Alternative 4: Embedded in Schema Definition

- **Pros**: Single source of truth, no separate auth configuration
- **Cons**: Violates separation of concerns, makes schemas less portable
- **Decision**: Rejected - Authentication is a cross-cutting concern, not schema-specific

## Consequences

### Positive Consequences

1. **Consistency with Phase 1**: Same builder patterns, type inference, and API style
2. **Flexibility**: Support for multiple providers enables various authentication scenarios
3. **Type Safety**: Full TypeScript type inference and compile-time validation
4. **Extensibility**: Easy to add new providers following the established pattern
5. **Clear Separation**: Authentication separate from authorization (but integrated)
6. **Government Cloud Ready**: Provider abstraction supports different cloud environments

### Negative Consequences

1. **Additional Complexity**: Multiple providers add implementation complexity
2. **Testing Burden**: Each provider needs comprehensive tests
3. **Documentation Needs**: More concepts to document and examples to provide
4. **Migration Path**: Existing backends will need updates to use new auth system

### Implementation Implications

1. **Phase 2 Scope**: 10 implementation tasks over 5 business days
2. **Team Assignment**: 5 Devon agents (implementation) + 5 Charlie agents (testing)
3. **Integration Points**: Must coordinate with Phase 4 (Backend Assembly) and Phase 7 (Middleware Generation)
4. **Type System Work**: Significant TypeScript type inference implementation required

## Success Criteria

### Technical Success

- All 3 provider types implemented (Entra, API Keys, Custom)
- > 90% test coverage achieved
- Type inference working correctly
- Integration with Phase 1 authorization verified

### API Success

- Consistent with Phase 1 patterns
- IntelliSense provides good developer experience
- Clear error messages for misconfigurations
- Examples cover common scenarios

### Performance Success

- defineAuth() execution < 10ms
- No memory leaks in builder pattern
- Provider processing O(n) complexity

## Trade-offs

### Trade-off 1: Declarative vs Imperative

- **Choice**: Declarative (configuration-based)
- **Gain**: Consistency with schema-first approach, easier synthesis
- **Loss**: Less runtime flexibility, can't modify auth dynamically

### Trade-off 2: Builder Pattern vs Configuration Object

- **Choice**: Builder pattern with fluent API
- **Gain**: Better IntelliSense, progressive disclosure, type safety
- **Loss**: More code to maintain, additional abstraction layer

### Trade-off 3: Separate Auth vs Embedded in Schema

- **Choice**: Separate authentication configuration
- **Gain**: Separation of concerns, reusable auth configs, cleaner schemas
- **Loss**: Additional configuration file, one more integration point

## Implementation Roadmap

### Week 3 (Phase 2): Authentication System

**Day 1**: Base auth pattern and defineAuth() function
**Day 2**: Entra ID and API Keys providers (parallel)
**Day 3**: Token validation and role mapping infrastructure
**Day 4**: Session, MFA, and Custom provider features
**Day 5**: Integration with schema authorization and type inference

### Dependencies

- Phase 1: Complete ✅ (schema system, authorization rules)
- External: None (no new npm packages required)
- Future: Phase 4 (Backend Assembly), Phase 7 (Middleware Generation)

## References

- PHASE1_REVIEW.md: Phase 1 implementation assessment
- PHASE2_PLAN.md: Detailed Phase 2 implementation plan
- IMPLEMENTATION_PLAN.md: Overall package migration strategy
- backend-simple/: Reference implementation for auth patterns

## Document History

| Version | Date       | Author                  | Changes                               |
| ------- | ---------- | ----------------------- | ------------------------------------- |
| 1.0     | 2025-11-20 | Becky (Staff Architect) | Initial ADR for authentication system |

---

**Status**: Approved
**Decision Date**: 2025-11-20
**Review Date**: Post Phase 2 completion (estimated 2025-11-27)
