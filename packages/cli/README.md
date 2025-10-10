# @atakora/cli

Command-line interface for Atakora - the type-safe Infrastructure as Code framework for Azure.

## Overview

The `@atakora/cli` package provides command-line tools for:

- Scaffolding new Atakora projects
- Synthesizing ARM templates from TypeScript
- Deploying infrastructure to Azure
- Managing multi-package workspaces
- Validating infrastructure code

## Installation

```bash
# Install globally
npm install -g @atakora/cli

# Or use with npx
npx @atakora/cli <command>
```

## Quick Start

```bash
# Create a new project
atakora init my-azure-project

# Navigate to the project
cd my-azure-project

# Synthesize ARM templates
atakora synth

# Deploy to Azure
atakora deploy
```

## Available Commands

### Project Management

```bash
# Initialize a new Atakora project
atakora init <project-name>

# Add a new package to workspace
atakora add <package-name>
```

### Infrastructure Operations

```bash
# Synthesize ARM templates
atakora synth [package]

# Deploy infrastructure
atakora deploy [package]

# Validate infrastructure
atakora validate [package]

# Destroy infrastructure
atakora destroy [package]
```

### Utility Commands

```bash
# List all packages
atakora list

# Show project information
atakora info

# Display help
atakora help [command]
```

## Documentation

For complete documentation, see:

- [CLI Reference](../../docs/reference/cli/)
- [Getting Started Guide](../../docs/usage/getting-started/)
- [Deployment Guide](../../docs/usage/guides/deployment.md)
- [Multi-Package Workspaces](../../docs/usage/guides/multi-package-workspaces.md)

## Project Templates

The CLI includes project templates for quick scaffolding:

- Root workspace configuration
- Package structure
- TypeScript configuration
- Example infrastructure code
- Git ignore patterns

See [CLI Templates Reference](../../docs/reference/cli-templates.md) for details.

## Requirements

- Node.js 14.0.0 or higher
- npm 7.0.0 or higher
- Azure CLI (for deployment commands)

## License

ISC
