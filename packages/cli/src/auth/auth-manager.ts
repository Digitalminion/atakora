import { AzureAuthService, CloudEnvironment } from './azure-auth';
import { TokenCredential } from '@azure/identity';

/**
 * Singleton authentication manager that caches credentials across CLI commands.
 *
 * This ensures users only need to authenticate once per CLI session,
 * rather than re-authenticating for every command.
 */
class AuthManager {
  private static instance: AuthManager;
  private authServices: Map<CloudEnvironment, AzureAuthService> = new Map();
  private currentCloud: CloudEnvironment = 'AzureCloud';

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of AuthManager
   */
  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Get or create an AzureAuthService for a specific cloud environment.
   * Reuses existing service instances to maintain credential cache.
   */
  getAuthService(cloud: CloudEnvironment = 'AzureCloud'): AzureAuthService {
    this.currentCloud = cloud;

    if (!this.authServices.has(cloud)) {
      this.authServices.set(cloud, new AzureAuthService(cloud));
    }

    return this.authServices.get(cloud)!;
  }

  /**
   * Get credential for the current cloud environment.
   * Throws if not authenticated.
   */
  getCredential(cloud?: CloudEnvironment): TokenCredential {
    const authService = this.getAuthService(cloud || this.currentCloud);
    return authService.getCredential();
  }

  /**
   * Create a credential for a specific tenant.
   * Uses the cached auth service to avoid re-authentication.
   */
  createCredential(tenantId: string, cloud?: CloudEnvironment): TokenCredential {
    const authService = this.getAuthService(cloud || this.currentCloud);
    return authService.createCredential(tenantId);
  }

  /**
   * Check if already authenticated for a specific cloud environment.
   */
  isAuthenticated(cloud?: CloudEnvironment): boolean {
    const targetCloud = cloud || this.currentCloud;
    const authService = this.authServices.get(targetCloud);

    if (!authService) {
      return false;
    }

    try {
      authService.getCredential();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all cached credentials (useful for logout).
   */
  clearCredentials(): void {
    this.authServices.clear();
  }

  /**
   * Get the current cloud environment.
   */
  getCurrentCloud(): CloudEnvironment {
    return this.currentCloud;
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance();
