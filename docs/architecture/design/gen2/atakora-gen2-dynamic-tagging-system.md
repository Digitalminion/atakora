# Atakora Gen 2 - Dynamic Rule-Driven Tagging System

**Extension to**: atakora-gen2-governance-compliance.md
**Created**: 2025-10-14
**Status**: Design Phase

## Overview

A comprehensive, dynamic tagging system that automatically cascades tags from the manifest through backend instances, stacks, components, and individual resources. Tags are rule-driven rather than hardcoded, allowing for flexible organizational strategies.

## Philosophy

**Tag Everything, Relate Everything, Find Everything**

Every resource should be:
1. **Traceable** - From manifest through component to individual resource
2. **Relatable** - Understand which resources work together
3. **Queryable** - Find resources by any dimension (cost, compliance, feature, etc.)
4. **Dynamic** - Adding fields to manifest automatically creates tags
5. **Grouped by synthesis** - Every resource in a synthesis run shares the same synthesis-run-id, allowing you to track what was deployed together

## Tag Cascade Hierarchy

```
┌─────────────────────────────────────────────┐
│ 1. Organization/Subscription (Highest)      │  ← Tenant, Subscription
├─────────────────────────────────────────────┤
│ 2. Synthesis Run                            │  ← Unique ID for this synthesis run
├─────────────────────────────────────────────┤
│ 3. Manifest (Project)                       │  ← Everything in manifest.json
│    - Standard fields (project, environment) │
│    - Custom fields (ANY additional field)   │
├─────────────────────────────────────────────┤
│ 4. Package                                  │  ← Package-specific tags
├─────────────────────────────────────────────┤
│ 5. Backend Instance                         │  ← Unique hash for this backend
├─────────────────────────────────────────────┤
│ 6. Stack                                    │  ← Stack identifier (crud, graphql)
├─────────────────────────────────────────────┤
│ 7. Component Instance                       │  ← CRUD API, Function, etc.
├─────────────────────────────────────────────┤
│ 8. Resource (Lowest)                        │  ← Individual Azure resources
└─────────────────────────────────────────────┘
```

Each level inherits tags from levels above and adds its own.

## 1. Manifest-Driven Tags (Dynamic)

### Standard Manifest

```json
// .atakora/manifest.json
{
  "version": "2.0.0",
  "project": "colorai",
  "organization": "digitalproducts",
  "environment": "nonprod",
  "geography": "eastus2",
  "subscriptionId": "12345678-1234-1234-1234-123456789abc",
  "tenantId": "87654321-4321-4321-4321-cba987654321",
  "instance": 6,

  // Standard tags (automatically applied)
  "tags": {
    "cost-center": "ENG-001",
    "business-unit": "AI Research",
    "budget-owner": "engineering-lead@company.com",
    "data-classification": "confidential"
  }
}
```

**Every field becomes a tag automatically:**
```typescript
{
  'atakora:version': '2.0.0',
  'atakora:project': 'colorai',
  'atakora:organization': 'digitalproducts',
  'atakora:environment': 'nonprod',
  'atakora:geography': 'eastus2',
  'atakora:instance': '06',
  'cost-center': 'ENG-001',
  'business-unit': 'AI Research',
  'budget-owner': 'engineering-lead@company.com',
  'data-classification': 'confidential',
}
```

### Extended Manifest (Custom Fields)

Users can add ANY field to the manifest and it becomes a tag:

```json
{
  "version": "2.0.0",
  "project": "colorai",
  "organization": "digitalproducts",
  "environment": "nonprod",
  "geography": "eastus2",
  "subscriptionId": "...",
  "tenantId": "...",
  "instance": 6,

  // Custom fields (user-defined)
  "team": "data-platform",
  "product": "AI Suite",
  "customer": "internal",
  "sla": "99.9",
  "support-tier": "premium",
  "compliance-requirements": "SOC2,HIPAA",
  "data-residency": "US",
  "disaster-recovery-tier": "1",

  // Standard tags
  "tags": {
    "cost-center": "ENG-001",
    "business-unit": "AI Research"
  }
}
```

