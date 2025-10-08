# Validation Architecture Implementation Tasks

## Priority Order

Tasks are organized by priority (P0 = Critical, P1 = High, P2 = Medium, P3 = Nice-to-have)

---

## Felix (Schema Validator) - ARM Schema & Type Generation

### P0: Create Strongly-Typed ARM Interfaces

**Files to Create/Modify:**

- `/packages/lib/src/synthesis/transform/types/arm-resource-types.ts` (new)
- `/packages/lib/src/synthesis/transform/types/arm-network-types.ts` (new)
- `/packages/lib/src/synthesis/transform/types/arm-storage-types.ts` (new)
- `/packages/lib/src/synthesis/transform/types/index.ts` (new)

**Task:** Generate TypeScript interfaces that exactly match ARM JSON structure requirements.

**Acceptance Criteria:**

- Each resource type has a strongly-typed interface (no `any` types)
- Interfaces model exact ARM structure including property wrappers
- Type definitions include JSDoc comments explaining ARM requirements
- Export a type guard for each interface: `isArmVirtualNetwork(obj): obj is ArmVirtualNetwork`

**Example Output:**

```typescript
export interface ArmSubnetDelegation {
  name: string;
  properties: {
    // REQUIRED wrapper
    serviceName: string;
  };
}

export interface ArmNetworkSecurityGroup {
  id: `[resourceId('Microsoft.Network/networkSecurityGroups', '${string}')]`; // Template literal type
}
```

### P0: Create ARM Expression Validator

**Files to Create:**

- `/packages/lib/src/synthesis/validate/arm-expression-validator.ts` (new)
- `/packages/lib/src/synthesis/validate/arm-expression-validator.test.ts` (new)

**Task:** Build validator that ensures ARM expressions are properly formatted.

**Acceptance Criteria:**

- Validates `resourceId()` expressions are properly formed
- Validates parameter/variable references use correct syntax
- Detects literal strings where ARM expressions are required
- Provides fix suggestions for common mistakes

### P1: Enhanced Schema Validator with Provider Rules

**Files to Modify:**

- `/packages/lib/src/synthesis/validate/schema-validator.ts`
- `/packages/lib/src/codegen/validation-generator.ts`

**Task:** Enhance schema validation to use provider-specific schemas.

**Acceptance Criteria:**

- Load and cache Azure provider schemas
- Validate against specific API version schemas
- Check required properties per resource type
- Validate property value constraints (enums, patterns, min/max)

---

## Devon (Developer) - Construct-Level Validation

### P0: Base Resource Validation Framework

**Files to Create/Modify:**

- `/packages/lib/src/core/resource.ts` (modify)
- `/packages/lib/src/core/validation/resource-validator.ts` (new)
- `/packages/lib/src/core/validation/validation-helpers.ts` (new)

**Task:** Create base validation framework that all resources must implement.

**Acceptance Criteria:**

- Abstract `Resource` class includes `validate()` method
- `validateProps()` called in constructor
- `validateArmStructure()` called before transformation
- Base implementation provides common validations (name, location, tags)

**Example Implementation:**

```typescript
export abstract class Resource extends Construct {
  protected constructor(scope: Construct, id: string, props: ResourceProps) {
    super(scope, id);
    this.validateProps(props); // Must be called
  }

  protected abstract validateProps(props: ResourceProps): void;
  public abstract validateArmStructure(): ValidationResult;
  public abstract toArmTemplate(): ArmResource; // Type-safe return
}
```

### P0: Critical Resource Validators

**Files to Modify (add validation methods):**

- `/packages/lib/src/resources/virtual-network/virtual-network.ts`
- `/packages/lib/src/resources/subnet/subnet.ts`
- `/packages/lib/src/resources/network-security-group/nsg.ts`

**Task:** Implement comprehensive validation for high-risk resources.

**Acceptance Criteria:**

- VirtualNetwork: Validate CIDR ranges, subnet overlaps
- Subnet: Validate delegation structure, service endpoints, address prefix within VNet range
- NSG: Validate rule priorities, port ranges, direction consistency

