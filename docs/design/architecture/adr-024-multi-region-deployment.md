# ADR-024: Multi-Region Deployment Strategy

**Status:** Proposed
**Date:** 2025-11-22
**Architect:** Becky (Staff Architect)
**Stakeholders:** Grace (Synthesis), Devon (Implementation), Charlie (Testing)

---

## Context

Modern cloud applications require high availability and low latency for global users. Azure provides multi-region deployment capabilities, but implementing them correctly requires careful architectural decisions around data replication, failover, and consistency.

### Current State

The backend synthesis currently supports single-region deployments:
- All resources deployed to `backend.settings.region`
- No multi-region configuration
- No failover strategy
- No global routing

### Problem Statement

We need a multi-region deployment strategy that:

1. **Supports Global Scale:** Deploy to multiple Azure regions
2. **Ensures High Availability:** Automatic failover between regions
3. **Provides Low Latency:** Route users to nearest region
4. **Maintains Data Consistency:** Replicate data with appropriate consistency
5. **Manages Complexity:** Keep configuration simple for users
6. **Cost-Optimized:** Balance cost with availability requirements

### Use Cases

**Use Case 1: Active-Active Multi-Region**

```typescript
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'global-app',
    regions: {
      primary: 'eastus',
      secondary: ['westeurope', 'southeastasia'],
      strategy: 'active-active',
    },
  },
});

// Should deploy:
// - Cosmos DB with multi-region writes
// - Function Apps in all 3 regions
// - Traffic Manager for global routing
// - Application Insights per region
```

**Use Case 2: Active-Passive with Failover**

```typescript
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'enterprise-app',
    regions: {
      primary: 'eastus',
      secondary: ['westus'],
      strategy: 'active-passive',
      failover: {
        automatic: true,
        priority: ['eastus', 'westus'],
      },
    },
  },
});

// Should deploy:
// - Cosmos DB with automatic failover
// - Function App in primary region
// - Standby Function App in secondary
// - Traffic Manager with priority routing
```

**Use Case 3: Read Replicas**

```typescript
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'read-heavy-app',
    regions: {
      primary: 'eastus',
      readReplicas: ['westeurope', 'southeastasia'],
    },
  },
});

// Should deploy:
// - Cosmos DB with read regions
// - Function App in primary for writes
// - Read-only Function Apps in replicas
```

---

## Decision

We will implement a **tiered multi-region strategy** with three deployment patterns: single-region (default), active-passive, and active-active.

### Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                     Global Layer                            │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ Traffic Manager  │         │   Front Door     │         │
│  │                  │         │  (Optional CDN)  │         │
│  └────────┬─────────┘         └─────────┬────────┘         │
│           │                             │                  │
└───────────┼─────────────────────────────┼──────────────────┘
            │                             │
  ┌─────────┴─────────┬───────────────────┴─────────┐
  │                   │                             │
  ▼                   ▼                             ▼
┌─────────────┐  ┌─────────────┐            ┌─────────────┐
│ Region 1    │  │ Region 2    │            │ Region 3    │
│ (Primary)   │  │ (Secondary) │            │ (Secondary) │
│             │  │             │            │             │
│ ┌─────────┐ │  │ ┌─────────┐ │            │ ┌─────────┐ │
│ │Function │ │  │ │Function │ │            │ │Function │ │
│ │  App    │ │  │ │  App    │ │            │ │  App    │ │
│ └────┬────┘ │  │ └────┬────┘ │            │ └────┬────┘ │
│      │      │  │      │      │            │      │      │
│ ┌────▼────┐ │  │ ┌────▼────┐ │            │ ┌────▼────┐ │
│ │ Cosmos  │◄┼──┼─│ Cosmos  │◄┼────────────┼─│ Cosmos  │ │
│ │   DB    │ │  │ │   DB    │ │            │ │   DB    │ │
│ │(Primary)│─┼──┼─(Replica)──┼────────────┼─(Replica)──┘ │
│ └─────────┘ │  │ └─────────┘ │            │ └─────────┘ │
│             │  │             │            │             │
│ ┌─────────┐ │  │ ┌─────────┐ │            │ ┌─────────┐ │
│ │KeyVault │ │  │ │KeyVault │ │            │ │KeyVault │ │
│ │(Primary)│─┼──┼─(Replica)──┼────────────┼─(Replica)──┘ │
│ └─────────┘ │  │ └─────────┘ │            │ └─────────┘ │
└─────────────┘  └─────────────┘            └─────────────┘
```

### Configuration Schema

```typescript
/**
 * Multi-region configuration
 */
