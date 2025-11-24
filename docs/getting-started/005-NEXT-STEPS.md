# Next Steps

[Home](../README.md) > [Getting Started](./README.md) > Next Steps

Congratulations on completing the getting started guides! Here's your path forward to mastering Atakora.

## What You've Accomplished

✅ Installed Atakora and configured Azure credentials
✅ Deployed your first infrastructure stack
✅ Learned Apps, Stacks, and Resources
✅ Built production-ready Functions Apps
✅ Understood deployment workflows

## Recommended Learning Path

### 1. Essential Workflows (Start Here)

These guides cover day-to-day tasks you'll use constantly:

#### **[Managing Multiple Environments](../guides/workflows/Deploying-Environments.md)** - 15 minutes
Learn to manage dev, staging, and production environments efficiently.
- Environment-specific configuration
- Stack parameters and outputs
- Deployment strategies

#### **[Organizing Large Projects](../guides/workflows/Organizing-Projects.md)** - 20 minutes
Structure your infrastructure code for maintainability.
- Multi-stack architectures
- Shared resources patterns
- Module organization

#### **[Managing Secrets](../guides/workflows/Managing-Secrets.md)** - 15 minutes
Handle sensitive data securely across environments.
- Azure Key Vault integration
- Environment variables best practices
- Secret rotation strategies

### 2. Real-World Tutorials

Build complete, production-ready applications:

#### **[Web App with Database](../guides/tutorials/Web-App-With-Database.md)** - 45 minutes
Full-stack application with:
- Azure App Service web app
- Azure SQL or Cosmos DB
- Secure networking
- Application Insights monitoring

#### **[Multi-Region Setup](../guides/tutorials/Multi-Region-Setup.md)** - 60 minutes
Build globally distributed infrastructure:
- Traffic Manager for routing
- Region-specific stacks
- Data replication strategies
- Disaster recovery planning

#### **[CI/CD Pipeline](../guides/tutorials/CI-CD-Pipeline.md)** - 45 minutes
Automate your infrastructure deployments:
- GitHub Actions or Azure DevOps setup
- Automated testing
- Environment promotions
- Rollback strategies

#### **[Government Cloud Deployment](../guides/tutorials/Government-Cloud-Deployment.md)** - 30 minutes
Deploy to Azure Government Cloud:
- Compliance requirements
- Region limitations
- Service availability differences
- Security considerations

### 3. Advanced Patterns

Master sophisticated infrastructure patterns:

#### **[Backend Patterns](../guides/patterns/backend/Overview.md)**
Build backend services with:
- API design patterns
- Microservices architecture
- Event-driven systems
- CQRS implementations

#### **[Networking Security](../guides/patterns/Networking-Security.md)**
Implement enterprise-grade security:
- Network segmentation
- Private endpoints
- Service endpoints
- Network security groups
- Azure Firewall

#### **[High Availability](../guides/patterns/High-Availability.md)**
Design resilient systems:
- Availability zones
- Load balancing
- Auto-scaling
- Health probes
- Backup strategies

### 4. Deep Dives by Service

Explore specific Azure services in depth:

#### Storage Services
- **[Storage Accounts](../guides/Storage-Accounts.md)** - Blobs, files, queues, tables
- **[Managed Disks](../guides/Managed-Disks.md)** - VM storage optimization
- **[Azure Files](../guides/Azure-Files.md)** - Shared file systems

#### Compute Services
- **[Virtual Machines](../guides/Virtual-Machines.md)** - IaaS deployments
- **[Container Instances](../guides/Container-Instances.md)** - Serverless containers
- **[Kubernetes Service](../guides/AKS.md)** - Managed Kubernetes

#### Data Services
- **[Cosmos DB](../guides/Cosmos-DB.md)** - Globally distributed database
- **[Azure SQL](../guides/Azure-SQL.md)** - Managed SQL Server
- **[PostgreSQL](../guides/PostgreSQL.md)** - Managed PostgreSQL

#### Integration Services
- **[Service Bus](../guides/Service-Bus.md)** - Enterprise messaging
- **[Event Grid](../guides/Event-Grid.md)** - Event routing
- **[Logic Apps](../guides/Logic-Apps.md)** - Workflow automation

### 5. Reference Documentation

Keep these handy for daily work:

#### Command Reference
- **[CLI Commands](../reference/cli/README.md)** - Complete command reference
- **[Configuration](../reference/cli/Config.md)** - CLI configuration options
- **[Troubleshooting CLI](../troubleshooting/CLI-TROUBLESHOOTING.md)** - Common CLI issues

#### API Reference
- **[Core API](../reference/api/core/README.md)** - App, Stack, Resource APIs
- **[CDK Constructs](../reference/api/cdk/README.md)** - All available constructs
- **[Validation Rules](../reference/Validation-Rules.md)** - Resource validation

