# Phase 5 Implementation Plan: Infrastructure Resource Builders

**Date**: 2025-11-20
**Author**: Becky (Staff Architect)
**Phase**: 5 of 10
**Duration**: 2 weeks (10 business days)
**Status**: Ready to Begin
**Depends On**: Phase 4 (Backend Assembly)

---

## Executive Summary

Phase 5 implements the infrastructure resource builder system that creates type-safe, validated Azure resource configurations. These builders integrate with Phase 4's attachment point system, providing the actual resource configurations that get attached to backends.

**Key Innovation**: Progressive builder pattern with environment-aware defaults, Azure-specific validation, and compile-time type safety that prevents invalid configurations before deployment.

**Timeline**: 2 weeks (on schedule)

---

## 1. Architecture Overview

### 1.1 Builder System Pattern

The resource builder system uses a **fluent builder pattern** with immutability and type safety:

```typescript
// Simple usage with defaults
const db = storage.cosmosDb().name('mydb').build();

// Progressive enhancement
const db = storage
  .cosmosDb()
  .name('proddb')
  .mode('Autoscale')
  .throughput(4000, 40000)
  .consistency('Session')
  .backup((backup) => backup.enable(true).type('Continuous').retention(30))
  .multiRegion(['eastus', 'westus'])
  .when(isProduction, (db) => db.enableAnalyticalStore(true))
  .build();
```

### 1.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Resource Builder Factories                              │
│   storage.cosmosDb()                                    │
│   storage.account()                                     │
│   compute.functionApp()                                 │
│   network.vnet()                                        │
│   monitoring.appInsights()                              │
│   performance.cdn()                                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Builder Classes (extend BaseBuilder)                    │
│   ├─ CosmosDbBuilder                                    │
│   ├─ StorageAccountBuilder                              │
│   ├─ FunctionAppBuilder                                 │
│   ├─ VNetBuilder                                        │
│   └─ ... (15+ builders)                                 │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Configuration State Management                          │
│   ├─ Type-safe configuration objects                    │
│   ├─ Immutable state (no mutation after build)          │
│   ├─ Nested builder support                             │
│   └─ Default values by environment                      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Validation Layer                                        │
│   ├─ Azure naming conventions                           │
│   ├─ SKU compatibility                                  │
│   ├─ Region availability                                │
│   ├─ Feature compatibility                              │
│   └─ Required property checks                           │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Build Output                                            │
│   ├─ Type-safe configuration objects                    │
│   ├─ Ready for attachment to Phase 4 backend            │
│   ├─ Ready for Phase 7 synthesis to ARM JSON            │
│   └─ Includes metadata for validation                   │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Key Design Decisions

1. **Fluent Builder Pattern**: All builders extend `BaseBuilder<TConfig>` for consistency
2. **Type-Safe Configuration**: Compile-time checking prevents invalid configs
3. **Environment Awareness**: Builders can detect environment and apply appropriate defaults
4. **Azure Validation**: Builders validate Azure-specific constraints (naming, SKUs, regions)
5. **Nested Builders**: Complex configurations use nested builders (e.g., backup config)
6. **Preset Configurations**: Common patterns available as presets (`.reliable()`, `.highThroughput()`)
7. **Immutable Output**: `.build()` returns frozen configuration object
8. **Fail Fast**: Validation happens at build time, not deployment time

---

## 2. Builder Architecture Design

### 2.1 Base Builder Extension

All resource builders extend the existing `BaseBuilder<TConfig>`:

```typescript
// src/infrastructure/builders/base-resource-builder.ts

import { BaseBuilder } from '../../common/builder';

/**
 * Base class for all infrastructure resource builders
 */
export abstract class BaseResourceBuilder<
  TConfig extends ResourceConfig,
> extends BaseBuilder<TConfig> {
  /**
   * Build and freeze the configuration
   */
  build(): Readonly<TConfig> {
    // Run validation
    this.validate();

    // Validate Azure-specific constraints
    this.validateAzure();

    // Return frozen config (immutable)
    return Object.freeze(this.getConfigClone());
  }

  /**
   * Azure-specific validation (override in subclasses)
   */
  protected validateAzure(): void {
    // Default: no Azure validation
    // Subclasses override to add Azure-specific checks
  }

  /**
   * Get environment-specific defaults
   */
  protected getEnvironmentDefaults(): Partial<TConfig> {
    const env = this.detectEnvironment();
    return this.getDefaultsForEnvironment(env);
  }

  /**
   * Detect current environment
   */
  protected detectEnvironment(): Environment {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    const envVar = process.env.ENVIRONMENT?.toLowerCase();

    if (nodeEnv === 'production' || envVar === 'production') {
      return 'production';
    } else if (nodeEnv === 'staging' || envVar === 'staging') {
      return 'staging';
    } else {
      return 'development';
    }
  }

  /**
   * Get defaults for specific environment (override in subclasses)
   */
  protected abstract getDefaultsForEnvironment(env: Environment): Partial<TConfig>;
}

/**
 * Base configuration interface for all resources
 */
export interface ResourceConfig {
  readonly resourceType: string;
  readonly name: string;
  readonly region?: string;
  readonly tags?: Record<string, string>;
}

export type Environment = 'development' | 'staging' | 'production';
```

### 2.2 Type Safety Strategy

**Approach**: Use TypeScript's type system to enforce correctness at compile-time:

```typescript
// 1. Discriminated unions for mode-specific configs
type CosmosDbConfig =
  | { mode: 'Serverless'; throughput?: never }
  | { mode: 'Provisioned'; throughput: number }
  | { mode: 'Autoscale'; throughput: { min: number; max: number } };

// 2. Conditional types for feature availability
type BackupConfig<T extends CosmosDbMode> = T extends 'Serverless'
  ? { enable: false } // Serverless doesn't support backup
  : { enable: boolean; type?: 'Continuous' | 'Periodic'; retention?: number };

// 3. Branded types for Azure-specific values
type CosmosDbName = string & { readonly __brand: 'CosmosDbName' };
type Region = string & { readonly __brand: 'AzureRegion' };

// 4. Builder return types that track state
interface CosmosDbBuilderWithName<T> {
  mode(mode: 'Serverless'): CosmosDbBuilderServerless;
  mode(mode: 'Provisioned'): CosmosDbBuilderProvisioned;
  mode(mode: 'Autoscale'): CosmosDbBuilderAutoscale;
}

// This ensures you can't call .throughput() on serverless mode
interface CosmosDbBuilderServerless {
  throughput(): never; // Compile error
  consistency(level: ConsistencyLevel): this;
  build(): CosmosDbConfig;
}
```

### 2.3 Validation Strategy

**Three-Layer Validation**:

