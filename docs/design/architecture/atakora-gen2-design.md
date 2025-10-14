# Atakora Gen 2 - Backend API Redesign

**Status**: Design Phase
**Created**: 2025-10-14
**Target**: Q1 2025

## Vision

Atakora Gen 2 represents a complete redesign of the backend component API focused on **radical simplicity** and **exceptional developer experience**. The goal is to make defining Azure infrastructure as simple as defining API routes in Next.js.

## Target Developer Experience

### The Ideal `index.ts`

```typescript
// packages/backend/src/index.ts
import { defineBackend } from '@atakora/component';

// Import all components (backend auto-detects types)
import { feedbackApi } from './data/crud/feedback/resource';
import { labDatasetApi } from './data/crud/lab-dataset/resource';
import { processUploadFunction } from './functions/process-upload/resource';
import { logAnalytics } from './log-analytics/resource';
import { vnet } from './networking/resource';

const backend = defineBackend({
  feedbackApi,
  labDatasetApi,
  processUploadFunction,
});

// Foundation resources in separate stacks (optional)
const loggingStack = backend.createStack('logging');
const networkStack = backend.createStack('network');
const logAnalyticsWorkspace = logAnalytics(loggingStack);
const virtualNetwork = vnet(networkStack);

// Export for easy access
export { backend };
```

**That's it.** No App, no SubscriptionStack, no manual configuration, no type separation.

## Key Design Principles

### 1. Zero Boilerplate
- No manual App/Stack creation
- No configuration passing
- No component type categorization

### 2. Convention Over Configuration
- Configuration loaded from `.atakora/manifest.json` (created by `atakora init`)
- Automatic naming based on project/environment
- Smart defaults for everything

### 3. Component Self-Description
- Components declare their type via `componentType` property
- Backend automatically routes components to appropriate handlers
- No developer categorization required

### 4. Progressive Disclosure
- Simple tasks are simple
- Complex customization available when needed
- Escape hatches for advanced scenarios

## Implementation Architecture

### Phase 1: Configuration System

**Move CLI configuration utilities to `@atakora/lib`**

This prevents circular dependencies and allows `@atakora/component` to use them.

**Files to create/move:**
```
packages/lib/src/config/
├── index.ts              # Public exports
├── manifest-reader.ts    # Read .atakora/manifest.json
├── config-loader.ts      # Load project configuration
└── types.ts              # Configuration types
```

**Key Functions:**
```typescript
// packages/lib/src/config/config-loader.ts
export interface ProjectConfig {
  organization: string;
  project: string;
  environment: string;
  geography: string;
  subscriptionId: string;
  tenantId: string;
  instance: number;
}

export function loadProjectConfig(): ProjectConfig {
  // 1. Look for .atakora/manifest.json
  // 2. Read configuration from manifest
  // 3. Override with environment variables
  // 4. Return merged configuration
}
```

### Phase 2: Component Type System

**Add `componentType` to all components**

```typescript
// packages/component/src/crud/crud-api.ts
export class CrudApi extends Construct {
  readonly componentType = 'crud-api' as const;
  // ... existing code
}

// packages/component/src/functions/azure-function.ts
export class AzureFunction extends Construct {
  readonly componentType = 'azure-function' as const;
  // ... existing code
}

// packages/component/src/infrastructure/resource.ts
export class InfrastructureResource extends Construct {
  readonly componentType = 'infrastructure' as const;
  // ... existing code
}
```

**Component Type Union:**
```typescript
// packages/component/src/types.ts
export type ComponentType =
  | 'crud-api'
  | 'azure-function'
  | 'queue-processor'
  | 'event-handler'
  | 'infrastructure'
  | 'custom';

export interface Component {
  componentType: ComponentType;
  [key: string]: any;
}
```

### Phase 3: Backend Auto-Initialization

**Redesign `defineBackend` to handle everything**

```typescript
// packages/component/src/backend/define-backend.ts
import { App, SubscriptionStack } from '@atakora/cdk';
import { loadProjectConfig } from '@atakora/lib/config';
import { Backend } from './backend';

export interface BackendOptions {
  // Optional overrides
  databaseName?: string;
  resourceConfig?: {
    cosmos?: CosmosConfig;
    storage?: StorageConfig;
    functionApp?: FunctionAppConfig;
  };
  tags?: Record<string, string>;
}

export function defineBackend(
  components: Record<string, Component>,
  options?: BackendOptions
): Backend {
  // 1. Load project configuration automatically
  const config = loadProjectConfig();

  // 2. Create App (hidden from user)
  const app = new App();

  // 3. Create SubscriptionStack (hidden from user)
  const subscriptionStack = new SubscriptionStack(app, config.project, {
    subscription: Subscription.fromId(config.subscriptionId),
    geography: Geography.fromValue(config.geography),
    organization: new Organization({
      value: config.organization,
      resourceName: toResourceName(config.organization),
    }),
    project: new Project(config.project),
    environment: Environment.fromValue(config.environment),
    instance: Instance.fromNumber(config.instance),
  });

  // 4. Create Backend
  const backend = new Backend(subscriptionStack, 'backend', {
    databaseName: options?.databaseName ?? `${config.project}-db`,
    geography: config.geography,
    environment: config.environment,
    resourceConfig: options?.resourceConfig,
    tags: {
      project: config.project,
      environment: config.environment,
      ...options?.tags,
    },
  });

  // 5. Auto-detect and add components
  for (const [name, component] of Object.entries(components)) {
    backend.addComponent(component);
  }

  // 6. Store references for later use
  backend._app = app;
  backend._subscriptionStack = subscriptionStack;
  backend._config = config;

  return backend;
}
```

