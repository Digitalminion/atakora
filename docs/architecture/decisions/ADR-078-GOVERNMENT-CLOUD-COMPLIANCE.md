# ADR-025: Government Cloud Compliance Strategy

**Status:** Proposed
**Date:** 2025-11-22
**Architect:** Becky (Staff Architect)
**Stakeholders:** Grace (Synthesis), Devon (Implementation), Charlie (Compliance Testing)

---

## Context

Azure Government is a separate cloud environment designed for US government agencies and their partners, with strict compliance requirements (FedRAMP, DoD IL2-IL5, ITAR, CJIS). Deploying to Azure Government requires different endpoints, stricter security controls, and additional compliance measures.

### Current State

- Backend synthesis targets Azure Commercial cloud only
- No government cloud-specific validation
- No FedRAMP compliance enforcement
- Endpoints hardcoded for commercial cloud

### Problem Statement

We need a government cloud compliance strategy that:

1. **Supports Azure Government:** Deploy to government cloud regions
2. **Enforces FedRAMP Controls:** Automatic compliance with FedRAMP requirements
3. **Manages Encryption:** Government-approved encryption at rest and in transit
4. **Implements Audit Logging:** Comprehensive audit trails for compliance
5. **Isolates Networks:** Strict network isolation and firewall rules
6. **Validates Compliance:** Pre-deployment compliance validation
7. **Maintains Parity:** Same developer experience for both clouds

### Compliance Requirements

**FedRAMP High Baseline:**
- Encryption: FIPS 140-2 compliant encryption
- Access Control: Multi-factor authentication required
- Audit Logging: Comprehensive logging with 90-day retention
- Network: Private endpoints, no public access
- Data Residency: Data must stay in US government regions
- Vulnerability Management: Regular security scanning
- Incident Response: Automated incident detection

**DoD Impact Level 5:**
- Enhanced encryption (AES-256)
- Isolated network environments
- Enhanced access controls
- Continuous monitoring
- Additional audit requirements

---

## Decision

We will implement a **compliance-first architecture** with automatic government cloud detection, validation, and enforcement of FedRAMP controls.

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Backend Definition                         │
│                                                               │
│  const backend = defineBackend({                              │
│    schema,                                                    │
│    authentication,                                            │
│    settings: {                                                │
│      name: 'gov-app',                                         │
│      region: 'usgovvirginia',  // Auto-detects gov cloud     │
│      compliance: {                                            │
│        standard: 'FedRAMP-High',                              │
│        impactLevel: 'IL5',                                    │
│      }                                                        │
│    }                                                          │
│  });                                                          │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│               Cloud Detection & Validation                    │
│                                                               │
│  ┌─────────────────┐    ┌──────────────────┐                │
│  │ Region Detector │───▶│ Compliance Rules │                │
│  └─────────────────┘    └──────────────────┘                │
│         │                        │                            │
│         ▼                        ▼                            │
│  usgovvirginia       ───▶  FedRAMP-High                      │
│  (Government)                Ruleset                          │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                Compliance Enforcement                         │
│                                                               │
│  ✅ FIPS 140-2 encryption                                    │
│  ✅ Private endpoints only                                   │
│  ✅ MFA required                                             │
│  ✅ Audit logging enabled                                    │
│  ✅ Network isolation                                        │
│  ✅ Data residency                                           │
│  ✅ Vulnerability scanning                                   │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│              Government Cloud Synthesis                       │
│                                                               │
│  - Government-specific endpoints                              │
│  - Enhanced security settings                                 │
│  - Compliance tags                                            │
│  - Audit configuration                                        │
└──────────────────────────────────────────────────────────────┘
```

### Configuration Schema

```typescript
/**
 * Compliance configuration
 */
export interface ComplianceConfig {
  /**
   * Compliance standard
   */
  standard: 'FedRAMP-Moderate' | 'FedRAMP-High' | 'DoD-IL2' | 'DoD-IL4' | 'DoD-IL5' | 'CJIS' | 'ITAR';

  /**
   * DoD Impact Level (for DoD deployments)
   */
  impactLevel?: 'IL2' | 'IL4' | 'IL5' | 'IL6';

  /**
   * Data classification
   */
  dataClassification?: 'Unclassified' | 'CUI' | 'Secret' | 'TopSecret';