1. **Compile-Time (TypeScript)**:
   - Type checking prevents invalid method calls
   - Discriminated unions enforce mode-specific configs
   - Required properties checked via types

2. **Build-Time (JavaScript)**:
   - Azure naming conventions (length, characters, uniqueness)
   - SKU compatibility (e.g., premium features require premium SKU)
   - Region availability (e.g., certain features not available in all regions)
   - Value ranges (e.g., throughput min/max)
   - Required property presence

3. **Runtime (Validation Library)**:
   - Deep validation of nested configs
   - Cross-field validation (e.g., min < max)
   - Environment-specific validation

**Validation Error Messages**:

```typescript
class AzureValidationError extends Error {
  constructor(
    public readonly resourceType: string,
    public readonly field: string,
    public readonly value: any,
    public readonly constraint: string,
    public readonly suggestion?: string
  ) {
    super(
      `Invalid ${field} for ${resourceType}: ${value}. ${constraint}${suggestion ? `. Suggestion: ${suggestion}` : ''}`
    );
  }
}

// Example usage
throw new AzureValidationError(
  'CosmosDB',
  'name',
  'my_database',
  'Name must contain only lowercase letters, numbers, and hyphens',
  'Use "my-database" instead'
);
```

### 2.4 Default Configuration Strategy

**Environment-Aware Defaults**:

```typescript
// Each builder provides defaults for each environment
class CosmosDbBuilder extends BaseResourceBuilder<CosmosDbConfig> {
  protected getDefaultsForEnvironment(env: Environment): Partial<CosmosDbConfig> {
    switch (env) {
      case 'development':
        return {
          mode: 'Serverless',
          consistency: 'Session',
          backup: { enable: false },
          publicNetworkAccess: 'Enabled', // Dev convenience
        };

      case 'staging':
        return {
          mode: 'Provisioned',
          throughput: 1000,
          consistency: 'Session',
          backup: { enable: true, type: 'Periodic', retention: 7 },
          publicNetworkAccess: 'Disabled',
        };

      case 'production':
        return {
          mode: 'Autoscale',
          throughput: { min: 4000, max: 40000 },
          consistency: 'Session',
          backup: { enable: true, type: 'Continuous', retention: 30 },
          publicNetworkAccess: 'Disabled',
          multiRegion: true,
          enableAnalyticalStore: true,
        };
    }
  }
}
```

**Override Strategy**:

```
User-specified values > Environment defaults > Builder defaults
```

**Documentation Strategy**:

````typescript
/**
 * Configure Cosmos DB backup
 *
 * @default Development: Disabled
 * @default Staging: Periodic, 7 days retention
 * @default Production: Continuous, 30 days retention
 *
 * @param configure - Backup configuration function
 *
 * @example
 * ```typescript
 * db.backup(backup => backup
 *   .enable(true)
 *   .type('Continuous')
 *   .retention(90)
 * )
 * ```
 */
backup(configure: (builder: BackupBuilder) => BackupBuilder): this {
  const builder = new BackupBuilder();
  const configured = configure(builder);
  this.config.backup = configured.build();
  return this;
}
````

---

## 3. Resource Builder Specifications

### 3.1 Storage Builders

#### CosmosDB Builder

**File**: `src/infrastructure/builders/storage/cosmos-db-builder.ts`

**API Design**:

```typescript
export class CosmosDbBuilder extends BaseResourceBuilder<CosmosDbConfig> {
  // Required configuration
  name(value: string): this;

  // Mode configuration (affects available methods)
  mode(mode: 'Serverless'): CosmosDbBuilderServerless;
  mode(mode: 'Provisioned'): CosmosDbBuilderProvisioned;
  mode(mode: 'Autoscale'): CosmosDbBuilderAutoscale;

  // Common configuration
  consistency(
    level: 'Eventual' | 'Session' | 'BoundedStaleness' | 'Strong' | 'ConsistentPrefix'
  ): this;
  region(region: string): this;
  multiRegion(regions: string[]): this;

  // Backup configuration
  backup(configure: (builder: BackupBuilder) => BackupBuilder): this;

  // Advanced features
  enableAnalyticalStore(enable: boolean): this;
  enableFreeTier(enable: boolean): this;
  publicNetworkAccess(access: 'Enabled' | 'Disabled'): this;

  // Network configuration
  networkRules(configure: (builder: NetworkRulesBuilder) => NetworkRulesBuilder): this;

  // Tags
  tag(key: string, value: string): this;
  tags(tags: Record<string, string>): this;

  // Presets
  serverless(): this; // Quick serverless config
  production(): this; // Production best practices

  // Build
  build(): Readonly<CosmosDbConfig>;
}

export interface CosmosDbConfig extends ResourceConfig {
  resourceType: 'Microsoft.DocumentDB/databaseAccounts';
  mode: 'Serverless' | 'Provisioned' | 'Autoscale';
  throughput?: number | { min: number; max: number };
  consistency: ConsistencyLevel;
  backup: BackupConfig;
  multiRegion?: string[];
  enableAnalyticalStore?: boolean;
  enableFreeTier?: boolean;
  publicNetworkAccess: 'Enabled' | 'Disabled';
  networkRules?: NetworkRulesConfig;
}
```

**Validation Rules**:

```typescript
protected validateAzure(): void {
  // Name validation
  this.validateName(this.config.name, {
    minLength: 3,
    maxLength: 44,
    pattern: /^[a-z0-9-]+$/,
    description: 'Cosmos DB account names must be 3-44 characters, lowercase letters, numbers, and hyphens only'
  });

  // Throughput validation
  if (this.config.mode === 'Provisioned' && this.config.throughput) {
    if (this.config.throughput < 400 || this.config.throughput > 1000000) {
      throw new AzureValidationError(
        'CosmosDB',
        'throughput',
        this.config.throughput,
        'Provisioned throughput must be between 400 and 1,000,000 RU/s'
      );
    }
  }

  if (this.config.mode === 'Autoscale' && typeof this.config.throughput === 'object') {
    const { min, max } = this.config.throughput;
    if (min < 1000 || max > 1000000) {
      throw new AzureValidationError(
        'CosmosDB',
        'throughput',
        `${min}-${max}`,
        'Autoscale throughput must be between 1,000 and 1,000,000 RU/s'
      );
    }
    if (min >= max) {
      throw new AzureValidationError(
        'CosmosDB',
        'throughput',
        `${min}-${max}`,
        'Minimum throughput must be less than maximum'
      );
    }
  }

  // Multi-region validation
  if (this.config.multiRegion && this.config.multiRegion.length > 0) {
    const validRegions = getAzureRegions();
    for (const region of this.config.multiRegion) {
      if (!validRegions.includes(region)) {
        throw new AzureValidationError(
          'CosmosDB',
          'multiRegion',
          region,
          `Invalid Azure region: ${region}`,
          `Valid regions: ${validRegions.join(', ')}`
        );
      }
    }
  }

  // Free tier validation
  if (this.config.enableFreeTier && this.config.mode !== 'Provisioned') {
    throw new AzureValidationError(
      'CosmosDB',
      'enableFreeTier',
      true,
      'Free tier is only available with Provisioned mode',
      'Set mode to "Provisioned" or disable free tier'
    );
  }
}
```

