#!/bin/bash
# Script to create comprehensive task breakdown for synthesis pipeline refactoring

cd /c/Users/austi/Source/Github/Digital\ Minion/cdk/atakora

# Phase 1: Core Infrastructure Tasks (Can be done in parallel)
echo "Creating Phase 1 tasks..."

# Task 1.1: SynthesisContext class (devon2)
npx dm task add "Implement SynthesisContext Class" \
  --notes "Create context class for ARM generation. File: packages/lib/src/synthesis/context/synthesis-context.ts. Properties: currentTemplate, resourceTemplates Map, templateMetadata Map. Methods: getResourceReference(), getParameterReference(), getCrossTemplateReference(). Include unit tests." && \
npx dm section move $(npx dm -o json list | jq -r '.tasks[0].gid') 1211549852858682 && \
npx dm assign $(npx dm -o json list | jq -r '.tasks[0].gid') devon2

# Task 1.2: TemplateAssignments type (devon3)
npx dm task add "Create TemplateAssignments Type System" \
  --notes "Design type system for template assignments. File: packages/lib/src/synthesis/types.ts. Include: TemplateAssignment interface, TemplateMetadata interface, ResourcePlacement type. Support main/linked template scenarios and cross-template references." && \
npx dm section move $(npx dm -o json list | jq -r '.tasks[0].gid') 1211549852858682 && \
npx dm assign $(npx dm -o json list | jq -r '.tasks[0].gid') devon3

# Task 1.3: Update Resource base class (devon4)
npx dm task add "Update Resource Base Class with Metadata Support" \
  --notes "Add toMetadata() abstract method to Resource base class. File: packages/lib/src/core/resource.ts. Include: Abstract toMetadata() method, Updated toArmTemplate(context?) signature, Backwards compatibility wrapper, JSDoc documentation. Ensure type safety." && \
npx dm section move $(npx dm -o json list | jq -r '.tasks[0].gid') 1211549852858682 && \
npx dm assign $(npx dm -o json list | jq -r '.tasks[0].gid') devon4

# Phase 2: Template Splitter Tasks (Can be done in parallel)
echo "Creating Phase 2 tasks..."

# Task 2.1: Metadata-based splitting algorithm (grace1)
npx dm task add "Implement Metadata-Based Template Splitting Algorithm" \
  --notes "Refactor splitting to use ResourceMetadata. File: packages/lib/src/synthesis/assembly/template-splitter.ts. Method: splitByMetadata(metadata[]). Consider: Size constraints, Dependency grouping, Cross-template minimization, Performance optimization. Include comprehensive tests." && \
npx dm section move $(npx dm -o json list | jq -r '.tasks[0].gid') 1211549852858682 && \
npx dm assign $(npx dm -o json list | jq -r '.tasks[0].gid') grace1

# Task 2.2: Template assignment logic (grace2)
npx dm task add "Create Template Assignment Logic" \
  --notes "Implement logic to assign resources to templates. File: packages/lib/src/synthesis/assembly/template-assigner.ts. Features: Respect requiresSameTemplate constraints, Honor templatePreference hints, Optimize for deployment performance, Handle circular dependencies. Return TemplateAssignments." && \
npx dm section move $(npx dm -o json list | jq -r '.tasks[0].gid') 1211549852858682 && \
npx dm assign $(npx dm -o json list | jq -r '.tasks[0].gid') grace2

# Phase 3: Synthesizer Pipeline Tasks
echo "Creating Phase 3 tasks..."

# Task 3.1: New pipeline orchestration (grace3)
npx dm task add "Refactor Synthesizer Pipeline Orchestration" \
  --notes "Restructure main synthesis flow. File: packages/lib/src/synthesis/synthesizer.ts. New flow: collectMetadata() -> assignTemplates() -> generateArm() -> writeArtifacts(). Maintain backwards compatibility. Update all phase transitions. Include logging and error handling." && \
npx dm section move $(npx dm -o json list | jq -r '.tasks[0].gid') 1211549852858682 && \
npx dm assign $(npx dm -o json list | jq -r '.tasks[0].gid') grace3

# Task 3.2: ResourceTransformer updates (grace4)
npx dm task add "Update ResourceTransformer for Context-Aware Generation" \
  --notes "Modify transformer to pass context. File: packages/lib/src/synthesis/transform/resource-transformer.ts. Changes: Accept SynthesisContext, Pass context to toArmTemplate(), Handle backwards compatibility, Update all resource transformations. Ensure no breaking changes." && \
npx dm section move $(npx dm -o json list | jq -r '.tasks[0].gid') 1211549852858682 && \
npx dm assign $(npx dm -o json list | jq -r '.tasks[0].gid') grace4

# Phase 4: Critical Resource Migration Tasks
echo "Creating Phase 4 tasks..."