  /**
   * Encryption requirements
   */
  encryption?: {
    /**
     * Require FIPS 140-2 validated encryption
     */
    fips140_2: boolean;

    /**
     * Encryption algorithm
     */
    algorithm?: 'AES-256-GCM' | 'AES-256-CBC';

    /**
     * Key management
     */
    keyManagement: 'AzureKeyVault' | 'HSM' | 'CustomerManaged';
  };

  /**
   * Network requirements
   */
  network?: {
    /**
     * Require private endpoints
     */
    privateEndpointsOnly: boolean;

    /**
     * Disable public access
     */
    publicAccessDisabled: boolean;

    /**
     * Network isolation level
     */
    isolation: 'Standard' | 'Enhanced' | 'Air-Gapped';
  };

  /**
   * Audit and logging requirements
   */
  audit?: {
    /**
     * Log retention period (days)
     */
    retentionDays: number;

    /**
     * Enable security audit logs
     */
    securityLogs: boolean;

    /**
     * Enable access logs
     */
    accessLogs: boolean;

    /**
     * Enable data access logs
     */
    dataAccessLogs: boolean;
  };

  /**
   * Access control requirements
   */
  accessControl?: {
    /**
     * Require MFA for all access
     */
    mfaRequired: boolean;

    /**
     * Require CAC/PIV for authentication
     */
    requireCAC: boolean;

    /**
     * Session timeout (minutes)
     */
    sessionTimeout: number;
  };

  /**
   * Continuous monitoring
   */
  monitoring?: {
    /**
     * Enable Microsoft Defender
     */
    defender: boolean;

    /**
     * Enable vulnerability scanning
     */
    vulnerabilityScanning: boolean;

    /**
     * Enable threat detection
     */
    threatDetection: boolean;
  };
}

/**
 * Backend settings with compliance
 */
export interface BackendSettings {
  name: string;
  region: AzureRegion;

  /**
   * Compliance configuration
   * Auto-populated for government regions
   */
  compliance?: ComplianceConfig;

  // ... other settings
}
```

### Cloud Detection

```typescript
/**
 * Azure Government regions
 */
const GOVERNMENT_REGIONS = [
  'usgovvirginia',
  'usgovtexas',
  'usgovarizona',
  'usdodeast',
  'usdodcentral',
] as const;

/**
 * Detect if region is in Azure Government
 */
export function isGovernmentRegion(region: string): boolean {
  return GOVERNMENT_REGIONS.includes(region as any);
}

/**
 * Detect cloud type from region
 */
export function detectCloudType(region: string): 'commercial' | 'government' | 'china' {
  if (isGovernmentRegion(region)) {
    return 'government';
  }
  if (region.startsWith('china')) {
    return 'china';
  }
  return 'commercial';
}

/**
 * Get cloud-specific endpoints
 */
export function getCloudEndpoints(cloudType: 'commercial' | 'government' | 'china') {
  switch (cloudType) {
    case 'government':
      return {
        resourceManager: 'https://management.usgovcloudapi.net/',
        activeDirectory: 'https://login.microsoftonline.us/',
        storage: 'core.usgovcloudapi.net',
        cosmos: 'documents.azure.us',
        keyVault: 'vault.usgovcloudapi.net',
      };
    case 'commercial':
      return {
        resourceManager: 'https://management.azure.com/',
        activeDirectory: 'https://login.microsoftonline.com/',
        storage: 'core.windows.net',
        cosmos: 'documents.azure.com',
        keyVault: 'vault.azure.net',
      };
    case 'china':
      return {
        resourceManager: 'https://management.chinacloudapi.cn/',
        activeDirectory: 'https://login.chinacloudapi.cn/',
        storage: 'core.chinacloudapi.cn',
        cosmos: 'documents.azure.cn',
        keyVault: 'vault.azure.cn',
      };
  }
}
```

### Compliance Presets

```typescript
/**
 * FedRAMP High compliance preset
 */