**Default Configurations**:

```typescript
protected getDefaultsForEnvironment(env: Environment): Partial<CosmosDbConfig> {
  const base: Partial<CosmosDbConfig> = {
    resourceType: 'Microsoft.DocumentDB/databaseAccounts',
    consistency: 'Session',
  };

  switch (env) {
    case 'development':
      return {
        ...base,
        mode: 'Serverless',
        backup: { enable: false },
        publicNetworkAccess: 'Enabled',
        enableFreeTier: true,
      };

    case 'staging':
      return {
        ...base,
        mode: 'Provisioned',
        throughput: 1000,
        backup: { enable: true, type: 'Periodic', retention: 7 },
        publicNetworkAccess: 'Disabled',
      };

    case 'production':
      return {
        ...base,
        mode: 'Autoscale',
        throughput: { min: 4000, max: 40000 },
        backup: { enable: true, type: 'Continuous', retention: 30 },
        publicNetworkAccess: 'Disabled',
        enableAnalyticalStore: true,
      };
  }
}
```

**Usage Examples**:

```typescript
// Development - minimal config
const devDb = storage.cosmosDb()
  .name('dev-db')
  .build();
// Result: Serverless, Session consistency, no backup, public access

// Staging - balanced config
const stageDb = storage.cosmosDb()
  .name('stage-db')
  .mode('Provisioned')
  .throughput(2000)
  .build();
// Result: Provisioned 2K RU/s, periodic backup, private access

// Production - full config
const prodDb = storage.cosmosDb()
  .name('prod-db')
  .mode('Autoscale')
  .throughput(4000, 40000)
  .consistency('BoundedStaleness')
  .backup(backup => backup
    .enable(true)
    .type('Continuous')
    .retention(90)
  )
  .multiRegion(['eastus', 'westus', 'northeurope'])
  .enableAnalyticalStore(true)
  .networkRules(rules => rules
    .defaultAction('Deny')
    .allowAzureServices(true)
    .allowIpRanges(['10.0.0.0/8'])
  )
  .tags({
    environment: 'production',
    cost-center: 'engineering',
  })
  .build();
```

---

#### Storage Account Builder

**File**: `src/infrastructure/builders/storage/storage-account-builder.ts`

**API Design**:

```typescript
export class StorageAccountBuilder extends BaseResourceBuilder<StorageAccountConfig> {
  // Required
  name(value: string): this;

  // SKU configuration
  sku(sku: 'Standard_LRS' | 'Standard_GRS' | 'Standard_ZRS' | 'Premium_LRS'): this;

  // Access tier
  tier(tier: 'Hot' | 'Cool' | 'Archive'): this;

  // Encryption
  encryption(type: 'Microsoft.Storage' | 'Microsoft.Keyvault'): this;

  // Network configuration
  networkRules(configure: (builder: NetworkRulesBuilder) => NetworkRulesBuilder): this;
  publicNetworkAccess(access: 'Enabled' | 'Disabled'): this;

  // Advanced features
  enableHierarchicalNamespace(enable: boolean): this; // Data Lake Gen2
  enableSftp(enable: boolean): this;
  enableNfsV3(enable: boolean): this;

  // Container configuration
  container(name: string, configure?: (builder: ContainerBuilder) => ContainerBuilder): this;

  // Blob configuration
  enableBlobVersioning(enable: boolean): this;
  enableChangeFeed(enable: boolean): this;

  // Lifecycle management
  lifecycle(configure: (builder: LifecycleBuilder) => LifecycleBuilder): this;

  // Tags
  tag(key: string, value: string): this;
  tags(tags: Record<string, string>): this;

  // Presets
  dataLake(): this; // Data Lake Gen2 config
  secure(): this; // Security best practices

  build(): Readonly<StorageAccountConfig>;
}

export interface StorageAccountConfig extends ResourceConfig {
  resourceType: 'Microsoft.Storage/storageAccounts';
  sku: StorageAccountSku;
  tier: 'Hot' | 'Cool' | 'Archive';
  encryption: EncryptionConfig;
  networkRules?: NetworkRulesConfig;
  publicNetworkAccess: 'Enabled' | 'Disabled';
  enableHierarchicalNamespace?: boolean;
  enableSftp?: boolean;
  enableNfsV3?: boolean;
  containers?: ContainerConfig[];
  blobVersioning?: boolean;
  changeFeed?: boolean;
  lifecycle?: LifecycleConfig;
}
```

**Validation Rules**:

```typescript
protected validateAzure(): void {
  // Name validation (strict for storage accounts)
  this.validateName(this.config.name, {
    minLength: 3,
    maxLength: 24,
    pattern: /^[a-z0-9]+$/,
    description: 'Storage account names must be 3-24 characters, lowercase letters and numbers only (no hyphens)'
  });

  // SKU + feature validation
  if (this.config.enableNfsV3 && !this.config.sku.startsWith('Premium')) {
    throw new AzureValidationError(
      'StorageAccount',
      'enableNfsV3',
      true,
      'NFSv3 requires Premium SKU',
      'Use Premium_LRS or disable NFSv3'
    );
  }

  if (this.config.enableHierarchicalNamespace && this.config.tier === 'Archive') {
    throw new AzureValidationError(
      'StorageAccount',
      'tier',
      'Archive',
      'Data Lake Gen2 (hierarchical namespace) not compatible with Archive tier',
      'Use Hot or Cool tier'
    );
  }
}
```

---

### 3.2 Compute Builders

#### Function App Builder

**File**: `src/infrastructure/builders/compute/function-app-builder.ts`

**API Design**:

