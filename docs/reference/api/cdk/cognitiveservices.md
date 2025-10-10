# Cognitive Services Resources API (@atakora/cdk/cognitiveservices)

**Navigation**: [Docs Home](../../../README.md) > [Reference](../../README.md) > [API Reference](../README.md) > Cognitive Services

---

## Overview

The cognitiveservices namespace provides constructs for Azure Cognitive Services, including Azure OpenAI Service. Azure Cognitive Services are cloud-based AI services that help developers build cognitive intelligence into applications without having direct AI or data science skills.

## Installation

```bash
npm install @atakora/cdk
```

## Import

```typescript
import {
  OpenAIService,
  CognitiveServicesSkuName,
  PublicNetworkAccess,
  NetworkRuleAction
} from '@atakora/cdk/cognitiveservices';
```

## Classes

### OpenAIService

Creates an Azure OpenAI Service account for deploying and using OpenAI models like GPT-4, GPT-3.5, DALL-E, and Embeddings.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `accountName` | `string` | Account name (globally unique) |
| `location` | `string` | Azure region |
| `accountId` | `string` | ARM resource ID |
| `customSubDomainName` | `string` | Custom subdomain for endpoint |
| `sku` | `CognitiveServicesSku` | Pricing SKU |

#### OpenAIServiceProps

```typescript
interface OpenAIServiceProps {
  /**
   * Account name (optional - auto-generated if not provided)
   * Must be globally unique, 2-64 chars, lowercase letters/numbers/hyphens
   */
  readonly accountName?: string;

  /**
   * Azure region (optional - defaults to parent location)
   * OpenAI is available in limited regions
   */
  readonly location?: string;

  /**
   * SKU name (optional - defaults to S0)
   * Only S0 is supported for OpenAI
   */
  readonly sku?: string;

  /**
   * Custom subdomain name (optional - auto-generated to match account name)
   * Required for OpenAI services
   */
  readonly customSubDomainName?: string;

  /**
   * Public network access (optional - default: Disabled)
   */
  readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Network ACL rules (optional - default: Deny all)
   */
  readonly networkAcls?: NetworkRuleSet;

  /**
   * Resource tags (optional - merged with parent tags)
   */
  readonly tags?: Record<string, string>;
}
```

#### Types

```typescript
enum CognitiveServicesSkuName {
  S0 = 'S0',  // Standard tier (required for OpenAI)
  F0 = 'F0'   // Free tier (not available for OpenAI)
}

enum PublicNetworkAccess {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled'
}

enum NetworkRuleAction {
  ALLOW = 'Allow',
  DENY = 'Deny'
}

interface NetworkRuleSet {
  readonly defaultAction: NetworkRuleAction;
  readonly ipRules?: IpRule[];
  readonly virtualNetworkRules?: VirtualNetworkRule[];
}

interface IpRule {
  readonly value: string;  // IP address or CIDR range
}

interface VirtualNetworkRule {
  readonly id: string;  // Subnet resource ID
  readonly ignoreMissingVnetServiceEndpoint?: boolean;
}
```

#### Examples

**Basic OpenAI Service**:
```typescript
import { OpenAIService } from '@atakora/cdk/cognitiveservices';

const openai = new OpenAIService(resourceGroup, 'AI', {
  // Auto-generates account name and subdomain
});
```

**Private OpenAI Service**:
```typescript
const openai = new OpenAIService(resourceGroup, 'PrivateAI', {
  publicNetworkAccess: PublicNetworkAccess.DISABLED,
  networkAcls: {
    defaultAction: NetworkRuleAction.DENY,
    virtualNetworkRules: [
      {
        id: privateSubnet.id,
        ignoreMissingVnetServiceEndpoint: false
      }
    ]
  }
});
```

**OpenAI with IP Allowlist**:
```typescript
const openai = new OpenAIService(resourceGroup, 'RestrictedAI', {
  publicNetworkAccess: PublicNetworkAccess.ENABLED,
  networkAcls: {
    defaultAction: NetworkRuleAction.DENY,
    ipRules: [
      { value: '203.0.113.0/24' },  // Office network
      { value: '198.51.100.10' }     // CI/CD server
    ]
  }
});
```

**Multi-Region Deployment**:
```typescript
// Primary region
const openaiEast = new OpenAIService(eastResourceGroup, 'AI', {
  location: 'eastus'
});

// Secondary region for failover
const openaiWest = new OpenAIService(westResourceGroup, 'AI', {
  location: 'westus'
});
```

---

## OpenAI Model Deployments

After creating an OpenAI Service, you need to deploy models to use them. This is typically done through the Azure Portal or Azure CLI:

### Deploy GPT-4

```bash
# Via Azure CLI
az cognitiveservices account deployment create \
  --name <account-name> \
  --resource-group <resource-group> \
  --deployment-name gpt-4 \
  --model-name gpt-4 \
  --model-version "0613" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name "Standard"
```

### Deploy GPT-3.5 Turbo

```bash
az cognitiveservices account deployment create \
  --name <account-name> \
  --resource-group <resource-group> \
  --deployment-name gpt-35-turbo \
  --model-name gpt-35-turbo \
  --model-version "0613" \
  --model-format OpenAI \
  --sku-capacity 20 \
  --sku-name "Standard"
```

