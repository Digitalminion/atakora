import { DeviceCodeCredential, InteractiveBrowserCredential, TokenCredential, TokenCachePersistenceOptions } from '@azure/identity';
import { SubscriptionClient } from '@azure/arm-subscriptions';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export type CloudEnvironment =
  | 'AzureCloud'
  | 'AzureUSGovernment'
  | 'AzureChinaCloud'
  | 'AzureGermanCloud';

export interface CloudConfig {
  authorityHost: string;
  managementEndpoint: string;
}

export interface TenantInfo {
  tenantId: string;
  displayName: string;
  defaultDomain: string;
}

export interface SubscriptionInfo {
  subscriptionId: string;
  displayName: string;
  state: string;
  tenantId: string;
}

export interface AuthResult {
  success: boolean;
  userEmail?: string;
  tenantId?: string;
  error?: string;
}

export class AzureAuthService {
  private credential: TokenCredential | null = null;
  private cloudConfig: CloudConfig;
  private tokenCachePath: string;

  constructor(cloud: CloudEnvironment = 'AzureCloud') {
    this.cloudConfig = this.getCloudConfig(cloud);
    // Set explicit token cache path to avoid "path is undefined" errors
    const cacheDir = path.join(os.homedir(), '.atakora');
    this.tokenCachePath = path.join(cacheDir, 'token-cache.bin');

    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }

  /**
   * Get cloud-specific configuration
   */
  private getCloudConfig(cloud: CloudEnvironment): CloudConfig {
    const configs: Record<CloudEnvironment, CloudConfig> = {
      AzureCloud: {
        authorityHost: 'https://login.microsoftonline.com',
        managementEndpoint: 'https://management.azure.com',
      },
      AzureUSGovernment: {
        authorityHost: 'https://login.microsoftonline.us',
        managementEndpoint: 'https://management.usgovcloudapi.net',
      },
      AzureChinaCloud: {
        authorityHost: 'https://login.chinacloudapi.cn',
        managementEndpoint: 'https://management.chinacloudapi.cn',
      },
      AzureGermanCloud: {
        authorityHost: 'https://login.microsoftonline.de',
        managementEndpoint: 'https://management.microsoftazure.de',
      },
    };

    return configs[cloud];
  }

  /**
   * Perform interactive browser-based authentication
   */
  async login(): Promise<AuthResult> {
    try {
      // Only create a new credential if we don't have one already
      // This allows the Azure SDK to reuse cached tokens
      if (!this.credential) {
        // Use InteractiveBrowserCredential with minimal configuration
        // Don't specify tokenCachePersistenceOptions - let SDK handle defaults
        this.credential = new InteractiveBrowserCredential({
          redirectUri: 'http://localhost',
          authorityHost: this.cloudConfig.authorityHost,
        });
      }

      // Test the credential by getting a token with cloud-specific endpoint
      // This will use cached token if available, or prompt for login if needed
      const tokenResponse = await this.credential.getToken(
        `${this.cloudConfig.managementEndpoint}/.default`
      );

      if (!tokenResponse) {
        return {
          success: false,
          error: 'Failed to obtain authentication token',
        };
      }

      // Get user info from the token claims
      const client = new SubscriptionClient(this.credential);
      const tenants = [];
      for await (const tenant of client.tenants.list()) {
        tenants.push(tenant);
      }

      const firstTenant = tenants[0];

      return {
        success: true,
        tenantId: firstTenant?.tenantId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * List all tenants accessible to the authenticated user
   */
  async listTenants(): Promise<TenantInfo[]> {
    if (!this.credential) {
      throw new Error('Not authenticated. Please run login first.');
    }

    const client = new SubscriptionClient(this.credential);
    const tenants: TenantInfo[] = [];

    for await (const tenant of client.tenants.list()) {
      tenants.push({
        tenantId: tenant.tenantId || '',
        displayName: tenant.displayName || tenant.tenantId || 'Unknown',
        defaultDomain: tenant.defaultDomain || '',
      });
    }

    return tenants;
  }

  /**
   * List all subscriptions in a specific tenant
   */
  async listSubscriptions(tenantId?: string): Promise<SubscriptionInfo[]> {
    if (!this.credential) {
      throw new Error('Not authenticated. Please run login first.');
    }

    // Create credential with specific tenant if provided
    const credential = tenantId
      ? new InteractiveBrowserCredential({
          tenantId,
          redirectUri: 'http://localhost',
          authorityHost: this.cloudConfig.authorityHost,
        })
      : this.credential;

    const client = new SubscriptionClient(credential);
    const subscriptions: SubscriptionInfo[] = [];

    for await (const subscription of client.subscriptions.list()) {
      subscriptions.push({
        subscriptionId: subscription.subscriptionId || '',
        displayName: subscription.displayName || subscription.subscriptionId || 'Unknown',
        state: subscription.state || 'Unknown',
        tenantId: subscription.tenantId || tenantId || '',
      });
    }

    return subscriptions;
  }

  /**
   * Get the current credential for use in other Azure SDK calls
   */
  getCredential(): TokenCredential {
    if (!this.credential) {
      throw new Error('Not authenticated. Please run login first.');
    }
    return this.credential;
  }

  /**
   * Create a credential for a specific tenant
   */
  createCredential(tenantId: string): TokenCredential {
    return new InteractiveBrowserCredential({
      tenantId,
      redirectUri: 'http://localhost',
      authorityHost: this.cloudConfig.authorityHost,
    });
  }
}
