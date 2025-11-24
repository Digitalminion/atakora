# Core Fundamentals

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > **Fundamentals**

---

## Overview

These guides cover the foundational concepts of Atakora. Understanding these fundamentals will give you a solid foundation for building Azure infrastructure as code.

## Core Concepts

### [App and Stacks](./APP-AND-STACKS.md)

Learn about the core application model in Atakora:
- Understanding the App class
- How stacks organize resources
- Stack relationships and dependencies
- Multi-stack architectures

### [Resources](./RESOURCES.md)

Understand how Atakora models Azure resources:
- Resource constructs and properties
- Resource naming and identification
- Resource dependencies and references
- Resource outputs and cross-stack references

### [Synthesis](./SYNTHESIS.md)

Learn how Atakora generates ARM templates:
- The synthesis process explained
- Template generation workflow
- Validation during synthesis
- Customizing synthesis behavior

### [Deployment](./DEPLOYMENT.md)

Master the deployment process:
- Deployment strategies
- Deployment validation
- Multi-environment deployments
- Rollback and recovery

## Learning Path

1. **Start Here**: [App and Stacks](./APP-AND-STACKS.md) - Understand the application structure
2. **Next**: [Resources](./RESOURCES.md) - Learn how to define resources
3. **Then**: [Synthesis](./SYNTHESIS.md) - See how code becomes templates
4. **Finally**: [Deployment](./DEPLOYMENT.md) - Deploy to Azure

## Quick Reference

### Key Concepts

| Concept | Description | Learn More |
|---------|-------------|------------|
| **App** | Top-level container for your infrastructure | [App and Stacks](./APP-AND-STACKS.md) |
| **Stack** | Logical grouping of resources | [App and Stacks](./APP-AND-STACKS.md) |
| **Resource** | Azure service representation | [Resources](./RESOURCES.md) |
| **Synthesis** | ARM template generation | [Synthesis](./SYNTHESIS.md) |
| **Deployment** | Applying infrastructure to Azure | [Deployment](./DEPLOYMENT.md) |

### Common Patterns

#### Single Stack Application
```typescript
const app = new App();
const stack = new Stack(app, 'MyStack');
// Add resources to stack
app.synth();
```

#### Multi-Stack Application
```typescript
const app = new App();
const networkStack = new Stack(app, 'Network');
const computeStack = new Stack(app, 'Compute');
// Cross-stack references
app.synth();
```

## Related Topics

After mastering the fundamentals:

- **[Workflows](../Workflows/README.md)** - Common development workflows
- **[Patterns](../Patterns/README.md)** - Production-ready patterns
- **[Validation](../Validation/README.md)** - Understanding validation
- **[Tutorials](../Tutorials/README.md)** - Step-by-step guides

## Additional Resources

- [CLI Reference](../../reference/cli/README.md) - Command documentation
- [API Reference](../../reference/api/README.md) - Complete API docs
- [Architecture Decisions](../../architecture/decisions/) - Design rationale

---

**Getting Help**: If you're stuck on fundamentals, start with [App and Stacks](./AppAndStacks.md) or return to [Getting Started](../GETTING-STARTED.md) for a refresher.