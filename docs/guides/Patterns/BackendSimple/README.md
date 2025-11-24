# Backend Simple Pattern Documentation

The backend-simple pattern provides the fastest way to get started with Atakora, using sensible defaults for all infrastructure while allowing you to focus entirely on your business logic.

## Documentation Structure

- **[Overview](./overview.md)** - Introduction to the backend-simple pattern and when to use it
- **[Getting Started](./getting-started.md)** - Step-by-step guide to deploy your first backend in 5 minutes
- **[Examples](./examples.md)** - Common patterns and real-world use cases:
  - Simple Todo API
  - Blog Platform
  - File Upload Service
  - Notification System
  - Data Processing Pipeline
  - Multi-Tenant SaaS
- **[Comparison Guide](./comparison.md)** - Detailed comparison between backend-simple and full backend packages

## Quick Summary

### What is Backend-Simple?

A minimal Atakora backend package that:
- Requires only 3 source files (~30 lines of code)
- Auto-configures all infrastructure with production-ready defaults
- Deploys in 5 minutes
- Scales from MVP to production

### When to Use

**Perfect for:**
- New projects and MVPs
- Prototypes and proof-of-concepts
- Standard CRUD + events + functions
- Small to medium applications
- Learning Atakora

**Consider full backend when you need:**
- VNet integration
- Multi-region deployments
- Custom scaling rules
- Enterprise security requirements
- Complex event processing

### Key Benefits

1. **Speed**: From zero to deployed API in 5 minutes
2. **Simplicity**: Focus on business logic, not infrastructure
3. **Flexibility**: Start simple, add customizations as needed
4. **Compatibility**: 100% compatible with full backend - never need to rewrite

### Migration Path

```
backend-simple → Add custom processors → Add custom handlers → Full backend
```

You never need to start over - just add files as your requirements grow.