#### Best Practices
- **[Naming Conventions](../reference/Naming-Conventions.md)** - Consistent resource naming
- **[Tagging Strategy](../guides/Tagging-Strategy.md)** - Resource organization
- **[Cost Optimization](../guides/Cost-Optimization.md)** - Managing Azure costs

## Example Projects

Learn from complete, working examples:

### By Complexity

#### Beginner
- **[Basic Functions](../examples/001-BASIC-FUNCTIONS.md)** - Serverless APIs
- **[REST API](../examples/002-REST-API.md)** - RESTful API examples

#### Note
Additional example projects are being developed. Check the [examples directory](../examples/) for the latest available examples.

## Contributing to Atakora

Help improve Atakora for everyone:

### Getting Involved
- **[Contributing Guide](../contributing/README.md)** - How to contribute
- **[Development Setup](../contributing/Development-Setup.md)** - Set up dev environment
- **[Testing Guide](../contributing/Testing-Guide.md)** - Write and run tests

### Types of Contributions
- **Report Bugs** - File issues on GitHub
- **Request Features** - Suggest improvements
- **Submit PRs** - Fix bugs or add features
- **Improve Docs** - Help others learn

## Getting Help

### When You're Stuck

1. **Check Documentation**
   - Search this documentation
   - Review relevant examples
   - Check troubleshooting guides

2. **Debug Systematically**
   ```bash
   # Validate your templates
   atakora validate

   # Check detailed synthesis output
   atakora synth --verbose

   # Review Azure activity logs
   az monitor activity-log list --resource-group <rg-name>
   ```

3. **Common Issues**
   - [Deployment Failures](../troubleshooting/DEPLOYMENT-FAILURES.md)
   - [Synthesis Errors](../troubleshooting/DEBUGGING-SYNTHESIS.md)
   - [Validation Errors](../guides/validation/Common-Errors.md)

### Community Resources

- **GitHub Issues** - Report bugs and request features
- **Discussions** - Ask questions and share ideas
- **Stack Overflow** - Tag questions with `atakora`
- **Azure Community** - Azure-specific help

## Certification Path

Enhance your Azure infrastructure skills:

1. **Azure Fundamentals (AZ-900)** - Azure basics
2. **Azure Administrator (AZ-104)** - Managing Azure resources
3. **Azure Developer (AZ-204)** - Building Azure solutions
4. **Azure Solutions Architect (AZ-305)** - Designing infrastructure
5. **Azure DevOps Engineer (AZ-400)** - Implementing DevOps

## Stay Updated

Keep up with Atakora developments:

- **[Changelog](../CHANGELOG.md)** - Latest updates
- **[Roadmap](../ROADMAP.md)** - Upcoming features
- **[Blog](https://blog.atakora.com)** - Tips and tutorials
- **[Newsletter](https://atakora.com/newsletter)** - Monthly updates

## Quick Reference Card

### Essential Commands

```bash
# Project Management
atakora init                 # Create new project
atakora add resource         # Add resource interactively

# Development Workflow
atakora synth                # Generate ARM templates
atakora diff                 # Preview changes
atakora validate             # Validate templates

# Deployment
atakora deploy               # Deploy stack
atakora destroy              # Remove stack
atakora deploy --auto-approve # Skip confirmation

# Debugging
atakora synth --verbose      # Detailed output
atakora doctor               # Check environment
atakora logs                 # View deployment logs
```

### Project Structure

```
my-infrastructure/
├── src/
│   ├── index.ts            # Main app file
│   ├── stacks/             # Stack definitions
│   ├── constructs/         # Reusable constructs
│   └── config/             # Configuration
├── test/                   # Tests
├── arm.out/                # Generated ARM templates
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
└── atakora.config.js       # Atakora config
```

### Resource Naming

```typescript
// Consistent naming pattern
const naming = {
  resourceGroup: `rg-${app}-${env}-${region}`,
  storageAccount: `st${app}${env}${unique}`,
  virtualNetwork: `vnet-${app}-${env}`,
  subnet: `snet-${tier}-${app}-${env}`,
  vm: `vm-${app}-${role}-${index}`,
  functionApp: `func-${app}-${env}`,
  webApp: `app-${app}-${env}`,
  sqlServer: `sql-${app}-${env}`,
  keyVault: `kv-${app}-${env}`
};
```

## Your Journey Continues

You now have a solid foundation in Atakora. The path forward depends on your goals:

- **Building a startup?** Focus on the web app tutorials and cost optimization
- **Enterprise migration?** Study multi-environment workflows and compliance patterns
- **Learning Azure?** Work through examples and get Azure certified
- **Contributing?** Start with documentation improvements or bug fixes

Remember: Infrastructure as code is a journey, not a destination. Each project teaches you something new.

---

**Ready for the next challenge?** Pick a tutorial from above and start building!

**Need guidance?** Check the [FAQ](../troubleshooting/COMMON-ISSUES.md) or [reach out to the community](#community-resources)