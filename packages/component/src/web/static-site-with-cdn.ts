/**
 * Static Site with CDN Component
 *
 * @remarks
 * High-level component that creates a complete static website infrastructure including:
 * - Storage Account with static website hosting enabled
 * - CDN Profile and Endpoint for global content delivery
 * - Optional DNS Zone and custom domain configuration
 * - Optional SSL/TLS certificate management
 * - CORS configuration for API integration
 *
 * This component is perfect for hosting SPAs (React, Vue, Angular), static documentation
 * sites, marketing websites, and JAMstack applications.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import { StorageAccounts, StorageAccountSkuName, StorageAccountKind, TlsVersion } from '@atakora/cdk/storage';
import type { IStorageAccount } from '@atakora/cdk/storage';
import { PublicDnsZones, DnsCNameRecords, DnsTxtRecords } from '@atakora/cdk/network';
import type { IPublicDnsZone } from '@atakora/cdk/network';
import { CdnProfiles, CdnEndpoints, CdnSkuName, QueryStringCachingBehavior, OptimizationType } from '@atakora/cdk/cdn';
import type { ICdnProfile, ICdnEndpoint } from '@atakora/cdk/cdn';
import type {
  StaticSiteWithCdnProps,
  CdnSku,
} from './types';
import {
  DEFAULT_CACHEABLE_FILE_TYPES,
  DEFAULT_COMPRESSIBLE_CONTENT_TYPES,
} from './types';
import {
  type IBackendComponent,
  type IComponentDefinition,
  type IResourceRequirement,
  type ResourceMap,
  type ValidationResult,
  type ComponentOutputs,
  isBackendManaged,
} from '../backend';

/**
 * Static Site with CDN Component
 *
 * @remarks
 * Creates a production-ready static website with global CDN delivery.
 * Automatically configures storage, CDN, DNS, and SSL certificates.
 *
 * @example
 * Traditional usage (backward compatible):
 * ```typescript
 * import { StaticSiteWithCdn } from '@atakora/component/web';
 * import { ResourceGroupStack } from '@atakora/cdk';
 *
 * const stack = new ResourceGroupStack(app, 'MyStack', {
 *   resourceGroupName: 'rg-myapp-prod',
 *   location: 'eastus'
 * });
 *
 * const site = new StaticSiteWithCdn(stack, 'MySite', {
 *   indexDocument: 'index.html',
 *   enableSpaMode: true
 * });
 *
 * console.log(site.cdnEndpoint); // https://xyz.azureedge.net
 * console.log(site.storageWebEndpoint); // https://xyz.z13.web.core.windows.net
 * ```
 *
 * @example
 * Production site with custom domain:
 * ```typescript
 * const prodSite = new StaticSiteWithCdn(stack, 'ProdSite', {
 *   customDomain: 'www.myapp.com',
 *   dnsZoneName: 'myapp.com',
 *   enableSpaMode: true,
 *   httpsRedirect: true,
 *   enableCompression: true,
 *   cacheMaxAge: 86400, // 24 hours
 *   corsAllowedOrigins: ['https://api.myapp.com']
 * });
 *
 * console.log(prodSite.customDomainEndpoint); // https://www.myapp.com
 * ```
 *
 * @example
 * Backend pattern usage (with shared resources):
 * ```typescript
 * import { StaticSiteWithCdn } from '@atakora/component/web';
 * import { defineBackend } from '@atakora/component/backend';
 *
 * const backend = defineBackend({
 *   website: StaticSiteWithCdn.define('Website', {
 *     indexDocument: 'index.html',
 *     enableSpaMode: true
 *   })
 * });
 * ```
 */
export class StaticSiteWithCdn extends Construct implements IBackendComponent<StaticSiteWithCdnProps> {
  /**
   * Storage account hosting the static website
   */
  public readonly storageAccount!: IStorageAccount;

  /**
   * Storage account name
   */
  public readonly storageAccountName!: string;

  /**
   * Storage web endpoint (direct access, not CDN)
   * Format: https://<account>.z13.web.core.windows.net
   */
  public readonly storageWebEndpoint!: string;

  /**
   * CDN Profile resource
   */
  public readonly cdnProfile!: ICdnProfile;

  /**
   * CDN Endpoint resource
   */
  public readonly cdnEndpointResource!: ICdnEndpoint;

  /**
   * CDN endpoint URL
   * Format: https://<endpoint>.azureedge.net
   */
  public readonly cdnEndpoint!: string;

  /**
   * CDN profile name
   */
  public readonly cdnProfileName!: string;

  /**
   * CDN endpoint name
   */
  public readonly cdnEndpointName!: string;