**All become tags automatically:**
```typescript
{
  'atakora:project': 'colorai',
  'atakora:team': 'data-platform',
  'atakora:product': 'AI Suite',
  'atakora:customer': 'internal',
  'atakora:sla': '99.9',
  'atakora:support-tier': 'premium',
  'atakora:compliance-requirements': 'SOC2,HIPAA',
  'atakora:data-residency': 'US',
  'atakora:disaster-recovery-tier': '1',
  // ... plus all other fields
}
```

### Package-Level Tags

Manifest can specify package-specific tags:

```json
{
  "version": "2.0.0",
  "project": "colorai",
  // ... standard fields

  "packages": {
    "backend": {
      "tags": {
        "layer": "backend",
        "runtime": "node20",
        "scaling-profile": "elastic",
        "monitoring-tier": "advanced"
      }
    },
    "frontend": {
      "tags": {
        "layer": "frontend",
        "framework": "nextjs",
        "cdn-enabled": "true"
      }
    },
    "ml-pipeline": {
      "tags": {
        "layer": "ml",
        "gpu-enabled": "true",
        "compute-tier": "high-performance"
      }
    }
  }
}
```

**Resources in each package inherit package tags:**

```typescript
// Backend resources get:
{
  'atakora:project': 'colorai',
  'atakora:layer': 'backend',
  'atakora:runtime': 'node20',
  'atakora:scaling-profile': 'elastic',
  'atakora:monitoring-tier': 'advanced',
}

// Frontend resources get:
{
  'atakora:project': 'colorai',
  'atakora:layer': 'frontend',
  'atakora:framework': 'nextjs',
  'atakora:cdn-enabled': 'true',
}
```

## 2. Backend Instance Hash

Each backend gets a unique hash that tags all its resources:

```typescript
const backend = defineBackend({
  feedbackApi,
  processUploadFunction,
});

// Backend automatically generates hash
backend.instanceHash = generateHash({
  project: config.project,
  package: 'backend',
  timestamp: Date.now(),
  random: randomBytes(8),
});

// Example: 'backend-colorai-b4f3a2e1'
```

**All resources in this backend get:**
```typescript
{
  'atakora:backend-instance': 'backend-colorai-b4f3a2e1',
  'atakora:backend-created': '2025-10-14T15:30:00Z',
}
```

**Benefits:**
- Query all resources for this specific backend deployment
- Identify resources that were created together
- Track backend lifecycle (when created, by whom)

## 3. Synthesis Run ID

Every synthesis run generates a unique ID that's shared across all resources in that run:

```typescript
// At the start of synthesis
const taggingEngine = new TaggingEngine();
console.log(`Synthesis Run ID: ${taggingEngine.synthesisRunId}`);
// Example: synth-20251014-153000-b8d4e2a1

// All resources synthesized in this run get the same ID
```

**All resources in this synthesis run get:**
```typescript
{
  'atakora:synthesis-run-id': 'synth-20251014-153000-b8d4e2a1',
}
```

**Benefits:**
- **Deployment tracking** - Query all resources that were deployed together in a single synthesis run
- **Rollback capability** - Identify exactly which resources were created in a failed deployment
- **Change tracking** - Compare resources between different synthesis runs
- **Audit trail** - Complete history of what was deployed when

**Use cases:**
```kql
-- Find everything deployed in the latest run
Resources
| where tags['atakora:synthesis-run-id'] == 'synth-20251014-153000-b8d4e2a1'

-- Compare two synthesis runs to see what changed
Resources
| where tags['atakora:synthesis-run-id'] in ('synth-20251014-120000-a1b2c3d4', 'synth-20251014-153000-b8d4e2a1')
| summarize count() by tags['atakora:synthesis-run-id'], type

-- Find orphaned resources (not from latest synthesis)
let latestSynthesisId = 'synth-20251014-153000-b8d4e2a1';
Resources
| where tags['atakora:project'] == 'colorai'
| where tags['atakora:synthesis-run-id'] != latestSynthesisId
| project name, type, tags['atakora:synthesis-run-id'], tags['atakora:created']
```

## 4. Stack-Level Tags