```typescript
export class FunctionAppBuilder extends BaseResourceBuilder<FunctionAppConfig> {
  // Required
  name(value: string): this;

  // Hosting plan
  plan(plan: 'Consumption' | 'Premium' | 'Dedicated', sku?: string): this;

  // Runtime
  runtime(runtime: 'node' | 'python' | 'dotnet' | 'java', version: string): this;

  // Scaling
  alwaysOn(enable: boolean): this;
  minInstances(count: number): this;
  maxInstances(count: number): this;

  // Health monitoring
  healthCheck(path: string): this;

  // Environment variables
  env(key: string, value: string): this;
  envVars(vars: Record<string, string>): this;

  // Storage binding
  storageAccount(account: StorageAccountConfig): this;

  // Application Insights
  appInsights(insights: AppInsightsConfig): this;

  // VNet integration
  vnet(vnetConfig: VNetConfig): this;

  // Deployment
  deploymentSlots(slots: string[]): this;

  // Tags
  tag(key: string, value: string): this;
  tags(tags: Record<string, string>): this;

  // Presets
  serverless(): this; // Consumption plan, minimal config
  premium(): this; // Premium plan, production settings

  build(): Readonly<FunctionAppConfig>;
}

export interface FunctionAppConfig extends ResourceConfig {
  resourceType: 'Microsoft.Web/sites';
  kind: 'functionapp';
  plan: FunctionAppPlan;
  runtime: RuntimeConfig;
  scaling: ScalingConfig;
  healthCheck?: string;
  environmentVariables?: Record<string, string>;
  storageAccount?: string; // Reference to storage account
  appInsights?: string; // Reference to App Insights
  vnetIntegration?: VNetIntegrationConfig;
  deploymentSlots?: string[];
}
```

**Validation Rules**:

```typescript
protected validateAzure(): void {
  // Name validation
  this.validateName(this.config.name, {
    minLength: 2,
    maxLength: 60,
    pattern: /^[a-zA-Z0-9-]+$/,
    description: 'Function app names must be 2-60 characters, letters, numbers, and hyphens'
  });

  // Plan + feature validation
  if (this.config.plan.type === 'Consumption' && this.config.scaling.alwaysOn) {
    throw new AzureValidationError(
      'FunctionApp',
      'alwaysOn',
      true,
      'Always On is not available on Consumption plan',
      'Use Premium or Dedicated plan for Always On'
    );
  }

  if (this.config.plan.type === 'Consumption' && this.config.vnetIntegration) {
    throw new AzureValidationError(
      'FunctionApp',
      'vnetIntegration',
      this.config.vnetIntegration,
      'VNet integration requires Premium or Dedicated plan',
      'Upgrade to Premium plan for VNet integration'
    );
  }

  // Scaling validation
  if (this.config.scaling.minInstances && this.config.scaling.maxInstances) {
    if (this.config.scaling.minInstances > this.config.scaling.maxInstances) {
      throw new AzureValidationError(
        'FunctionApp',
        'scaling',
        `min: ${this.config.scaling.minInstances}, max: ${this.config.scaling.maxInstances}`,
        'Minimum instances must be less than or equal to maximum instances'
      );
    }
  }
}
```

---

### 3.3 Network Builders

#### VNet Builder

**File**: `src/infrastructure/builders/network/vnet-builder.ts`

**API Design**:

```typescript
export class VNetBuilder extends BaseResourceBuilder<VNetConfig> {
  // Required
  name(value: string): this;
  addressSpace(cidr: string): this;

  // Subnets
  subnet(name: string, configure: (builder: SubnetBuilder) => SubnetBuilder): this;
  subnets(configs: SubnetConfig[]): this;

  // DNS
  dnsServers(servers: string[]): this;

  // DDoS Protection
  ddosProtection(enable: boolean, planId?: string): this;

  // Peering
  peer(vnetId: string, allowForwarding?: boolean): this;

  // Tags
  tag(key: string, value: string): this;
  tags(tags: Record<string, string>): this;

  // Presets
  standard(): this; // Standard VNet with common subnets
  isolated(): this; // Isolated VNet with strict NSGs

  build(): Readonly<VNetConfig>;
}

export interface VNetConfig extends ResourceConfig {
  resourceType: 'Microsoft.Network/virtualNetworks';
  addressSpace: string[];
  subnets: SubnetConfig[];
  dnsServers?: string[];
  ddosProtection?: DdosProtectionConfig;
  peerings?: VNetPeeringConfig[];
}
```

**Validation Rules**:

```typescript
protected validateAzure(): void {
  // Name validation
  this.validateName(this.config.name, {
    minLength: 2,
    maxLength: 64,
    pattern: /^[a-zA-Z0-9-_.]+$/,
    description: 'VNet names must be 2-64 characters, letters, numbers, hyphens, underscores, and periods'
  });

  // Address space validation
  for (const cidr of this.config.addressSpace) {
    if (!this.isValidCidr(cidr)) {
      throw new AzureValidationError(
        'VNet',
        'addressSpace',
        cidr,
        'Invalid CIDR notation',
        'Use format like "10.0.0.0/16"'
      );
    }
  }

  // Subnet validation
  for (const subnet of this.config.subnets) {
    // Ensure subnet is within VNet address space
    if (!this.isSubnetInAddressSpace(subnet.addressPrefix, this.config.addressSpace)) {
      throw new AzureValidationError(
        'VNet',
        'subnet',
        `${subnet.name}: ${subnet.addressPrefix}`,
        'Subnet address prefix is not within VNet address space'
      );
    }

    // Ensure subnets don't overlap
    for (const otherSubnet of this.config.subnets) {
      if (subnet !== otherSubnet && this.subnetsOverlap(subnet.addressPrefix, otherSubnet.addressPrefix)) {
        throw new AzureValidationError(
          'VNet',
          'subnet',
          `${subnet.name} and ${otherSubnet.name}`,
          'Subnet address prefixes overlap'
        );
      }
    }
  }
}
```

---

### 3.4 Monitoring Builders

#### Application Insights Builder

**File**: `src/infrastructure/builders/monitoring/app-insights-builder.ts`

**API Design**:

```typescript
export class AppInsightsBuilder extends BaseResourceBuilder<AppInsightsConfig> {
  // Required
  name(value: string): this;

  // Workspace integration
  workspace(workspaceId: string): this;

  // Sampling
  samplingPercentage(percentage: number): this;

  // Retention
  retentionDays(days: number): this;

  // Features
  enableLiveMetrics(enable: boolean): this;
  enableProfiler(enable: boolean): this;
  enableDebugger(enable: boolean): this;

  // Alerts (creates alert rules)
  alertOnResponseTime(threshold: number): this;
  alertOnErrorRate(threshold: number): this;
  alertOnAvailability(threshold: number): this;

  // Public network access
  publicNetworkAccess(access: 'Enabled' | 'Disabled'): this;

  // Tags
  tag(key: string, value: string): this;
  tags(tags: Record<string, string>): this;

  // Presets
  development(): this; // Minimal sampling, short retention
  production(): this; // Full features, long retention

  build(): Readonly<AppInsightsConfig>;
}

export interface AppInsightsConfig extends ResourceConfig {
  resourceType: 'Microsoft.Insights/components';
  applicationType: 'web';
  workspaceId?: string;
  samplingPercentage: number;
  retentionDays: number;
  enableLiveMetrics: boolean;
  enableProfiler: boolean;
  enableDebugger: boolean;
  publicNetworkAccess: 'Enabled' | 'Disabled';
  alertRules?: AlertRuleConfig[];
}
```

