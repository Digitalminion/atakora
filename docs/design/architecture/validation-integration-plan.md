# Validation Layer Integration Plan

## Overview

This document describes how the five validation layers work together to prevent ARM template deployment failures. Each layer has a specific responsibility and catches different classes of errors at different stages of the development lifecycle.

## Validation Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Development Time                         │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Type-Safe Transformation (TypeScript Compiler)    │
│  ↓                                                           │
│  Layer 2: Construct Validation (Constructor/Methods)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Synthesis Time                          │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: ARM Structure Validation                           │
│  ↓                                                           │
│  Layer 4: Deployment Simulation                              │
│  ↓                                                           │
│  Layer 5: Schema Compliance                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     ARM Template Output                      │
└─────────────────────────────────────────────────────────────┘
```

## Layer Integration Details

### Layer 1: Type-Safe Transformation (Compile-Time)

**When It Runs:** TypeScript compilation
**What It Catches:** Type mismatches, missing required properties, invalid structures
**Integration Points:**
- Resource classes must return strongly-typed ARM resources from `toArmTemplate()`
- ResourceTransformer uses type guards to validate transformation output
- Compilation fails if types don't match

```typescript
// Resource must return correct type
class VirtualNetwork extends Resource {
  toArmTemplate(): ArmVirtualNetwork {  // Not 'any'
    return {
      type: 'Microsoft.Network/virtualNetworks',
      apiVersion: '2024-01-01',
      name: this.name,
      properties: {  // TypeScript ensures this structure
        addressSpace: {
          addressPrefixes: this.addressPrefixes
        }
      }
    };
  }
}
```

### Layer 2: Construct Validation (Build-Time)

**When It Runs:** Resource instantiation and method calls
**What It Catches:** Invalid property values, business logic violations, relationship errors
**Integration Points:**
- Called from Resource constructor
- Validates before any transformation occurs
- Can access parent/child construct relationships

```typescript
class Subnet extends Resource {
  constructor(scope: VirtualNetwork, id: string, props: SubnetProps) {
    super(scope, id);

    // Layer 2 validation
    this.validateProps(props);
    this.validateWithinVnetRange(props.addressPrefix, scope.addressSpace);
    this.validateDelegationStructure(props.delegation);
  }
}
```

### Layer 3: ARM Structure Validation (Synthesis-Time)

**When It Runs:** After transformation to ARM JSON
**What It Catches:** ARM-specific structure requirements, property wrappers, reference formats
**Integration Points:**
- Runs in ResourceTransformer after `toArmTemplate()` call
- Validates the generated ARM JSON structure
- Uses type guards and structural validators

```typescript
class ResourceTransformer {
  transform(resource: Resource): ArmResource {
    // Generate ARM JSON
    const armJson = resource.toArmTemplate();

    // Layer 3: Validate ARM structure
    const validator = this.getValidator(resource.resourceType);
    const result = validator.validateStructure(armJson);

    if (!result.valid) {
      throw new ArmStructureError(result.errors);
    }

    return armJson;
  }
}
```

### Layer 4: Deployment Simulation (Synthesis-Time)

**When It Runs:** After all resources are transformed
**What It Catches:** Dependency cycles, deployment timing issues, service lockdown problems
**Integration Points:**
- Runs in Synthesizer after all transformations
- Simulates deployment sequence
- Validates cross-resource dependencies

```typescript
class DeploymentValidator {
  validate(resources: ArmResource[]): ValidationResult {
    // Build dependency graph
    const graph = this.buildDependencyGraph(resources);

    // Check for cycles
    this.detectCycles(graph);

    // Simulate deployment order
    const deploymentOrder = this.topologicalSort(graph);

    // Check timing constraints
    this.validateDeploymentTiming(deploymentOrder);

    // Check network lockdown timing
    this.validateNetworkLockdown(deploymentOrder);
  }
}
```

### Layer 5: Schema Compliance (Synthesis-Time)

**When It Runs:** Final validation before writing templates
**What It Catches:** Schema violations, API version mismatches, provider-specific rules
**Integration Points:**
- Uses Azure Resource Manager schemas
- Validates complete template structure
- Final gate before template generation

```typescript
class SchemaValidator {
  async validate(template: ArmTemplate): Promise<ValidationResult> {
    // Load provider schemas
    const schemas = await this.loadProviderSchemas(template.resources);

    // Validate each resource against its schema
    for (const resource of template.resources) {
      const schema = schemas.get(resource.type);
      const result = this.ajv.validate(schema, resource);

      if (!result.valid) {
        errors.push(...this.formatSchemaErrors(result.errors));
      }
    }
  }
}
```

## Integration Flow

### Success Path

```
1. Developer writes code
   ↓