const FEDRAMP_HIGH: ComplianceConfig = {
  standard: 'FedRAMP-High',
  encryption: {
    fips140_2: true,
    algorithm: 'AES-256-GCM',
    keyManagement: 'AzureKeyVault',
  },
  network: {
    privateEndpointsOnly: true,
    publicAccessDisabled: true,
    isolation: 'Enhanced',
  },
  audit: {
    retentionDays: 90,
    securityLogs: true,
    accessLogs: true,
    dataAccessLogs: true,
  },
  accessControl: {
    mfaRequired: true,
    requireCAC: false,
    sessionTimeout: 30,
  },
  monitoring: {
    defender: true,
    vulnerabilityScanning: true,
    threatDetection: true,
  },
};

/**
 * DoD Impact Level 5 preset
 */
const DOD_IL5: ComplianceConfig = {
  standard: 'DoD-IL5',
  impactLevel: 'IL5',
  dataClassification: 'CUI',
  encryption: {
    fips140_2: true,
    algorithm: 'AES-256-GCM',
    keyManagement: 'HSM',
  },
  network: {
    privateEndpointsOnly: true,
    publicAccessDisabled: true,
    isolation: 'Air-Gapped',
  },
  audit: {
    retentionDays: 180,
    securityLogs: true,
    accessLogs: true,
    dataAccessLogs: true,
  },
  accessControl: {
    mfaRequired: true,
    requireCAC: true,
    sessionTimeout: 15,
  },
  monitoring: {
    defender: true,
    vulnerabilityScanning: true,
    threatDetection: true,
  },
};

/**
 * Apply compliance preset based on region
 */
export function applyCompliancePreset(
  settings: BackendSettings
): BackendSettings {
  const cloudType = detectCloudType(settings.region);

  if (cloudType === 'government' && !settings.compliance) {
    // Auto-apply FedRAMP-High for government regions
    return {
      ...settings,
      compliance: { ...FEDRAMP_HIGH },
    };
  }

  return settings;
}
```

### Compliance Validation

```typescript
/**
 * Compliance validator
 */
