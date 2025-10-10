# ADR-001: Multi-Layer Validation Architecture for ARM Template Generation

## Context

The Atakora ARM template generator has been experiencing deployment failures that are only caught when templates are deployed to Azure. These failures include:

1. **Structure Errors**: Missing property wrappers (e.g., delegation missing `properties` wrapper), incorrect nesting levels
2. **Reference Format Errors**: Literal strings instead of ARM expressions for resource references
3. **Type Mismatches**: Using `any` types in transformations allows invalid structures to pass through
4. **Deployment Timing Issues**: Services being locked down before Azure Resource Manager can provision them

Current State:

- Template-level validation exists but only checks basic ARM schema compliance
- Construct-level validation is inconsistent (some resources have `validateProps()`, many don't)
- Transformation layer uses `any` types extensively, eliminating type safety
- No ARM-specific structure validation for complex nested properties
- No deployment-aware validation for resource ordering and dependencies

The cost of these failures is significant:

- Deployments fail after significant time investment (5-30 minutes)
- Debugging requires manual ARM template inspection
- Developers lose confidence in the tool
- Iteration cycles are slow and frustrating

## Decision

We will implement a **5-layer validation architecture** that catches errors at compile-time, build-time, and synthesis-time:

### Layer 1: Type-Safe Transformation (Compile-Time)

Replace all `any` types in the transformation pipeline with strongly-typed interfaces that model exact ARM structure requirements.

### Layer 2: Construct Validation (Build-Time)

Mandatory validation in every resource construct that validates both input props AND generated ARM structure.

### Layer 3: ARM Structure Validation (Synthesis-Time)

Deep structural validation that checks ARM-specific requirements like property wrappers, reference formats, and nesting.

### Layer 4: Deployment Simulation (Synthesis-Time)

Validate deployment sequences, dependency chains, and timing issues before generating templates.

### Layer 5: Schema Compliance (Synthesis-Time)

Enhanced schema validation using actual Azure Resource Manager schemas with provider-specific rules.

## Alternatives Considered

### Alternative 1: Single Post-Generation Validator

**Approach**: One comprehensive validator that runs after template generation.
**Pros**: Simple to implement, single point of validation
**Cons**:

- Errors caught too late in the process
- No compile-time safety
- Difficult to provide actionable error messages
- Doesn't leverage TypeScript's type system

### Alternative 2: Runtime Azure Validation API

**Approach**: Call Azure's validation API before deployment.
**Pros**: Guaranteed accuracy, catches all Azure-specific issues
**Cons**:

- Requires authentication and network calls
- Slow feedback loop
- Doesn't help during development
- Can't run in CI without Azure credentials

### Alternative 3: Generate Types from ARM Schemas Only

**Approach**: Auto-generate all types from ARM schemas, no manual type definitions.
**Pros**: Always accurate to Azure's requirements
**Cons**:

- ARM schemas are incomplete and inconsistent
- Lose ability to provide better developer experience
- Can't add domain-specific validations
- Generated types are often too permissive

## Consequences

### Positive Consequences

1. **Compile-Time Safety**: TypeScript catches structure errors before runtime
2. **Fast Feedback**: Errors caught immediately during development
3. **Precise Error Messages**: Each layer provides context-specific error messages
4. **Progressive Enhancement**: Can implement layers incrementally
5. **Developer Confidence**: Predictable behavior, fewer surprises at deployment
6. **Testability**: Each layer can be tested independently
7. **Documentation**: Types serve as documentation for ARM requirements

### Negative Consequences

1. **Implementation Complexity**: Multiple validation layers to maintain
2. **Performance Overhead**: Multiple validation passes (mitigated by early exit on errors)
3. **Type Maintenance**: Need to keep types synchronized with Azure changes
4. **Learning Curve**: Developers need to understand the validation model
5. **Potential Over-Validation**: Risk of being too strict and blocking valid scenarios

### Trade-offs

We're optimizing for **correctness and developer experience** over simplicity:

- More complex implementation but better developer experience
- Slightly slower synthesis but much faster overall development cycle
- Higher maintenance burden but fewer production failures

## Implementation Strategy

### Phase 1: Type-Safe Foundation (Week 1)

1. Create comprehensive ARM type definitions
2. Replace `any` types in ResourceTransformer
3. Add type guards and validators for ARM structures

### Phase 2: Construct Validation (Week 2)

1. Create base validation framework for resources
2. Implement validation for high-risk resources (VNet, Subnet, NSG)
3. Add validation code generation to resource factory

### Phase 3: Structure & Deployment Validation (Week 3)

1. Implement ARM structure validator
2. Create deployment sequence validator
3. Add timing and dependency validation

### Phase 4: Integration & Testing (Week 4)

1. Integrate all validators into synthesis pipeline
2. Create comprehensive test suites
3. Document validation patterns

## Success Criteria

We will measure success by:

### Quantitative Metrics

- **Zero deployment failures** from structural issues (measured over 30 days)
- **90% of errors caught at compile-time** (TypeScript errors)
- **95% of remaining errors caught at synthesis-time** (before deployment)
- **Validation performance < 500ms** for typical templates (100 resources)

### Qualitative Metrics

- **Developer Satisfaction**: Survey shows improved confidence in tool
- **Error Message Quality**: Developers can fix issues without external help
- **Documentation Completeness**: Every validation rule is documented
- **Test Coverage**: >90% code coverage for validation logic

### Validation Checkpoints

1. **Week 1**: Type errors prevent compilation for invalid structures
2. **Week 2**: Construct validation catches 80% of known issues
3. **Week 3**: No deployment failures in test suite
4. **Week 4**: All success metrics achieved

## Technical Details

### Type System Architecture

```typescript
// Instead of any:
interface ArmResource {
  properties?: any; // BAD
}

// Strongly typed:
interface ArmVirtualNetwork {
  type: 'Microsoft.Network/virtualNetworks';
  properties: {
    addressSpace: {
      addressPrefixes: string[];
    };
    subnets?: ArmSubnet[];
    dhcpOptions?: {
      dnsServers: string[];
    };
  };
}
```

### Validation Pipeline

```typescript
class ValidationPipeline {
  async validate(resource: Resource): Promise<ValidationResult> {
    // Layer 1: Type validation (compile-time, enforced by TypeScript)

    // Layer 2: Construct validation
    await this.validateConstruct(resource);

    // Layer 3: ARM structure validation
    await this.validateArmStructure(resource);

    // Layer 4: Deployment validation
    await this.validateDeployment(resource);

    // Layer 5: Schema compliance
    await this.validateSchema(resource);
  }
}
```

### Error Reporting

Each validation layer provides specific, actionable error messages:

```typescript
// Bad error:
"Validation failed"

// Good error:
"Subnet delegation requires 'properties' wrapper
  at: MyStack/VNet/Subnet/delegation
  expected structure: { properties: { serviceName: 'Microsoft.Web/serverFarms' } }
  actual structure: { serviceName: 'Microsoft.Web/serverFarms' }
  fix: Wrap delegation object in 'properties' field"
```

## Related Decisions

- ADR-002: Type Generation Strategy (upcoming)
- ADR-003: Error Message Standards (upcoming)
- ADR-004: Testing Strategy for Validators (upcoming)