export interface MultiRegionConfig {
  /**
   * Primary region (required)
   */
  primary: AzureRegion;

  /**
   * Secondary regions (optional)
   */
  secondary?: AzureRegion[];

  /**
   * Read replica regions (optional)
   * Only for read-heavy workloads
   */
  readReplicas?: AzureRegion[];

  /**
   * Deployment strategy
   */
  strategy?: 'single-region' | 'active-passive' | 'active-active';

  /**
   * Failover configuration
   */
  failover?: {
    /**
     * Enable automatic failover
     */
    automatic: boolean;

    /**
     * Failover priority (ordered regions)
     */
    priority: AzureRegion[];

    /**
     * Manual approval required for failover
     */
    manualApproval?: boolean;
  };

  /**
   * Data replication configuration
   */
  replication?: {
    /**
     * Consistency level across regions
     */
    consistency: 'Strong' | 'BoundedStaleness' | 'Session' | 'ConsistentPrefix' | 'Eventual';

    /**
     * Replication mode
     */
    mode: 'synchronous' | 'asynchronous';

    /**
     * Conflict resolution policy
     */
    conflictResolution?: 'LastWriterWins' | 'Custom';
  };

  /**
   * Traffic routing configuration
   */
  routing?: {
    /**
     * Routing method
     */
    method: 'performance' | 'priority' | 'weighted' | 'geographic';

    /**
     * Health check configuration
     */
    healthCheck?: {
      protocol: 'HTTP' | 'HTTPS';
      path: string;
      interval: number; // seconds
      timeout: number; // seconds
    };
  };
}

/**
 * Backend settings with multi-region support
 */
export interface BackendSettings {
  name: string;

  /**
   * Single region (backward compatible)
   */
  region?: AzureRegion;

  /**
   * Multi-region configuration
   */
  regions?: MultiRegionConfig;

  // ... other settings
}
```

### Deployment Patterns

#### Pattern 1: Single Region (Default)

```typescript
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'simple-app',
    region: 'eastus', // Simple single-region
  },
});

// Deploys to:
// - eastus only
// - No failover
// - No replication
```

#### Pattern 2: Active-Passive

```typescript
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'reliable-app',
    regions: {
      primary: 'eastus',
      secondary: ['westus'],
      strategy: 'active-passive',
      failover: {
        automatic: true,
        priority: ['eastus', 'westus'],
      },
      replication: {
        consistency: 'Session',
        mode: 'asynchronous',
      },
    },
  },
});

// Deploys:
// - Primary Function App in eastus (active)
// - Standby Function App in westus (passive)
// - Cosmos DB with automatic failover
// - Traffic Manager with priority routing
// - Automatic failover on primary region failure
```

#### Pattern 3: Active-Active

```typescript
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'global-app',
    regions: {
      primary: 'eastus',
      secondary: ['westeurope', 'southeastasia'],
      strategy: 'active-active',
      replication: {
        consistency: 'BoundedStaleness',
        mode: 'asynchronous',
        conflictResolution: 'LastWriterWins',
      },
      routing: {
        method: 'performance', // Route to nearest region
        healthCheck: {
          protocol: 'HTTPS',
          path: '/health',
          interval: 30,
          timeout: 10,
        },
      },
    },
  },
});

// Deploys:
// - Function Apps in all 3 regions (all active)
// - Cosmos DB with multi-region writes
// - Traffic Manager with performance-based routing
// - Global load balancing
// - Conflict resolution for concurrent writes
```

### Resource Synthesis Strategy

```typescript
/**
 * Multi-Region Synthesizer
 *
 * Generates ARM templates for multi-region deployments
 */