---

### 3.5 Performance Builders

#### CDN Builder

**File**: `src/infrastructure/builders/performance/cdn-builder.ts`

**API Design**:

```typescript
export class CdnBuilder extends BaseResourceBuilder<CdnConfig> {
  // Required
  name(value: string): this;

  // Profile configuration
  profile(
    sku: 'Standard_Microsoft' | 'Standard_Akamai' | 'Standard_Verizon' | 'Premium_Verizon'
  ): this;

  // Origin configuration
  origin(url: string): this;

  // Caching
  caching(policy: 'Standard' | 'Bypass' | 'Override'): this;
  cacheDuration(duration: Duration): this;

  // Query string caching
  queryStringCaching(behavior: 'IgnoreQueryString' | 'BypassCaching' | 'UseQueryString'): this;

  // Compression
  compression(enable: boolean, types?: string[]): this;

  // Custom domains
  customDomain(domain: string, httpsEnabled?: boolean): this;

  // Geo-filtering
  geoFilter(action: 'Allow' | 'Block', countries: string[]): this;

  // Tags
  tag(key: string, value: string): this;
  tags(tags: Record<string, string>): this;

  build(): Readonly<CdnConfig>;
}

export interface CdnConfig extends ResourceConfig {
  resourceType: 'Microsoft.Cdn/profiles';
  sku: CdnSku;
  origin: OriginConfig;
  caching: CachingConfig;
  compression: CompressionConfig;
  customDomains?: CustomDomainConfig[];
  geoFilters?: GeoFilterConfig[];
}
```

---

## 4. Implementation Tasks

### Task Breakdown (18 tasks total)

#### Task 1: Base Resource Builder [Day 1]

**Owner**: Devon-Infrastructure-1
**Files**:

- `src/infrastructure/builders/base-resource-builder.ts`
- `src/infrastructure/builders/types.ts`
- `src/infrastructure/builders/validation.ts`

**Deliverables**:

- `BaseResourceBuilder` class extending `BaseBuilder`
- Common validation utilities
- Environment detection logic
- Azure naming validation helpers

**Success Criteria**:

- Extends `BaseBuilder` correctly
- Environment detection works
- Validation helpers functional
- Type safety maintained

---

#### Task 2: CosmosDB Builder [Day 1-2]

**Owner**: Devon-Infrastructure-2
**Files**:

- `src/infrastructure/builders/storage/cosmos-db-builder.ts`
- `src/infrastructure/builders/storage/cosmos-db-types.ts`

**Deliverables**:

- `CosmosDbBuilder` class
- Type-safe mode switching
- Backup nested builder
- Network rules nested builder
- Azure validation

**Success Criteria**:

- All modes supported (Serverless, Provisioned, Autoscale)
- Validation prevents invalid configs
- Environment defaults work
- Type inference correct

---

#### Task 3: Storage Account Builder [Day 2-3]

**Owner**: Devon-Infrastructure-3
**Files**:

- `src/infrastructure/builders/storage/storage-account-builder.ts`
- `src/infrastructure/builders/storage/storage-account-types.ts`

**Deliverables**:

- `StorageAccountBuilder` class
- Container nested builder
- Lifecycle nested builder
- Network rules integration
- SKU validation

**Success Criteria**:

- All SKUs supported
- Feature compatibility validated
- Container configuration works
- Lifecycle rules functional

---

#### Task 4: Queue Builder [Day 3]

**Owner**: Devon-Infrastructure-4
**Files**:

- `src/infrastructure/builders/storage/queue-builder.ts`
- `src/infrastructure/builders/storage/queue-types.ts`

**Deliverables**:

- `QueueBuilder` class (refactor existing)
- Dead letter queue support
- Retry policy configuration
- Message TTL configuration

**Success Criteria**:

- Integrates with existing queue pattern
- Validates queue settings
- Supports both Storage Queue and Service Bus Queue
- Presets work (.reliable(), .highThroughput())

---

#### Task 5: Blob Container Builder [Day 3]

**Owner**: Devon-Infrastructure-5
**Files**:

- `src/infrastructure/builders/storage/container-builder.ts`
- `src/infrastructure/builders/storage/container-types.ts`

**Deliverables**:

- `ContainerBuilder` class
- Access level configuration
- Metadata support
- Lifecycle rules

**Success Criteria**:

- Public/private access works
- Metadata validation
- Lifecycle integration
- Immutable storage support

---

#### Task 6: Function App Builder [Day 4]

**Owner**: Devon-Infrastructure-1 (continuation)
**Files**:

- `src/infrastructure/builders/compute/function-app-builder.ts`
- `src/infrastructure/builders/compute/function-app-types.ts`

**Deliverables**:

- `FunctionAppBuilder` class
- Plan configuration (Consumption, Premium, Dedicated)
- Runtime configuration
- Scaling configuration
- VNet integration support

**Success Criteria**:

- All plans supported
- Feature validation per plan
- Scaling rules work
- Runtime validation

---

#### Task 7: App Service Plan Builder [Day 4]

**Owner**: Devon-Infrastructure-2 (continuation)
**Files**:

- `src/infrastructure/builders/compute/app-service-plan-builder.ts`
- `src/infrastructure/builders/compute/app-service-plan-types.ts`

**Deliverables**:

- `AppServicePlanBuilder` class
- SKU configuration
- OS selection (Windows/Linux)
- Auto-scaling rules
- Zone redundancy

**Success Criteria**:

- All SKUs supported
- OS compatibility validated
- Auto-scaling rules functional
- Zone redundancy works

---

#### Task 8: VNet Builder [Day 5]

**Owner**: Devon-Infrastructure-3 (continuation)
**Files**:

- `src/infrastructure/builders/network/vnet-builder.ts`
- `src/infrastructure/builders/network/vnet-types.ts`

**Deliverables**:

- `VNetBuilder` class
- Subnet nested builder
- Address space validation
- Peering configuration
- DDoS protection integration

**Success Criteria**:

- Address space validation works
- Subnets don't overlap
- Peering configuration correct
- DDoS integration works

---

#### Task 9: Network Security Group Builder [Day 5]

**Owner**: Devon-Infrastructure-4 (continuation)
**Files**:

- `src/infrastructure/builders/network/nsg-builder.ts`
- `src/infrastructure/builders/network/nsg-types.ts`

