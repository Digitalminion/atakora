# Architecture Diagrams

**Navigation**: [Docs Home](../../README.md) > [Architecture](../README.md) > Diagrams

---

## Overview

Visual representations of Atakora's architecture, workflows, and design patterns.

## Available Diagrams

### System Architecture

```
┌─────────────────────────────────────────┐
│          User Infrastructure Code        │
│  TypeScript classes extending Stack     │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│       @atakora/lib (Core Library)       │
│  App, Stack, Construct, Resource        │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│    @atakora/cdk/* (Service Packages)    │
│  Network, Storage, Web, Compute         │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│         ARM Templates (JSON)            │
└─────────────────────────────────────────┘
```

### Synthesis Pipeline

```
Code → Constructs → Validation → Resolution → ARM Templates → Azure
```

### Construct Tree

```
App
└── Stack
    ├── ResourceGroup
    ├── VirtualNetwork
    │   └── Subnet
    └── StorageAccount
```

## Diagram Sources

Diagrams are created using:
- Mermaid.js for flow diagrams
- ASCII art for simple diagrams
- PlantUML for complex UML diagrams (future)

## See Also

- [Architecture Overview](../README.md)
- [Synthesis Guide](../../guides/fundamentals/synthesis.md)

---

**Last Updated**: 2025-10-08