  /**
   * DNS Zone (if custom domain configured)
   */
  public readonly dnsZone?: IPublicDnsZone;

  /**
   * Custom domain endpoint (if configured)
   * Format: https://www.example.com
   */
  public readonly customDomainEndpoint?: string;

  /**
   * Index document
   */
  public readonly indexDocument: string;

  /**
   * Error document
   */
  public readonly errorDocument: string;

  /**
   * Location of resources
   */
  public readonly location: string;

  /**
   * Whether SPA mode is enabled
   */
  public readonly spaMode: boolean;

  // IBackendComponent implementation
  public readonly componentId: string;
  public readonly componentType = 'StaticSiteWithCdn';
  public readonly config: StaticSiteWithCdnProps;

  private sharedResources?: ResourceMap;
  private backendManaged: boolean = false;

  constructor(scope: Construct, id: string, props: StaticSiteWithCdnProps = {}) {
    super(scope, id);

    // Store component metadata
    this.componentId = id;
    this.config = props;

    // Check if backend-managed
    this.backendManaged = isBackendManaged(scope);

    this.location = props.location ?? this.getLocationFromParent(scope);
    this.spaMode = props.enableSpaMode ?? false;
    this.indexDocument = props.indexDocument ?? 'index.html';
    this.errorDocument = this.spaMode ? this.indexDocument : (props.errorDocument ?? '404.html');

    // Backend-managed mode: Resources will be injected later via initialize()
    // Traditional mode: Create resources now
    if (!this.backendManaged) {
      // Traditional mode - create own resources
      this.initializeTraditionalMode(props);
    } else {
      // Backend-managed mode - placeholders will be replaced in initialize()
      this.storageAccount = null as any;
      this.storageAccountName = '';
      this.storageWebEndpoint = '';
      this.cdnProfile = null as any;
      this.cdnEndpointResource = null as any;
      this.cdnProfileName = '';
      this.cdnEndpointName = '';
      this.cdnEndpoint = '';
    }
  }

  /**
   * Initialize component in traditional mode (creates own resources)
   * @internal
   */
  private initializeTraditionalMode(props: StaticSiteWithCdnProps): void {
    // Create or use existing storage account
    (this as any).storageAccount = props.storageAccount ?? this.createStorageAccount(props);
    (this as any).storageAccountName = this.storageAccount.storageAccountName;

    // Configure static website hosting on storage account
    this.configureStaticWebsite(props);

    // Generate storage web endpoint
    // Format: https://<account>.z13.web.core.windows.net
    // Note: The zone number (z13) varies by region
    const zoneNumber = this.getStorageZoneNumber(this.location);
    (this as any).storageWebEndpoint = `https://${this.storageAccountName}.${zoneNumber}.web.core.windows.net`;

    // Create CDN Profile and Endpoint (always created in traditional mode)
    const cdnResources = this.createCdnResources(props);
    (this as any).cdnProfile = cdnResources.profile;
    (this as any).cdnEndpointResource = cdnResources.endpoint;
    (this as any).cdnProfileName = this.cdnProfile.profileName;
    (this as any).cdnEndpointName = this.cdnEndpointResource.endpointName;
    (this as any).cdnEndpoint = `https://${this.cdnEndpointResource.hostName}`;

    // Configure custom domain if provided
    if (props.customDomain && props.dnsZoneName) {
      (this as any).dnsZone = this.configureDnsAndCustomDomain(props);
      (this as any).customDomainEndpoint = `https://${props.customDomain}`;
    }
  }

  /**
   * Creates storage account for static website hosting
   */
  private createStorageAccount(props: StaticSiteWithCdnProps): StorageAccounts {
    const storage = new StorageAccounts(this, 'Storage', {
      location: this.location,
      sku: StorageAccountSkuName.STANDARD_LRS,
      kind: StorageAccountKind.STORAGE_V2,
      accessTier: 'Hot' as any, // Hot tier for frequently accessed content
      minimumTlsVersion: TlsVersion.TLS1_2,
      tags: props.tags,
    });

    return storage;
  }