**Deliverables**:

- `NsgBuilder` class
- Security rule nested builder
- Priority management
- Common rule presets (.allowHttp(), .allowHttps(), .allowSsh())

**Success Criteria**:

- Security rules validated
- Priority conflicts detected
- Presets work
- Direction validation

---

#### Task 10: WAF Builder [Day 6]

**Owner**: Devon-Infrastructure-5 (continuation)
**Files**:

- `src/infrastructure/builders/network/waf-builder.ts`
- `src/infrastructure/builders/network/waf-types.ts`

**Deliverables**:

- `WafBuilder` class
- Policy configuration
- Rule set selection
- Custom rules support
- Mode configuration (Detection/Prevention)

**Success Criteria**:

- Policy modes work
- Rule sets validated
- Custom rules functional
- OWASP integration

---

#### Task 11: Application Insights Builder [Day 6]

**Owner**: Devon-Infrastructure-1 (continuation)
**Files**:

- `src/infrastructure/builders/monitoring/app-insights-builder.ts`
- `src/infrastructure/builders/monitoring/app-insights-types.ts`

**Deliverables**:

- `AppInsightsBuilder` class
- Sampling configuration
- Retention configuration
- Alert rule integration
- Live Metrics configuration

**Success Criteria**:

- Sampling percentage validated
- Retention days validated
- Alert rules created
- Live Metrics works

---

#### Task 12: Log Analytics Builder [Day 7]

**Owner**: Devon-Infrastructure-2 (continuation)
**Files**:

- `src/infrastructure/builders/monitoring/log-analytics-builder.ts`
- `src/infrastructure/builders/monitoring/log-analytics-types.ts`

**Deliverables**:

- `LogAnalyticsBuilder` class
- SKU configuration
- Retention configuration
- Data sources integration
- Diagnostic settings

**Success Criteria**:

- All SKUs supported
- Retention validated
- Data sources work
- Diagnostic integration

---

#### Task 13: Alert Rules Builder [Day 7]

**Owner**: Devon-Infrastructure-3 (continuation)
**Files**:

- `src/infrastructure/builders/monitoring/alert-rules-builder.ts`
- `src/infrastructure/builders/monitoring/alert-rules-types.ts`

**Deliverables**:

- `AlertRulesBuilder` class
- Metric alerts
- Log alerts
- Action groups
- Threshold configuration

**Success Criteria**:

- Metric alerts work
- Log query validation
- Action groups created
- Thresholds validated

---

#### Task 14: CDN Builder [Day 8]

**Owner**: Devon-Infrastructure-4 (continuation)
**Files**:

- `src/infrastructure/builders/performance/cdn-builder.ts`
- `src/infrastructure/builders/performance/cdn-types.ts`

**Deliverables**:

- `CdnBuilder` class
- Profile configuration
- Endpoint configuration
- Caching rules
- Custom domain support

**Success Criteria**:

- All SKUs supported
- Caching rules work
- Custom domains validated
- Geo-filtering functional

---

#### Task 15: Redis Cache Builder [Day 8]

**Owner**: Devon-Infrastructure-5 (continuation)
**Files**:

- `src/infrastructure/builders/performance/redis-cache-builder.ts`
- `src/infrastructure/builders/performance/redis-cache-types.ts`

**Deliverables**:

- `RedisCacheBuilder` class
- SKU configuration
- Persistence configuration
- Clustering support
- Firewall rules

**Success Criteria**:

- All SKUs supported
- Persistence validated
- Clustering works
- Firewall rules functional

---

#### Task 16: Rate Limiting Builder [Day 9]

**Owner**: Devon-Infrastructure-1 (continuation)
**Files**:

- `src/infrastructure/builders/performance/rate-limit-builder.ts`
- `src/infrastructure/builders/performance/rate-limit-types.ts`

**Deliverables**:

- `RateLimitBuilder` class
- Request limits configuration
- Burst size configuration
- Time window configuration
- IP-based limits

**Success Criteria**:

- Request limits work
- Burst size validated
- Time windows correct
- IP filtering functional

---

#### Task 17: Builder Factory Functions [Day 9-10]

**Owner**: Devon-Infrastructure-2 (continuation)
**Files**:

- `src/infrastructure/builders/storage/index.ts`
- `src/infrastructure/builders/compute/index.ts`
- `src/infrastructure/builders/network/index.ts`
- `src/infrastructure/builders/monitoring/index.ts`
- `src/infrastructure/builders/performance/index.ts`

**Deliverables**:

- Factory functions for all builders
- Namespace organization (`storage.*`, `compute.*`, etc.)
- Type exports
- Documentation

**Success Criteria**:

- Clean namespace API
- Type inference works
- Documentation complete
- Examples provided

---

#### Task 18: Integration with Phase 4 [Day 10]

**Owner**: Devon-Infrastructure-3 (continuation)
**Files**:

- `src/infrastructure/builders/index.ts`
- `src/backend/defaults/development.ts` (update)
- `src/backend/defaults/staging.ts` (update)
- `src/backend/defaults/production.ts` (update)

**Deliverables**:

- Update Phase 4 defaults to use builders
- Ensure attachment point compatibility
- Type contract validation
- Integration tests

**Success Criteria**:

- Phase 4 defaults use builders
- Attachment points accept builder output
- Type safety maintained
- Integration tests pass

---

## 5. Integration Design

### 5.1 Integration with Phase 4 Backend Assembly

**Builder Output → Attachment Point**:

```typescript
// Phase 5: Create configuration using builder
const customDb = storage
  .cosmosDb()
  .name('custom-db')
  .mode('Autoscale')
  .throughput(1000, 10000)
  .build();

// Phase 4: Attach to backend
backend.storage.database.attach(customDb);

// Type contract ensures compatibility
interface AttachmentPoint<T> {
  attach(config: T): void; // T must match builder output type
}
```

**Type Safety Contract**:

```typescript
// Builder builds type T
class CosmosDbBuilder extends BaseResourceBuilder<CosmosDbConfig> {
  build(): Readonly<CosmosDbConfig> { ... }
}

// Attachment point accepts type T
interface DatabaseAttachmentPoint extends AttachmentPoint<CosmosDbConfig> {
  attach(config: CosmosDbConfig): void;
}

// TypeScript ensures compatibility at compile-time
backend.storage.database.attach(customDb); // ✓ Type safe
backend.storage.database.attach(customVnet); // ✗ Compile error
```

### 5.2 Integration with Phase 7 Synthesis

**Builder Output → ARM JSON**:

```typescript
// Phase 5: Builder creates configuration
const db = storage.cosmosDb()
  .name('proddb')
  .mode('Autoscale')
  .throughput(4000, 40000)
  .build();

// Phase 7: Synthesizer converts to ARM JSON
const armTemplate = synthesize(db);

// Result:
{
  "type": "Microsoft.DocumentDB/databaseAccounts",
  "apiVersion": "2023-04-15",
  "name": "proddb",
  "properties": {
    "databaseAccountOfferType": "Standard",
    "capacityMode": "Autoscale",
    "autoscaleSettings": {
      "maxThroughput": 40000
    },
    "consistencyPolicy": {
      "defaultConsistencyLevel": "Session"
    }
  }
}
```

**Metadata for Synthesis**:

```typescript
interface ResourceConfig {
  // Required for ARM synthesis
  readonly resourceType: string; // e.g., 'Microsoft.DocumentDB/databaseAccounts'
  readonly name: string;
  readonly region?: string;

  // Optional metadata
  readonly _metadata?: {
    builderVersion: string;
    environment: Environment;
    createdAt: string;
    validatedAt: string;
  };
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests (Target: >90% coverage)

**Test Structure**:

```
src/infrastructure/builders/
├── base-resource-builder.spec.ts
├── storage/
│   ├── cosmos-db-builder.spec.ts
│   ├── storage-account-builder.spec.ts
│   ├── queue-builder.spec.ts
│   └── container-builder.spec.ts
├── compute/
│   ├── function-app-builder.spec.ts
│   └── app-service-plan-builder.spec.ts
├── network/
│   ├── vnet-builder.spec.ts
│   ├── nsg-builder.spec.ts
│   └── waf-builder.spec.ts
├── monitoring/
│   ├── app-insights-builder.spec.ts
│   ├── log-analytics-builder.spec.ts
│   └── alert-rules-builder.spec.ts
└── performance/
    ├── cdn-builder.spec.ts
    ├── redis-cache-builder.spec.ts
    └── rate-limit-builder.spec.ts
```

**Test Categories**:

1. **Builder API Tests**: Test fluent API works
2. **Validation Tests**: Test Azure constraint validation
3. **Environment Tests**: Test environment-specific defaults
4. **Type Tests**: Test TypeScript type inference
5. **Integration Tests**: Test builder output compatibility with Phase 4

**Example Test**:

```typescript
describe('CosmosDbBuilder', () => {
  describe('API', () => {
    it('should build minimal configuration', () => {
      const config = storage.cosmosDb().name('test-db').build();

      expect(config.name).toBe('test-db');
      expect(config.resourceType).toBe('Microsoft.DocumentDB/databaseAccounts');
      expect(Object.isFrozen(config)).toBe(true);
    });

    it('should support method chaining', () => {
      const config = storage
        .cosmosDb()
        .name('test-db')
        .mode('Autoscale')
        .throughput(1000, 10000)
        .consistency('Strong')
        .build();

      expect(config.mode).toBe('Autoscale');
      expect(config.throughput).toEqual({ min: 1000, max: 10000 });
      expect(config.consistency).toBe('Strong');
    });
  });

  describe('Validation', () => {
    it('should reject invalid names', () => {
      expect(() => {
        storage
          .cosmosDb()
          .name('My_Database') // Uppercase and underscore not allowed
          .build();
      }).toThrow(AzureValidationError);
    });

    it('should reject min >= max throughput', () => {
      expect(() => {
        storage
          .cosmosDb()
          .name('test-db')
          .mode('Autoscale')
          .throughput(10000, 5000) // min > max
          .build();
      }).toThrow(AzureValidationError);
    });

    it('should reject invalid regions', () => {
      expect(() => {
        storage.cosmosDb().name('test-db').multiRegion(['invalid-region']).build();
      }).toThrow(AzureValidationError);
    });
  });

  describe('Environment Defaults', () => {
    it('should use serverless for development', () => {
      process.env.NODE_ENV = 'development';

      const config = storage.cosmosDb().name('dev-db').build();

      expect(config.mode).toBe('Serverless');
      expect(config.publicNetworkAccess).toBe('Enabled');
    });

    it('should use autoscale for production', () => {
      process.env.NODE_ENV = 'production';

      const config = storage.cosmosDb().name('prod-db').build();

      expect(config.mode).toBe('Autoscale');
      expect(config.publicNetworkAccess).toBe('Disabled');
    });
  });
});
```

### 6.2 Type Safety Tests

```typescript
import { expectType, expectError } from 'tsd';

// Test type inference
const db = storage.cosmosDb()
  .name('test-db')
  .build();

expectType<Readonly<CosmosDbConfig>>(db);

// Test mode-specific types
const serverless = storage.cosmosDb()
  .name('test')
  .mode('Serverless')
  .build();

expectType<'Serverless'>(serverless.mode);
expectType<never>(serverless.throughput); // throughput not available in serverless