Each stack within a backend gets its own identifier:

```typescript
const backend = defineBackend({
  feedbackApi,      // Goes to default stack
  labDatasetApi,    // Goes to default stack
});

// Additional stacks
const loggingStack = backend.createStack('logging');
const networkStack = backend.createStack('network');
```

**Stack tags:**
```typescript
// Default stack resources:
{
  'atakora:backend-instance': 'backend-colorai-b4f3a2e1',
  'atakora:stack': 'default',
  'atakora:stack-id': 'stack-default-7c5e9a2b',
}

// Logging stack resources:
{
  'atakora:backend-instance': 'backend-colorai-b4f3a2e1',
  'atakora:stack': 'logging',
  'atakora:stack-id': 'stack-logging-3f8d1e7a',
  'atakora:stack-purpose': 'observability',
}

// Network stack resources:
{
  'atakora:backend-instance': 'backend-colorai-b4f3a2e1',
  'atakora:stack': 'network',
  'atakora:stack-id': 'stack-network-9e2b4c1f',
  'atakora:stack-purpose': 'networking',
}
```

## 5. Component Instance Tags

Each component (CRUD API, Function, etc.) gets unique tags:

```typescript
// Define CRUD API
export const feedbackApi = defineCrudApi({
  name: 'feedback',
  entityName: 'Feedback',
  schema: { /* ... */ },
});

// Generates component hash
feedbackApi.componentHash = 'crud-feedback-a8e3f1d9';
```

**All resources created by this component inherit:**
```typescript
{
  // Inherited from manifest
  'atakora:project': 'colorai',
  'atakora:environment': 'nonprod',

  // Inherited from backend
  'atakora:backend-instance': 'backend-colorai-b4f3a2e1',

  // Inherited from stack
  'atakora:stack': 'default',
  'atakora:stack-id': 'stack-default-7c5e9a2b',

  // Component-specific
  'atakora:component-type': 'crud-api',
  'atakora:component-name': 'feedback',
  'atakora:component-instance': 'crud-feedback-a8e3f1d9',

  // Resource relationship
  'atakora:component-resources': 'cosmos-container,function-create,function-read,function-update,function-delete,function-list',
}
```

### Component Resource Grouping

Resources created by a component are explicitly linked:

```typescript
// CRUD API creates multiple resources
feedbackApi.resources = [
  cosmos.container('feedback'),           // Cosmos container
  functionApp.function('feedback-create'), // Create endpoint
  functionApp.function('feedback-read'),   // Read endpoint
  functionApp.function('feedback-update'), // Update endpoint
  functionApp.function('feedback-delete'), // Delete endpoint
  functionApp.function('feedback-list'),   // List endpoint
];

// Each resource gets:
{
  'atakora:component-instance': 'crud-feedback-a8e3f1d9',
  'atakora:component-resource-type': 'cosmos-container', // or 'function'
  'atakora:component-resource-name': 'feedback',
  'atakora:component-resource-role': 'storage', // or 'create-endpoint', 'read-endpoint', etc.
}
```

**Query to find all resources for a component:**
```kql
Resources
| where tags['atakora:component-instance'] == 'crud-feedback-a8e3f1d9'
| project name, type, tags['atakora:component-resource-role']
```

## 6. Resource-Level Tags

Individual resources get a simple purpose tag:

```typescript
// Cosmos Container
{
  // All inherited tags...
  'atakora:resource-purpose': 'data-storage',
}

// Function
{
  // All inherited tags...
  'atakora:resource-purpose': 'api-endpoint',
}

// Storage Container
{
  // All inherited tags...
  'atakora:resource-purpose': 'file-storage',
}
```

**Note**: Azure already knows the resource type, and configuration details (partition keys, etc.) are in the resource properties, not needed as tags.

## Dynamic Tagging Rule System

### Tag Rule Definition