**Validation Examples:**

```typescript
// Subnet validation
validateProps(props: SubnetProps): void {
  // Check delegation structure
  if (props.delegation && !props.delegation.properties) {
    throw new ValidationError(
      'Subnet delegation must be wrapped in properties object',
      'Expected: { properties: { serviceName: "..." } }'
    );
  }

  // Validate address prefix is within VNet range
  if (!isWithinCidr(props.addressPrefix, this.vnet.addressSpace)) {
    throw new ValidationError(
      `Subnet ${props.addressPrefix} not within VNet ${this.vnet.addressSpace}`
    );
  }
}
```

### P1: Code Generation for Resource Validation

**Files to Modify:**

- `/packages/lib/src/codegen/resource-factory.ts`
- `/packages/lib/src/codegen/templates/resource.hbs` (if using templates)

**Task:** Update code generation to include validation methods in generated resources.

**Acceptance Criteria:**

- Generated resources include `validateProps()` method
- Validation rules derived from schema constraints
- Generated validation includes helpful error messages

---

## Charlie (Quality Lead) - Testing Infrastructure

### P0: Validation Test Framework

**Files to Create:**

- `/packages/lib/src/testing/validation-test-helpers.ts` (new)
- `/packages/lib/src/testing/arm-template-matchers.ts` (new)
- `/packages/lib/src/testing/deployment-simulator.ts` (new)

**Task:** Create testing utilities for validation scenarios.

**Acceptance Criteria:**

- Helper to create invalid resources and expect specific errors
- Custom Jest matchers for ARM template validation
- Deployment simulator that checks timing/dependency issues
- Test data builders for common invalid scenarios

### P0: Comprehensive Validation Test Suite

**Files to Create:**

- `/packages/lib/src/synthesis/validate/__tests__/validation-integration.test.ts` (new)
- `/packages/lib/src/synthesis/validate/__tests__/known-failures.test.ts` (new)

**Task:** Create test suite that covers all known failure scenarios.

**Test Cases Required:**

```typescript
describe('Known ARM Deployment Failures', () => {
  test('subnet delegation without properties wrapper fails validation', () => {
    const subnet = new Subnet(stack, 'Subnet', {
      delegation: { serviceName: 'Microsoft.Web/serverFarms' }, // Missing properties wrapper
    });

    expect(() => stack.synthesize()).toThrowValidationError(
      'Delegation must be wrapped in properties object'
    );
  });

  test('NSG with literal string reference fails validation', () => {
    const nsg = new NetworkSecurityGroup(stack, 'NSG', {
      id: '/subscriptions/.../networkSecurityGroups/nsg1', // Literal string
    });

    expect(() => stack.synthesize()).toThrowValidationError(
      'NSG reference must use resourceId() function'
    );
  });
});
```

### P1: Performance Benchmarking

**Files to Create:**

- `/packages/lib/benchmarks/validation-performance.bench.ts` (new)

**Task:** Create performance benchmarks for validation pipeline.

**Acceptance Criteria:**

- Benchmark validation of templates with 1, 10, 100, 1000 resources
- Track performance regression over time
- Ensure validation completes in <500ms for typical templates

---

## Grace (Synthesis/CLI) - Synthesis Pipeline Integration

### P0: Type-Safe Resource Transformer

**Files to Modify:**

- `/packages/lib/src/synthesis/transform/resource-transformer.ts`
- `/packages/lib/src/synthesis/transform/type-safe-transformer.ts` (new)

**Task:** Replace `any` types with strongly-typed transformation.

**Acceptance Criteria:**

- `transform()` returns strongly-typed ARM resources
- Type guards ensure correct structure before transformation
- Compilation fails if invalid structure is produced
- Clear error messages when type validation fails

**Implementation:**

```typescript
class TypeSafeTransformer {
  transform<T extends ArmResource>(resource: Resource): T {
    const armJson = resource.toArmTemplate();

    // Type guard validation
    if (!this.validateArmStructure<T>(armJson)) {
      throw new TransformationError(
        `Invalid ARM structure for ${resource.resourceType}`,
        this.getStructureDiff(expected, actual)
      );
    }

    return armJson as T;
  }
}
```