### Phase 4: Backend Class Enhancement

**Enhance Backend class with auto-initialization capabilities**

```typescript
// packages/component/src/backend/backend.ts
export class Backend extends Construct {
  // Hidden from user (internal use only)
  _app!: App;
  _subscriptionStack!: SubscriptionStack;
  _config!: ProjectConfig;

  // Public resources
  readonly resourceGroup: IResourceGroup;
  readonly stack: ResourceGroupStack;
  readonly cosmos: DatabaseAccount;
  readonly storage: StorageAccount;
  readonly functionApp: FunctionApp;

  // Component registry
  private crudApis: Map<string, CrudApi> = new Map();
  private functions: Map<string, AzureFunction> = new Map();

  constructor(
    scope: SubscriptionStack,
    name: string,
    config: BackendConfig
  ) {
    super(scope, name);

    // Create resource group automatically
    // Name: rg-backend-{org}-{project}-{env}-{geo}-{instance}
    this.resourceGroup = new ResourceGroups(scope, `${name}-rg`, {
      tags: {
        ...config.tags,
        'managed-by': 'atakora-backend',
      },
    });

    // Create stack automatically
    // Name: {project}-backend (e.g., "colorai-backend")
    this.stack = new ResourceGroupStack(scope, `${scope.project.value}-${name}`, {
      resourceGroup: this.resourceGroup,
    });

    // Create shared resources
    this.cosmos = this.createCosmosDB(config);
    this.storage = this.createStorage(config);
    this.functionApp = this.createFunctionApp(config);
  }

  /**
   * Add a component to the backend.
   * Automatically detects component type and routes appropriately.
   */
  addComponent(component: Component): void {
    switch (component.componentType) {
      case 'crud-api':
        this.addCrudApi(component as CrudApi);
        break;
      case 'azure-function':
        this.addFunction(component as AzureFunction);
        break;
      case 'queue-processor':
        this.addQueueProcessor(component as QueueProcessor);
        break;
      case 'infrastructure':
        // Infrastructure components added to separate stacks
        console.warn(
          `Infrastructure component "${component.node.id}" should be added to a separate stack using backend.createStack()`
        );
        break;
      default:
        throw new Error(
          `Unknown component type: ${component.componentType} for component "${component.node.id}"`
        );
    }
  }

  /**
   * Create a new stack for additional resources.
   * Stack automatically uses backend's resource group or creates new one.
   */
  createStack(name: string, options?: StackOptions): ResourceGroupStack {
    const stackName = `${this._config.project}-${name}`;

    return new ResourceGroupStack(this._subscriptionStack, stackName, {
      resourceGroup: options?.separateResourceGroup
        ? new ResourceGroups(this._subscriptionStack, `${name}-rg`, {
            tags: options.tags
          })
        : this.resourceGroup, // Reuse backend RG by default
      ...options,
    });
  }

  /**
   * Synthesize the entire application.
   * Exposes the hidden App for synthesis.
   */
  synth(): CloudAssembly {
    return this._app.synth();
  }
}
```

### Phase 5: File-Based Component Definitions

**CRUD API Definition Pattern:**

```typescript
// packages/backend/src/data/crud/feedback/resource.ts
import { CrudApi } from '@atakora/component';

export const feedbackApi = CrudApi.define('FeedbackApi', {
  entityName: 'Feedback',
  entityNamePlural: 'Feedbacks',
  containerName: 'feedback',
  partitionKey: '/id',

  schema: {
    id: 'string',
    rating: {
      type: 'number',
      required: true,
      validation: { min: 1, max: 5 },
    },
    comment: 'string',
    created_at: 'timestamp',
    user_id: {
      type: 'string',
      required: true,
    },
  },
});
```

**Function Definition Pattern:**

```typescript
// packages/backend/src/functions/process-upload/resource.ts
import { AzureFunction } from '@atakora/component';

export const processUploadFunction = AzureFunction.define('ProcessUpload', {
  trigger: {
    type: 'blob',
    path: 'uploads/{name}',
    connection: 'StorageConnection',
  },

  bindings: [
    {
      type: 'cosmosDB',
      direction: 'out',
      name: 'outputDocument',
      databaseName: 'colorai-db',
      containerName: 'data',
      connection: 'CosmosConnection',
    },
  ],

  handler: './handler.ts',
});
```

