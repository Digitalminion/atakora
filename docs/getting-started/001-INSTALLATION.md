# Installation

[Home](../README.md) > [Getting Started](./README.md) > Installation

Get Atakora up and running on your development machine in minutes.

## Prerequisites

Before installing Atakora, ensure you have:

### Required

- **Node.js 18.0 or higher** - [Download](https://nodejs.org/)
- **Azure CLI** - [Installation guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- **Azure Subscription** - [Free account](https://azure.microsoft.com/free/)

### Recommended

- **Visual Studio Code** - [Download](https://code.visualstudio.com/)
- **Azure Extensions for VS Code** - Better IntelliSense and debugging
- **Git** - Version control for your infrastructure code

## Install Atakora CLI

Install the Atakora CLI globally using npm:

```bash
npm install -g @atakora/cli
```

Or using yarn:

```bash
yarn global add @atakora/cli
```

## Verify Installation

Check that Atakora is installed correctly:

```bash
atakora --version
```

You should see output like:

```
@atakora/cli v1.0.0
```

## Configure Azure Credentials

Atakora needs access to your Azure subscription to deploy resources.

### Option 1: Azure CLI Authentication (Recommended)

```bash
# Login to Azure
az login

# Set your default subscription
az account set --subscription "Your Subscription Name"

# Verify you're using the correct subscription
az account show
```

### Option 2: Service Principal

For CI/CD or automated deployments:

```bash
# Create a service principal
az ad sp create-for-rbac --name "atakora-sp" --role contributor \
    --scopes /subscriptions/{subscription-id}

# Configure Atakora to use the service principal
atakora config set-credentials
```

## Development Environment Setup

### VS Code Extensions

Install these extensions for the best development experience:

```bash
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension ms-azuretools.vscode-azureresourcegroups
code --install-extension ms-azuretools.vscode-azurefunctions
```

### TypeScript Configuration

Atakora projects use TypeScript by default. Ensure you have TypeScript installed:

```bash
npm install -g typescript
```

## Azure Government Cloud

If you're using Azure Government Cloud:

```bash
# Set Azure CLI to use Government Cloud
az cloud set --name AzureUSGovernment

# Login
az login

# Configure Atakora for Government Cloud
atakora config set-cloud AzureUSGovernment
```

## Troubleshooting Installation

### Common Issues

**Issue: Command not found after installation**

Solution: Ensure npm's global bin directory is in your PATH:

```bash
# Find npm global bin directory
npm config get prefix

# Add to PATH (bash/zsh)
export PATH=$PATH:$(npm config get prefix)/bin
```

**Issue: Permission denied during installation**

Solution: Use a Node version manager or fix npm permissions:

```bash
# Option 1: Use npx instead of global install
npx @atakora/cli <command>

# Option 2: Fix npm permissions
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

**Issue: Azure CLI not found**

Solution: Install Azure CLI for your platform:

- **macOS**: `brew install azure-cli`
- **Windows**: Download from [Azure CLI installer](https://aka.ms/installazurecliwindows)
- **Linux**: Follow [distribution-specific instructions](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-linux)

## Next Steps

Installation complete! Now you're ready to:

- **[Create Your First Project](./002-QUICKSTART.md)** - Deploy infrastructure in 5 minutes
- **[Build Your First Stack](./003-YOUR-FIRST-STACK.md)** - Learn core concepts
- **[Explore Examples](../examples/README.md)** - See what's possible

---

**Having issues?** Check the [Troubleshooting Guide](../troubleshooting/COMMON-ISSUES.md) or [CLI Troubleshooting](../troubleshooting/CLI-TROUBLESHOOTING.md)