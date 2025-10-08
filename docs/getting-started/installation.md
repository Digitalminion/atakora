# Installation

[Home](../README.md) > [Getting Started](./README.md) > Installation

Learn how to install the Atakora CLI and set up your development environment for TypeScript-first infrastructure-as-code.

## Prerequisites

Before installing Atakora, ensure you have the following:

### Required

**Node.js 18 or higher**

Atakora requires Node.js v18 or later. Check your version:

```bash
node --version
```

If you need to install or upgrade Node.js:
- **Download**: https://nodejs.org/
- **Recommended**: Use [nvm](https://github.com/nvm-sh/nvm) (Linux/macOS) or [nvm-windows](https://github.com/coreybutler/nvm-windows) for version management

**Azure CLI**

The Azure CLI is required for deploying infrastructure to Azure. Check if it's installed:

```bash
az --version
```

If not installed:
- **Download**: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
- **Verify**: Run `az login` to authenticate

**Azure Subscription**

You'll need an active Azure subscription. If you don't have one:
- **Free tier**: https://azure.microsoft.com/en-us/free/
- **Check subscriptions**: `az account list --output table`

### Optional but Recommended

**Visual Studio Code**

VS Code provides excellent TypeScript support with IntelliSense and debugging:
- **Download**: https://code.visualstudio.com/
- **Extensions**: Install the TypeScript and Azure extensions

**Git**

Version control for your infrastructure code:
- **Download**: https://git-scm.com/downloads

**TypeScript (global installation)**

While not required (Atakora projects include TypeScript as a dependency), a global installation can be helpful:

```bash
npm install -g typescript
```

## Installation Methods

### Method 1: Global Installation (Recommended)

Install the Atakora CLI globally to use it from anywhere:

```bash
npm install -g @atakora/cli @atakora/lib
```

**Verify installation:**

```bash
atakora --version
```

You should see output like:
```
@atakora/cli/1.0.0
```

**Benefits:**
- Simple `atakora` command available everywhere
- No need to prefix commands with `npx`
- Faster execution (no package resolution needed)

### Method 2: Using npx (No Installation)

Use Atakora without installing it globally:

```bash
npx @atakora/cli init
```

**Benefits:**
- No global installation required
- Always uses the latest version
- Good for one-off project creation

**Note**: Each command will download the package if not cached, making it slightly slower than global installation.

### Method 3: Project-Local Installation

Install Atakora as a project dependency:

```bash
npm install --save-dev @atakora/cli @atakora/lib
```

**Run commands via npm scripts:**

```json
{
  "scripts": {
    "atakora": "atakora"
  }
}
```

```bash
npm run atakora -- init
```

**Benefits:**
- Version locked to your project
- Ensures team uses same CLI version
- Avoids global package conflicts

## Verify Installation

After installation, verify everything is set up correctly:

### Check Atakora Version

```bash
atakora --version
```

Expected output:
```
@atakora/cli/1.0.0
```

### Check Node.js Version

```bash
node --version
```

Expected output (or higher):
```
v18.0.0
```

### Check Azure CLI

```bash
az --version
```

Expected output (any recent version):
```
azure-cli                         2.50.0
```

### Verify Azure Authentication

```bash
az account show
```

Expected output: Your current Azure subscription details

If not authenticated:
```bash
az login
```

## Environment Setup

### Configure Azure Authentication

Authenticate with Azure using the Azure CLI:

```bash
az login
```

This opens a browser window for authentication. Once complete, you'll see your available subscriptions.

**Select a default subscription:**

```bash
az account set --subscription "your-subscription-id"
```

**Verify the active subscription:**

```bash
az account show --query "{Name:name, ID:id}" --output table
```

### Set Environment Variables

Atakora projects often use environment variables for configuration. Set up a few common ones:

**Linux/macOS:**

```bash
export AZURE_SUBSCRIPTION_ID=$(az account show --query id --output tsv)
export AZURE_LOCATION="eastus2"
```

Add to `~/.bashrc` or `~/.zshrc` to persist across sessions.

**Windows PowerShell:**

```powershell
$env:AZURE_SUBSCRIPTION_ID = (az account show --query id --output tsv)
$env:AZURE_LOCATION = "eastus2"
```

Add to PowerShell profile to persist: `notepad $PROFILE`

**Windows Command Prompt:**

```cmd
for /f "delims=" %i in ('az account show --query id --output tsv') do set AZURE_SUBSCRIPTION_ID=%i
set AZURE_LOCATION=eastus2
```

### Optional: Configure for Government Cloud

If using Azure Government Cloud, configure the Azure CLI:

```bash
az cloud set --name AzureUSGovernment
az login
```

**Set Government Cloud environment variable:**

```bash
export AZURE_ENVIRONMENT="AzureUSGovernment"
```

See [Government Cloud Deployment Guide](../guides/tutorials/government-cloud-deployment.md) for details.

## IDE Setup (VS Code)

Enhance your development experience with VS Code:

### Install Recommended Extensions

1. **TypeScript and JavaScript Language Features** (built-in)
2. **Azure Account** - Manage Azure resources
   ```
   ext install ms-vscode.azure-account
   ```
3. **Azure Resources** - View and manage Azure resources
   ```
   ext install ms-azuretools.vscode-azureresourcegroups
   ```
4. **Prettier** - Code formatting
   ```
   ext install esbenp.prettier-vscode
   ```

### Configure VS Code Settings

Create or update `.vscode/settings.json` in your project:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
      "source.organizeImports": "explicit"
    }
  }
}
```

### Enable IntelliSense

IntelliSense provides autocomplete, parameter info, and inline documentation while writing infrastructure code.

**Verify IntelliSense is working:**

1. Open a TypeScript file (`*.ts`)
2. Start typing: `import { Azure`
3. You should see autocomplete suggestions with documentation

## Troubleshooting

### Command Not Found: atakora

**Problem**: Shell doesn't recognize `atakora` command

**Solution**:

1. Verify global installation:
   ```bash
   npm list -g @atakora/cli
   ```

2. Check npm global bin path is in PATH:
   ```bash
   npm config get prefix
   ```

3. Add npm global bin to PATH:
   - **Linux/macOS**: Add to `~/.bashrc` or `~/.zshrc`:
     ```bash
     export PATH="$(npm config get prefix)/bin:$PATH"
     ```
   - **Windows**: Add `%APPDATA%\npm` to system PATH

4. Restart terminal and try again

### Permission Errors on Linux/macOS

**Problem**: `EACCES` errors when installing globally

**Solution**: Configure npm to use a different directory:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

Now install again:
```bash
npm install -g @atakora/cli @atakora/lib
```

### Azure CLI Not Found

**Problem**: `az` command not found

**Solution**:

1. Install Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
2. Restart terminal
3. Verify: `az --version`

### Azure Authentication Fails

**Problem**: Cannot authenticate with Azure

**Solution**:

1. Clear cached credentials:
   ```bash
   az account clear
   ```

2. Login again:
   ```bash
   az login
   ```

3. If using Government Cloud:
   ```bash
   az cloud set --name AzureUSGovernment
   az login
   ```

### Node.js Version Too Old

**Problem**: Atakora requires Node.js 18+

**Solution**:

1. Install nvm (Node Version Manager):
   - **Linux/macOS**: https://github.com/nvm-sh/nvm
   - **Windows**: https://github.com/coreybutler/nvm-windows

2. Install Node.js 18:
   ```bash
   nvm install 18
   nvm use 18
   ```

3. Verify:
   ```bash
   node --version
   ```

## Next Steps

Now that Atakora is installed, you're ready to create your first project!

**Continue to**: [5-Minute Quickstart](./quickstart.md)

Or explore:
- [CLI Commands Reference](../reference/cli/README.md) - Learn all available commands
- [Your First Stack Tutorial](./your-first-stack.md) - Detailed walkthrough
- [Project Structure](../guides/fundamentals/app-and-stacks.md) - Understand Atakora projects

## Need Help?

- Check [Common Issues](../troubleshooting/common-issues.md)
- See [Error Codes](../reference/error-codes.md)
- Review [CLI Commands](../reference/cli/README.md)

---

**Previous**: [Getting Started Home](./README.md) | **Next**: [5-Minute Quickstart](./quickstart.md)