```typescript
interface TaggingRule {
  name: string;
  description: string;

  // Where does this tag come from?
  source: 'manifest' | 'backend' | 'stack' | 'component' | 'resource' | 'computed';

  // What resources does it apply to?
  scope: 'all' | 'backend' | 'stack' | 'component' | 'resource-type';

  // Optional: only apply if condition is true
  condition?: (context: TaggingContext) => boolean;

  // Optional: transform the value before applying
  transform?: (value: any, context: TaggingContext) => string;

  // Tag key (with optional prefix)
  key: string;
  prefix?: string;  // e.g., 'atakora:' or 'azure:'

  // Tag value (can be static or computed)
  value: string | ((context: TaggingContext) => string);
}

interface TaggingContext {
  manifest: ManifestConfig;
  backend?: Backend;
  stack?: ResourceGroupStack;
  component?: Component;
  resource?: ArmResource;
  timestamp: Date;
  synthesisRunId: string;  // Unique ID for this synthesis run
}
```

### Built-In Tagging Rules

```typescript
const builtInRules: TaggingRule[] = [
  // Rule 1: All manifest fields become tags
  {
    name: 'manifest-fields',
    description: 'All manifest fields automatically become tags',
    source: 'manifest',
    scope: 'all',
    key: '*',  // Wildcard - use field name as key
    prefix: 'atakora:',
    transform: (value) => String(value),
  },

  // Rule 2: Package-level tags
  {
    name: 'package-tags',
    description: 'Package-specific tags from manifest.packages',
    source: 'manifest',
    scope: 'all',
    condition: (ctx) => ctx.manifest.packages?.[ctx.backend?.packageName] != null,
    key: '*',
    prefix: 'atakora:',
    value: (ctx) => ctx.manifest.packages[ctx.backend.packageName].tags,
  },

  // Rule 3: Backend instance hash
  {
    name: 'backend-instance-hash',
    description: 'Unique hash identifying this backend instance',
    source: 'backend',
    scope: 'all',
    key: 'backend-instance',
    prefix: 'atakora:',
    value: (ctx) => ctx.backend.instanceHash,
  },

  // Rule 4: Stack identifier
  {
    name: 'stack-identifier',
    description: 'Stack name and unique ID',
    source: 'stack',
    scope: 'all',
    key: 'stack',
    prefix: 'atakora:',
    value: (ctx) => ctx.stack.name,
  },

  // Rule 5: Component instance
  {
    name: 'component-instance',
    description: 'Component type, name, and unique hash',
    source: 'component',
    scope: 'all',
    key: 'component-instance',
    prefix: 'atakora:',
    value: (ctx) => ctx.component.componentHash,
  },

  // Rule 6: Created timestamp
  {
    name: 'created-timestamp',
    description: 'When this resource was created',
    source: 'computed',
    scope: 'all',
    key: 'created',
    prefix: 'atakora:',
    value: (ctx) => ctx.timestamp.toISOString(),
  },

  // Rule 7: Created by
  {
    name: 'created-by',
    description: 'Who created this resource',
    source: 'computed',
    scope: 'all',
    key: 'created-by',
    prefix: 'atakora:',
    value: () => process.env.USER_EMAIL || process.env.USERNAME || 'system',
  },

  // Rule 8: Synthesis Run ID
  {
    name: 'synthesis-run-id',
    description: 'Unique ID for this synthesis run - tracks all resources synthesized together',
    source: 'computed',
    scope: 'all',
    key: 'synthesis-run-id',
    prefix: 'atakora:',
    value: (ctx) => ctx.synthesisRunId,
  },

  // Rule 9: Deployment ID
  {
    name: 'deployment-id',
    description: 'Unique ID for this deployment to Azure',
    source: 'computed',
    scope: 'all',
    key: 'deployment-id',
    prefix: 'atakora:',
    value: () => generateDeploymentId(),
  },

  // Rule 10: Environment-specific tags
  {
    name: 'environment-defaults',
    description: 'Apply environment-specific default tags',
    source: 'manifest',
    scope: 'all',
    condition: (ctx) => ctx.manifest.environment === 'prod',
    key: 'backup-required',
    value: 'true',
  },

  // Rule 11: Cost allocation
  {
    name: 'cost-tracking',
    description: 'Track costs by component',
    source: 'component',
    scope: 'all',
    key: 'cost-component',
    prefix: 'atakora:',
    value: (ctx) => `${ctx.component.componentType}-${ctx.component.name}`,
  },
];
```