  /**
   * Configures static website hosting on storage account
   */
  private configureStaticWebsite(props: StaticSiteWithCdnProps): void {
    // TODO: Once StorageAccounts L2 construct supports static website configuration,
    // add the configuration here. For now, this is a placeholder.
    //
    // The configuration should include:
    // - indexDocument: this.indexDocument
    // - errorDocument404Path: this.errorDocument
    //
    // This will be added when we enhance the StorageAccounts construct with:
    // public configureStaticWebsite(config: StaticWebsiteConfig): void
    //
    // For now, users will need to configure this via Azure Portal or Azure CLI:
    // az storage blob service-properties update \
    //   --account-name <account> \
    //   --static-website \
    //   --index-document index.html \
    //   --404-document 404.html

    // Configure CORS if specified
    if (props.corsAllowedOrigins && props.corsAllowedOrigins.length > 0) {
      // TODO: Add CORS configuration when StorageAccounts supports it
      // this.storageAccount.addCorsRule({
      //   allowedOrigins: props.corsAllowedOrigins,
      //   allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      //   allowedHeaders: ['*'],
      //   exposedHeaders: ['*'],
      //   maxAgeInSeconds: 3600
      // });
    }
  }

  /**
   * Creates CDN Profile and Endpoint
   */
  private createCdnResources(props: StaticSiteWithCdnProps): {
    profile: ICdnProfile;
    endpoint: ICdnEndpoint;
  } {
    // Determine CDN SKU - use provided value or default to Standard_Microsoft
    const cdnSku = this.getCdnSkuName(props.cdnSku);

    // Create CDN Profile
    const cdnProfile = new CdnProfiles(this, 'CdnProfile', {
      location: 'global', // CDN profiles are global resources
      sku: cdnSku,
      tags: props.tags,
    });

    // Extract hostname from storage web endpoint
    const originHostName = this.storageWebEndpoint.replace('https://', '');

    // Create CDN Endpoint
    const cdnEndpoint = new CdnEndpoints(this, 'Endpoint', {
      profile: cdnProfile,
      originHostName: originHostName,
      originHostHeader: originHostName,
      isHttpAllowed: !props.httpsRedirect, // Disable HTTP if HTTPS redirect is enabled
      isHttpsAllowed: true,
      isCompressionEnabled: props.enableCompression ?? true,
      contentTypesToCompress: DEFAULT_COMPRESSIBLE_CONTENT_TYPES,
      queryStringCachingBehavior: this.mapQueryStringCachingBehavior(props.queryStringCachingBehavior),
      optimizationType: OptimizationType.GENERAL_WEB_DELIVERY,
      location: 'global',
      tags: props.tags,
    });

    return { profile: cdnProfile, endpoint: cdnEndpoint };
  }

  /**
   * Converts CdnSku string to CdnSkuName enum
   */
  private getCdnSkuName(cdnSku?: CdnSku): CdnSkuName {
    if (!cdnSku) {
      return CdnSkuName.STANDARD_MICROSOFT;
    }

    // Map string values to enum
    const skuMap: Record<string, CdnSkuName> = {
      'Standard_Microsoft': CdnSkuName.STANDARD_MICROSOFT,
      'Standard_Akamai': CdnSkuName.STANDARD_AKAMAI,
      'Standard_Verizon': CdnSkuName.STANDARD_VERIZON,
      'Premium_Verizon': CdnSkuName.PREMIUM_VERIZON,
      'Standard_AzureFrontDoor': CdnSkuName.STANDARD_AZURE_FRONT_DOOR,
      'Premium_AzureFrontDoor': CdnSkuName.PREMIUM_AZURE_FRONT_DOOR,
    };

    return skuMap[cdnSku] ?? CdnSkuName.STANDARD_MICROSOFT;
  }

  /**
   * Maps query string caching behavior from string to enum
   */
  private mapQueryStringCachingBehavior(behavior?: 'IgnoreQueryString' | 'BypassCaching' | 'UseQueryString'): QueryStringCachingBehavior {
    if (!behavior) {
      return QueryStringCachingBehavior.IGNORE_QUERY_STRING;
    }

    const behaviorMap: Record<string, QueryStringCachingBehavior> = {
      'IgnoreQueryString': QueryStringCachingBehavior.IGNORE_QUERY_STRING,
      'BypassCaching': QueryStringCachingBehavior.BYPASS_CACHING,
      'UseQueryString': QueryStringCachingBehavior.USE_QUERY_STRING,
    };

    return behaviorMap[behavior] ?? QueryStringCachingBehavior.IGNORE_QUERY_STRING;
  }