export class MultiRegionSynthesizer {
  async synthesize(
    backend: BackendObject,
    context: SynthesisContext
  ): Promise<ARMTemplate[]> {
    const regionConfig = this.parseRegionConfig(backend.settings);

    // Generate templates per region
    const templates: ARMTemplate[] = [];

    // 1. Global resources (Traffic Manager, Front Door)
    if (regionConfig.strategy !== 'single-region') {
      templates.push(await this.synthesizeGlobalResources(backend, regionConfig));
    }

    // 2. Primary region
    templates.push(
      await this.synthesizeRegion(backend, regionConfig.primary, 'primary', context)
    );

    // 3. Secondary regions
    if (regionConfig.secondary) {
      for (const region of regionConfig.secondary) {
        templates.push(
          await this.synthesizeRegion(backend, region, 'secondary', context)
        );
      }
    }

    // 4. Read replicas
    if (regionConfig.readReplicas) {
      for (const region of regionConfig.readReplicas) {
        templates.push(
          await this.synthesizeRegion(backend, region, 'read-replica', context)
        );
      }
    }

    return templates;
  }

  /**
   * Synthesize global resources
   */
  private async synthesizeGlobalResources(
    backend: BackendObject,
    config: MultiRegionConfig
  ): Promise<ARMTemplate> {
    const resources: ARMResource[] = [];

    // Traffic Manager profile
    resources.push({
      type: 'Microsoft.Network/trafficManagerProfiles',
      apiVersion: '2022-04-01',
      name: `${backend.settings.name}-tm`,
      location: 'global',
      properties: {
        profileStatus: 'Enabled',
        trafficRoutingMethod: this.getRoutingMethod(config.routing?.method),
        dnsConfig: {
          relativeName: backend.settings.name,
          ttl: 60,
        },
        monitorConfig: {
          protocol: config.routing?.healthCheck?.protocol || 'HTTPS',
          port: config.routing?.healthCheck?.protocol === 'HTTPS' ? 443 : 80,
          path: config.routing?.healthCheck?.path || '/health',
          intervalInSeconds: config.routing?.healthCheck?.interval || 30,
          timeoutInSeconds: config.routing?.healthCheck?.timeout || 10,
          toleratedNumberOfFailures: 3,
        },
        endpoints: this.generateEndpoints(backend, config),
      },
    });

    return {
      $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
      contentVersion: '1.0.0.0',
      resources,
    };
  }

