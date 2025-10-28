# Examples

**Navigation**: [Docs Home](../README.md) > Examples

---

## Overview

Complete, working examples of Atakora infrastructure projects. Each example includes full source code, documentation, and deployment instructions.

## Available Examples

### [Azure Functions - Basic Usage](./functions-basic-usage.md)

Complete working examples for Azure Functions Apps including:
- Simple serverless API (Consumption plan)
- Premium Functions App with custom configuration
- Multiple Functions Apps in one stack
- Python data processing Functions
- .NET enterprise Functions App
- Development environment setup
- Environment variables management
- Accessing storage properties
- Shared resource group with other services

**Use Case**: Learning Azure Functions with Atakora

**Complexity**: Beginner to Intermediate

**Topics covered**:
- All supported runtimes (Node.js, Python, .NET, Java, PowerShell)
- Hosting plan options (Consumption, Premium, Dedicated)
- Storage account architecture
- Environment variable patterns
- Multi-app deployments

### [REST API Examples](./rest-api-examples.md)

Examples of building REST APIs with Atakora including:
- Basic CRUD APIs
- API Gateway integration
- OpenAPI/Swagger integration
- Authentication and authorization
- Multi-environment deployments

**Use Case**: Building production REST APIs

**Complexity**: Intermediate

## Using the Examples

These examples are provided as documentation with complete code samples that you can copy and adapt for your own projects.

### Copy Example Code

1. **Browse the example files** linked above
2. **Copy the code** from the examples into your project
3. **Adapt** the code to your specific needs
4. **Test** in your development environment
5. **Deploy** to Azure

### Prerequisites

Before using these examples:

```bash
# Install Atakora
npm install -g @atakora/cli

# Configure Azure credentials
atakora config set-credentials

# Create a new project
atakora init my-project
cd my-project
```

### Typical Workflow

```bash
# Install dependencies
npm install

# Write your infrastructure code (using examples as reference)
# Edit src/index.ts

# Synthesize ARM templates
atakora synth

# Review the generated templates
ls arm.out/

# Deploy to Azure
atakora deploy
```

## Learning Path

1. **Start with**: [Azure Functions Basic Usage](./functions-basic-usage.md) - Learn Functions fundamentals
2. **Then explore**: [REST API Examples](./rest-api-examples.md) - Build production APIs
3. **Deep dive**: [Guides](../guides/README.md) - Learn advanced patterns and best practices

## See Also

- [Getting Started Guide](../getting-started/README.md)
- [Tutorials](../guides/tutorials/README.md)
- [API Reference](../reference/api/README.md)

---

**Last Updated**: 2025-10-08