export class ComplianceValidator {
  /**
   * Validate backend complies with specified standard
   */
  async validate(
    backend: BackendObject,
    context: SynthesisContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const compliance = backend.settings.compliance;
    if (!compliance) {
      if (context.cloudType === 'government') {
        errors.push({
          path: 'settings.compliance',
          message: 'Compliance configuration required for government cloud deployments',
          code: 'COMPLIANCE_REQUIRED',
          suggestion: 'Add settings.compliance with FedRAMP-High or DoD IL level',
        });
      }
      return { isValid: errors.length === 0, errors, warnings };
    }

    // Validate encryption
    if (compliance.encryption?.fips140_2) {
      await this.validateFIPSEncryption(backend, errors);
    }

    // Validate network isolation
    if (compliance.network?.privateEndpointsOnly) {
      await this.validatePrivateEndpoints(backend, errors);
    }

    // Validate audit logging
    if (compliance.audit) {
      await this.validateAuditLogging(backend, compliance.audit, errors);
    }

    // Validate access controls
    if (compliance.accessControl?.mfaRequired) {
      await this.validateMFA(backend, errors);
    }

    // Validate data residency
    await this.validateDataResidency(backend, context, errors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate FIPS 140-2 encryption
   */
  private async validateFIPSEncryption(
    backend: BackendObject,
    errors: ValidationError[]
  ): Promise<void> {
    // Check Cosmos DB encryption
    const cosmosConfig = backend.storage.database.getConfig();
    if (!cosmosConfig.encryption || cosmosConfig.encryption !== 'AES-256-GCM') {
      errors.push({
        path: 'storage.database',
        message: 'FIPS 140-2 requires AES-256-GCM encryption for Cosmos DB',
        code: 'FIPS_ENCRYPTION_REQUIRED',
      });
    }

    // Check Storage Account encryption
    const storageConfig = backend.storage.account.getConfig();
    if (!storageConfig.encryption?.keySource || storageConfig.encryption.keySource !== 'Microsoft.Keyvault') {
      errors.push({
        path: 'storage.account',
        message: 'FIPS 140-2 requires KeyVault-managed encryption keys',
        code: 'KEYVAULT_ENCRYPTION_REQUIRED',
      });
    }
  }

  /**
   * Validate private endpoints
   */
  private async validatePrivateEndpoints(
    backend: BackendObject,
    errors: ValidationError[]
  ): Promise<void> {
    // Network feature must be enabled
    if (!backend.settings.features.networking) {
      errors.push({
        path: 'settings.features.networking',
        message: 'Networking feature must be enabled for private endpoints',
        code: 'NETWORKING_REQUIRED',
      });
    }

    // Public access must be disabled
    const cosmosConfig = backend.storage.database.getConfig();
    if (cosmosConfig.publicNetworkAccess !== 'Disabled') {
      errors.push({
        path: 'storage.database',
        message: 'Public network access must be disabled for Cosmos DB',
        code: 'PUBLIC_ACCESS_PROHIBITED',
      });
    }
  }

  /**
   * Validate audit logging
   */
  private async validateAuditLogging(
    backend: BackendObject,
    auditConfig: ComplianceConfig['audit'],
    errors: ValidationError[]
  ): Promise<void> {
    // Monitoring feature must be enabled
    if (!backend.settings.features.monitoring) {
      errors.push({
        path: 'settings.features.monitoring',
        message: 'Monitoring feature must be enabled for audit logging',
        code: 'MONITORING_REQUIRED',
      });
    }

    // Log retention must meet requirements
    const monitoringConfig = backend.monitoring?.logAnalytics?.getConfig();
    if (monitoringConfig && monitoringConfig.retentionDays < auditConfig.retentionDays) {
      errors.push({
        path: 'monitoring.logAnalytics',
        message: `Log retention must be at least ${auditConfig.retentionDays} days`,
        code: 'INSUFFICIENT_LOG_RETENTION',
      });
    }
  }

  /**
   * Validate MFA requirement
   */
  private async validateMFA(
    backend: BackendObject,
    errors: ValidationError[]
  ): Promise<void> {
    if (!backend.authentication) {
      errors.push({
        path: 'authentication',
        message: 'Authentication configuration required for MFA',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Check if any auth provider has MFA enabled
    const providers = Object.values(backend.authentication.providers);
    const hasMFA = providers.some(p => p.config?.mfa?.enabled);

    if (!hasMFA) {
      errors.push({
        path: 'authentication',
        message: 'Multi-factor authentication (MFA) is required for compliance',
        code: 'MFA_REQUIRED',
        suggestion: 'Enable MFA on at least one authentication provider',
      });
    }
  }

  /**
   * Validate data residency
   */
  private async validateDataResidency(
    backend: BackendObject,
    context: SynthesisContext,
    errors: ValidationError[]
  ): Promise<void> {
    if (context.cloudType !== 'government') {
      return;
    }

    // All resources must be in government regions
    const region = backend.settings.region;
    if (!isGovernmentRegion(region)) {
      errors.push({
        path: 'settings.region',
        message: 'Region must be a US Government region for government cloud compliance',
        code: 'INVALID_REGION',
        suggestion: 'Use usgovvirginia, usgovtexas, usgovarizona, usdodeast, or usdodcentral',
      });
    }

    // Check multi-region configuration
    if (backend.settings.regions) {
      const allRegions = [
        backend.settings.regions.primary,
        ...(backend.settings.regions.secondary || []),
      ];

      for (const region of allRegions) {
        if (!isGovernmentRegion(region)) {
          errors.push({
            path: 'settings.regions',
            message: `Region ${region} is not a US Government region`,
            code: 'INVALID_SECONDARY_REGION',
          });
        }
      }
    }
  }
}
```

### Government Cloud Resource Synthesis

```typescript
/**
 * Apply government cloud overrides to ARM resources
 */
export function applyGovernmentOverrides(
  resource: ARMResource,
  compliance: ComplianceConfig,
  cloudType: 'commercial' | 'government'
): ARMResource {
  if (cloudType !== 'government') {
    return resource;
  }

  const endpoints = getCloudEndpoints('government');

  switch (resource.type) {
    case 'Microsoft.DocumentDB/databaseAccounts':
      return {
        ...resource,
        properties: {
          ...resource.properties,
          // Force encryption
          encryption: {
            keyVaultKeyUri: '[parameters(\'keyVaultKeyUri\')]',
          },
          // Disable public access
          publicNetworkAccess: 'Disabled',
          // Private endpoints only
          networkAclBypass: 'None',
          isVirtualNetworkFilterEnabled: true,
          // Government cloud endpoints
          documentEndpoint: `https://${resource.name}.${endpoints.cosmos}`,
          // Enhanced security
          disableKeyBasedMetadataWriteAccess: true,
          // Compliance tags
          tags: {
            ...resource.tags,
            Compliance: compliance.standard,
            DataClassification: compliance.dataClassification || 'CUI',
            ImpactLevel: compliance.impactLevel || 'IL4',
          },
        },
      };

    case 'Microsoft.Storage/storageAccounts':
      return {
        ...resource,
        properties: {
          ...resource.properties,
          // Force HTTPS
          supportsHttpsTrafficOnly: true,
          // Minimum TLS version
          minimumTlsVersion: 'TLS1_2',
          // Encryption
          encryption: {
            services: {
              blob: { enabled: true, keyType: 'Account' },
              file: { enabled: true, keyType: 'Account' },
              table: { enabled: true, keyType: 'Account' },
              queue: { enabled: true, keyType: 'Account' },
            },
            keySource: 'Microsoft.Keyvault',
            keyvaultproperties: {
              keyname: '[parameters(\'encryptionKeyName\')]',
              keyvaulturi: '[parameters(\'keyVaultUri\')]',
            },
          },
          // Network rules
          networkAcls: {
            bypass: 'AzureServices',
            defaultAction: 'Deny',
            virtualNetworkRules: [],
            ipRules: [],
          },
          // Disable public blob access
          allowBlobPublicAccess: false,
        },
      };

    case 'Microsoft.Web/sites':
      return {
        ...resource,
        properties: {
          ...resource.properties,
          // Force HTTPS
          httpsOnly: true,
          // Minimum TLS
          siteConfig: {
            ...resource.properties.siteConfig,
            minTlsVersion: '1.2',
            ftpsState: 'Disabled',
            // Managed identity
            identity: {
              type: 'SystemAssigned',
            },
          },
          // Client certificate required
          clientCertEnabled: compliance.accessControl?.requireCAC ?? false,
        },
      };

    case 'Microsoft.KeyVault/vaults':
      return {
        ...resource,
        properties: {
          ...resource.properties,
          // Soft delete required
          enableSoftDelete: true,
          softDeleteRetentionInDays: 90,
          // Purge protection required
          enablePurgeProtection: true,
          // Network ACLs
          networkAcls: {
            bypass: 'AzureServices',
            defaultAction: 'Deny',
          },
          // Enhanced security
          enableRbacAuthorization: true,
        },
      };

    default:
      return resource;
  }
}
```

---

## Alternatives Considered

### Alternative 1: Manual Compliance Configuration

**Approach:** Users manually configure all compliance settings.

**Rejected because:** Error-prone, doesn't guarantee compliance, poor developer experience.

### Alternative 2: Separate Government Backend Type

**Approach:** Create `defineGovernmentBackend()` function.

**Rejected because:** Duplicates code, breaks parity, adds unnecessary complexity.

### Alternative 3: Compliance as Add-On

**Approach:** Compliance as optional plugin, not built-in.

**Rejected because:** Compliance is critical for government deployments, should be first-class.

---

## Consequences

### Positive

1. **Automatic Compliance:** FedRAMP controls auto-applied
2. **Validation:** Pre-deployment compliance checks
3. **Correct Endpoints:** Auto-configured for government cloud
4. **Audit Ready:** Comprehensive logging by default
5. **Secure by Default:** Enhanced security for government deployments

### Negative

1. **Complexity:** More validation rules to maintain
2. **Testing:** Need access to government cloud subscriptions
3. **Documentation:** Complex compliance requirements to explain

---

## Success Criteria

1. ✅ Auto-detect government regions
2. ✅ Apply FedRAMP compliance presets
3. ✅ Validate compliance before deployment
4. ✅ Use correct government cloud endpoints
5. ✅ Generate compliant ARM templates
6. ✅ Comprehensive audit logging

---

## Implementation Plan

- Phase 1: Cloud detection (1 day)
- Phase 2: Compliance presets (2 days)
- Phase 3: Validation (3 days)
- Phase 4: Resource overrides (3 days)
- Phase 5: Testing (3 days)

**Total:** 12 days

---

**Status:** Proposed
**Implementation Target:** Week 6-8