// Test builder output compatibility with attachment points
const backend = defineBackend({ ... });
expectType<void>(backend.storage.database.attach(db)); // Should work
expectError(backend.storage.database.attach(vnet)); // Should fail
```

### 6.3 Integration Tests

```typescript
describe('Phase 4 Integration', () => {
  it('should attach builder output to backend', () => {
    const db = storage.cosmosDb().name('test-db').mode('Provisioned').throughput(1000).build();

    const backend = defineBackend({
      schema,
      authentication,
      settings: { name: 'test' },
    });

    backend.storage.database.attach(db);

    expect(backend.storage.database.isAttached()).toBe(true);
    expect(backend.storage.database.getConfig()).toEqual(db);
  });

  it('should use builder in defaults', () => {
    const defaults = getProductionDefaults();

    expect(defaults.storage.database.resourceType).toBe('Microsoft.DocumentDB/databaseAccounts');
    expect(defaults.storage.database.mode).toBe('Autoscale');
  });
});
```

---

## 7. Success Criteria

### 7.1 Functional Requirements

**Must Have**:

- ✅ All 15+ builders implemented
- ✅ Type-safe fluent API
- ✅ Azure validation for all builders
- ✅ Environment-aware defaults
- ✅ Nested builder support
- ✅ Immutable build output
- ✅ Integration with Phase 4
- ✅ Factory functions for clean API

**Should Have**:

- ✅ Preset configurations (`.serverless()`, `.production()`, etc.)
- ✅ Comprehensive error messages
- ✅ Validation helpers
- ✅ Type inference utilities

### 7.2 Quality Requirements

- > 90% test coverage
- All public APIs documented with TSDoc
- Type safety verified with tsd
- No runtime errors in validation
- Clean separation by resource category
- Consistent API patterns across all builders

### 7.3 Performance Requirements

- Builder instantiation < 1ms
- Validation < 5ms per builder
- No memory leaks (immutable configs)
- Support for 100+ builders in single backend

---

## 8. Dependencies

### 8.1 From Previous Phases

**Required from Phase 1**:

- ✅ `BaseBuilder<TConfig>` pattern
- ✅ Common utilities (duration, threshold, size, network)

**Required from Phase 4**:

- ✅ Attachment point system
- ✅ Backend assembly pattern
- ✅ Environment detection

### 8.2 For Future Phases

**Phase 5 enables**:

- Phase 6: Advanced patterns can use builders
- Phase 7: Synthesis uses builder output
- Phase 8: Context API uses builder configs
- Phase 9: Deployment uses validated configs

---

## 9. Risk Assessment

### 9.1 Technical Risks

**Risk 1: Azure API Complexity** (High)

- **Impact**: Azure has many SKUs, regions, and feature combinations
- **Mitigation**: Start with core features, add advanced features incrementally
- **Contingency**: Provide escape hatch for raw config if needed

**Risk 2: Type Safety Complexity** (Medium)

- **Impact**: Mode-specific types and conditional properties are complex
- **Mitigation**: Use discriminated unions and conditional types carefully
- **Contingency**: Provide explicit type parameters as fallback

**Risk 3: Validation Performance** (Low)

- **Impact**: Deep validation could be slow
- **Mitigation**: Lazy validation, only validate what's configured
- **Contingency**: Make validation optional for trusted configs

**Risk 4: Breaking Changes** (Medium)

- **Impact**: Azure updates SKUs and features frequently
- **Mitigation**: Version builder APIs, allow raw passthrough
- **Contingency**: Provide migration guides for breaking changes

### 9.2 Timeline Risks

**Risk 1: Builder Count** (Medium)

- **Impact**: 15+ builders is substantial work
- **Mitigation**: Parallelize work across 5 Devon agents
- **Contingency**: Prioritize most common builders first, defer others

**Risk 2: Validation Complexity** (Low)

- **Impact**: Azure validation rules are extensive
- **Mitigation**: Start with basic validation, add rules iteratively
- **Contingency**: Document known validation gaps

---

## 10. Team Assignments

### Devon Agent Allocation

**Devon-Infrastructure-1** (Base & Core)

- Day 1: Task 1 (Base resource builder)
- Day 4: Task 6 (Function App builder)
- Day 6: Task 11 (Application Insights builder)
- Day 9: Task 16 (Rate limiting builder)

**Devon-Infrastructure-2** (Storage)

- Days 1-2: Task 2 (CosmosDB builder)
- Day 4: Task 7 (App Service Plan builder)
- Day 7: Task 12 (Log Analytics builder)
- Days 9-10: Task 17 (Factory functions)

**Devon-Infrastructure-3** (Storage & Network)

- Days 2-3: Task 3 (Storage Account builder)
- Day 5: Task 8 (VNet builder)
- Day 7: Task 13 (Alert rules builder)
- Day 10: Task 18 (Phase 4 integration)

**Devon-Infrastructure-4** (Storage & Network)

- Day 3: Task 4 (Queue builder)
- Day 5: Task 9 (NSG builder)
- Day 8: Task 14 (CDN builder)

**Devon-Infrastructure-5** (Storage & Performance)

- Day 3: Task 5 (Blob Container builder)
- Day 6: Task 10 (WAF builder)
- Day 8: Task 15 (Redis Cache builder)

### Charlie Agent Allocation

5 Charlie agents for comprehensive testing, following Devon agents' work.

---

## 11. Next Steps

### Immediate Actions

1. Create tasks in Digital Minion system
2. Review plan with team
3. Set up test infrastructure
4. Begin Task 1 implementation

### Week 1 Goals

- Base resource builder complete
- Storage builders complete (CosmosDB, Storage Account, Queue, Container)
- Compute builders complete (Function App, App Service Plan)
- Network builders started (VNet, NSG)

### Week 2 Goals

- Network builders complete (VNet, NSG, WAF)
- Monitoring builders complete (App Insights, Log Analytics, Alerts)
- Performance builders complete (CDN, Redis, Rate Limit)
- Factory functions complete
- Phase 4 integration complete
- Full test coverage achieved

---

## 12. API Design Summary

### 12.1 Namespace Organization

```typescript
// Storage namespace
import { storage } from '@atakora/component/infrastructure';

storage.cosmosDb(); // CosmosDB account
storage.account(); // Storage account
storage.queue(); // Storage queue
storage.container(); // Blob container

// Compute namespace
import { compute } from '@atakora/component/infrastructure';

compute.functionApp(); // Function App
compute.appServicePlan(); // App Service Plan

// Network namespace
import { network } from '@atakora/component/infrastructure';

network.vnet(); // Virtual Network
network.subnet(); // Subnet
network.nsg(); // Network Security Group
network.waf(); // Web Application Firewall
network.ddos(); // DDoS Protection

// Monitoring namespace
import { monitoring } from '@atakora/component/infrastructure';

monitoring.appInsights(); // Application Insights
monitoring.logAnalytics(); // Log Analytics Workspace
monitoring.alerts(); // Alert Rules

// Performance namespace
import { performance } from '@atakora/component/infrastructure';

performance.cdn(); // CDN
performance.cache(); // Redis Cache
performance.rateLimit(); // Rate Limiting
```

### 12.2 Common Patterns

**Pattern 1: Simple Configuration**

```typescript
const db = storage.cosmosDb().name('mydb').build();
```

**Pattern 2: Environment-Aware**

```typescript
const db = storage
  .cosmosDb()
  .name('mydb')
  .when(isProd, (db) => db.mode('Autoscale').throughput(4000, 40000))
  .when(!isProd, (db) => db.mode('Serverless'))
  .build();
```

**Pattern 3: Nested Configuration**

```typescript
const db = storage
  .cosmosDb()
  .name('mydb')
  .backup((backup) => backup.enable(true).type('Continuous').retention(90))
  .build();
```

**Pattern 4: Preset Configuration**

```typescript
const db = storage
  .cosmosDb()
  .name('mydb')
  .production() // Apply production best practices
  .build();
```

**Pattern 5: Attachment to Backend**

```typescript
const customDb = storage.cosmosDb().name('custom-db').mode('Autoscale').build();

backend.storage.database.attach(customDb);
```

---

## Document History

| Version | Date       | Author                  | Changes              |
| ------- | ---------- | ----------------------- | -------------------- |
| 1.0     | 2025-11-20 | Becky (Staff Architect) | Initial Phase 5 plan |

---

**Document Status**: Complete
**Ready for Implementation**: Yes
**Phase Dependencies**: Phase 4 (Backend Assembly)
**Next Phase**: Phase 6 (Advanced Patterns)
