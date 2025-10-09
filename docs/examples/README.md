# Examples

**Navigation**: [Docs Home](../README.md) > Examples

---

## Overview

Complete, working examples of Atakora infrastructure projects. Each example includes full source code, documentation, and deployment instructions.

## Available Examples

### [Simple Web App](./simple-web-app/README.md)

Basic web application infrastructure with:
- App Service Plan
- Web App
- SQL Database
- Application Insights

**Use Case**: Getting started with Atakora

**Complexity**: Beginner

### [Multi-Region App](./multi-region-app/README.md)

Multi-region deployment with:
- Regional infrastructure
- Traffic Manager
- Geo-replicated storage
- Failover configuration

**Use Case**: High availability applications

**Complexity**: Intermediate

### [Government Cloud](./government-cloud/README.md)

Azure Government Cloud deployment with:
- Gov Cloud-specific configuration
- Compliance-focused security
- Government region selection
- Special networking requirements

**Use Case**: Government and regulated industries

**Complexity**: Intermediate

## Running Examples

### Clone Repository

```bash
git clone https://github.com/Digital-Minion/atakora.git
cd atakora/docs/examples
```

### Choose Example

```bash
cd simple-web-app
npm install
```

### Configure Azure

```bash
atakora config set-credentials
```

### Synthesize

```bash
atakora synth
```

### Deploy

```bash
atakora deploy
```

## Example Structure

Each example follows this structure:

```
example-name/
├── README.md          # Example documentation
├── package.json       # Dependencies
├── bin/
│   └── app.ts        # Infrastructure code
└── .env.example      # Environment variables template
```

## Learning Path

1. **Start with**: [Simple Web App](./simple-web-app/README.md)
2. **Then try**: [Multi-Region App](./multi-region-app/README.md)
3. **Advanced**: [Government Cloud](./government-cloud/README.md)

## See Also

- [Getting Started Guide](../getting-started/README.md)
- [Tutorials](../guides/tutorials/README.md)
- [API Reference](../reference/api/README.md)

---

**Last Updated**: 2025-10-08
