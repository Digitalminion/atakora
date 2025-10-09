# Development Workflows

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > **Workflows**

---

This section covers common development workflows and best practices for building Azure infrastructure with Atakora. These guides walk you through real-world scenarios you'll encounter when developing, testing, and deploying your infrastructure.

## What You'll Find Here

### [Adding Resources](./adding-resources.md)
Learn how to add and configure Azure resources to your infrastructure. This guide covers:
- Adding new resources to existing stacks
- Configuring resource properties and dependencies
- Understanding resource naming and conventions
- Managing resource relationships and outputs

### [Testing Infrastructure](./testing-infrastructure.md)
Develop confidence in your infrastructure through comprehensive testing. This guide covers:
- Unit testing your infrastructure code
- Snapshot testing for change detection
- Validation testing patterns
- Integration testing strategies
- Testing best practices and patterns

### [Organizing Projects](./organizing-projects.md)
Structure your infrastructure projects for long-term maintainability. This guide covers:
- Multi-package project organization
- Separating concerns across packages
- Sharing common infrastructure patterns
- Managing dependencies between packages
- Monorepo vs multi-repo strategies

### [Managing Secrets](./managing-secrets.md)
Handle sensitive data securely in your infrastructure. This guide covers:
- Azure Key Vault integration patterns
- Referencing secrets in your infrastructure
- Managing secrets across environments
- CI/CD secret handling
- Best practices for credential management

### [Deploying Environments](./deploying-environments.md)
Manage multiple environments effectively. This guide covers:
- Multi-environment deployment strategies
- Environment-specific configuration
- Promoting changes across environments
- Managing environment drift
- Production deployment best practices

## Quick Navigation

### By Experience Level

**Beginners**: Start with [Adding Resources](./adding-resources.md) and [Testing Infrastructure](./testing-infrastructure.md) to learn the fundamentals of infrastructure development.

**Intermediate**: Focus on [Organizing Projects](./organizing-projects.md) and [Deploying Environments](./deploying-environments.md) to scale your infrastructure effectively.

**Advanced**: Deep dive into [Managing Secrets](./managing-secrets.md) for production-ready security practices.

### By Scenario

| Scenario | Guide |
|----------|-------|
| Adding a new Azure service to my stack | [Adding Resources](./adding-resources.md) |
| Setting up automated testing for IaC | [Testing Infrastructure](./testing-infrastructure.md) |
| Splitting a large project into packages | [Organizing Projects](./organizing-projects.md) |
| Storing database passwords securely | [Managing Secrets](./managing-secrets.md) |
| Deploying to dev, staging, and production | [Deploying Environments](./deploying-environments.md) |

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

- [Core Concepts](../core-concepts/README.md) - Understand fundamental Atakora concepts
- [Design Patterns](../patterns/README.md) - Proven infrastructure patterns
- [CLI Reference](../../reference/cli/README.md) - Command-line tool documentation
- [Troubleshooting](../../troubleshooting/common-issues.md) - Solve common problems

## Related Guides

- **[Validation](../validation/README.md)**: Understanding and working with validation rules
- **[Government Cloud](../government-cloud/README.md)**: Azure Government-specific considerations
- **[Tutorials](../tutorials/README.md)**: Step-by-step learning paths

---

**Next Steps**: Choose a workflow guide above that matches your current needs, or continue to [Adding Resources](./adding-resources.md) for the most common starting point.