2. TypeScript compilation succeeds (Layer 1)
   ↓
3. Tests run, constructs validate (Layer 2)
   ↓
4. Developer runs 'atakora synth'
   ↓
5. Resources transform to ARM (Layer 3)
   ↓
6. Deployment simulation passes (Layer 4)
   ↓
7. Schema validation passes (Layer 5)
   ↓
8. Templates written to disk
   ↓
9. Deployment succeeds
```

### Error Handling Flow

Each layer provides specific error information that flows up to the user:

```typescript
interface ValidationError {
  layer: 'type' | 'construct' | 'structure' | 'deployment' | 'schema';
  code: string;        // e.g., 'ARM001'
  message: string;     // Human-readable error
  path: string;        // Location in construct tree
  suggestion: string;  // How to fix it
  documentation: string; // Link to docs
}
```

## Error Aggregation Strategy

### Fail-Fast vs. Collect-All

**Development Time (Layers 1-2):** Fail-fast
- TypeScript compilation stops on first error
- Construct validation throws immediately
- Provides fastest feedback during development

**Synthesis Time (Layers 3-5):** Collect-all within layer, fail-fast between layers
- Each layer collects all errors before reporting
- If Layer 3 fails, Layers 4-5 don't run
- Provides comprehensive error report per layer

```typescript
class SynthesisValidator {
  async validate(resources: Resource[]): Promise<void> {
    // Layer 3: Collect all structure errors
    const structureErrors = await this.validateStructure(resources);
    if (structureErrors.length > 0) {
      throw new ValidationException('Structure validation failed', structureErrors);
    }

    // Layer 4: Only runs if Layer 3 passed
    const deploymentErrors = await this.validateDeployment(resources);
    if (deploymentErrors.length > 0) {
      throw new ValidationException('Deployment validation failed', deploymentErrors);
    }

    // Layer 5: Only runs if Layer 4 passed
    const schemaErrors = await this.validateSchema(resources);
    if (schemaErrors.length > 0) {
      throw new ValidationException('Schema validation failed', schemaErrors);
    }
  }
}
```

## Configuration Options

### Validation Levels

```typescript
enum ValidationLevel {
  STRICT = 'strict',     // All warnings are errors
  NORMAL = 'normal',     // Default behavior
  LENIENT = 'lenient',   // Only critical errors
  NONE = 'none'          // Skip validation (dangerous!)
}
```

### Per-Layer Configuration

```typescript
interface ValidationConfig {
  level: ValidationLevel;
  layers: {
    construct: { enabled: boolean; strict: boolean };
    structure: { enabled: boolean; strict: boolean };
    deployment: { enabled: boolean; strict: boolean };
    schema: { enabled: boolean; strict: boolean };
  };
  customValidators: Validator[];
  excludeResources: string[];  // Resource types to skip
}
```

## Performance Considerations

### Validation Caching

- Cache validated structures to avoid re-validation
- Cache loaded schemas between synthesis runs
- Invalidate cache on resource changes

```typescript
class ValidationCache {
  private cache = new Map<string, ValidationResult>();

