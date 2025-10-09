# Architecture Overview

**Navigation**: [Docs Home](../README.md) > Architecture

---

## Overview

Atakora is a TypeScript infrastructure-as-code framework for Azure, inspired by AWS CDK. It provides type-safe, composable constructs for defining Azure infrastructure using a familiar object-oriented approach.

## Core Principles

### 1. Type Safety First
- Strict TypeScript with no implicit `any`
- Compile-time validation
- IntelliSense support

### 2. Construct Tree Pattern
- Hierarchical resource organization
- Context flows down the tree
- Scoped dependencies

### 3. Multi-Level Abstractions
- **L1 Constructs**: Direct ARM mapping (ArmVirtualNetwork)
- **L2 Constructs**: Intent-based API (VirtualNetwork)
- **L3 Constructs**: Pattern-based (WebAppInfrastructure)

### 4. Modular Architecture
- Core library (@atakora/lib)
- Service namespaces (@atakora/cdk/*)
- CLI tooling (@atakora/cli)

## System Architecture

```
┌─────────────────────────────────────────┐
│          User Infrastructure Code        │
│  TypeScript classes extending Stack     │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│       @atakora/lib (Core Library)       │
│  App, Stack, Construct, Resource        │
│  Naming, Validation, Synthesis          │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│    @atakora/cdk/* (Service Packages)    │
│  Network, Storage, Web, Compute, etc.   │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│        @atakora/cli (CLI Tools)         │
│  synth, deploy, diff, config            │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│         ARM Templates (JSON)            │
│  Azure Resource Manager                 │
└─────────────────────────────────────────┘
```

## Package Structure

### Monorepo Layout

```
atakora/
├── packages/
│   ├── lib/           # Core constructs
│   ├── cdk/           # Service namespaces
│   └── cli/           # Command-line tools
├── docs/              # Documentation
└── examples/          # Example projects
```

### Core Library (@atakora/lib)

```
packages/lib/src/
├── core/              # App, Stack, Construct
├── naming/            # Name generation
├── synthesis/         # ARM template generation
└── validation/        # Schema validation
```

### CDK Package (@atakora/cdk)

```
packages/cdk/
├── network/           # Networking resources
├── storage/           # Storage resources
├── web/               # Web & App Services
├── compute/           # VMs, VMSS
├── sql/               # SQL databases
└── keyvault/          # Key Vault, secrets
```

## Construct Tree

All infrastructure forms a tree:

```
App (root)
└── Stack (deployment boundary)
    ├── ResourceGroup
    ├── VirtualNetwork
    │   ├── Subnet (web)
    │   └── Subnet (data)
    ├── StorageAccount
    │   └── BlobContainer
    └── KeyVault
        └── Secret
```

Each node:
- Has a unique path
- Inherits context from parent
- Can reference siblings/parents
- Validates at synthesis

## Synthesis Pipeline

Transform TypeScript code to ARM templates:

```
1. User Code
   ↓
2. Construct Tree (TypeScript objects)
   ↓
3. Validation (check properties, references)
   ↓
4. Resolution (resolve names, IDs, dependencies)
   ↓
5. ARM Template (JSON)
   ↓
6. Deployment (Azure)
```

## Naming System

Automatic resource naming based on context:

```typescript
// Stack provides context
class MyStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id, {
      environment: 'production',
      location: 'eastus'
    });

    // Auto-generated name: rg-mystack-production-eastus
    const rg = new ResourceGroup(this, 'ResourceGroup');
  }
}
```

Pattern: `{prefix}-{identifier}-{environment}-{location}`

## Validation Framework

Multi-layer validation:

1. **TypeScript Compiler**: Type checking
2. **Runtime Validation**: Property constraints
3. **Schema Validation**: ARM schema compliance
4. **Reference Validation**: Dependency resolution
5. **Azure Validation**: Template validation API

## Deployment Model

Three deployment scopes:

1. **Subscription Scope**: Resource groups, policies
2. **Resource Group Scope**: Most resources
3. **Management Group Scope**: Governance (future)

## Architecture Decision Records

Detailed design decisions:

- **[ADR-001: Validation Architecture](./decisions/README.md)** - Schema-driven validation system
- **[ADR-002: Manifest Schema](./decisions/README.md)** - Project manifest structure
- **[ADR-003: CDK Package Architecture](./decisions/README.md)** - Modular package design

## Design Documentation

Technical specifications:

- **[Project Structure](../design/architecture/project-structure-spec.md)** - Codebase organization
- **[Validation Integration](../design/architecture/validation-integration-plan.md)** - Validation implementation
- **[Success Metrics](../design/architecture/validation-success-metrics.md)** - Quality metrics

## See Also

- [Getting Started](../getting-started/README.md)
- [API Reference](../reference/api/README.md)
- [Contributing Guide](../contributing/README.md)

---

**Last Updated**: 2025-10-08
**Version**: 1.0.0
