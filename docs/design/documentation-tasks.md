# Documentation Task Specifications

## Task 1: Core Framework & Synthesis Documentation (ella1)

### Scope
Document the core framework, synthesis pipeline, and code generation components that form the foundation of Atakora.

### Files and Directories
- `packages/lib/src/core/` (29 files)
- `packages/lib/src/synthesis/` (30 files)
- `packages/lib/src/codegen/` (15 files)
- `packages/lib/src/generated/` (10 files)
- `packages/lib/src/stacks/` (4 files)
- **Total**: ~90 files

### Priority Documentation Items
1. **Core abstractions** (highest priority):
   - `core/app.ts`, `core/stack.ts`, `core/construct.ts`
   - Base classes and interfaces
   - Lifecycle methods and hooks
2. **Synthesis pipeline**:
   - `synthesis/synthesizer.ts`, `synthesis/resolver.ts`
   - Template generation logic
   - Resource dependency resolution
3. **Code generation**:
   - Generator classes and utilities
   - Template processing
   - Type generation logic

### Documentation Requirements
- **Classes**: Document purpose, lifecycle, usage patterns
- **Core concepts**: Explain construct tree, synthesis process, resolution
- **Examples**: Show how to create apps, stacks, and constructs
- **Edge cases**: Document initialization order, circular dependencies
- **Performance**: Note any performance-critical code paths

### Success Criteria
- 100% public API documentation
- Clear explanation of synthesis pipeline stages
- Examples showing app → stack → construct flow
- Documentation of all lifecycle hooks
- References to relevant ADRs (especially ADR-001, ADR-002)

---

## Task 2: Resources & Constructs Documentation (ella2)

### Scope
Document the resource base classes and construct framework that all Azure resources inherit from.

### Files and Directories
- `packages/lib/src/resources/` (158 files)
- `packages/lib/src/examples/` (5 files)
- **Total**: ~163 files

### Priority Documentation Items
1. **Base resource classes**:
   - Resource abstract class
   - Resource properties and validation
   - Resource naming and tagging
2. **Construct patterns**:
   - L1, L2, L3 construct levels
   - Construct composition
   - Property interfaces
3. **Common patterns**:
   - Dependency handling
   - Cross-resource references
   - Resource validation

### Documentation Requirements
- **Resource types**: Document each Azure resource type
- **Property interfaces**: Explain all configuration options
- **Validation rules**: Document constraints and requirements
- **Best practices**: Include Azure-specific guidance
- **Integration points**: Show how resources connect

### Success Criteria
- Every resource class has complete documentation
- All property interfaces are documented with constraints
- Examples for common resource patterns
- Clear explanation of L1/L2/L3 construct levels
- Government vs Commercial cloud differences noted

---

## Task 3: CDK Infrastructure Resources Documentation (ella3)

### Scope
Document core infrastructure namespaces that provide foundational Azure services.

### Files and Directories
- `packages/cdk/network/` (29 files)
- `packages/cdk/compute/` (1 file)
- `packages/cdk/storage/` (4 files)
- `packages/cdk/keyvault/` (1 file)
- `packages/cdk/resources/` (4 files)
- `packages/cdk/sql/` (1 file)
- `packages/cdk/documentdb/` (4 files)
- **Total**: ~44 files

### Priority Documentation Items
1. **Network resources** (highest volume):
   - VNets, subnets, security groups
   - Load balancers, application gateways
   - Network peering and connectivity
2. **Storage resources**:
   - Storage accounts
   - Blob, file, queue, table storage
3. **Data resources**:
   - SQL databases
   - DocumentDB/CosmosDB

### Documentation Requirements
- **Resource configuration**: All properties and their effects
- **Network topology**: Explain connectivity patterns
- **Security**: Document security group rules, encryption
- **Performance**: Note SKU impacts, throughput settings
- **Cost implications**: Document pricing tier effects

### Success Criteria
- Complete documentation of all network patterns
- Clear examples of common infrastructure setups
- Security best practices documented
- Gov cloud endpoints and limitations noted
- Integration with other services explained

---

## Task 4: CDK Application Services Documentation (ella4)

### Scope
Document application-layer Azure services that build on infrastructure.

### Files and Directories
- `packages/cdk/insights/` (16 files)
- `packages/cdk/apimanagement/` (8 files)
- `packages/cdk/web/` (5 files)
- `packages/cdk/cognitiveservices/` (4 files)
- `packages/cdk/operationalinsights/` (4 files)
- `packages/cdk/search/` (4 files)
- **Total**: ~41 files

