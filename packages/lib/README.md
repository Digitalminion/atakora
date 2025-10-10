# @atakora/lib

Core framework for Atakora - the type-safe Infrastructure as Code framework for Azure.

## Overview

The `@atakora/lib` package provides the foundational framework components for building Azure infrastructure:

- Core construct system and construct tree
- ARM template synthesis engine
- Validation framework and type-safe validators
- Azure scope definitions (App, Subscription, Resource Group)
- Base resource abstractions
- Shared interfaces and utilities

## Installation

```bash
npm install @atakora/lib
```

## Basic Usage

```typescript
import { App, ResourceGroupStack } from '@atakora/lib';

const app = new App();
const stack = new ResourceGroupStack(app, 'MyStack', {
  resourceGroupName: 'rg-myapp-prod',
  location: 'eastus',
});

// Add resources to the stack using @atakora/cdk constructs

app.synth();
```

## Quick Example

```typescript
import { App, ResourceGroupStack } from '@atakora/lib';
import { VirtualNetworks } from '@atakora/cdk/network';

const app = new App();
const stack = new ResourceGroupStack(app, 'NetworkStack', {
  resourceGroupName: 'rg-network',
  location: 'eastus',
});

const vnet = new VirtualNetworks(stack, 'VNet', {
  virtualNetworkName: 'vnet-main',
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
});

app.synth();
```

## Documentation

For complete documentation, see:

- [Getting Started Guide](../../docs/usage/getting-started/)
- [Core Concepts](../../docs/usage/guides/core-concepts.md)
- [API Reference](../../docs/reference/api/)
- [Architecture Decision Records](../../docs/design/architecture/)

## What's Included

### Core Framework

- `App` - Root application construct
- `Stack` - Base stack abstraction
- `ResourceGroupStack` - Resource group-scoped stack
- `SubscriptionStack` - Subscription-scoped stack
- `Construct` - Base construct class

### Synthesis

- ARM template generation
- Multi-stack synthesis
- Template merging and optimization
- Output file generation

### Validation

- Runtime validation framework
- Schema validation
- Type-safe validators
- Error reporting with actionable messages

### Utilities

- Resource naming utilities
- Azure naming conventions
- CIDR validation helpers
- Type guards and assertions

## Requirements

- Node.js 14.0.0 or higher
- TypeScript 4.5.0 or higher
- npm 7.0.0 or higher

## License

ISC
