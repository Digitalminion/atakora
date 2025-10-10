# Next Steps

[Home](../README.md) > [Getting Started](./README.md) > Next Steps

Congratulations on completing the getting-started guides! You now have a solid foundation in Atakora. This guide helps you decide what to learn next based on your goals.

## What You've Learned

By completing the getting-started guides, you've mastered:

- Installing and configuring the Atakora CLI
- Initializing projects with proper structure
- Writing infrastructure code in TypeScript
- Synthesizing ARM templates from code
- Deploying infrastructure to Azure
- Working with Apps, Stacks, and Resources
- Managing resource dependencies
- Following naming and tagging best practices

## Choose Your Path

Select the learning path that matches your current goals:

### Path 1: Build Production Infrastructure

**Goal**: Deploy real applications to production

**Essential guides:**

1. **[Multi-Environment Deployments](../guides/workflows/deploying-environments.md)** (15 min)
   - Learn to manage dev, staging, and production environments
   - Environment-specific configuration
   - Promotion workflows

2. **[Managing Secrets](../guides/workflows/managing-secrets.md)** (10 min)
   - Secure secret handling
   - Azure Key Vault integration
   - Environment variables and configuration

3. **[Web App with Database Tutorial](../guides/tutorials/web-app-with-database.md)** (30 min)
   - Complete application stack
   - App Service, SQL Database, Application Insights
   - Connection strings and configuration

4. **[CI/CD Pipeline Tutorial](../guides/tutorials/ci-cd-pipeline.md)** (45 min)
   - Automate deployments with GitHub Actions / Azure DevOps
   - Testing and validation in pipelines
   - Safe production deployments

**Additional resources:**
- [Testing Infrastructure](../guides/workflows/testing-infrastructure.md) - Unit testing your IaC
- [Validation Overview](../guides/validation/overview.md) - Understanding validation
- [Naming Conventions](../reference/naming-conventions.md) - Production naming standards

### Path 2: Master Core Concepts

**Goal**: Deep understanding of how Atakora works

**Essential guides:**

1. **[App and Stacks](../guides/fundamentals/app-and-stacks.md)** (15 min)
   - Understand the construct tree
   - Stack types and when to use each
   - App configuration and organization

2. **[Resources](../guides/fundamentals/resources.md)** (15 min)
   - How resources work
   - Properties and configuration
   - Resource dependencies and references

3. **[Synthesis Process](../guides/fundamentals/synthesis.md)** (20 min)
   - How TypeScript becomes ARM templates
   - Validation layers
   - Customizing synthesis

4. **[Deployment Workflow](../guides/fundamentals/deployment.md)** (15 min)
   - Deployment scopes and strategies
   - Rollback and recovery
   - Troubleshooting deployments

**Additional resources:**
- [Architecture Overview](../architecture/README.md) - System design
- [Validation Architecture](../guides/validation/overview.md) - 5-layer validation
- [ARM Template Output](../reference/arm-template-output.md) - Understanding templates

### Path 3: Organize Large Projects

**Goal**: Structure infrastructure for teams and scale

**Essential guides:**

1. **[Multi-Package Projects](../guides/workflows/organizing-projects.md)** (20 min)
   - When to use multiple packages
   - Organizing by team, environment, or deployment boundary
   - Cross-package dependencies

2. **[Adding Resources](../guides/workflows/adding-resources.md)** (15 min)
   - How to find and add resources
   - Configuring resource properties
   - Best practices for resource organization

3. **[Testing Infrastructure](../guides/workflows/testing-infrastructure.md)** (30 min)
   - Unit testing infrastructure code
   - Snapshot testing
   - Integration testing strategies

4. **[Architecture Overview](../architecture/README.md)** (15 min)
   - System architecture
   - Design patterns
   - Extensibility

**Additional resources:**
- [Contributing Guide](../contributing/README.md) - Contribute to Atakora
- [Development Setup](../contributing/development-setup.md) - Local development
- [ADR Index](../architecture/decisions/README.md) - Architecture decisions

### Path 4: Government Cloud Deployment

**Goal**: Deploy to Azure Government Cloud

**Essential guides:**

1. **[Government Cloud Deployment](../guides/tutorials/government-cloud-deployment.md)** (30 min)
   - Azure Government Cloud specifics
   - Authentication and configuration
   - Regional differences and limitations