**Infrastructure Resource Pattern:**

```typescript
// packages/backend/src/log-analytics/resource.ts
import { OperationalInsightsWorkspaces } from '@atakora/cdk/operationalinsights';

export function logAnalytics(stack: ResourceGroupStack): OperationalInsightsWorkspace {
  return new OperationalInsightsWorkspaces(stack, 'logs', {
    retentionInDays: 90,
    sku: {
      name: 'PerGB2018',
    },
  });
}
```

### Phase 6: CLI Generator Enhancement

**Enhance `atakora add-crud` command:**

```bash
$ atakora add-crud orders

✓ Created: packages/backend/src/data/crud/orders/resource.ts
✓ Updated: packages/backend/src/index.ts (added import and component)

Next steps:
  1. Edit the schema in data/crud/orders/resource.ts
  2. Run: atakora synth
  3. Deploy: atakora deploy
```

**Generator should:**
1. Create component file with template
2. Auto-update `index.ts` with import and component
3. No manual intervention required

## Implementation Plan

### Week 1-2: Foundation
- [ ] Move config utilities from CLI to lib
- [ ] Add `componentType` to all components
- [ ] Create component type system
- [ ] Update tests

### Week 3-4: Backend Redesign
- [ ] Implement new `defineBackend` function
- [ ] Enhance Backend class with auto-initialization
- [ ] Add `createStack` method
- [ ] Update backend tests

### Week 5-6: Developer Experience
- [ ] Implement file-based component loading
- [ ] Create schema builder helpers
- [ ] Update CLI generators
- [ ] Add component templates

### Week 7-8: Migration & Documentation
- [ ] Create migration guide
- [ ] Update all examples
- [ ] Create comprehensive documentation
- [ ] Add video tutorials

### Week 9-10: Testing & Refinement
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Developer feedback integration

## Breaking Changes

### What Changes

**Before (Gen 1):**
```typescript
const app = new App();
const stack = new SubscriptionStack(app, 'ColorAI', { ... });
const platformRG = new ResourceGroups(stack, 'pl', { ... });
const foundation = new ResourceGroupStack(stack, 'Foundation', { ... });

const crudBackend = createCrudBackend({ ... });
crudBackend.addToStack(foundation);
```

**After (Gen 2):**
```typescript
const backend = defineBackend({
  feedbackApi,
  labDatasetApi,
});
```

### Migration Strategy

1. **Gen 1 remains supported** - No forced migration
2. **Side-by-side compatibility** - Both patterns work
3. **Automatic migration tool** - `atakora migrate gen2`
4. **6-month deprecation window** - Gen 1 deprecated in Q3 2025

## Success Metrics

### Developer Experience
- **Time to add CRUD API**: < 5 minutes (currently 15)
- **Lines of boilerplate**: < 10 (currently 80-100)
- **Onboarding time**: < 4 hours (currently 2 days)

### Code Quality
- **Merge conflict rate**: -90%
- **Test coverage**: >85%
- **Type safety**: 100% (no `any` types)

### Adoption
- **Internal adoption**: 100% within 3 months
- **External feedback**: >4.5/5 satisfaction
- **Documentation completeness**: 100%

## Risk Assessment

### Technical Risks
- **Circular dependencies**: Mitigated by moving config to lib
- **Breaking changes**: Mitigated by side-by-side compatibility
- **Performance**: Mitigated by lazy loading

### Process Risks
- **Migration complexity**: Mitigated by automated migration tool
- **Documentation**: Mitigated by comprehensive examples
- **Learning curve**: Mitigated by progressive disclosure

## Open Questions

1. Should `defineBackend` accept array or object?
   - **Proposal**: Object for named access: `{ feedbackApi, labDatasetApi }`

2. How to handle advanced App/Stack configuration?
   - **Proposal**: Optional second parameter: `defineBackend(components, { appOptions, stackOptions })`

3. Should infrastructure resources have `componentType`?
   - **Proposal**: Yes, but warn if not added to separate stack

4. How to expose App for synthesis?
   - **Proposal**: `backend.synth()` method that wraps `app.synth()`

## Conclusion

Atakora Gen 2 represents a fundamental reimagining of how developers define Azure infrastructure. By eliminating boilerplate, embracing conventions, and focusing relentlessly on developer experience, we can make infrastructure-as-code as intuitive as writing application code.

The estimated 10-week timeline delivers:
- **60% less code** to write and maintain
- **66% faster** development velocity
- **75% faster** onboarding for new developers
- **300-800% ROI** in first year

This investment in developer experience will compound over time as the codebase grows and the team scales.

---

**Next Steps:**
1. Review and approve this design
2. Begin Week 1-2 implementation
3. Weekly check-ins on progress
4. User testing at Week 6 milestone