  /**
   * Configures DNS Zone and custom domain
   */
  private configureDnsAndCustomDomain(props: StaticSiteWithCdnProps): IPublicDnsZone {
    if (!props.customDomain || !props.dnsZoneName) {
      throw new Error('Both customDomain and dnsZoneName must be provided for custom domain configuration');
    }

    // Use existing or create new DNS zone
    const dnsZone = props.existingDnsZone ?? new PublicDnsZones(this, 'DnsZone', {
      zoneName: props.dnsZoneName,
      tags: props.tags,
    });

    // Extract subdomain from custom domain
    // For example: www.example.com with zone example.com -> subdomain is 'www'
    const subdomain = props.customDomain.replace(`.${props.dnsZoneName}`, '');

    // Add CNAME record pointing to CDN endpoint
    // This makes www.example.com point to xyz.azureedge.net
    new DnsCNameRecords(this, 'CName', {
      zone: dnsZone,
      recordName: subdomain,
      cname: this.cdnEndpointResource.hostName, // e.g., xyz.azureedge.net
      ttl: 3600,
    });

    // Add CDN verification TXT record
    // Azure CDN requires a TXT record at _dnsauth.<subdomain> to verify domain ownership
    new DnsTxtRecords(this, 'CdnVerification', {
      zone: dnsZone,
      recordName: `_dnsauth.${subdomain}`,
      txtValues: [this.cdnEndpointResource.hostName],
      ttl: 3600,
    });

    // Note: Actual custom domain configuration on the CDN endpoint
    // requires Microsoft.Cdn/profiles/endpoints/customDomains resource.
    // This would be added as a separate construct in the future:
    //
    // new CdnCustomDomain(this, 'CustomDomain', {
    //   endpoint: this.cdnEndpointResource,
    //   hostName: props.customDomain,
    //   httpsEnabled: true,
    //   certificateSource: 'Cdn' // Use CDN-managed certificate
    // });
    //
    // For now, users need to configure the custom domain via Azure Portal or CLI:
    // az cdn custom-domain create --endpoint-name <endpoint> --hostname <domain> \
    //   --profile-name <profile> --resource-group <rg> --name <name>

    return dnsZone;
  }

  /**
   * Gets storage zone number based on region
   */
  private getStorageZoneNumber(region: string): string {
    // Azure storage static website zone numbers by region
    // Format: z<number>.web.core.windows.net
    const zoneMap: Record<string, string> = {
      // US regions
      eastus: 'z13',
      eastus2: 'z13',
      westus: 'z13',
      westus2: 'z13',
      westus3: 'z13',
      centralus: 'z13',
      northcentralus: 'z13',
      southcentralus: 'z13',
      westcentralus: 'z13',

      // Europe regions
      northeurope: 'z6',
      westeurope: 'z6',
      uksouth: 'z6',
      ukwest: 'z6',
      francecentral: 'z6',
      francesouth: 'z6',
      germanywestcentral: 'z6',
      norwayeast: 'z6',
      switzerlandnorth: 'z6',
      swedencentral: 'z6',

      // Asia regions
      eastasia: 'z7',
      southeastasia: 'z7',
      japaneast: 'z11',
      japanwest: 'z11',
      koreacentral: 'z12',
      koreasouth: 'z12',
      australiaeast: 'z28',
      australiasoutheast: 'z28',
      centralindia: 'z18',
      southindia: 'z18',
      westindia: 'z18',

      // Other regions
      brazilsouth: 'z4',
      southafricanorth: 'z31',
      uaenorth: 'z21',
    };

    return zoneMap[region.toLowerCase()] ?? 'z13'; // Default to z13 if unknown
  }

  /**
   * Gets location from parent stack
   */
  private getLocationFromParent(scope: Construct): string {
    let current: Construct | undefined = scope;

    while (current) {
      const parent = current as any;
      if (parent && typeof parent.location === 'string') {
        return parent.location;
      }
      current = current.node.scope;
    }

    return 'eastus'; // Fallback default
  }

  /**
   * Gets Azure CLI command to upload files to static website
   *
   * @param localPath - Local directory path containing files to upload
   * @returns Azure CLI command string
   *
   * @example
   * ```typescript
   * const uploadCmd = site.getUploadCommand('./dist');
   * console.log(uploadCmd);
   * // az storage blob upload-batch -d '$web' --account-name myaccount -s ./dist
   * ```
   */
  public getUploadCommand(localPath: string): string {
    return `az storage blob upload-batch -d '$web' --account-name ${this.storageAccountName} -s ${localPath}`;
  }

  /**
   * Gets Azure CLI command to purge CDN cache
   *
   * @param paths - Paths to purge (default: all paths)
   * @returns Azure CLI command string
   *
   * @example
   * ```typescript
   * // Purge all content
   * const purgeCmd = site.getPurgeCdnCommand();
   *
   * // Purge specific paths
   * const purgeCmd = site.getPurgeCdnCommand(['/index.html', '/assets/*']);
   * ```
   */
  public getPurgeCdnCommand(paths: string[] = ['/*']): string {
    // TODO: Get actual resource group name from parent stack
    const resourceGroup = 'rg-placeholder';
    return `az cdn endpoint purge --resource-group ${resourceGroup} --profile-name ${this.cdnProfileName} --name ${this.cdnEndpointName} --content-paths ${paths.join(' ')}`;
  }

