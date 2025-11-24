# Getting Started with Atakora

[Home](../README.md) > Getting Started

Welcome to Atakora! This section will guide you through your journey from installation to deploying production-ready Azure infrastructure.

## 🚀 Quick Start Path

New to Atakora? Follow these guides in order:

### [1. Installation](./001-INSTALLATION.md)
**Time: 5 minutes**

Get Atakora installed and configured on your machine.
- Install the CLI and prerequisites
- Configure Azure credentials
- Set up your development environment
- Verify everything works

### [2. Quickstart](./002-QUICKSTART.md)
**Time: 5 minutes**

Deploy your first infrastructure to Azure.
- Create a new project
- Write basic infrastructure code
- Deploy a storage account
- Clean up resources

### [3. Your First Stack](./003-YOUR-FIRST-STACK.md)
**Time: 20 minutes**

Build a complete infrastructure stack.
- Understand Apps, Stacks, and Resources
- Create networking and storage layers
- Learn dependency management
- Apply best practices

### [4. Azure Functions App](./004-FUNCTIONS-APP.md)
**Time: 30 minutes**

Master serverless with Azure Functions.
- Deploy Functions Apps with auto-storage
- Choose the right hosting plan
- Configure monitoring
- Implement security

### [5. Next Steps](./005-NEXT-STEPS.md)
**Time: 5 minutes**

Discover your learning path forward.
- Essential workflows and patterns
- Real-world tutorials
- Advanced topics
- Community resources

## 📚 Learning Approach

### For Beginners
Start with guides 1-3 to understand the fundamentals. Take your time with "Your First Stack" - it introduces crucial concepts you'll use everywhere.

### For Experienced Developers
If you're familiar with infrastructure-as-code, you can jump to the [Quickstart](./002-QUICKSTART.md) and then explore specific topics in [Next Steps](./005-NEXT-STEPS.md).

### For Teams
Review the [Installation](./001-INSTALLATION.md) guide together, then have each member complete the [Quickstart](./002-QUICKSTART.md). Use [Your First Stack](./003-YOUR-FIRST-STACK.md) as a reference architecture.

## 🎯 By Use Case

### "I need to deploy a web application"
1. Complete [Installation](./001-INSTALLATION.md) and [Quickstart](./002-QUICKSTART.md)
2. Follow [Web App with Database Tutorial](../guides/tutorials/Web-App-With-Database.md)
3. Review [Production Best Practices](../guides/patterns/backend/Best-Practices.md)

### "I want to build serverless APIs"
1. Complete [Installation](./001-INSTALLATION.md) and [Quickstart](./002-QUICKSTART.md)
2. Deep dive into [Azure Functions App](./004-FUNCTIONS-APP.md)
3. Explore [REST API Examples](../examples/002-REST-API.md)

### "I'm migrating existing infrastructure"
1. Review all Getting Started guides for Atakora patterns
2. Study [Migration Guide](../guides/migration/README.md)
3. Check [Government Cloud](../guides/tutorials/Government-Cloud-Deployment.md) if applicable

### "I need enterprise compliance"
1. Complete the basic guides first
2. Review [Networking Security](../guides/patterns/Networking-Security.md)
3. Study [Government Cloud Deployment](../guides/tutorials/Government-Cloud-Deployment.md)

## ✅ Prerequisites Check

Before starting, ensure you have:

### Required
- [ ] Node.js 18+ installed ([Download](https://nodejs.org/))
- [ ] Azure CLI installed ([Install Guide](https://docs.microsoft.com/cli/azure/install-azure-cli))
- [ ] Active Azure subscription ([Free Trial](https://azure.microsoft.com/free/))
- [ ] Basic TypeScript knowledge

### Recommended
- [ ] Visual Studio Code ([Download](https://code.visualstudio.com/))
- [ ] Git for version control
- [ ] Azure VS Code extensions
- [ ] Basic Azure knowledge

## 📖 Additional Resources

### Quick References
- [CLI Commands](../reference/cli/README.md) - Complete command reference
- [API Documentation](../reference/api/core/README.md) - Detailed API docs
- [Examples](../examples/README.md) - Working code samples

### When You Need Help
- [Common Issues](../troubleshooting/COMMON-ISSUES.md) - Frequent problems and solutions
- [CLI Troubleshooting](../troubleshooting/CLI-TROUBLESHOOTING.md) - CLI-specific issues
- [Deployment Failures](../troubleshooting/DEPLOYMENT-FAILURES.md) - Debug failed deployments

### Going Deeper
- [Architecture Patterns](../guides/patterns/README.md) - Production patterns
- [Validation Guide](../guides/validation/README.md) - Resource validation
- [Contributing](../contributing/README.md) - Help improve Atakora

## 💡 Tips for Success

### Start Small
Begin with simple stacks and gradually add complexity. The [Quickstart](./002-QUICKSTART.md) intentionally keeps things minimal.

### Use Version Control
```bash
git init
git add .
git commit -m "Initial infrastructure"
```

### Follow Naming Conventions
Consistent naming makes resources easier to manage:
- Resource Groups: `rg-{app}-{env}-{region}`
- Storage Accounts: `st{app}{env}{unique}`
- Functions Apps: `func-{app}-{env}`

### Tag Everything
```typescript
const commonTags = {
  environment: 'production',
  owner: 'platform-team',
  costCenter: 'engineering'
};
```

### Test in Development First
Always deploy to a development environment before production:
```bash
ENVIRONMENT=dev atakora deploy
# Test thoroughly
ENVIRONMENT=prod atakora deploy
```

## 🎓 What You'll Achieve

By completing these getting started guides, you'll be able to:

- ✅ Create and structure Atakora projects
- ✅ Define infrastructure using TypeScript
- ✅ Deploy resources to Azure confidently
- ✅ Implement security best practices
- ✅ Monitor and debug deployments
- ✅ Build production-ready infrastructure

## 🚦 Ready to Begin?

Start your Atakora journey with the **[Installation Guide](./001-INSTALLATION.md)**!

Remember: Every Azure expert started exactly where you are now. Take it step by step, and you'll be deploying production infrastructure in no time.

---

**Questions before starting?** Check our [FAQ](../troubleshooting/COMMON-ISSUES.md) or browse the [complete documentation](../README.md).