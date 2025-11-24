# Backend Simple Package

The `@atakora/backend-simple` package provides a minimal, quick-start approach to building Atakora backends. It uses sensible defaults for all infrastructure while allowing you to focus on your data models and business logic.

## Quick Start

Get a fully functional backend deployed in 5 minutes:

1. **Set up Azure AD authentication**
2. **Define your schema** (models, events, functions)
3. **Deploy** with a single command

Everything else is handled automatically with production-ready defaults.

## Package Structure

```
packages/backend-simple/
├── src/
│   ├── auth/
│   │   └── resource.ts         # Minimal auth config (tenant + clientId)
│   ├── schema/
│   │   └── resource.ts         # Your data models, events, and functions
│   └── index.ts                # Simple backend assembly
├── package.json
└── tsconfig.json
```

## Key Features

- **Minimal Configuration**: Just 3 source files
- **Smart Defaults**: Development vs production settings auto-configured
- **Full Compatibility**: Can grow into full backend package as needed
- **Zero Infrastructure Code**: Focus entirely on business logic

## When to Use

Use `backend-simple` when:
- Starting a new project
- Building MVPs or prototypes
- Standard requirements (CRUD + events + functions)
- Small to medium applications (< 1000 req/s, < 100 GB database)
- Learning the Atakora framework

## Next Steps

- See the [Getting Started Guide](./getting-started.md) for step-by-step deployment
- Review [Common Examples](./examples.md) for typical use cases
- Compare with [full backend package](./comparison.md) to understand differences