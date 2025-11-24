# Atakora Examples

[Home](../README.md) > Examples

Complete, working examples to accelerate your Azure infrastructure development.

## 📚 Example Categories

### Basic Examples
Start here if you're new to Atakora or want to understand fundamental patterns.

#### [Basic Web App](./Basic-Web-App.md)
Simple web application with App Service
- Basic App Service deployment
- Application settings
- Custom domains
- SSL certificates

#### [Basic Functions](./Basic-Functions.md)
Serverless functions for APIs and automation
- HTTP triggered functions
- Timer triggered functions
- Queue triggered functions
- Function app configuration

#### [Static Website](./Static-Website.md)
CDN-backed static website hosting
- Storage account static website
- Azure CDN integration
- Custom domain setup
- HTTPS configuration

### Intermediate Examples
Build on the basics with more sophisticated patterns.

#### [REST API](./REST-API.md)
Complete REST API with OpenAPI integration
- API Management setup
- OpenAPI specification
- Authentication
- Rate limiting

#### [Web App with Database](./Web-App-Database.md)
Full-stack application example
- Azure SQL Database
- App Service web app
- Connection string management
- Database migrations

#### [Microservices](./Microservices.md)
Service-oriented architecture
- Multiple Function Apps
- Service Bus messaging
- API Gateway
- Service discovery

### Advanced Examples
Production-ready, enterprise-scale examples.

#### [Multi-Region Setup](./Multi-Region.md)
Globally distributed infrastructure
- Traffic Manager
- Region failover
- Data replication
- Geo-redundancy

#### [Enterprise Platform](./Enterprise-Platform.md)
Multi-tenant SaaS infrastructure
- Tenant isolation
- RBAC implementation
- Cost allocation
- Monitoring

#### [Data Pipeline](./Data-Pipeline.md)
ETL and data processing
- Data Factory
- Databricks
- Event Hubs
- Stream Analytics

## 🔧 By Azure Service

### Compute
- [Virtual Machines](./services/Virtual-Machines.md)
- [Container Instances](./services/Container-Instances.md)
- [Kubernetes Service](./services/AKS.md)
- [Batch Processing](./services/Batch.md)

### Storage
- [Blob Storage](./services/Blob-Storage.md)
- [File Shares](./services/File-Shares.md)
- [Queue Storage](./services/Queue-Storage.md)
- [Table Storage](./services/Table-Storage.md)

### Databases
- [Cosmos DB](./services/Cosmos-DB.md)
- [Azure SQL](./services/Azure-SQL.md)
- [PostgreSQL](./services/PostgreSQL.md)
- [Redis Cache](./services/Redis-Cache.md)

### Networking
- [Virtual Networks](./services/Virtual-Networks.md)
- [Load Balancers](./services/Load-Balancers.md)
- [Application Gateway](./services/Application-Gateway.md)
- [VPN Gateway](./services/VPN-Gateway.md)

### Integration
- [Service Bus](./services/Service-Bus.md)
- [Event Grid](./services/Event-Grid.md)
- [Logic Apps](./services/Logic-Apps.md)
- [API Management](./services/API-Management.md)

## 🏭 By Industry/Compliance

### [Healthcare - HIPAA Compliant](./compliance/Healthcare-HIPAA.md)
- PHI data protection
- Audit logging
- Encryption at rest and in transit
- Access controls

### [Financial Services - PCI DSS](./compliance/Financial-PCI.md)
- Network segmentation
- Key management
- Security monitoring
- Compliance reporting

### [Government - FedRAMP](./compliance/Government-FedRAMP.md)
- Azure Government Cloud
- Security controls
- Continuous monitoring
- Authorization boundaries

## 🎯 By Use Case

### E-Commerce
- [Online Store](./use-cases/Online-Store.md)
- [Inventory Management](./use-cases/Inventory-Management.md)
- [Payment Processing](./use-cases/Payment-Processing.md)

### IoT
- [Device Management](./use-cases/IoT-Device-Management.md)
- [Telemetry Processing](./use-cases/IoT-Telemetry.md)
- [Edge Computing](./use-cases/IoT-Edge.md)

### Machine Learning
- [ML Training Pipeline](./use-cases/ML-Training.md)
- [Model Serving](./use-cases/ML-Serving.md)
- [Batch Inference](./use-cases/ML-Batch-Inference.md)

