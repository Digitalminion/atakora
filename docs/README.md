# Atakora Documentation

Welcome to Atakora - a TypeScript-first infrastructure-as-code framework for Azure that brings type safety, testability, and developer joy to cloud infrastructure management.

## What is Atakora?

Atakora lets you define Azure infrastructure using TypeScript, synthesize it into ARM templates, and deploy with confidence. Write infrastructure code that's as reliable and maintainable as your application code.

```typescript
import { AzureApp, ResourceGroupStack } from '@atakora/lib';
import { VirtualNetworks } from '@atakora/cdk/network';

const app = new AzureApp({
  organization: 'Contoso',
  project: 'ProductionInfra',
});

const stack = new ResourceGroupStack(app, 'Foundation', {
  resourceGroupName: 'rg-platform-prod',
  location: 'eastus2'
});

const vnet = new VirtualNetworks(stack, 'VNet', {
  virtualNetworkName: 'vnet-platform',
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
});

app.synth();
```

## Quick Start

```bash
# Install the CLI
npm install -g @atakora/cli @atakora/lib

# Initialize a new project
npx atakora init

# Define your infrastructure in packages/*/bin/app.ts

# Synthesize ARM templates
npm run synth

# Deploy to Azure
npm run deploy
```

## Key Features

- **Type Safety**: Catch configuration errors at compile time with full TypeScript support
- **IntelliSense**: Get autocomplete and inline documentation while writing infrastructure code
- **Reusability**: Create and share infrastructure patterns using standard TypeScript modules
- **Testability**: Unit test your infrastructure code like any other TypeScript project
- **Multi-Package Support**: Organize large infrastructure projects into manageable packages
- **Validation**: 5-layer validation system catches errors before deployment
- **Government Cloud**: First-class support for Azure Government Cloud deployments

## Documentation Sections

### Getting Started

New to Atakora? Start here:

- **[Installation](./getting-started/installation.md)** - Install the CLI and set up your environment
- **[5-Minute Quickstart](./getting-started/quickstart.md)** - Deploy your first infrastructure in 5 minutes
- **[Your First Stack](./getting-started/your-first-stack.md)** - Complete tutorial for building and deploying a stack
- **[Next Steps](./getting-started/next-steps.md)** - What to learn after the basics

### Guides

Learn core concepts and common workflows:

- **Fundamentals**
  - [App and Stacks](./guides/fundamentals/app-and-stacks.md) - Understanding the construct tree
  - [Resources](./guides/fundamentals/resources.md) - Working with Azure resources
  - [Synthesis](./guides/fundamentals/synthesis.md) - How code becomes ARM templates
  - [Deployment](./guides/fundamentals/deployment.md) - Deploying to Azure

- **Tutorials**
  - [Web App with Database](./guides/tutorials/web-app-with-database.md) - Complete web application deployment
  - [Multi-Region Setup](./guides/tutorials/multi-region-setup.md) - Deploying across regions
  - [CI/CD Pipeline](./guides/tutorials/ci-cd-pipeline.md) - Automating deployments
  - [Government Cloud Deployment](./guides/tutorials/government-cloud-deployment.md) - Azure Gov Cloud specifics

- **Workflows**
  - [Adding Resources](./guides/workflows/adding-resources.md) - How to add and configure resources
  - [Testing Infrastructure](./guides/workflows/testing-infrastructure.md) - Unit testing your IaC
  - [Organizing Projects](./guides/workflows/organizing-projects.md) - Multi-package project structure
  - [Managing Secrets](./guides/workflows/managing-secrets.md) - Secure secret handling
  - [Deploying Environments](./guides/workflows/deploying-environments.md) - Multi-environment strategies

- **Validation**
  - [Validation Overview](./guides/validation/overview.md) - Understanding the validation system
  - [Common Errors](./guides/validation/common-errors.md) - Troubleshooting validation errors
  - [Custom Validators](./guides/validation/writing-custom-validators.md) - Extending validation

- **Migration**
  - [Migrating to CDK Package](./guides/migration/migrating-to-cdk-package.md) - Upgrade to new package structure

### Reference

Technical reference documentation:

- **CLI Commands**
  - [CLI Overview](./reference/cli/README.md) - Command-line interface guide
  - [init](./reference/cli/init.md) - Initialize a new project
  - [add](./reference/cli/add.md) - Add a package to your project
  - [synth](./reference/cli/synth.md) - Synthesize ARM templates
  - [deploy](./reference/cli/deploy.md) - Deploy infrastructure to Azure
  - [diff](./reference/cli/diff.md) - Show infrastructure changes
  - [config](./reference/cli/config.md) - Manage Azure configuration
  - [set-default](./reference/cli/set-default.md) - Set default package

- **API Reference**
  - [Core API](./reference/api/core/README.md) - @atakora/lib exports
  - [Network Resources](./reference/api/cdk/network.md) - Microsoft.Network resources
  - [Storage Resources](./reference/api/cdk/storage.md) - Microsoft.Storage resources
  - [Web Resources](./reference/api/cdk/web.md) - Microsoft.Web resources

- **Schema & Standards**
  - [Manifest Schema](./reference/manifest-schema.md) - Project configuration reference
  - [Error Codes](./reference/error-codes.md) - Complete error code index
  - [Naming Conventions](./reference/naming-conventions.md) - Resource naming standards
  - [ARM Template Output](./reference/arm-template-output.md) - Understanding synthesized templates

### Architecture

Understand how Atakora works:

- [Architecture Overview](./architecture/README.md) - System design and philosophy
- [Architecture Decisions](./architecture/decisions/README.md) - ADR index
- [Design Documents](./architecture/design/README.md) - Detailed design specs
- [Diagrams](./architecture/diagrams/README.md) - Visual system architecture

### Contributing

Help improve Atakora:

- [Contribution Guide](./contributing/README.md) - How to contribute
- [Development Setup](./contributing/development-setup.md) - Set up your dev environment
- [Testing Guide](./contributing/testing-guide.md) - Writing and running tests
- [PR Process](./contributing/pr-process.md) - Submitting pull requests
- [Release Process](./contributing/release-process.md) - How releases work

### Examples

Complete, working code samples:

- [Simple Web App](./examples/simple-web-app/README.md) - Basic App Service deployment
- [Multi-Region Application](./examples/multi-region-app/README.md) - Cross-region deployment
- [Government Cloud Setup](./examples/government-cloud/README.md) - Azure Gov Cloud example

### Troubleshooting

Problem-solving guides:

- [Common Issues](./troubleshooting/common-issues.md) - Frequently encountered problems
- [Debugging Synthesis](./troubleshooting/debugging-synthesis.md) - Troubleshoot template generation
- [Deployment Failures](./troubleshooting/deployment-failures.md) - Resolve deployment errors
- [CI/CD Problems](./troubleshooting/ci-cd-problems.md) - Fix pipeline issues

## Popular Topics

**Just getting started?**
- [Installation Guide](./getting-started/installation.md)
- [5-Minute Quickstart](./getting-started/quickstart.md)
- [Your First Stack](./getting-started/your-first-stack.md)

**Working with resources?**
- [Adding Resources Guide](./guides/workflows/adding-resources.md)
- [Network Resources API](./reference/api/cdk/network.md)
- [Storage Resources API](./reference/api/cdk/storage.md)

**Deploying to production?**
- [Multi-Environment Deployments](./guides/workflows/deploying-environments.md)
- [CI/CD Pipeline Tutorial](./guides/tutorials/ci-cd-pipeline.md)
- [Government Cloud Deployment](./guides/tutorials/government-cloud-deployment.md)

**Troubleshooting errors?**
- [Common Validation Errors](./guides/validation/common-errors.md)
- [Error Code Reference](./reference/error-codes.md)
- [Common Issues](./troubleshooting/common-issues.md)

## Need Help?

- Browse the [Guides](./guides/README.md) for conceptual documentation
- Check the [Reference](./reference/cli/README.md) for detailed API docs
- Review [Troubleshooting](./troubleshooting/common-issues.md) for common problems
- See [Examples](./examples/README.md) for working code samples

## Version Information

This documentation is for Atakora v1.x. For older versions, see the [version archive](./archive/README.md).

## Contributing to Documentation

Found an error or want to improve the docs? See our [documentation contribution guide](./contributing/README.md#documentation).

---

**Next**: [Get started with Atakora](./getting-started/installation.md) or jump to the [5-minute quickstart](./getting-started/quickstart.md)