  get(resource: Resource): ValidationResult | undefined {
    const key = this.getCacheKey(resource);
    const cached = this.cache.get(key);

    if (cached && !this.isStale(cached, resource)) {
      return cached;
    }

    return undefined;
  }
}
```

### Parallel Validation

- Layers 1-2 are sequential (compile-time, construct-time)
- Within Layer 3-5, validate resources in parallel where possible
- Use worker threads for schema validation of large templates

```typescript
class ParallelValidator {
  async validateResources(resources: Resource[]): Promise<ValidationResult[]> {
    // Group independent resources
    const groups = this.groupIndependentResources(resources);

    // Validate each group in parallel
    const results = await Promise.all(
      groups.map(group => this.validateGroup(group))
    );

    return results.flat();
  }
}
```

## Extensibility Points

### Custom Validators

Each layer provides extension points for custom validation:

```typescript
// Layer 2: Construct validators
export abstract class CustomResourceValidator {
  abstract validate(resource: Resource): ValidationResult;
}

// Layer 3: Structure validators
export abstract class CustomStructureValidator {
  abstract validate(armJson: any): ValidationResult;
}

// Layer 4: Deployment validators
export abstract class CustomDeploymentValidator {
  abstract validate(resources: ArmResource[]): ValidationResult;
}

// Registration
synthesizer.registerValidator(new MyCustomValidator(), 'structure');
```

### Validation Hooks

```typescript
export interface ValidationHooks {
  beforeValidation?: (context: ValidationContext) => void;
  afterLayer?: (layer: number, results: ValidationResult) => void;
  onError?: (errors: ValidationError[]) => void;
  afterValidation?: (results: ValidationResult) => void;
}
```

## Testing Integration

### Unit Testing Each Layer

```typescript
describe('Layer 2: Construct Validation', () => {
  it('validates subnet delegation structure', () => {
    expect(() => new Subnet(vnet, 'subnet', {
      delegation: { serviceName: 'service' }  // Missing properties wrapper
    })).toThrow('Delegation must be wrapped in properties');
  });
});
```

### Integration Testing Across Layers

```typescript
describe('Validation Pipeline Integration', () => {
  it('catches errors at appropriate layer', async () => {
    const app = new App();
    const stack = new Stack(app, 'stack');

    // This should fail at Layer 3 (structure validation)
    const vnet = new VirtualNetwork(stack, 'vnet', {
      addressSpace: ['10.0.0.0/16']  // Should be { addressPrefixes: [...] }
    });

    const result = await app.synth();

    expect(result.errors[0].layer).toBe('structure');
    expect(result.errors[0].code).toBe('ARM003');
  });
});
```

## Monitoring & Metrics

### Validation Metrics to Track

```typescript
interface ValidationMetrics {
  totalValidations: number;
  errorsByLayer: Record<string, number>;
  averageValidationTime: number;
  mostCommonErrors: Array<{ code: string; count: number }>;
  successRate: number;
}
```

### Telemetry Integration

```typescript
class ValidationTelemetry {
  recordValidation(result: ValidationResult): void {
    this.metrics.record({
      timestamp: Date.now(),
      layer: result.layer,
      duration: result.duration,
      errorCount: result.errors.length,
      errorCodes: result.errors.map(e => e.code),
      resourceType: result.resourceType
    });
  }
}
```

## Migration Strategy

### Gradual Adoption

1. **Phase 1:** Add type definitions, don't enforce
2. **Phase 2:** Enable warnings for validation errors
3. **Phase 3:** Enforce validation for new resources
4. **Phase 4:** Migrate existing resources
5. **Phase 5:** Enforce strict validation

### Backward Compatibility

```typescript
class BackwardCompatibleValidator {
  validate(resource: Resource): ValidationResult {
    try {
      // Try new validation
      return this.strictValidate(resource);
    } catch (e) {
      // Fall back to legacy validation
      console.warn(`Using legacy validation for ${resource.id}`);
      return this.legacyValidate(resource);
    }
  }
}
```