  /**
   * Synthesize resources for a specific region
   */
  private async synthesizeRegion(
    backend: BackendObject,
    region: AzureRegion,
    role: 'primary' | 'secondary' | 'read-replica',
    context: SynthesisContext
  ): Promise<ARMTemplate> {
    const resources: ARMResource[] = [];

    // Function App (with region suffix)
    const functionAppName = `${backend.settings.name}-${region}`;
    resources.push(await this.synthesizeFunctionApp(functionAppName, region, role));

    // Cosmos DB (primary or replica)
    if (role === 'primary') {
      resources.push(await this.synthesizeCosmosDB(backend, region, true));
    } else {
      // Add region to existing Cosmos DB
      // (done via Cosmos DB multi-region configuration)
    }

    // KeyVault (replicated)
    resources.push(await this.synthesizeKeyVault(backend, region));

    // Application Insights (per region)
    resources.push(await this.synthesizeAppInsights(backend, region));

    return {
      $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
      contentVersion: '1.0.0.0',
      resources,
    };
  }
}
```

### Cosmos DB Multi-Region Configuration

```typescript
/**
 * Cosmos DB with multi-region support
 */
{
  type: 'Microsoft.DocumentDB/databaseAccounts',
  apiVersion: '2023-04-15',
  name: `${backend.settings.name}-cosmos`,
  location: config.primary,
  kind: 'GlobalDocumentDB',
  properties: {
    databaseAccountOfferType: 'Standard',
    consistencyPolicy: {
      defaultConsistencyLevel: config.replication?.consistency || 'Session',
      maxIntervalInSeconds: 5,
      maxStalenessPrefix: 100,
    },
    locations: [
      // Primary region
      {
        locationName: config.primary,
        failoverPriority: 0,
        isZoneRedundant: environment === 'production',
      },
      // Secondary regions
      ...config.secondary.map((region, index) => ({
        locationName: region,
        failoverPriority: index + 1,
        isZoneRedundant: environment === 'production',
      })),
    ],
    enableMultipleWriteLocations: config.strategy === 'active-active',
    enableAutomaticFailover: config.failover?.automatic ?? true,
    capabilities: config.strategy === 'active-active'
      ? [{ name: 'EnableMultipleWriteLocations' }]
      : [],
  },
}
```

---

## Alternatives Considered

### Alternative 1: Deploy All Resources to All Regions

**Approach:** Duplicate every resource in every region.

**Pros:**
- Complete isolation per region
- Simple to understand
- Easy to manage independently

**Cons:**
- High cost (duplicate everything)
- Complex cross-region coordination
- Data synchronization challenges
- Resource management overhead

**Rejected because:** Too expensive and complex for most use cases.

---

### Alternative 2: Use Azure Front Door for Everything

**Approach:** Let Front Door handle all routing and failover.

**Pros:**
- Simplified routing
- Built-in WAF
- CDN capabilities
- Global load balancing

**Cons:**
- More expensive than Traffic Manager
- Overkill for simple multi-region
- Doesn't handle data replication

**Partially adopted:** Offer Front Door as optional enhancement.

---

### Alternative 3: Manual Multi-Region Backends

**Approach:** Users create separate backend per region.

**Pros:**
- Maximum control
- Simple implementation
- No multi-region logic needed

**Cons:**
- Repetitive configuration
- No automatic failover
- Users manage coordination
- Error-prone

**Rejected because:** Poor developer experience, defeats purpose of framework.

---

## Consequences

### Positive Consequences

1. **High Availability:** Automatic failover ensures uptime
2. **Low Latency:** Users routed to nearest region
3. **Scalability:** Horizontal scaling across regions
4. **Flexibility:** Three patterns support different needs
5. **Cost Control:** Can choose level of redundancy
6. **Data Protection:** Multi-region replication prevents data loss

### Negative Consequences

1. **Complexity:** Multi-region adds significant complexity
2. **Cost:** Running resources in multiple regions is expensive
3. **Consistency Trade-offs:** Multi-region writes require conflict resolution
4. **Testing:** Harder to test multi-region scenarios
5. **Monitoring:** Need to monitor multiple deployments

### Trade-offs

**Availability vs. Cost:**
- Active-active: High availability, high cost
- Active-passive: Good availability, moderate cost
- Single-region: Lower availability, lowest cost

**Consistency vs. Performance:**
- Strong consistency: Slower writes, guaranteed consistency
- Eventual consistency: Fast writes, potential conflicts

---

## Success Criteria

1. ✅ Support single-region (backward compatible)
2. ✅ Support active-passive with automatic failover
3. ✅ Support active-active with multi-region writes
4. ✅ Generate correct Cosmos DB multi-region config
5. ✅ Generate Traffic Manager configuration
6. ✅ Handle conflict resolution for multi-write
7. ✅ Provide clear documentation and examples

---

## Implementation Plan

### Phase 1: Configuration Schema (2 days)
- Define MultiRegionConfig interface
- Update BackendSettings
- Add validation

### Phase 2: Synthesis Adapter (3 days)
- Implement MultiRegionSynthesizer
- Generate global resources
- Generate per-region resources

### Phase 3: Cosmos DB Multi-Region (2 days)
- Multi-region writes configuration
- Failover configuration
- Consistency level handling

### Phase 4: Traffic Manager (2 days)
- Profile configuration
- Endpoint generation
- Health check setup

### Phase 5: Testing (3 days)
- Unit tests
- Integration tests
- Multi-region deployment tests

**Total Effort:** 12 days

---

## Documentation Requirements

1. Multi-region deployment guide
2. Pattern selection guide (when to use each)
3. Cost comparison by pattern
4. Failover testing procedures
5. Monitoring multi-region deployments

---

## Related ADRs

- ADR-023: Synthesis Strategy (foundation)
- ADR-025: Government Cloud Compliance (similar region considerations)

---

**Status:** Proposed
**Implementation Target:** Post-Sprint (Week 8-10)
