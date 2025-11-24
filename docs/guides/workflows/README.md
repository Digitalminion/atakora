# Development Workflows

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > **Workflows**

---

This section covers common development workflows and best practices for building Azure infrastructure with Atakora. These guides walk you through real-world scenarios you'll encounter when developing, testing, and deploying your infrastructure.

## What You'll Find Here

### [Adding Resources](./ADDING-RESOURCES.md)

Learn how to add and configure Azure resources to your infrastructure. This guide covers:

- Adding new resources to existing stacks
- Configuring resource properties and dependencies
- Understanding resource naming and conventions
- Managing resource relationships and outputs

### [Testing Infrastructure](./TESTING-INFRASTRUCTURE.md)

Develop confidence in your infrastructure through comprehensive testing. This guide covers:

- Unit testing your infrastructure code
- Snapshot testing for change detection
- Validation testing patterns
- Integration testing strategies
- Testing best practices and patterns

### [Organizing Projects](./ORGANIZING-PROJECTS.md)

Structure your infrastructure projects for long-term maintainability. This guide covers:

- Multi-package project organization
- Separating concerns across packages
- Sharing common infrastructure patterns
- Managing dependencies between packages
- Monorepo vs multi-repo strategies

### [Managing Secrets](./MANAGING-SECRETS.md)

Handle sensitive data securely in your infrastructure. This guide covers:

- Azure Key Vault integration patterns
- Referencing secrets in your infrastructure
- Managing secrets across environments
- CI/CD secret handling
- Best practices for credential management

### [Deploying Environments](./DEPLOYING-ENVIRONMENTS.md)

Manage multiple environments effectively. This guide covers:

- Multi-environment deployment strategies
- Environment-specific configuration
- Promoting changes across environments
- Managing environment drift
- Production deployment best practices

## Quick Navigation

### By Experience Level

**Beginners**: Start with [Adding Resources](./ADDING-RESOURCES.md) and [Testing Infrastructure](./TESTING-INFRASTRUCTURE.md) to learn the fundamentals of infrastructure development.

**Intermediate**: Focus on [Organizing Projects](./ORGANIZING-PROJECTS.md) and [Deploying Environments](./DEPLOYING-ENVIRONMENTS.md) to scale your infrastructure effectively.

**Advanced**: Deep dive into [Managing Secrets](./MANAGING-SECRETS.md) for production-ready security practices.

### By Scenario

| Scenario                                  | Guide                                                 |
| ----------------------------------------- | ----------------------------------------------------- |
| Adding a new Azure service to my stack    | [Adding Resources](./ADDING-RESOURCES.md)             |
| Setting up automated testing for IaC      | [Testing Infrastructure](./TESTING-INFRASTRUCTURE.md) |
| Splitting a large project into packages   | [Organizing Projects](./ORGANIZING-PROJECTS.md)       |
| Storing database passwords securely       | [Managing Secrets](./MANAGING-SECRETS.md)             |
| Deploying to dev, staging, and production | [Deploying Environments](./DEPLOYING-ENVIRONMENTS.md) |

## Common Workflow Pattern

Most infrastructure development follows this pattern:

1. **Design**: Plan your infrastructure requirements
2. **Develop**: Write infrastructure code using Atakora constructs
3. **Test**: Validate your infrastructure with unit and integration tests
4. **Review**: Use `atakora diff` to preview changes
5. **Deploy**: Apply changes to your Azure environment
6. **Monitor**: Verify deployment success and monitor resources

Each guide in this section addresses specific aspects of this workflow, helping you develop robust, maintainable infrastructure as code.

## Additional Resources

- [Core Concepts](../Fundamentals/README.md) - Understand fundamental Atakora concepts
- [Design Patterns](../Patterns/README.md) - Proven infrastructure patterns
- [CLI Reference](../../reference/cli/README.md) - Command-line tool documentation
- [Troubleshooting](../../troubleshooting/Common-Issues.md) - Solve common problems

## Related Guides

- **[Validation](../Validation/README.md)**: Understanding and working with validation rules
- **[Government Cloud](../Tutorials/GOVERNMENT-CLOUD-DEPLOYMENT.md)**: Azure Government-specific considerations
- **[Tutorials](../Tutorials/README.md)**: Step-by-step learning paths

---

**Next Steps**: Choose a workflow guide above that matches your current needs, or continue to [Adding Resources](./ADDING-RESOURCES.md) for the most common starting point.