# Task 4.1: Migrate FunctionApp (devon5)
npx dm task add "Migrate FunctionApp to Context-Aware Pattern" \
  --notes "Update FunctionApp for new synthesis. File: packages/cdk/src/functions/function-app.ts. Implement: toMetadata() with accurate size estimate, Context-aware toArmTemplate(), Correct storage account references, Cross-template app settings. Fix all placeholder issues." && \
npx dm section move $(npx dm -o json list | jq -r '.tasks[0].gid') 1211549852858682 && \
npx dm assign $(npx dm -o json list | jq -r '.tasks[0].gid') devon5

# Task 4.2: Migrate StorageAccount (devon6)
npx dm task add "Migrate StorageAccount to Context-Aware Pattern" \
  --notes "Update StorageAccount resource. File: packages/lib/src/resources/storage/storage-account.ts. Implement: toMetadata() method, Context-aware connection string generation, Proper listKeys expressions based on template placement. Ensure function app integration works." && \
npx dm section move $(npx dm -o json list | jq -r '.tasks[0].gid') 1211549852858682 && \
npx dm assign $(npx dm -o json list | jq -r '.tasks[0].gid') devon6

# Task 4.3: Migrate CosmosDbAccount (devon7)
npx dm task add "Migrate CosmosDbAccount to Context-Aware Pattern" \
  --notes "Update CosmosDB resource. File: packages/lib/src/resources/cosmos/cosmos-account.ts. Implement: toMetadata() with dependency tracking, Context-aware endpoint references, Proper connection string generation. Fix ${cosmosEndpoint} placeholder issues." && \
npx dm section move $(npx dm -o json list | jq -r '.tasks[0].gid') 1211549852858682 && \
npx dm assign $(npx dm -o json list | jq -r '.tasks[0].gid') devon7

# Task 4.4: Migrate KeyVault (devon8)
npx dm task add "Migrate KeyVault to Context-Aware Pattern" \
  --notes "Update KeyVault resource. File: packages/lib/src/resources/security/key-vault.ts. Implement: toMetadata() method, Context-aware secret references, Proper vault URI generation, Cross-template access policy references. Test with function apps." && \
npx dm section move $(npx dm -o json list | jq -r '.tasks[0].gid') 1211549852858682 && \
npx dm assign $(npx dm -o json list | jq -r '.tasks[0].gid') devon8

# Phase 5: Testing Tasks
echo "Creating Phase 5 testing tasks..."

# Task 5.1: Unit tests for core components (charlie1)
npx dm task add "Create Unit Tests for Core Synthesis Components" \
  --notes "Write comprehensive unit tests. Files: synthesis-context.test.ts, resource-metadata.test.ts, template-assigner.test.ts. Cover: All public methods, Edge cases, Error conditions, Type safety. Use Jest, aim for 95% coverage." && \
npx dm section move $(npx dm -o json list | jq -r '.tasks[0].gid') 1211549852858682 && \
npx dm assign $(npx dm -o json list | jq -r '.tasks[0].gid') charlie1

# Task 5.2: Integration tests (charlie2)
npx dm task add "Create Integration Tests for New Pipeline" \
  --notes "Test complete synthesis flow. File: packages/lib/src/synthesis/__tests__/synthesis-integration.test.ts. Test: Metadata collection, Template assignment, Context propagation, ARM generation, Cross-template references. Use real resource examples." && \
npx dm section move $(npx dm -o json list | jq -r '.tasks[0].gid') 1211549852858682 && \
npx dm assign $(npx dm -o json list | jq -r '.tasks[0].gid') charlie2

# Task 5.3: E2E deployment tests (charlie3)
npx dm task add "Create E2E Deployment Tests" \
  --notes "Test actual Azure deployments. File: packages/e2e/synthesis-pipeline.test.ts. Test: Template splitting scenarios, Cross-template references, Function app deployments, Storage provisioning. Use test Azure subscription. Validate all fixes work in practice." && \
npx dm section move $(npx dm -o json list | jq -r '.tasks[0].gid') 1211549852858682 && \
npx dm assign $(npx dm -o json list | jq -r '.tasks[0].gid') charlie3

# Task 5.4: Performance benchmarks (charlie4)
npx dm task add "Create Performance Benchmarks for New Pipeline" \
  --notes "Measure synthesis performance. File: packages/lib/src/synthesis/__benchmarks__/synthesis.bench.ts. Measure: Memory usage (before/after), Synthesis time, Template size optimization. Compare old vs new pipeline. Document in ADR-018." && \
npx dm section move $(npx dm -o json list | jq -r '.tasks[0].gid') 1211549852858682 && \
npx dm assign $(npx dm -o json list | jq -r '.tasks[0].gid') charlie4

echo "Task creation complete!"