### Priority Documentation Items
1. **Monitoring and insights**:
   - Application Insights setup
   - Log Analytics workspaces
   - Metrics and alerting
2. **API Management**:
   - API gateway configuration
   - Policies and transformations
3. **Web services**:
   - App Service plans
   - Web app configuration

### Documentation Requirements
- **Service configuration**: All settings and options
- **Integration patterns**: How services connect
- **Monitoring setup**: Explain telemetry and logging
- **API patterns**: Document API management scenarios
- **Scaling options**: Auto-scale and performance

### Success Criteria
- All application services fully documented
- Clear examples of service integration
- Monitoring and observability patterns explained
- API management policies documented
- Cost and performance trade-offs noted

---

## Task 5: CLI & Supporting Systems Documentation (ella5)

### Scope
Document the CLI, naming conventions, and testing utilities that support the framework.

### Files and Directories
- `packages/cli/src/` (61 files)
- `packages/lib/src/naming/` (12 files)
- `packages/lib/src/testing/` (4 files)
- **Total**: ~77 files

### Priority Documentation Items
1. **CLI commands**:
   - Command structure and options
   - Authentication flows
   - Configuration management
2. **Naming system**:
   - Naming conventions and rules
   - Resource name generation
   - Uniqueness strategies
3. **Testing utilities**:
   - Test helpers and mocks
   - Assertion utilities

### Documentation Requirements
- **Commands**: Document all CLI commands and options
- **Configuration**: Explain config files and environments
- **Authentication**: Document auth flows and token management
- **Naming rules**: Explain Azure naming constraints
- **Testing patterns**: Show how to test constructs

### Success Criteria
- Every CLI command fully documented with examples
- Authentication flows clearly explained
- Naming convention rules documented
- Testing patterns and utilities explained
- Troubleshooting guide included

---

## Google Docstring Style Guide

All documentation must follow this format:

```typescript
/**
 * Brief one-line description of what this does.
 *
 * Detailed explanation of the functionality, including:
 * - Why this exists (the problem it solves)
 * - How it fits into the larger system
 * - Any important design decisions or trade-offs
 * - Performance considerations if relevant
 * - Government vs Commercial cloud differences
 *
 * @param paramName - Clear description of the parameter's purpose,
 *                    including valid ranges, formats, or constraints
 * @param optionalParam - Optional parameters marked with ? in signature
 *                        should note "(optional)" in description
 * @returns Description of return value, including possible states,
 *          error conditions, or special values like null/undefined
 * @throws {ErrorType} Description of when this error is thrown
 * @throws {AnotherError} Each error type should be documented
 *
 * @example
 * ```typescript
 * // Example showing common usage
 * const resource = new MyResource('name', {
 *   location: 'eastus',
 *   sku: 'Standard'
 * });
 * resource.addTag('environment', 'production');
 * ```
 *
 * @example
 * ```typescript
 * // Example showing advanced usage or edge cases
 * const resource = new MyResource('name', {
 *   location: 'usgovvirginia', // Gov cloud location
 *   encryption: {
 *     keyVaultKeyId: 'https://vault.vault.azure.net/keys/key1'
 *   }
 * });
 * ```
 *
 * @see {@link RelatedClass} for related functionality
 * @see {@link https://docs.microsoft.com/azure/...} for Azure documentation
 * @since 1.0.0
 */
```

### Documentation Priorities

1. **Public APIs** (MUST have):
   - All exported classes, functions, interfaces
   - All public methods and properties
   - All exported types and enums

2. **Complex Logic** (SHOULD have):
   - Algorithms with non-obvious behavior
   - Business logic with special rules
   - Performance-critical code

3. **Implementation Details** (NICE to have):
   - Private methods doing complex work
   - Internal helper functions
   - Utility functions

### Quality Checklist

For each file, ensure:
- [ ] All exports have docstrings
- [ ] Examples compile without errors
- [ ] Parameters include type and constraint info
- [ ] Return values are clearly described
- [ ] Errors/exceptions are documented
- [ ] Related code is cross-referenced
- [ ] Azure docs are linked where relevant
- [ ] Gov vs Commercial differences noted
- [ ] Design decisions explained for complex code
- [ ] Edge cases and gotchas mentioned