### Custom Tagging Rules

Users can define custom rules:

```typescript
const backend = defineBackend({
  feedbackApi,
}, {
  tagging: {
    rules: [
      // Custom rule: Tag all storage accounts with replication strategy
      {
        name: 'storage-replication',
        source: 'resource',
        scope: 'resource-type',
        condition: (ctx) => ctx.resource.type === 'Microsoft.Storage/storageAccounts',
        key: 'replication',
        value: (ctx) => ctx.resource.properties.sku.name,
      },

      // Custom rule: Tag functions with their trigger type
      {
        name: 'function-trigger',
        source: 'resource',
        scope: 'resource-type',
        condition: (ctx) => ctx.resource.type.includes('Microsoft.Web/sites/functions'),
        key: 'trigger-type',
        value: (ctx) => ctx.component.trigger?.type || 'unknown',
      },

      // Custom rule: Feature-level tagging
      {
        name: 'feature-grouping',
        source: 'component',
        scope: 'all',
        key: 'feature',
        value: (ctx) => {
          // Map component names to features
          const featureMap = {
            'feedback': 'user-feedback',
            'user-profile': 'user-management',
            'auth': 'authentication',
          };
          return featureMap[ctx.component.name] || 'general';
        },
      },
    ],
  },
});
```

## Tag Cascade Examples

### Example 1: CRUD API Resource

```typescript
// Define CRUD API
const feedbackApi = defineCrudApi({
  name: 'feedback',
  entityName: 'Feedback',
  schema: { rating: { type: 'number' } },
});

// Add to backend
const backend = defineBackend({ feedbackApi });
```

**Cosmos Container gets these tags:**
```typescript
{
  // Level 1: Manifest (project)
  'atakora:version': '2.0.0',
  'atakora:project': 'colorai',
  'atakora:organization': 'digitalproducts',
  'atakora:environment': 'nonprod',
  'atakora:geography': 'eastus2',
  'atakora:instance': '06',
  'cost-center': 'ENG-001',
  'business-unit': 'AI Research',

  // Level 2: Synthesis Run
  'atakora:synthesis-run-id': 'synth-20251014-153000-b8d4e2a1',

  // Level 3: Package
  'atakora:layer': 'backend',
  'atakora:runtime': 'node20',

  // Level 4: Backend instance
  'atakora:backend-instance': 'backend-colorai-b4f3a2e1',
  'atakora:backend-created': '2025-10-14T15:30:00Z',

  // Level 5: Stack
  'atakora:stack': 'default',
  'atakora:stack-id': 'stack-default-7c5e9a2b',

  // Level 6: Component
  'atakora:component-type': 'crud-api',
  'atakora:component-name': 'feedback',
  'atakora:component-instance': 'crud-feedback-a8e3f1d9',

  // Level 7: Resource
  'atakora:resource-purpose': 'data-storage',

  // Computed
  'atakora:created': '2025-10-14T15:30:00Z',
  'atakora:created-by': 'developer@company.com',
  'atakora:deployment-id': 'deploy-20251014-153000-a7f3',
  'atakora:cost-component': 'crud-api-feedback',
}
```

**Function (feedback-create) gets these tags:**
```typescript
{
  // All the same tags as above, PLUS:

  // Resource-specific
  'atakora:resource-purpose': 'api-endpoint',
}
```

### Example 2: Azure Function with Blob Trigger

```typescript
const processUploadFunction = defineFunction({
  name: 'process-upload',
  entry: './handler.ts',
  runtime: 20,
  trigger: {
    type: 'blob',
    path: 'uploads/{name}',
  },
});
```

**Function gets:**
```typescript
{
  // Inherited from manifest + backend + stack...

  // Component
  'atakora:component-type': 'azure-function',
  'atakora:component-name': 'process-upload',
  'atakora:component-instance': 'func-process-upload-c2e9a1b7',

  // Resource
  'atakora:resource-purpose': 'background-processing',
}
```

