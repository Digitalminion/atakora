# Synthesis Design Documentation

**Navigation**: [Architecture](../../README.md) > [Design](../README.md) > Synthesis

---

## Overview

Design specifications for the ARM template synthesis pipeline in Atakora. These documents detail how TypeScript constructs are transformed into deployable Azure Resource Manager templates.

## Design Documents

- [Artifact Storage Strategy](./ARTIFACT-STORAGE-STRATEGY.md) - Managing deployment artifacts and templates
- [Linked Templates Architecture](./LINKED-TEMPLATES-ARCHITECTURE.md) - Organizing complex deployments with linked templates
- [Synthesis Refactor Implementation Spec](./SYNTHESIS-REFACTOR-IMPLEMENTATION-SPEC.md) - Refactoring the synthesis pipeline
- [Template Splitting Strategy](./TEMPLATE-SPLITTING-STRATEGY.md) - Breaking large templates into manageable pieces

## Key Concepts

### Synthesis Pipeline
The transformation process from TypeScript to ARM:
1. **Discovery** - Find all constructs in the app
2. **Validation** - Validate resource configurations
3. **Resolution** - Resolve references and dependencies
4. **Generation** - Generate ARM template JSON
5. **Optimization** - Split and optimize templates

### Linked Templates
Strategy for handling large deployments:
- Automatic splitting at 4MB limit
- Blob storage for template artifacts
- Nested deployment orchestration
- Cross-template reference resolution

### Context-Aware Synthesis
Resources understand their deployment context:
- Stack context flows to all resources
- Proper ARM expression generation
- No post-generation fixes needed

## See Also

- [ADR-017: Linked Templates Default](../../decisions/ADR-017-LINKED-TEMPLATES-DEFAULT.md)
- [ADR-019: Synthesis Pipeline Refactoring](../../decisions/ADR-019-SYNTHESIS-PIPELINE-REFACTORING.md)
- [Synthesis Guide](../../../../guides/fundamentals/synthesis.md)

---

**Last Updated**: 2025-11-24