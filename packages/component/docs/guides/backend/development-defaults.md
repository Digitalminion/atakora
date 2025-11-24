# Development Defaults Guide

## Overview

Development defaults provide cost-optimized, serverless configurations designed for local development, testing, and prototyping. This guide explains when and how to use development defaults effectively.

---

## Quick Reference

### What's Enabled

- ✅ **Storage Account**: Standard_LRS (locally redundant)
- ✅ **Cosmos DB**: Serverless mode (pay per request)
- ✅ **Function App**: Consumption plan (pay per execution)
- ✅ **Basic Monitoring**: App Insights with 10% sampling

### What's Disabled

- ❌ **Network Isolation**: No VNet, WAF, or DDoS
- ❌ **Performance Features**: No CDN, cache, or rate limiting
- ❌ **Backups**: Disabled to save costs
- ❌ **Multi-region**: Single region only
- ❌ **Log Analytics**: No centralized logging
- ❌ **Alerts**: No alert rules configured

---

## Cost Breakdown

### Monthly Cost Estimate: $5-20

| Component       | Configuration          | Est. Monthly Cost   |
| --------------- | ---------------------- | ------------------- |
| Storage Account | Standard_LRS, Hot tier | $0.50-2             |
| Cosmos DB       | Serverless             | $0-10 (usage-based) |
| Function App    | Consumption            | $0-5 (usage-based)  |
| App Insights    | 10% sampling           | $0-3                |
| **Total**       |                        | **$0.50-20**        |

### Comparison with Production

| Environment | Monthly Cost | Savings  |
| ----------- | ------------ | -------- |
| Development | $5-20        | Baseline |
| Staging     | $200-500     | 10-100x  |
| Production  | $500-2000+   | 25-400x  |

**Key Insight**: Development defaults provide 95-98% cost savings compared to production configurations.

---

## When to Use Development Defaults

### ✅ Perfect For

1. **Local Development**

   ```typescript
   // Your local machine - keep costs minimal
   const backend = defineBackend({
     schema: mySchema,
     settings: { name: 'my-app-dev' },
   });
   ```

2. **Unit/Integration Testing**

   ```typescript
   // CI/CD pipelines - fast and cheap
   process.env.NODE_ENV = 'development';
   const backend = defineBackend({
     schema: testSchema,
     settings: { name: 'test-app' },
   });
   ```

3. **Prototyping**

   ```typescript
   // Quick proof-of-concept
   const backend = defineBackend({
     schema: prototypeSchema,
     settings: { name: 'prototype' },
   });
   ```

4. **Demos**
   ```typescript
   // Short-lived demo environments
   const backend = defineBackend({
     schema: demoSchema,
     settings: { name: 'demo-app' },
   });
   ```

### ❌ Don't Use For

1. **Production Workloads** - Use production defaults instead
2. **Customer-Facing Staging** - Use staging defaults instead
3. **Load Testing** - Use staging/production defaults
4. **Long-term Data Storage** - Backups are disabled

---

## Cost Optimization Features

### 1. Serverless Cosmos DB

```typescript
storage: {
  database: {
    mode: 'Serverless',  // No provisioned throughput
    // Pay only for RU/s consumed
    // Ideal for:
    // - Variable workloads
    // - Low-traffic scenarios
    // - Development/testing
  }
}
```

**Savings**: Up to 90% vs provisioned throughput for low-traffic scenarios

### 2. Consumption Function App

```typescript
compute: {
  functionApp: {
    plan: 'Consumption',  // Serverless functions
    // Pay only per execution
    // Auto-scales to zero
    // Ideal for:
    // - Development
    // - Testing
    // - Low-traffic APIs
  }
}
```

**Savings**: Up to 95% vs Premium plan for low-traffic scenarios

### 3. Locally Redundant Storage

```typescript
storage: {
  account: {
    sku: 'Standard_LRS',  // Single datacenter replication
    // Lowest cost option
    // Sufficient for development
  }
}
```

**Savings**: 70% vs zone-redundant storage (Standard_ZRS)

### 4. Minimal Monitoring

```typescript
monitoring: {
  appInsights: {
    samplingPercentage: 10,  // Sample only 10% of telemetry
    retentionDays: 30,       // Short retention period
    liveMetrics: false,      // Disabled
    profiler: false,         // Disabled
  }
}
```

**Savings**: 90% on telemetry ingestion costs

### 5. No Network Isolation

```typescript
network: undefined; // No VNet, WAF, or DDoS
```

**Savings**:

- VNet: $50-100/month
- WAF: $200-300/month
- DDoS Protection: $2,944/month

### 6. No Performance Features

```typescript
performance: undefined; // No CDN, cache, or rate limiting
```

**Savings**:

- CDN: $0.087/GB + $0.0075/10k requests
- Redis Cache: $15-600/month

---

## Override Scenarios

### Scenario 1: Enable Full Monitoring for Debugging

```typescript
const backend = defineBackend({
  schema: mySchema,
  settings: {
    name: 'my-app-dev',
    features: {
      monitoring: true, // Enable full monitoring
    },
  },
});

// Result:
// - 100% telemetry sampling
// - Live metrics enabled
// - But still uses serverless storage/compute
```

### Scenario 2: Enable Backups for Testing

```typescript
import { getDevelopmentDefaultsWithOverrides } from '@atakora/component/backend/defaults';

const customDefaults = getDevelopmentDefaultsWithOverrides({
  storage: {
    database: {
      backup: {
        enabled: true,
        type: 'Periodic',
        retentionDays: 7,
      },
    },
  },
});
```

### Scenario 3: Test Network Isolation

```typescript
const backend = defineBackend({
  schema: mySchema,
  settings: {
    name: 'network-test-dev',
    features: {
      networking: true, // Enable VNet for testing
    },
  },
});

// Result:
// - VNet created
// - Private endpoints configured
// - But still uses serverless compute/storage
```

### Scenario 4: Higher Consistency Level

```typescript
import { getDevelopmentDefaultsWithOverrides } from '@atakora/component/backend/defaults';

const customDefaults = getDevelopmentDefaultsWithOverrides({
  storage: {
    database: {
      consistency: 'Strong', // Override from 'Session' to 'Strong'
    },
  },
});
```

---

## Environment Detection

Development defaults are automatically applied when:

1. `NODE_ENV=development` (or `dev`, `local`)
2. `ENVIRONMENT=development` (if NODE_ENV not set)
3. No environment variables set (defaults to development)

### Manual Override

```typescript
// Force production defaults even if NODE_ENV=development
const backend = defineBackend({
  schema: mySchema,
  settings: { name: 'my-app' },
  environment: 'production', // Explicit override
});
```

---

## Security Considerations

### What's Still Secure

Even though development defaults are cost-optimized, security best practices are maintained:

1. ✅ **HTTPS Only**: All traffic encrypted
2. ✅ **TLS 1.2 Minimum**: Modern encryption standards
3. ✅ **Authentication**: Auth configuration still applies
4. ✅ **Azure RBAC**: Standard Azure access controls

### What's Different

1. ⚠️ **No Private Endpoints**: Resources accessible via public endpoints
2. ⚠️ **No WAF**: No web application firewall
3. ⚠️ **No DDoS Protection**: No DDoS mitigation
4. ⚠️ **No Network Isolation**: Resources in public network

**Recommendation**: Never expose development environments to the internet or use them with production data.

---

## Performance Characteristics

### Expected Performance

| Metric       | Development  | Staging      | Production |
| ------------ | ------------ | ------------ | ---------- |
| Cold Start   | 5-10 seconds | 1-2 seconds  | < 1 second |
| Latency      | 50-200ms     | 20-50ms      | 10-30ms    |
| Throughput   | 1-10 RPS     | 100-1000 RPS | 1000+ RPS  |
| Availability | 99%          | 99.9%        | 99.95%     |

### Trade-offs

**Development Accepts**:

- ⚠️ Higher cold start times (Consumption plan)
- ⚠️ Variable latency (serverless)
- ⚠️ No always-on capability
- ⚠️ Single region (no geo-redundancy)

**In Exchange For**:

- ✅ 95-98% cost savings
- ✅ Zero idle costs
- ✅ Auto-scaling to zero
- ✅ Simple configuration

---

## Troubleshooting

### Issue: Costs Higher Than Expected

**Symptoms**: Development environment costing $50+/month

**Possible Causes**:

1. High-traffic usage (unexpected load)
2. Forgotten to clean up resources
3. Accidentally using staging/production defaults

**Solutions**:

```typescript
// 1. Verify environment detection
import { isDevelopment } from '@atakora/component/backend/defaults';
console.log('Is Development:', isDevelopment());

// 2. Check backend configuration
console.log('Environment:', backend.environment);
console.log('Cosmos Mode:', backend.storage.database.mode);
console.log('Function Plan:', backend.compute.functionApp.plan);

// 3. Review Azure Cost Analysis
// - Check which resources are incurring costs
// - Look for unexpected resource creation
```

### Issue: Performance Too Slow

**Symptoms**: High latency, slow response times

**Possible Causes**:

1. Cold starts (Consumption plan)
2. Serverless Cosmos DB throttling
3. No CDN or cache

**Solutions**:

```typescript
// Option 1: Enable always-on (costs more)
const backend = defineBackend({
  schema: mySchema,
  settings: {
    name: 'my-app-dev',
    features: {
      /* override */
    },
  },
  environment: 'staging', // Use staging defaults instead
});

// Option 2: Use custom overrides
import { getDevelopmentDefaultsWithOverrides } from '@atakora/component/backend/defaults';

const customDefaults = getDevelopmentDefaultsWithOverrides({
  compute: {
    functionApp: {
      plan: 'Premium', // Upgrade to Premium
      sku: 'EP1',
      scaling: {
        minInstances: 1,
        alwaysOn: true,
      },
    },
  },
});
```

### Issue: Testing Network Features

**Symptoms**: Need to test VNet, private endpoints, etc.

**Solution**:

```typescript
const backend = defineBackend({
  schema: mySchema,
  settings: {
    name: 'network-test-dev',
    features: {
      networking: true, // Enable network features
    },
  },
});

// Note: This will increase costs significantly
// Only enable when actively testing network scenarios
```

---

## Migration Path

### Development → Staging

```typescript
// Development
const devBackend = defineBackend({
  schema: mySchema,
  settings: { name: 'my-app' },
  environment: 'development',
});

// Staging (when ready for pre-prod testing)
const stagingBackend = defineBackend({
  schema: mySchema,
  settings: { name: 'my-app' },
  environment: 'staging', // Just change environment
});

// Changes automatically:
// - Cosmos DB: Serverless → Autoscale
// - Function App: Consumption → Premium EP1
// - Monitoring: 10% → 100% sampling
// - Network: Disabled → Enabled
// - Backups: Disabled → Enabled
```

### Staging → Production

```typescript
// Production
const prodBackend = defineBackend({
  schema: mySchema,
  settings: { name: 'my-app' },
  environment: 'production',
});

// Changes automatically:
// - Function App: EP1 → EP2 (more powerful)
// - Min Instances: 1 → 2 (high availability)
// - Retention: 30 days → 90 days
// - Performance: Disabled → Enabled (CDN, cache)
// - Multi-region: Disabled → Enabled
```

---

## Best Practices

### 1. Always Use for Local Development

```typescript
// ✅ Good: Use development defaults locally
const backend = defineBackend({
  schema: mySchema,
  settings: { name: 'my-app-dev' },
});

// ❌ Bad: Using production defaults locally (expensive!)
const backend = defineBackend({
  schema: mySchema,
  settings: { name: 'my-app-dev' },
  environment: 'production',
});
```

### 2. Clean Up Regularly

```bash
# Delete unused development resources
az group delete --name my-app-dev-rg --yes

# Set up auto-deletion for dev resources > 7 days old
```

### 3. Set Budget Alerts

```bash
# Azure CLI: Set budget alert for development
az consumption budget create \
  --budget-name dev-budget \
  --amount 50 \
  --time-grain Monthly \
  --threshold 80
```

### 4. Use Feature Flags Sparingly

```typescript
// ✅ Good: Only enable what you need
const backend = defineBackend({
  schema: mySchema,
  settings: {
    name: 'my-app-dev',
    features: {
      monitoring: true, // Only if actively debugging
    },
  },
});

// ❌ Bad: Enabling everything (defeats the purpose)
const backend = defineBackend({
  schema: mySchema,
  settings: {
    name: 'my-app-dev',
    features: {
      monitoring: true,
      networking: true,
      performance: true, // Expensive!
    },
  },
});
```

### 5. Test in Staging Before Production

```typescript
// Development: Rapid iteration
const devBackend = defineBackend({
  schema: mySchema,
  settings: { name: 'my-app' },
  environment: 'development',
});

// Staging: Pre-production validation
const stagingBackend = defineBackend({
  schema: mySchema,
  settings: { name: 'my-app' },
  environment: 'staging',
});

// Production: Only after staging validation
const prodBackend = defineBackend({
  schema: mySchema,
  settings: { name: 'my-app' },
  environment: 'production',
});
```

---

## Summary

### Development Defaults Provide

1. ✅ **95-98% cost savings** vs production
2. ✅ **Serverless architecture** (Cosmos DB, Functions)
3. ✅ **Minimal monitoring** (10% sampling)
4. ✅ **No expensive features** (network, performance)
5. ✅ **Fast iteration** with sensible defaults
6. ✅ **Easy overrides** when needed

### Remember

- Use development defaults for all local development
- Override only when necessary
- Clean up unused resources regularly
- Set budget alerts for development subscriptions
- Test in staging before deploying to production
- Never use development defaults for production workloads

---

**For more information**:

- Implementation: `/src/backend/defaults/development.ts`
- Tests: `/src/backend/defaults/development.spec.ts`
- Task Summary: `/TASK4_DEVELOPMENT_DEFAULTS_SUMMARY.md`
