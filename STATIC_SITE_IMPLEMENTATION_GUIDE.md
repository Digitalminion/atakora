# StaticSite Backend Pattern Implementation Guide

## File: `packages/component/src/web/static-site-with-cdn.ts`

## Step 1: Add Backend Imports

Add these imports after the existing imports:

```typescript
import {
  type IBackendComponent,
  type IComponentDefinition,
  type IResourceRequirement,
  type ResourceMap,
  type ValidationResult,
  type ComponentOutputs,
  isBackendManaged,
} from '../backend';
```

## Step 2: Update Class Declaration

Change:
```typescript
export class StaticSiteWithCdn extends Construct {
```

To:
```typescript
export class StaticSiteWithCdn extends Construct implements IBackendComponent<StaticSiteWithCdnProps> {
```

## Step 3: Add Backend Component Properties

Add these properties after the existing public properties:

```typescript
  // IBackendComponent implementation
  public readonly componentId: string;
  public readonly componentType = 'StaticSiteWithCdn';
  public readonly config: StaticSiteWithCdnProps;

  private sharedResources?: ResourceMap;
  private backendManaged: boolean = false;
```

## Step 4: Update Constructor

At the beginning of the constructor, add:

```typescript
constructor(scope: Construct, id: string, props: StaticSiteWithCdnProps = {}) {
  super(scope, id);

  // Store component metadata
  this.componentId = id;
  this.config = props;

  // Check if backend-managed
  this.backendManaged = isBackendManaged(scope);

  // Existing initialization code continues...
  this.location = props.location ?? this.getLocationFromParent(scope);
  // ...
}
```

Then, wrap the resource creation logic:

```typescript
  // Backend-managed mode: Resources will be injected later via initialize()
  // Traditional mode: Create resources now
  if (!this.backendManaged) {
    this.initializeTraditionalMode(props);
  } else {
    // Placeholders - will be replaced in initialize()
    this.storageAccount = null as any;
    this.cdnProfile = null as any;
    this.cdnEndpointResource = null as any;
    // Set temporary values
    this.storageAccountName = '';
    this.storageWebEndpoint = '';
    this.cdnEndpoint = '';
    this.cdnProfileName = '';
    this.cdnEndpointName = '';
  }
```

## Step 5: Extract Traditional Mode Initialization

Create a new private method with all the current resource creation logic:

```typescript
/**
 * Initialize component in traditional mode (creates own resources)
 * @internal
 */
private initializeTraditionalMode(props: StaticSiteWithCdnProps): void {
  // Create or use existing storage account
  this.storageAccount = props.storageAccount ?? this.createStorageAccount(props);
  this.storageAccountName = this.storageAccount.storageAccountName;

  // Configure static website hosting on storage account
  this.configureStaticWebsite(props);

  // Generate storage web endpoint
  const zoneNumber = this.getStorageZoneNumber(this.location);
  this.storageWebEndpoint = `https://${this.storageAccountName}.${zoneNumber}.web.core.windows.net`;

  // Create CDN Profile and Endpoint
  const cdnResources = this.createCdnResources(props);
  this.cdnProfile = cdnResources.profile;
  this.cdnEndpointResource = cdnResources.endpoint;
  this.cdnProfileName = this.cdnProfile.profileName;
  this.cdnEndpointName = this.cdnEndpointResource.endpointName;
  this.cdnEndpoint = `https://${this.cdnEndpointResource.hostName}`;

  // Configure custom domain if provided
  if (props.customDomain && props.dnsZoneName) {
    this.dnsZone = this.configureDnsAndCustomDomain(props);
    this.customDomainEndpoint = `https://${props.customDomain}`;
  }
}
```

## Step 6: Add Backend Pattern Methods

Add these methods at the end of the class, before the closing brace:

```typescript
  // ============================================================================
  // Backend Pattern Support
  // ============================================================================

  /**
   * Define a Static Site component for use with defineBackend().
   * Returns a component definition that declares resource requirements.
   *
   * @param id - Component identifier
   * @param config - Component configuration
   * @returns Component definition
   *
   * @example
   * ```typescript
   * import { defineBackend } from '@atakora/component/backend';
   * import { StaticSiteWithCdn } from '@atakora/component/web';
   *
   * const backend = defineBackend({
   *   website: StaticSiteWithCdn.define('Website', {
   *     indexDocument: 'index.html',
   *     enableSpaMode: true,
   *     enableCompression: true
   *   })
   * });
   * ```
   */
  public static define(id: string, config: StaticSiteWithCdnProps = {}): IComponentDefinition<StaticSiteWithCdnProps> {
    return {
      componentId: id,
      componentType: 'StaticSiteWithCdn',
      config,
      factory: (scope: Construct, componentId: string, componentConfig: StaticSiteWithCdnProps, resources: ResourceMap) => {
        const instance = new StaticSiteWithCdn(scope, componentId, componentConfig);
        instance.initialize(resources, scope);
        return instance;
      },
    };
  }

  /**
   * Get resource requirements for this component.
   * Declares what Azure resources this component needs.
   *
   * @returns Array of resource requirements
   */
  public getRequirements(): ReadonlyArray<IResourceRequirement> {
    const requirements: IResourceRequirement[] = [];

    // Storage requirement for static website hosting
    requirements.push({
      resourceType: 'storage',
      requirementKey: `${this.componentId}-static`,
      priority: 15,
      config: {
        sku: 'Standard_LRS',
        kind: 'StorageV2',
        accessTier: 'Hot',
        enableHttpsOnly: true,
        staticWebsite: {
          indexDocument: this.indexDocument,
          errorDocument: this.errorDocument,
        },
        cors: this.config.corsAllowedOrigins ? {
          allowedOrigins: this.config.corsAllowedOrigins,
          allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
          allowedHeaders: ['*'],
          exposedHeaders: ['*'],
          maxAgeInSeconds: 3600,
        } : undefined,
      },
      metadata: {
        source: this.componentId,
        version: '1.0.0',
        description: `Storage for ${this.componentId} static website`,
      },
    });

    // CDN requirement (if not explicitly disabled)
    if (this.config.enableCdn !== false) {
      requirements.push({
        resourceType: 'cdn',
        requirementKey: `${this.componentId}-cdn`,
        priority: 15,
        config: {
          sku: this.config.cdnSku || 'Standard_Microsoft',
          endpoint: {
            originHostName: '${storage.webEndpoint}',
            isHttpAllowed: !this.config.httpsRedirect,
            isHttpsAllowed: true,
            isCompressionEnabled: this.config.enableCompression ?? true,
            queryStringCachingBehavior: this.config.queryStringCachingBehavior || 'IgnoreQueryString',
            optimizationType: 'GeneralWebDelivery',
          },
        },
        metadata: {
          source: this.componentId,
          version: '1.0.0',
          description: `CDN for ${this.componentId} content delivery`,
        },
      });
    }

    // DNS requirement (if custom domain configured)
    if (this.config.customDomain && this.config.dnsZoneName) {
      requirements.push({
        resourceType: 'dns',
        requirementKey: `${this.componentId}-dns`,
        priority: 15,
        config: {
          zoneName: this.config.dnsZoneName,
          customDomain: this.config.customDomain,
          cdnEndpointHostname: '${cdn.hostname}',
        },
        metadata: {
          source: this.componentId,
          version: '1.0.0',
          description: `DNS for ${this.componentId} custom domain`,
        },
      });
    }

    return requirements;
  }

  /**
   * Initialize component with shared resources from the backend.
   * Called by the backend after resources are provisioned.
   *
   * @param resources - Map of provisioned resources
   * @param scope - CDK construct scope
   */
  public initialize(resources: ResourceMap, scope: Construct): void {
    if (!this.backendManaged) {
      // Already initialized in traditional mode
      return;
    }

    this.sharedResources = resources;

    // Extract shared resources
    const storageKey = `storage:${this.componentId}-static`;
    const cdnKey = `cdn:${this.componentId}-cdn`;
    const dnsKey = `dns:${this.componentId}-dns`;

    const storage = resources.get(storageKey) as IStorageAccount | undefined;
    if (!storage) {
      throw new Error(`Required Storage Account resource not found: ${storageKey}`);
    }

    this.storageAccount = storage;
    this.storageAccountName = storage.storageAccountName;

    // Generate storage web endpoint
    const zoneNumber = this.getStorageZoneNumber(this.location);
    this.storageWebEndpoint = `https://${this.storageAccountName}.${zoneNumber}.web.core.windows.net`;

    // Extract CDN resources if enabled
    if (this.config.enableCdn !== false) {
      const cdn = resources.get(cdnKey) as { profile: ICdnProfile; endpoint: ICdnEndpoint } | undefined;
      if (cdn) {
        this.cdnProfile = cdn.profile;
        this.cdnEndpointResource = cdn.endpoint;
        this.cdnProfileName = cdn.profile.profileName;
        this.cdnEndpointName = cdn.endpoint.endpointName;
        this.cdnEndpoint = `https://${cdn.endpoint.hostName}`;
      }
    }

    // Extract DNS resources if configured
    if (this.config.customDomain && this.config.dnsZoneName) {
      const dns = resources.get(dnsKey) as IPublicDnsZone | undefined;
      if (dns) {
        this.dnsZone = dns;
        this.customDomainEndpoint = `https://${this.config.customDomain}`;
      }
    }
  }

  /**
   * Validate that provided resources meet this component's requirements.
   *
   * @param resources - Map of resources to validate
   * @returns Validation result
   */
  public validateResources(resources: ResourceMap): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate Storage Account resource
    const storageKey = `storage:${this.componentId}-static`;
    if (!resources.has(storageKey)) {
      errors.push(`Missing required Storage Account resource: ${storageKey}`);
    }

    // Validate CDN resources (if enabled)
    if (this.config.enableCdn !== false) {
      const cdnKey = `cdn:${this.componentId}-cdn`;
      if (!resources.has(cdnKey)) {
        warnings.push(`Missing optional CDN resource: ${cdnKey}`);
      }
    }

    // Validate DNS resources (if configured)
    if (this.config.customDomain && this.config.dnsZoneName) {
      const dnsKey = `dns:${this.componentId}-dns`;
      if (!resources.has(dnsKey)) {
        warnings.push(`Missing optional DNS resource: ${dnsKey}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Get component outputs for cross-component references.
   *
   * @returns Component outputs
   */
  public getOutputs(): ComponentOutputs {
    return {
      componentId: this.componentId,
      componentType: this.componentType,
      storageAccountName: this.storageAccountName,
      storageWebEndpoint: this.storageWebEndpoint,
      cdnEndpoint: this.cdnEndpoint,
      cdnProfileName: this.cdnProfileName,
      cdnEndpointName: this.cdnEndpointName,
      customDomainEndpoint: this.customDomainEndpoint,
      indexDocument: this.indexDocument,
      errorDocument: this.errorDocument,
      location: this.location,
    };
  }
```

## Step 7: Update Type Declarations

Ensure the following properties have proper type declarations to support both modes:

```typescript
// Change from:
public readonly storageAccount: IStorageAccount;

// To:
public storageAccount!: IStorageAccount;

// Similarly for:
public cdnProfile!: ICdnProfile;
public cdnEndpointResource!: ICdnEndpoint;
```

The `!` (definite assignment assertion) tells TypeScript these will be assigned later.

## Testing

After implementation, test both modes:

### Traditional Mode Test:
```typescript
const site = new StaticSiteWithCdn(stack, 'Website', {
  indexDocument: 'index.html',
  enableSpaMode: true
});

console.log(site.storageWebEndpoint); // Should work immediately
```

### Backend Mode Test:
```typescript
const backend = defineBackend({
  website: StaticSiteWithCdn.define('Website', {
    indexDocument: 'index.html',
    enableSpaMode: true
  })
});

backend.addToStack(stack);
console.log(backend.components.website.storageWebEndpoint); // Should work after initialization
```

## Verification Checklist

- [ ] Backend imports added
- [ ] Class implements IBackendComponent<StaticSiteWithCdnProps>
- [ ] Component metadata properties added
- [ ] Backward compatibility detection in constructor
- [ ] Traditional mode logic extracted to initializeTraditionalMode()
- [ ] define() static method implemented
- [ ] getRequirements() method implemented
- [ ] initialize() method implemented
- [ ] validateResources() method implemented
- [ ] getOutputs() method implemented
- [ ] Type declarations updated (use `!` for properties)
- [ ] Traditional mode tested and working
- [ ] Backend mode tested and working
- [ ] No breaking changes to existing code
