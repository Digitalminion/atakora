# Atakora Examples

Real-world, runnable examples for the Atakora Azure infrastructure framework.

## Purpose

This directory contains production-ready examples that demonstrate how to use Atakora to build Azure infrastructure. Unlike documentation examples, these are:

- ✅ **Type-checked** - All examples compile and are validated by TypeScript
- ✅ **Runnable** - Can be synthesized to ARM templates
- ✅ **Complete** - Include all configuration files and documentation
- ✅ **Up-to-date** - Automatically validated against latest API changes

## Available Examples

### simple-web-app
A complete web application infrastructure with:
- App Service with staging slot
- SQL Database for data storage
- Storage Account for static files
- Application Insights for monitoring
- Virtual Network integration

### multi-region-app
Multi-region application with global load balancing:
- Primary and secondary region deployments
- Traffic Manager for global routing
- Geo-replicated storage and databases
- High availability and disaster recovery

### government-cloud
Azure Government Cloud deployment with enhanced security:
- Government Cloud endpoints and configuration
- Private endpoints for secure connectivity
- Key Vault with HSM-backed keys
- Network isolation and security groups
- NIST 800-53 compliance features

## Running Examples

Each example is a standalone project with its own dependencies:

```bash
# Navigate to an example
cd simple-web-app

# Install dependencies
npm install

# Build and synthesize
npm run synth

# Deploy to Azure
npm run deploy
```

## Contributing Examples

When adding new examples:

1. Create a new directory with a descriptive name
2. Include a comprehensive README.md
3. Provide complete infrastructure code (app.ts)
4. Add package.json with proper scripts
5. Include .env.example for required configuration
6. Use workspace references for @atakora packages
7. Keep examples focused and production-ready