**Storage Container (uploads) gets:**
```typescript
{
  // Inherited from manifest + backend + stack...

  // Component relationship
  'atakora:component-instance': 'func-process-upload-c2e9a1b7',
  'atakora:component-type': 'azure-function',
  'atakora:component-name': 'process-upload',

  // Resource
  'atakora:resource-purpose': 'trigger-storage',
}
```

## Additional Tag Cascade Strategies

### 1. Feature-Level Tagging

Group resources by application feature:

```typescript
const backend = defineBackend({
  // User management feature
  userProfileApi: defineCrudApi({ name: 'user-profile' }),
  uploadAvatarFunction: defineFunction({ name: 'upload-avatar' }),

  // Authentication feature
  loginFunction: defineFunction({ name: 'login' }),
  resetPasswordFunction: defineFunction({ name: 'reset-password' }),
}, {
  features: {
    'user-management': ['userProfileApi', 'uploadAvatarFunction'],
    'authentication': ['loginFunction', 'resetPasswordFunction'],
  },
});
```

**All resources get:**
```typescript
{
  'atakora:feature': 'user-management',  // or 'authentication'
  'atakora:feature-components': 'userProfileApi,uploadAvatarFunction',
}
```

### 2. Dependency Chain Tagging

Track dependencies between resources:

```typescript
// CRUD API depends on:
// - Cosmos container (storage)
// - Function App (compute)
// - Storage Account (bindings)
// - Key Vault (secrets)

{
  'atakora:depends-on': 'cosmos-feedback,function-app,storage,key-vault',
  'atakora:dependency-type': 'runtime',
}
```

### 3. Monitoring Group Tagging

Group resources for monitoring and alerting:

```typescript
{
  'atakora:monitoring-group': 'backend-api',
  'atakora:alert-rules': 'error-rate,latency,availability',
  'atakora:metrics-enabled': 'true',
  'atakora:logs-enabled': 'true',
}
```

### 4. Backup Group Tagging

Group resources by backup requirements:

```typescript
{
  'atakora:backup-group': 'data-tier',
  'atakora:backup-policy': 'continuous',
  'atakora:backup-retention': '90',
  'atakora:disaster-recovery-tier': '1',
}
```

### 5. Security Zone Tagging

Mark resources by security zone:

```typescript
{
  'atakora:security-zone': 'private',  // or 'public', 'dmz'
  'atakora:network-access': 'private-endpoint',
  'atakora:encryption-required': 'true',
  'atakora:compliance-tier': 'high',
}
```

### 6. Lifecycle Stage Tagging

Track resource lifecycle:

```typescript
{
  'atakora:lifecycle-stage': 'production',  // or 'staging', 'canary', 'deprecated'
  'atakora:deployment-version': 'v2.1.0',
  'atakora:deployment-timestamp': '2025-10-14T15:30:00Z',
  'atakora:previous-version': 'v2.0.5',
}
```

### 7. Cost Optimization Tagging

Enable cost optimization strategies:

```typescript
{
  'atakora:cost-optimization': 'enabled',
  'atakora:auto-shutdown': 'true',  // Shut down in non-business hours
  'atakora:scaling-strategy': 'aggressive',
  'atakora:reserved-capacity': 'false',
  'atakora:spot-eligible': 'true',
}
```

## Implementation

### Tagging Engine