### P0: Validation Pipeline Orchestrator

**Files to Modify:**

- `/packages/lib/src/synthesis/synthesizer.ts`
- `/packages/lib/src/synthesis/validate/validation-pipeline.ts` (new)

**Task:** Integrate all validation layers into synthesis pipeline.

**Acceptance Criteria:**

- Validation runs in correct order (construct → transform → structure → deployment → schema)
- Early exit on first error with clear message
- Aggregate warnings but don't block synthesis
- Configurable validation levels (strict/normal/lenient)

### P1: CLI Validation Commands

**Files to Create:**

- `/packages/cli/src/commands/validate.ts` (new)
- `/packages/cli/src/commands/validate-deployment.ts` (new)

**Task:** Add CLI commands for validation without synthesis.

**Acceptance Criteria:**

- `atakora validate` - runs all validations without generating files
- `atakora validate --strict` - treats warnings as errors
- `atakora validate-deployment` - simulates deployment sequence
- Clear, actionable error output with suggestions

---

## Ella (Documentation) - Validation Pattern Documentation

### P0: Validation Guide

**Files to Create:**

- `/docs/guides/validation-architecture.md` (new)
- `/docs/guides/common-validation-errors.md` (new)

**Task:** Document the validation architecture and common errors.

**Content Requirements:**

- Explain each validation layer and when it runs
- Document all validation rules with examples
- Provide troubleshooting guide for common errors
- Include migration guide for existing code

### P0: Error Message Catalog

**Files to Create:**

- `/docs/reference/error-codes.md` (new)
- `/packages/lib/src/core/validation/error-catalog.ts` (new)

**Task:** Create comprehensive error message catalog.

**Acceptance Criteria:**

- Every validation error has a unique code
- Each error includes: description, example, fix suggestion
- Searchable reference documentation
- Type-safe error creation helpers

**Example:**

```typescript
export const ErrorCatalog = {
  ARM001: {
    code: 'ARM001',
    message: 'Delegation structure requires properties wrapper',
    description: 'ARM requires delegation objects to be wrapped in a properties field',
    example: '{ properties: { serviceName: "Microsoft.Web/serverFarms" } }',
    suggestion: 'Wrap your delegation object in a properties field',
  },
} as const;
```

### P1: Validation Best Practices

**Files to Create:**

- `/docs/patterns/validation-patterns.md` (new)
- `/docs/patterns/custom-validators.md` (new)

**Task:** Document patterns for implementing custom validation.

**Content Requirements:**

- How to add validation to custom resources
- Patterns for complex validation scenarios
- Performance considerations
- Testing validation logic

---

## Implementation Timeline

### Week 1: Foundation (P0 Tasks)

- **Felix**: ARM type definitions, expression validator
- **Devon**: Base validation framework
- **Charlie**: Test framework setup
- **Grace**: Type-safe transformer
- **Ella**: Initial documentation structure

### Week 2: Critical Resources (P0 Tasks)

- **Devon**: VNet, Subnet, NSG validators
- **Charlie**: Known failure test suite
- **Grace**: Pipeline integration
- **Ella**: Error catalog

### Week 3: Enhancement (P1 Tasks)

- **Felix**: Provider schema validation
- **Devon**: Code generation updates
- **Charlie**: Performance benchmarks
- **Grace**: CLI commands
- **Ella**: Best practices guide

### Week 4: Polish & Testing

- Integration testing
- Performance optimization
- Documentation review
- Team coordination for edge cases

---

## Success Validation Checklist

- [ ] All `any` types removed from transformation pipeline
- [ ] Type errors prevent compilation for invalid structures
- [ ] All known deployment failures have specific test cases
- [ ] Validation completes in <500ms for 100-resource templates
- [ ] Error messages include actionable fix suggestions
- [ ] Documentation covers all validation scenarios
- [ ] Zero deployment failures in test environment for 7 days
