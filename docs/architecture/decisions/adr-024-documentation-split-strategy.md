# ADR-004: Parallel Documentation Split Strategy

## Context

The Atakora codebase requires comprehensive Google-style docstring documentation across approximately 804 TypeScript files. To accomplish this efficiently, we need to divide the work among 5 documentation agents (ella1-ella5) working in parallel.

### Codebase Analysis

Total file distribution (excluding tests):
- **@atakora/lib**: 573 files (71% of codebase)
  - core: 29 files
  - codegen: 15 files
  - generated: 10 files
  - naming: 12 files
  - resources: 158 files (largest component)
  - stacks: 4 files
  - synthesis: 30 files
  - testing: 4 files
  - examples: 5 files
- **@atakora/cdk**: 85 files across 13 namespaces (11% of codebase)
  - network: 29 files (largest)
  - insights: 16 files
  - apimanagement: 8 files
  - web: 5 files
  - Others: 1-4 files each
- **@atakora/cli**: 61 files (8% of codebase)
  - commands, auth, config, generators, templates, validation

The remaining 10% consists of configuration and auxiliary files.

## Decision

We will split the codebase into 5 logical parts based on:
1. **Architectural boundaries** - Respecting package and module boundaries
2. **Domain cohesion** - Keeping related functionality together
3. **Workload balance** - Roughly equal complexity and effort
4. **Dependency isolation** - Minimizing cross-boundary dependencies
5. **Parallel efficiency** - Enabling true parallel work without conflicts

### The 5-Part Division

#### Part 1: Core Framework & Synthesis (ella1)
- **Scope**: Core framework, synthesis pipeline, and code generation
- **Files**: ~90 files
- **Packages**:
  - lib/src/core (29)
  - lib/src/synthesis (30)
  - lib/src/codegen (15)
  - lib/src/generated (10)
  - lib/src/stacks (4)
- **Rationale**: Core abstractions that everything else depends on

#### Part 2: Resources & Constructs (ella2)
- **Scope**: Resource base classes and construct framework
- **Files**: ~160 files
- **Packages**:
  - lib/src/resources (158)
  - lib/src/examples (5)
- **Rationale**: Largest single component, foundational for all Azure resources

#### Part 3: CDK Infrastructure Resources (ella3)
- **Scope**: Core infrastructure namespaces (network, compute, storage)
- **Files**: ~45 files
- **Packages**:
  - cdk/network (29)
  - cdk/compute (1)
  - cdk/storage (4)
  - cdk/keyvault (1)
  - cdk/resources (4)
  - cdk/sql (1)
  - cdk/documentdb (4)
- **Rationale**: Core infrastructure resources that most applications need

#### Part 4: CDK Application Services (ella4)
- **Scope**: Application-layer Azure services
- **Files**: ~40 files
- **Packages**:
  - cdk/insights (16)
  - cdk/apimanagement (8)
  - cdk/web (5)
  - cdk/cognitiveservices (4)
  - cdk/operationalinsights (4)
  - cdk/search (4)
- **Rationale**: Higher-level services that depend on infrastructure

#### Part 5: CLI & Supporting Systems (ella5)
- **Scope**: CLI, naming conventions, testing utilities
- **Files**: ~80 files
- **Packages**:
  - cli/src (61)
  - lib/src/naming (12)
  - lib/src/testing (4)
- **Rationale**: User-facing tools and cross-cutting concerns

## Alternatives Considered

### Alternative 1: Package-Based Split
- **Approach**: Assign entire packages (lib to 2 agents, cdk to 2 agents, cli to 1)
- **Rejected because**: Huge imbalance (lib is 71% of codebase)

### Alternative 2: Equal File Count Split
- **Approach**: Divide 804 files into 5 parts of ~160 files each
- **Rejected because**: Would split logical boundaries and create dependency conflicts

### Alternative 3: Namespace-Based Split
- **Approach**: Split CDK namespaces evenly across all 5 agents
- **Rejected because**: CDK is only 11% of codebase, would leave lib undocumented

## Consequences

### Positive
- **Balanced workload**: Each agent has 40-160 files with similar complexity
- **Clear boundaries**: Each part is architecturally cohesive
- **Minimal conflicts**: Agents work in separate directories
- **Progressive documentation**: Core → Resources → Infrastructure → Services → Tools
- **Domain expertise**: Each agent develops expertise in their area

### Negative
- **Unequal file counts**: Part 2 (160 files) is larger than Part 4 (40 files)
- **Dependency awareness**: Later parts may need to reference earlier documentation
- **Cross-references**: Some documentation may need updates after all parts complete

### Mitigation Strategies
- **File count imbalance**: Complexity-adjusted - Part 2 has many similar resource files
- **Dependencies**: Document public APIs first, implementation details second
- **Cross-references**: Final review pass to add cross-references

## Success Criteria

Documentation is successful when:

1. **Coverage Metrics**:
   - 100% of public APIs have complete docstrings
   - 90%+ of implementation code has documentation
   - All exported types, interfaces, and classes are documented

2. **Quality Standards**:
   - Every docstring includes: description, parameters, returns, examples
   - Complex algorithms have detailed explanations
   - Design decisions and trade-offs are documented
   - Edge cases and gotchas are noted

3. **Consistency Checks**:
   - Documentation follows Google style guide
   - Examples compile without errors
   - Cross-references are valid
   - No documentation linting errors

4. **Maintainability Goals**:
   - External contributors can understand the codebase
   - Azure concepts are explained or linked
   - "Why" is documented, not just "what"
   - Related ADRs are referenced

## Coordination Protocol

### Shared Dependencies
When documenting shared types or interfaces:
1. Document in the defining module (owner)
2. Reference from consuming modules
3. Use fully-qualified type references

### Progress Tracking
1. Each agent updates progress daily in Asana
2. Block on dependencies explicitly
3. Mark 100% complete only when linting passes

### Quality Review
1. Self-review against success criteria
2. Peer review critical APIs
3. Final consistency pass after all complete

## Implementation Timeline

Suggested parallel execution:
- **Week 1**: All agents start simultaneously
  - Focus on public APIs first
  - Document complex algorithms
- **Week 2**: Continue implementation details
  - Add examples and edge cases
  - Cross-reference related code
- **Week 3**: Final polish
  - Review and consistency checks
  - Add missing cross-references
  - Validate all examples compile

## Verification

To verify the split is working:
```bash
# Check for file conflicts between agents
git status | grep "both modified"

# Verify documentation coverage
npm run docs:coverage

# Lint documentation
npm run lint:docs
```