```typescript
// packages/lib/src/tagging/tagging-engine.ts

export class TaggingEngine {
  private rules: TaggingRule[] = [];
  readonly synthesisRunId: string;

  constructor() {
    // Generate unique synthesis run ID
    this.synthesisRunId = this.generateSynthesisRunId();

    // Load built-in rules
    this.rules.push(...builtInRules);
  }

  private generateSynthesisRunId(): string {
    const timestamp = new Date().toISOString().replace(/[-:\.]/g, '').substring(0, 15);
    const random = crypto.randomBytes(4).toString('hex');
    return `synth-${timestamp}-${random}`;
  }

  addRule(rule: TaggingRule): void {
    this.rules.push(rule);
  }

  addRules(rules: TaggingRule[]): void {
    this.rules.push(...rules);
  }

  /**
   * Compute tags for a resource based on all applicable rules
   */
  computeTags(context: TaggingContext): Record<string, string> {
    const tags: Record<string, string> = {};

    // Apply rules in order (later rules can override earlier ones)
    for (const rule of this.rules) {
      // Check if rule applies to this resource
      if (!this.shouldApplyRule(rule, context)) {
        continue;
      }

      // Get tag key and value
      const tagKey = rule.prefix ? `${rule.prefix}${rule.key}` : rule.key;
      const tagValue = this.resolveTagValue(rule, context);

      // Handle wildcard keys (manifest fields)
      if (rule.key === '*') {
        const wildcardTags = this.resolveWildcardTags(rule, context);
        Object.assign(tags, wildcardTags);
      } else {
        tags[tagKey] = tagValue;
      }
    }

    return tags;
  }

  private shouldApplyRule(rule: TaggingRule, context: TaggingContext): boolean {
    // Check scope
    if (rule.scope === 'backend' && !context.backend) return false;
    if (rule.scope === 'stack' && !context.stack) return false;
    if (rule.scope === 'component' && !context.component) return false;

    // Check condition
    if (rule.condition && !rule.condition(context)) {
      return false;
    }

    return true;
  }

  private resolveTagValue(rule: TaggingRule, context: TaggingContext): string {
    let value: any;

    // Get value
    if (typeof rule.value === 'function') {
      value = rule.value(context);
    } else {
      value = rule.value;
    }

    // Transform value
    if (rule.transform) {
      value = rule.transform(value, context);
    }

    return String(value);
  }

  private resolveWildcardTags(rule: TaggingRule, context: TaggingContext): Record<string, string> {
    const tags: Record<string, string> = {};

    if (rule.source === 'manifest') {
      // All manifest fields
      for (const [key, value] of Object.entries(context.manifest)) {
        if (key === 'tags' || key === 'packages') continue;  // Skip special fields

        const tagKey = rule.prefix ? `${rule.prefix}${key}` : key;
        const tagValue = rule.transform ? rule.transform(value, context) : String(value);
        tags[tagKey] = tagValue;
      }

      // Manifest tags
      if (context.manifest.tags) {
        for (const [key, value] of Object.entries(context.manifest.tags)) {
          tags[key] = String(value);
        }
      }

      // Package tags
      if (context.backend && context.manifest.packages?.[context.backend.packageName]) {
        const packageTags = context.manifest.packages[context.backend.packageName].tags;
        if (packageTags) {
          for (const [key, value] of Object.entries(packageTags)) {
            const tagKey = rule.prefix ? `${rule.prefix}${key}` : key;
            tags[tagKey] = String(value);
          }
        }
      }
    }

    return tags;
  }
}
```

### Integration with Backend

```typescript
// packages/component/src/backend/backend.ts

export class Backend extends Construct {
  readonly instanceHash: string;
  private taggingEngine: TaggingEngine;
  private baseTags: Record<string, string>;

  constructor(scope: SubscriptionStack, name: string, config: BackendConfig) {
    super(scope, name);

    // Generate backend instance hash
    this.instanceHash = this.generateInstanceHash();

    // Initialize tagging engine
    this.taggingEngine = new TaggingEngine();

    // Add custom rules if provided
    if (config.tagging?.rules) {
      this.taggingEngine.addRules(config.tagging.rules);
    }

    // Compute base tags (from manifest + backend)
    this.baseTags = this.taggingEngine.computeTags({
      manifest: config.manifest,
      backend: this,
      timestamp: new Date(),
      synthesisRunId: this.taggingEngine.synthesisRunId,
    });

    // Create resources with tags
    this.createResources(config);
  }

  private generateInstanceHash(): string {
    const data = {
      project: this.config.project,
      package: 'backend',
      timestamp: Date.now(),
      random: crypto.randomBytes(8).toString('hex'),
    };

    const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    return `backend-${this.config.project}-${hash.substring(0, 8)}`;
  }

  /**
   * Get tags for a specific resource
   */
  getResourceTags(
    resource: ArmResource,
    component?: Component,
    additionalTags?: Record<string, string>
  ): Record<string, string> {
    const tags = this.taggingEngine.computeTags({
      manifest: this.config.manifest,
      backend: this,
      stack: resource.stack,
      component: component,
      resource: resource,
      timestamp: new Date(),
      synthesisRunId: this.taggingEngine.synthesisRunId,
    });

    // Merge with additional tags
    return {
      ...tags,
      ...additionalTags,
    };
  }

  private createResources(config: BackendConfig) {
    // Create Cosmos DB with tags
    this.cosmos = new DatabaseAccount(this.stack, 'cosmos', {
      ...cosmosConfig,
      tags: this.getResourceTags(cosmosResource),
    });

    // Create Storage with tags
    this.storage = new StorageAccount(this.stack, 'storage', {
      ...storageConfig,
      tags: this.getResourceTags(storageResource),
    });

    // ... etc
  }
}
```

