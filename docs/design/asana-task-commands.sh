#!/bin/bash
# Asana Task Creation Commands for Documentation Sprint
# Run from the atakora directory

# Task 1: Core Framework & Synthesis Documentation (ella1)
npx dm task create \
  --agent ella1 \
  --title "Code Documentation: Core Framework & Synthesis" \
  --description "Document the core framework, synthesis pipeline, and code generation components (90 files).

## Scope
- packages/lib/src/core/ (29 files) - Core abstractions
- packages/lib/src/synthesis/ (30 files) - Synthesis pipeline
- packages/lib/src/codegen/ (15 files) - Code generation
- packages/lib/src/generated/ (10 files) - Generated types
- packages/lib/src/stacks/ (4 files) - Stack management

## Priority Items
1. Core abstractions: app.ts, stack.ts, construct.ts
2. Synthesis pipeline: synthesizer.ts, resolver.ts
3. Lifecycle methods and hooks
4. Code generation utilities

## Documentation Standards
Follow Google docstring style with:
- Brief description + detailed explanation
- @param with constraints and formats
- @returns with possible states
- @throws for error conditions
- @example with compilable code
- @see for cross-references

## Success Criteria
- 100% public API documentation
- Clear synthesis pipeline explanation
- Examples for app → stack → construct flow
- All lifecycle hooks documented
- References to ADR-001, ADR-002

See docs/design/documentation-tasks.md for full details." \
  --section 1211551550287537

# Task 2: Resources & Constructs Documentation (ella2)
npx dm task create \
  --agent ella2 \
  --title "Code Documentation: Resources & Constructs" \
  --description "Document the resource base classes and construct framework (163 files).

## Scope
- packages/lib/src/resources/ (158 files) - All Azure resource types
- packages/lib/src/examples/ (5 files) - Example patterns

## Priority Items
1. Base resource classes and abstractions
2. Resource properties and validation
3. L1/L2/L3 construct patterns
4. Dependency and cross-reference handling

## Documentation Standards
Follow Google docstring style with:
- Purpose and usage patterns for each resource
- All property interfaces with constraints
- Validation rules and requirements
- Azure-specific best practices
- Gov vs Commercial cloud differences

## Success Criteria
- Every resource class fully documented
- All property interfaces explained
- Examples for common patterns
- L1/L2/L3 levels clearly explained
- Cloud environment differences noted

See docs/design/documentation-tasks.md for full details." \
  --section 1211551550287537

# Task 3: CDK Infrastructure Resources Documentation (ella3)
npx dm task create \
  --agent ella3 \
  --title "Code Documentation: CDK Infrastructure Resources" \
  --description "Document core infrastructure namespaces for Azure services (44 files).

## Scope
- packages/cdk/network/ (29 files) - Network resources
- packages/cdk/compute/ (1 file) - Compute resources
- packages/cdk/storage/ (4 files) - Storage accounts
- packages/cdk/keyvault/ (1 file) - Key Vault
- packages/cdk/resources/ (4 files) - Resource groups
- packages/cdk/sql/ (1 file) - SQL databases
- packages/cdk/documentdb/ (4 files) - DocumentDB/Cosmos

## Priority Items
1. Network resources: VNets, subnets, security groups
2. Load balancers and application gateways
3. Storage configuration and types
4. Database resources

## Documentation Standards
Follow Google docstring style with:
- All resource properties and effects
- Network topology patterns
- Security configurations
- Performance and SKU impacts
- Cost implications

## Success Criteria
- Complete network pattern documentation
- Common infrastructure setup examples
- Security best practices included
- Gov cloud limitations noted
- Service integration explained

See docs/design/documentation-tasks.md for full details." \
  --section 1211551550287537

# Task 4: CDK Application Services Documentation (ella4)
npx dm task create \
  --agent ella4 \
  --title "Code Documentation: CDK Application Services" \
  --description "Document application-layer Azure services (41 files).

## Scope
- packages/cdk/insights/ (16 files) - Application Insights
- packages/cdk/apimanagement/ (8 files) - API Management
- packages/cdk/web/ (5 files) - Web services
- packages/cdk/cognitiveservices/ (4 files) - Cognitive Services
- packages/cdk/operationalinsights/ (4 files) - Log Analytics
- packages/cdk/search/ (4 files) - Azure Search

## Priority Items
1. Monitoring and insights setup
2. API Management configuration
3. Web app services
4. Service integration patterns

## Documentation Standards
Follow Google docstring style with:
- Service configuration options
- Integration patterns
- Monitoring and telemetry setup
- API management scenarios
- Scaling and performance

## Success Criteria
- All services fully documented
- Service integration examples
- Monitoring patterns explained
- API policies documented
- Cost/performance trade-offs noted

See docs/design/documentation-tasks.md for full details." \
  --section 1211551550287537

# Task 5: CLI & Supporting Systems Documentation (ella5)
npx dm task create \
  --agent ella5 \
  --title "Code Documentation: CLI & Supporting Systems" \
  --description "Document CLI, naming conventions, and testing utilities (77 files).

## Scope
- packages/cli/src/ (61 files) - CLI commands and tools
- packages/lib/src/naming/ (12 files) - Naming conventions
- packages/lib/src/testing/ (4 files) - Test utilities

## Priority Items
1. CLI command structure and options
2. Authentication and configuration
3. Naming convention system
4. Testing helpers and utilities

## Documentation Standards
Follow Google docstring style with:
- All CLI commands with examples
- Configuration and auth flows
- Azure naming constraints
- Testing patterns
- Troubleshooting guidance

## Success Criteria
- Every command documented with examples
- Auth flows clearly explained
- Naming rules documented
- Testing patterns shown
- Troubleshooting guide included

See docs/design/documentation-tasks.md for full details." \
  --section 1211551550287537

echo "All 5 documentation tasks created successfully!"
echo "Agents ella1-ella5 can now begin parallel documentation work."
echo "Reference docs/design/documentation-tasks.md for detailed specifications."