2. **[Managing Secrets](../guides/workflows/managing-secrets.md)** (10 min)
   - Secure secret handling for Gov Cloud
   - Compliance considerations
   - Key Vault in Government Cloud

3. **[Multi-Region Setup](../guides/tutorials/multi-region-setup.md)** (30 min)
   - Deploy across Government Cloud regions
   - Data residency requirements
   - Regional failover

**Additional resources:**
- [Naming Conventions](../reference/naming-conventions.md) - Gov Cloud naming
- [Common Issues](../troubleshooting/common-issues.md) - Gov Cloud troubleshooting

### Path 5: Reference and Deep Dives

**Goal**: Comprehensive API knowledge and troubleshooting

**Reference documentation:**

1. **[CLI Commands Reference](../reference/cli/README.md)**
   - Complete command documentation
   - All flags and options
   - Common workflows

2. **[API Documentation](../reference/api/core/README.md)**
   - Core API (@atakora/lib)
   - Network resources (@atakora/cdk/network)
   - Storage resources (@atakora/cdk/storage)
   - Web resources (@atakora/cdk/web)

3. **[Error Code Reference](../reference/error-codes.md)**
   - All error codes explained
   - Solutions and workarounds
   - Common causes

4. **[Manifest Schema](../reference/manifest-schema.md)**
   - Project configuration reference
   - Package settings
   - Advanced options

**Troubleshooting:**
- [Common Issues](../troubleshooting/common-issues.md) - Frequently encountered problems
- [Common Validation Errors](../guides/validation/common-errors.md) - Validation troubleshooting
- [Debugging Synthesis](../troubleshooting/debugging-synthesis.md) - Template generation issues
- [Deployment Failures](../troubleshooting/deployment-failures.md) - Deployment troubleshooting

## Quick Wins

Want to accomplish something specific right now? Try these quick tasks:

### Add a New Resource (5 minutes)

Add a resource to your existing stack:

```typescript
import { StorageAccounts } from '@atakora/cdk/storage';

const storage = new StorageAccounts(stack, 'NewStorage', {
  accountName: 'stnewstorage001',
  sku: { name: 'Standard_LRS' },
  kind: 'StorageV2'
});
```

Then: `npm run synth && npm run deploy`

See [Adding Resources Guide](../guides/workflows/adding-resources.md)

### Create a Second Package (10 minutes)

Organize infrastructure by adding a new package:

```bash
npx atakora add frontend --set-default
```

Edit `packages/frontend/bin/app.ts` and define your infrastructure.

See [Multi-Package Projects Guide](../guides/workflows/organizing-projects.md)

### Preview Changes Without Deploying (2 minutes)

See what would change before deploying:

```bash
npm run diff
```

See [CLI diff Command](../reference/cli/diff.md)

### Validate Templates (2 minutes)

Check templates without deploying:

```bash
npm run synth -- --validate-only
```

See [CLI synth Command](../reference/cli/synth.md)

## Common Next Questions

### How do I add a specific Azure resource?

Browse the API documentation:
- [Network Resources](../reference/api/cdk/network.md) - VNet, Subnet, NSG, Public IP, etc.
- [Storage Resources](../reference/api/cdk/storage.md) - Storage Account, Blob Container, File Share, etc.
- [Web Resources](../reference/api/cdk/web.md) - App Service, Function App, Static Web App, etc.

See [Adding Resources Guide](../guides/workflows/adding-resources.md) for step-by-step instructions.

### How do I manage multiple environments?

Use environment-specific configuration:

```typescript
const environment = process.env.ENVIRONMENT || 'nonprod';

const stack = new ResourceGroupStack(app, 'AppStack', {
  resourceGroupName: `rg-app-${environment}`,
  location: 'eastus2',
  tags: { environment }
});
```

See [Multi-Environment Deployments](../guides/workflows/deploying-environments.md)

### How do I reference resources across stacks?

Use stack outputs and parameters:

```typescript
// Stack 1: Export a value
const vnet = new VirtualNetworks(stack1, 'VNet', { /* ... */ });
stack1.addOutput('VNetId', vnet.id);

// Stack 2: Import the value
const vnetId = stack2.getParameter('VNetId');
```

See [App and Stacks Guide](../guides/fundamentals/app-and-stacks.md)