## 💡 How to Use These Examples

### 1. Choose Your Example
Browse the categories above and find an example that matches your use case.

### 2. Copy the Code
Each example includes complete, working code that you can copy into your project.

### 3. Customize
Modify the example to fit your specific requirements:
- Change resource names
- Adjust configurations
- Add or remove features

### 4. Deploy
```bash
# Synthesize the ARM templates
atakora synth

# Deploy to Azure
atakora deploy
```

## 📝 Example Structure

Each example follows this structure:

```markdown
# Example Name

## Overview
Brief description of what this example demonstrates

## Architecture
Diagram or description of the infrastructure

## Prerequisites
- Required Azure services
- Necessary configurations
- Dependencies

## Code
Complete, working TypeScript code

## Deployment
Step-by-step deployment instructions

## Testing
How to verify the deployment works

## Cost Estimate
Approximate Azure costs

## Clean Up
How to remove all resources

## Variations
Alternative approaches or configurations
```

## 🚀 Quick Start Examples

### Minimal Web App (5 lines)
```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { WebApp } from '@atakora/cdk/web';

const app = new App();
const stack = new Stack(app, 'quick-web');
const rg = new ResourceGroup(stack, 'rg', { name: 'rg-quick', location: 'eastus' });
const web = new WebApp(stack, 'web', { resourceGroupName: rg.name, siteName: 'quick-web-app', location: 'eastus' });
app.synth();
```

### Minimal Storage (5 lines)
```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { StorageAccount } from '@atakora/cdk/storage';

const app = new App();
const stack = new Stack(app, 'quick-storage');
const rg = new ResourceGroup(stack, 'rg', { name: 'rg-storage', location: 'eastus' });
const storage = new StorageAccount(stack, 'storage', { resourceGroupName: rg.name, accountName: 'stquick' + Date.now(), location: 'eastus' });
app.synth();
```

### Minimal Function App (5 lines)
```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { FunctionApp } from '@atakora/cdk/web';

const app = new App();
const stack = new Stack(app, 'quick-func');
const rg = new ResourceGroup(stack, 'rg', { name: 'rg-func', location: 'eastus' });
const func = new FunctionApp(stack, 'func', { resourceGroupName: rg.name, functionAppName: 'func-quick', location: 'eastus', runtime: 'node', runtimeVersion: '18' });
app.synth();
```

## 🔍 Finding the Right Example

### By Complexity
- **Beginner**: Start with Basic Examples
- **Intermediate**: Try service integration examples
- **Advanced**: Explore multi-region and enterprise patterns

### By Timeline
- **Proof of Concept**: Use minimal examples
- **Development**: Start with intermediate examples
- **Production**: Reference advanced examples and compliance guides

### By Budget
- **Low Cost**: Serverless and consumption-based examples
- **Medium Cost**: Standard tier services
- **Enterprise**: Premium services with high availability

## 📚 Learning Path

1. **Start**: [Basic Web App](./Basic-Web-App.md) or [Basic Functions](./Basic-Functions.md)
2. **Add Data**: [Web App with Database](./Web-App-Database.md)
3. **Scale**: [Microservices](./Microservices.md) or [Multi-Region](./Multi-Region.md)
4. **Optimize**: Review best practices in advanced examples

## 🤝 Contributing Examples

Have a great example? We'd love to include it!

1. Follow the example structure above
2. Include complete, working code
3. Add clear documentation
4. Test the deployment
5. Submit a PR

See [Contributing Guide](../contributing/README.md) for details.

## ⚠️ Important Notes

- **Costs**: These examples will create real Azure resources that incur costs
- **Regions**: Examples use `eastus` by default - change to your preferred region
- **Naming**: Resource names may need to be unique - add timestamps or random suffixes
- **Clean Up**: Always run `atakora destroy` when done to avoid ongoing charges

## 🔗 Additional Resources

- [Getting Started Guide](../getting-started/README.md)
- [API Reference](../reference/api/README.md)
- [Best Practices](../guides/patterns/backend/Best-Practices.md)
- [Troubleshooting](../troubleshooting/README.md)

---

**Ready to explore?** Pick an example above and start building!