## Query Examples

### Find all resources synthesized together in a specific run

```kql
Resources
| where tags['atakora:synthesis-run-id'] == 'synth-20251014-153000-b8d4e2a1'
| project name, type, location, resourceGroup
| order by type, name
```

### Find all resources for a backend instance

```kql
Resources
| where tags['atakora:backend-instance'] == 'backend-colorai-b4f3a2e1'
| project name, type, location, tags
```

### Find all resources for a specific component

```kql
Resources
| where tags['atakora:component-instance'] == 'crud-feedback-a8e3f1d9'
| project name, type, tags['atakora:resource-role']
```

### Find all resources for a feature

```kql
Resources
| where tags['atakora:feature'] == 'user-management'
| summarize count() by type
```

### Cost analysis by component

```kql
Resources
| where tags['atakora:project'] == 'colorai'
| extend CostComponent = tags['atakora:cost-component']
| summarize ResourceCount = count() by CostComponent
```

### Find all production databases

```kql
Resources
| where tags['atakora:environment'] == 'prod'
| where type contains 'database'
| project name, tags['atakora:backup-policy'], tags['atakora:disaster-recovery-tier']
```

### Find resources without proper tags (compliance check)

```kql
Resources
| where tags['atakora:project'] == 'colorai'
| where isnull(tags['atakora:component-instance'])
   or isnull(tags['cost-center'])
   or isnull(tags['atakora:backup-required'])
| project name, type, resourceGroup
```

## Benefits

1. **Complete Traceability** - From manifest to individual resource
2. **Relationship Mapping** - Understand which resources work together
3. **Dynamic & Flexible** - Add fields to manifest, they become tags automatically
4. **Cost Allocation** - Track costs by project, component, feature, team
5. **Compliance** - Ensure all resources are properly tagged and categorized
6. **Operational Efficiency** - Find and manage resources easily
7. **Disaster Recovery** - Identify dependencies and recovery requirements
8. **Security** - Tag resources by security zone and requirements

## Summary

**Every resource gets tagged with:**

1. ✅ **Synthesis run ID** (unique ID for this synthesis run - groups all resources deployed together)
2. ✅ **Manifest tags** (dynamic - any field in manifest.json)
3. ✅ **Package tags** (layer, runtime, scaling profile)
4. ✅ **Backend instance hash** (unique ID for this backend)
5. ✅ **Stack identifier** (default, logging, network, etc.)
6. ✅ **Component instance** (CRUD API, function, etc.)
7. ✅ **Resource purpose** (data-storage, api-endpoint, file-storage, etc.)
8. ✅ **Lifecycle info** (created, created-by, deployment-id)
9. ✅ **Cost allocation** (cost-center, cost-component, feature)
10. ✅ **Compliance** (data-classification, backup-required, encryption)
11. ✅ **Operational** (monitoring-group, security-zone, dependencies)

**The system is:**
- **Dynamic** - Add fields to manifest, get tags automatically
- **Rule-driven** - Define custom tagging rules as needed
- **Cascading** - Tags flow from manifest → backend → stack → component → resource
- **Queryable** - Find anything by any dimension

---

**Next Steps:**
1. Review tagging hierarchy and rules
2. Identify additional cascade strategies needed
3. Implement TaggingEngine
4. Add to Backend class
5. Test with real deployments