### How do I test my infrastructure code?

Write unit tests using standard testing frameworks:

```typescript
import { AzureApp } from '@atakora/cdk';

test('creates VNet with correct address space', () => {
  const app = new AzureApp({ /* ... */ });
  // ... test assertions
});
```

See [Testing Infrastructure Guide](../guides/workflows/testing-infrastructure.md)

### How do I integrate with CI/CD?

Add Atakora commands to your pipeline:

```yaml
# GitHub Actions example
- name: Install dependencies
  run: npm ci

- name: Synthesize templates
  run: npm run synth

- name: Deploy to Azure
  run: npm run deploy
  env:
    AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

See [CI/CD Pipeline Tutorial](../guides/tutorials/ci-cd-pipeline.md)

### What if I get stuck?

**Troubleshooting resources:**

1. Check [Common Issues](../troubleshooting/common-issues.md) first
2. Review [Common Validation Errors](../guides/validation/common-errors.md)
3. Search [Error Code Reference](../reference/error-codes.md)
4. Browse [Examples](../examples/README.md) for working code

**Documentation sections:**
- [Guides](../guides/README.md) - Conceptual documentation
- [Reference](../reference/cli/README.md) - API and CLI reference
- [Troubleshooting](../troubleshooting/common-issues.md) - Problem-solving

## Example Projects

Learn by example - explore complete working projects:

- **[Simple Web App](../examples/simple-web-app/README.md)**
  - App Service with staging slots
  - SQL Database with connection strings
  - Application Insights monitoring

- **[Multi-Region Application](../examples/multi-region-app/README.md)**
  - Cross-region deployment
  - Traffic Manager for failover
  - Regional storage replication

- **[Government Cloud Setup](../examples/government-cloud/README.md)**
  - Azure Government Cloud authentication
  - Compliance-focused configuration
  - Regional constraints

## Community and Contribution

### Contributing to Atakora

Help improve Atakora:

- [Contribution Guide](../contributing/README.md) - How to contribute
- [Development Setup](../contributing/development-setup.md) - Set up your environment
- [Testing Guide](../contributing/testing-guide.md) - Write and run tests
- [PR Process](../contributing/pr-process.md) - Submit pull requests

### Sharing Your Work

Created something useful with Atakora? Share it:

- Submit example projects
- Write tutorials and guides
- Improve documentation
- Report bugs and suggest features

## Recommended Learning Sequence

If you're unsure where to start, follow this sequence:

**Week 1: Foundations**
1. [App and Stacks](../guides/fundamentals/app-and-stacks.md)
2. [Resources](../guides/fundamentals/resources.md)
3. [Adding Resources](../guides/workflows/adding-resources.md)
4. [Multi-Package Projects](../guides/workflows/organizing-projects.md)

**Week 2: Production Skills**
5. [Multi-Environment Deployments](../guides/workflows/deploying-environments.md)
6. [Managing Secrets](../guides/workflows/managing-secrets.md)
7. [Web App with Database Tutorial](../guides/tutorials/web-app-with-database.md)
8. [Testing Infrastructure](../guides/workflows/testing-infrastructure.md)

**Week 3: Advanced Topics**
9. [CI/CD Pipeline Tutorial](../guides/tutorials/ci-cd-pipeline.md)
10. [Multi-Region Setup](../guides/tutorials/multi-region-setup.md)
11. [Validation Overview](../guides/validation/overview.md)
12. [Architecture Overview](../architecture/README.md)

**Week 4: Mastery**
13. Browse [API Reference](../reference/api/core/README.md)
14. Explore [Examples](../examples/README.md)
15. Read [Architecture Decisions](../architecture/decisions/README.md)
16. Contribute to [Atakora](../contributing/README.md)

## Keep Learning

Atakora is a powerful framework with many features to explore. The documentation is your guide:

- **[Home](../README.md)** - Main documentation hub
- **[Guides](../guides/README.md)** - Concepts and workflows
- **[Reference](../reference/cli/README.md)** - API and CLI documentation
- **[Examples](../examples/README.md)** - Working code samples
- **[Troubleshooting](../troubleshooting/common-issues.md)** - Problem-solving

---

**Previous**: [Your First Stack](./your-first-stack.md) | **Documentation Home**: [Home](../README.md)