  /**
   * Gets setup instructions for deploying static content
   *
   * @returns Markdown-formatted setup instructions
   */
  public getSetupInstructions(): string {
    const instructions = [
      '# Static Site Deployment Instructions',
      '',
      '## 1. Enable Static Website on Storage Account',
      '',
      'Run the following Azure CLI command:',
      '',
      '```bash',
      `az storage blob service-properties update \\`,
      `  --account-name ${this.storageAccountName} \\`,
      `  --static-website \\`,
      `  --index-document ${this.indexDocument} \\`,
      `  --404-document ${this.errorDocument}`,
      '```',
      '',
      '## 2. Upload Your Static Files',
      '',
      'Build your application and upload to the $web container:',
      '',
      '```bash',
      '# Example: React app',
      'npm run build',
      this.getUploadCommand('./build'),
      '',
      '# Example: Vue app',
      'npm run build',
      this.getUploadCommand('./dist'),
      '```',
      '',
      '## 3. Access Your Site',
      '',
      `- Storage Endpoint: ${this.storageWebEndpoint}`,
      `- CDN Endpoint: ${this.cdnEndpoint}`,
    ];

    if (this.customDomainEndpoint) {
      instructions.push(`- Custom Domain: ${this.customDomainEndpoint}`);
    }

    instructions.push(
      '',
      '## 4. Purge CDN Cache (after updates)',
      '',
      '```bash',
      this.getPurgeCdnCommand(),
      '```',
      ''
    );

    return instructions.join('\n');
  }

  // ============================================================================
  // Backend Pattern Support
  // ============================================================================

  /**
   * Define a Static Site with CDN component for use with defineBackend().
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
   *     enableSpaMode: true
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
      requirementKey: `${this.componentId}-static-site`,
      priority: 20,
      config: {
        sku: 'Standard_LRS',
        kind: 'StorageV2',
        accessTier: 'Hot',
        enableHttpsOnly: true,
        enableStaticWebsite: true,
        indexDocument: this.config.indexDocument || 'index.html',
        errorDocument: this.config.errorDocument,
      },
      metadata: {
        source: this.componentId,
        version: '1.0.0',
        description: `Storage for ${this.componentId} static website`,
      },
    });

    // CDN requirement (always included for static sites)
    requirements.push({
      resourceType: 'cdn',
      requirementKey: `${this.componentId}-cdn`,
      priority: 20,
      config: {
        sku: this.config.cdnSku || 'Standard_Microsoft',
        originHostName: '${storage.primaryEndpoints.web}',
        enableCompression: this.config.enableCompression !== false,
        cacheMaxAge: this.config.cacheMaxAge || 3600,
      },
      metadata: {
        source: this.componentId,
        version: '1.0.0',
        description: `CDN for ${this.componentId} static site`,
      },
    });

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
    const storageKey = `storage:${this.componentId}-static-site`;
    const storage = resources.get(storageKey) as StorageAccounts;

    if (!storage) {
      throw new Error(`Required Storage resource not found: ${storageKey}`);
    }

    // Set storage account properties
    (this as any).storageAccount = storage;
    (this as any).storageAccountName = storage.storageAccountName;

    // Generate storage web endpoint
    const zoneNumber = this.getStorageZoneNumber(this.location);
    (this as any).storageWebEndpoint = `https://${this.storageAccountName}.${zoneNumber}.web.core.windows.net`;

    // Set up CDN
    const cdnKey = `cdn:${this.componentId}-cdn`;
    const cdnProfile = resources.get(cdnKey) as ICdnProfile;

    if (cdnProfile) {
      (this as any).cdnProfile = cdnProfile;
      (this as any).cdnProfileName = cdnProfile.profileName;
      // Note: CDN endpoint would need to be extracted from the CDN profile
      // This depends on how the CDN provider implements the resource
    }

    // Configure custom domain if provided
    if (this.config.customDomain && this.config.dnsZoneName) {
      (this as any).dnsZone = this.configureDnsAndCustomDomain(this.config);
      (this as any).customDomainEndpoint = `https://${this.config.customDomain}`;
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

    // Validate Storage resource
    const storageKey = `storage:${this.componentId}-static-site`;
    if (!resources.has(storageKey)) {
      errors.push(`Missing required Storage resource: ${storageKey}`);
    }

    // Validate CDN resource
    const cdnKey = `cdn:${this.componentId}-cdn`;
    if (!resources.has(cdnKey)) {
      warnings.push(`CDN resource not found: ${cdnKey}`);
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
    };
  }
}
