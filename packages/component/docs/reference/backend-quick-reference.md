# Backend Module Quick Reference

**Phase 4 Complete** - All systems operational ✅

---

## Core API

### Define Backend

```typescript
import { defineBackend } from '@atakora/component';

const backend = defineBackend({
  schema, // From defineSchema()
  authentication, // From defineAuth()
  settings: {
    name: 'my-app',
    environment: 'production', // Auto-applies prod defaults
    region: 'eastus',
  },
});
```

---

## Environment Defaults

### Development

```typescript
import { getDevelopmentDefaults } from '@atakora/component/backend/defaults';

const defaults = getDevelopmentDefaults();
// - Serverless Cosmos DB
// - Consumption Function App
// - No network isolation
// - Minimal monitoring (10% sampling)
```

### Staging

```typescript
import { getStagingDefaults } from '@atakora/component/backend/defaults';

const defaults = getStagingDefaults();
// - Autoscale Cosmos DB (1K-10K RU/s)
// - Premium EP1 Function App
// - Network isolation
// - Full monitoring (30-day retention)
```

### Production

```typescript
import { getProductionDefaults } from '@atakora/component/backend/defaults';

const defaults = getProductionDefaults();
// - Autoscale Cosmos DB (4K-40K RU/s)
// - Premium EP2 Function App
// - Multi-region
// - Full monitoring (90-day retention)
// - CDN, cache, rate limiting
```

---

## Schema Integration

### Access Models

```typescript
import { getModel, getModelsByType } from '@atakora/component/backend/schema-integration';

// Get specific model
const userModel = getModel(backend, 'User');

// Get by type
const crudModels = getModelsByType(backend, 'crud');
const eventModels = getModelsByType(backend, 'event');
const functionModels = getModelsByType(backend, 'function');
```

### Model Categorization

```typescript
import { categorizeModels, getModelCounts } from '@atakora/component/backend/schema-integration';

// Categorize all models
const { crud, events, functions } = categorizeModels(backend);

// Get counts
const counts = getModelCounts(backend);
// { crud: 3, event: 2, function: 1 }
```

---

## Configuration Merging

### Basic Merging

```typescript
import { ConfigurationMerger } from '@atakora/component/backend/merger';

const merger = new ConfigurationMerger({
  defaultStrategy: 'priority',
  strictMode: false,
});

const result = merger.mergeRequirements([
  { resourceType: 'functionApp', config: { memory: 256 }, priority: 5 },
  { resourceType: 'functionApp', config: { memory: 512 }, priority: 10 },
]);

console.log(result.config.memory); // 512 (higher priority)
console.log(result.success); // true
```

### Advanced Merging

```typescript
const merger = new ConfigurationMerger({
  defaultStrategy: 'priority',
  strictMode: true, // Throw on conflicts
  enableTracing: true, // Debug merge operations
  customStrategies: [
    {
      path: 'config.memory',
      handler: (values, context) => ({
        value: Math.max(...values),
        strategyUsed: 'maximum',
        contributingSources: context.sources,
      }),
    },
  ],
});
```

---

## Attachment Points

### Compute Attachments

```typescript
import { validateFunctionAppConfig } from '@atakora/component/backend/attachments/compute';

const config = {
  plan: 'Premium',
  sku: 'EP1',
  runtime: 'node',
  runtimeVersion: '20',
  scaling: {
    minInstances: 1,
    maxInstances: 10,
    alwaysOn: true,
  },
};

const errors = validateFunctionAppConfig(config);
if (errors.length > 0) {
  console.error('Invalid config:', errors);
}
```

### Network Attachments

```typescript
import { validateVNetConfig } from '@atakora/component/backend/attachments/network';

const vnetConfig = {
  enabled: true,
  addressSpace: '10.0.0.0/16',
  subnets: [
    {
      name: 'functions',
      range: '10.0.1.0/24',
      serviceEndpoints: ['Microsoft.Storage'],
    },
  ],
};

const validation = validateVNetConfig(vnetConfig);
if (!validation.valid) {
  console.error('VNet errors:', validation.errors);
}
```

### Monitoring Attachments

```typescript
import {
  createDefaultAppInsightsConfig,
  createDefaultAlertsConfig,
} from '@atakora/component/backend/attachments/monitoring';

// Environment-specific configs
const appInsights = createDefaultAppInsightsConfig('production', {
  samplingPercentage: 100,
  retentionDays: 90,
});

const alerts = createDefaultAlertsConfig('production', {
  responseTime: {
    warning: 1000,
    critical: 3000,
  },
});
```

---

## Validation

### Schema Validation

```typescript
import { validateSchemaStructure } from '@atakora/component/backend/schema-integration';

try {
  validateSchemaStructure(schema);
  console.log('Schema valid');
} catch (error) {
  console.error('Schema invalid:', error.message);
}
```

### Configuration Validation