### Deploy Embeddings

```bash
az cognitiveservices account deployment create \
  --name <account-name> \
  --resource-group <resource-group> \
  --deployment-name text-embedding-ada-002 \
  --model-name text-embedding-ada-002 \
  --model-version "2" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name "Standard"
```

---

## Using OpenAI Service

### Python SDK Example

```python
from openai import AzureOpenAI

client = AzureOpenAI(
    api_key="<your-api-key>",
    api_version="2024-02-01",
    azure_endpoint="https://<your-account>.openai.azure.com/"
)

response = client.chat.completions.create(
    model="gpt-4",  # Deployment name
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)
```

### REST API Example

```bash
curl https://<your-account>.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2024-02-01 \
  -H "Content-Type: application/json" \
  -H "api-key: <your-api-key>" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

---

## Common Patterns

### OpenAI with Managed Identity

```typescript
import { OpenAIService } from '@atakora/cdk/cognitiveservices';
import { WebApps } from '@atakora/cdk/web';

// Create OpenAI service
const openai = new OpenAIService(resourceGroup, 'AI', {
  publicNetworkAccess: PublicNetworkAccess.DISABLED
});

// Create web app with managed identity
const webApp = new WebApps(resourceGroup, 'ChatApp', {
  enableSystemIdentity: true,
  appSettings: {
    AZURE_OPENAI_ENDPOINT: `https://${openai.customSubDomainName}.openai.azure.com/`,
    AZURE_OPENAI_API_VERSION: '2024-02-01'
  }
});

// Grant web app access to OpenAI (via Azure Portal or CLI)
// Assign "Cognitive Services OpenAI User" role to web app's identity
```

### OpenAI with Private Endpoint

```typescript
import { PrivateEndpoint } from '@atakora/cdk/network';

const openai = new OpenAIService(resourceGroup, 'PrivateAI', {
  publicNetworkAccess: PublicNetworkAccess.DISABLED
});

const endpoint = new PrivateEndpoint(resourceGroup, 'OpenAIEndpoint', {
  subnet: privateSubnet,
  privateLinkServiceId: openai.accountId,
  groupIds: ['account']
});
```

---

## Government Cloud Considerations

### Availability
Azure OpenAI is **not currently available** in Azure Government Cloud. This is a significant limitation for government customers.

**Commercial Cloud Regions**:
- East US
- South Central US
- West Europe
- France Central
- UK South
- And more (check Azure portal for current list)

### Alternatives for Gov Cloud
For government customers needing AI capabilities:
1. Use other Cognitive Services (Computer Vision, Language, etc.) that are available in Gov Cloud
2. Deploy open-source models on Azure Gov Cloud infrastructure
3. Wait for Azure OpenAI availability in Gov Cloud (roadmap TBD)

### Data Residency
When Azure OpenAI becomes available in Gov Cloud:
- Will support FedRAMP High compliance
- Data processing within government boundaries
- Enhanced security and compliance features

---

## Available Models

### GPT-4 Family
- **gpt-4**: Most capable, best for complex tasks
- **gpt-4-32k**: Extended context window (32,768 tokens)
- **gpt-4-turbo**: Faster, cheaper, larger context

### GPT-3.5 Family
- **gpt-35-turbo**: Fast and cost-effective
- **gpt-35-turbo-16k**: Extended context window

### Embeddings
- **text-embedding-ada-002**: Most capable embedding model

### DALL-E
- **dall-e-3**: Image generation from text

### Whisper
- **whisper**: Speech-to-text

---

## Pricing

### GPT-4
- Input: ~$0.03 per 1K tokens
- Output: ~$0.06 per 1K tokens

### GPT-3.5 Turbo
- Input: ~$0.0015 per 1K tokens
- Output: ~$0.002 per 1K tokens

### Embeddings
- ~$0.0001 per 1K tokens

### Rate Limits
- Tokens per minute (TPM) quotas
- Requests per minute (RPM) quotas
- Can request quota increases

---

## Best Practices

### Security
- Use managed identities instead of API keys
- Disable public network access
- Use Private Link for connectivity
- Enable audit logging
- Rotate API keys regularly if using keys

### Cost Optimization
- Use GPT-3.5 Turbo for simpler tasks
- Implement caching for repeated queries
- Use streaming for long responses
- Monitor token usage
- Set up cost alerts

### Performance
- Deploy in regions close to users
- Implement retry logic with exponential backoff
- Use connection pooling
- Monitor latency and adjust regions if needed

### Reliability
- Implement multi-region failover
- Handle rate limits gracefully
- Use circuit breaker pattern
- Monitor service health
- Have fallback models

---

## See Also

- [Managed Identity Resources](./managedidentity.md) - Identity for secure access
- [Network Resources](./network.md) - Private endpoints
- [Key Vault Resources](./keyvault.md) - API key management
- [Azure OpenAI Documentation](https://docs.microsoft.com/azure/cognitive-services/openai/)

---

**Last Updated**: 2025-10-09
**Version**: @atakora/cdk 1.0.0