```typescript
import { ConfigValidator, AzureValidators } from '@atakora/component/backend/merger';

const validator = new ConfigValidator();

// Register validators
validator.registerValidator('config.memory', AzureValidators.memorySize);
validator.registerValidator('config.throughput', AzureValidators.throughputLimit);

// Validate
const result = validator.validate(config, {
  path: 'config',
  source: 'user',
  fullConfig: config,
});

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

---

## Testing Utilities

### Mock Backend

```typescript
import { defineBackend, defineSchema } from '@atakora/component';

const testSchema = defineSchema({
  schema: a.schema({
    TestModel: c.model({
      id: a.id(),
      name: a.string().required(),
    }),
  }),
});

const testBackend = defineBackend({
  schema: testSchema,
  authentication: defineAuth({ mode: 'none' }),
  settings: { name: 'test', environment: 'development' },
});
```

### Test Assertions

```typescript
import { hasModel, getModelCounts } from '@atakora/component/backend/schema-integration';

expect(hasModel(backend, 'User')).toBe(true);
expect(getModelCounts(backend)).toEqual({ crud: 2, event: 1, function: 0 });
```

---

## Common Patterns

### Environment Detection

```typescript
import { isDevelopment, isStaging, isProduction } from '@atakora/component/backend/environment';

if (isDevelopment()) {
  // Use development defaults
} else if (isStaging()) {
  // Use staging defaults
} else if (isProduction()) {
  // Use production defaults
}
```

### Custom Defaults with Overrides

```typescript
import { getStagingDefaultsWithOverrides } from '@atakora/component/backend/defaults';

const customDefaults = getStagingDefaultsWithOverrides({
  compute: {
    functionApp: {
      scaling: {
        maxInstances: 20, // Increase for load testing
      },
    },
  },
});
```

### Type-Safe Model Access

```typescript
import { createModelAccessor } from '@atakora/component/backend/schema-integration';

const models = createModelAccessor(backend);

// TypeScript autocomplete works!
const user = models('User');
const post = models('Post');
```

---

## Error Handling

### Merge Errors

```typescript
const result = merger.mergeRequirements(requirements);

if (!result.success) {
  console.error('Unresolvable conflicts:', result.unresolvableConflicts);
  console.error('Validation errors:', result.errors);
  console.warn('Warnings:', result.warnings);
}
```

### Validation Errors

```typescript
import { MonitoringAttachmentError } from '@atakora/component/backend/attachments/monitoring';

try {
  const errors = validateAppInsightsConfig(config);
  if (errors.length > 0) {
    throw new MonitoringAttachmentError(errors.join('; '));
  }
} catch (error) {
  if (error instanceof MonitoringAttachmentError) {
    console.error('Monitoring config invalid:', error.message);
  }
}
```

---

## Performance Tips

### Merge Strategy Selection

- Use `union` for arrays/sets that should combine
- Use `maximum` for numeric values (memory, throughput, retention)
- Use `priority` when explicit ordering matters
- Use `intersection` for required/common properties

### Environment Variable Namespacing

```typescript
import { EnvironmentVariableNamespace } from '@atakora/component/backend/merger';

// Automatic namespacing prevents conflicts
const namespaced = EnvironmentVariableNamespace.namespace('UserApi', 'COSMOS_ENDPOINT');
// Returns: 'USER_API_COSMOS_ENDPOINT'
```

---

## Test Coverage

Run backend tests:

```bash
npx vitest run src/backend/
```

Test specific module:

```bash
npx vitest run src/backend/defaults/staging.spec.ts
npx vitest run src/backend/attachments/monitoring.spec.ts
npx vitest run src/backend/merger/index.spec.ts
```

With coverage:

```bash
npx vitest run src/backend/ --coverage
```

---

## File Organization

```
src/backend/
├── define-backend.ts           # Main API
├── types.ts                    # Core types
├── schema-integration.ts       # Schema utilities
├── environment.ts              # Environment detection
├── defaults/
│   ├── base.ts                 # Type definitions
│   ├── development.ts          # Dev defaults
│   ├── staging.ts              # Staging defaults
│   └── production.ts           # Prod defaults
├── attachments/
│   ├── compute.ts              # Function App config
│   ├── storage.ts              # Storage/Cosmos config
│   ├── network.ts              # VNet/WAF/DDoS config
│   ├── monitoring.ts           # App Insights/Alerts
│   └── performance.ts          # CDN/Cache/Rate limiting
└── merger/
    ├── index.ts                # Main merger
    ├── strategies.ts           # Merge strategies
    └── validators.ts           # Validation framework
```

---

## Next Steps

See Grace for:

- ARM template generation from backend config
- CDK construct synthesis
- Deployment orchestration

See Charlie for:

- Integration testing
- E2E backend deployment tests
- Performance benchmarks

---

**Quick Links**:

- [Phase 4 Completion Report](./PHASE4_FINAL_COMPLETION_REPORT.md)
- [Backend Architecture](../../docs/design/architecture/adr-019-backend-pattern.md)
- [Test Summary](./TEST_SUMMARY.md)

---

_Last Updated: 2025-11-21_
_Phase 4 Status: ✅ 100% Complete_
