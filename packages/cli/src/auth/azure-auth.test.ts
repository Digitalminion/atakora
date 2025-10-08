import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AzureAuthService } from './azure-auth';
import { InteractiveBrowserCredential } from '@azure/identity';
import { SubscriptionClient } from '@azure/arm-subscriptions';

// Mock Azure SDK
vi.mock('@azure/identity');
vi.mock('@azure/arm-subscriptions');

interface MockCredential {
  getToken: ReturnType<typeof vi.fn>;
}

interface MockSubscriptionClient {
  tenants: {
    list: ReturnType<typeof vi.fn>;
  };
  subscriptions: {
    list: ReturnType<typeof vi.fn>;
  };
}

describe('AzureAuthService', () => {
  let authService: AzureAuthService;
  let mockCredential: MockCredential;
  let mockSubscriptionClient: MockSubscriptionClient;

  beforeEach(() => {
    authService = new AzureAuthService();

    // Mock credential
    mockCredential = {
      getToken: vi.fn(),
    };

    // Mock subscription client
    mockSubscriptionClient = {
      tenants: {
        list: vi.fn(),
      },
      subscriptions: {
        list: vi.fn(),
      },
    };

    vi.mocked(InteractiveBrowserCredential).mockImplementation(
      () => mockCredential as unknown as InteractiveBrowserCredential
    );
    vi.mocked(SubscriptionClient).mockImplementation(
      () => mockSubscriptionClient as unknown as SubscriptionClient
    );
  });

  describe('login', () => {
    it('should successfully authenticate and return tenant ID', async () => {
      // Mock successful token retrieval
      mockCredential.getToken.mockResolvedValue({
        token: 'mock-token',
        expiresOnTimestamp: Date.now() + 3600000,
      });

      // Mock tenant listing
      const mockTenant = {
        tenantId: 'tenant-123',
        displayName: 'Test Tenant',
        defaultDomain: 'test.onmicrosoft.com',
      };

      mockSubscriptionClient.tenants.list.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield mockTenant;
        },
      });

      const result = await authService.login();

      expect(result.success).toBe(true);
      expect(result.tenantId).toBe('tenant-123');
      expect(mockCredential.getToken).toHaveBeenCalledWith('https://management.azure.com/.default');
    });

    it('should return error when token retrieval fails', async () => {
      mockCredential.getToken.mockResolvedValue(null);

      const result = await authService.login();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to obtain authentication token');
    });

    it('should handle authentication errors', async () => {
      mockCredential.getToken.mockRejectedValue(new Error('Auth failed'));

      const result = await authService.login();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Auth failed');
    });
  });

  describe('listTenants', () => {
    it('should return list of accessible tenants', async () => {
      const mockTenants = [
        {
          tenantId: 'tenant-1',
          displayName: 'Tenant 1',
          defaultDomain: 'tenant1.onmicrosoft.com',
        },
        {
          tenantId: 'tenant-2',
          displayName: 'Tenant 2',
          defaultDomain: 'tenant2.onmicrosoft.com',
        },
      ];

      mockSubscriptionClient.tenants.list.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const tenant of mockTenants) {
            yield tenant;
          }
        },
      });

      // First login to set credential
      mockCredential.getToken.mockResolvedValue({ token: 'mock-token' });
      mockSubscriptionClient.tenants.list.mockReturnValueOnce({
        [Symbol.asyncIterator]: async function* () {
          yield mockTenants[0];
        },
      });
      await authService.login();

      // Reset mock to return all tenants
      mockSubscriptionClient.tenants.list.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const tenant of mockTenants) {
            yield tenant;
          }
        },
      });

      const tenants = await authService.listTenants();

      expect(tenants).toHaveLength(2);
      expect(tenants[0].tenantId).toBe('tenant-1');
      expect(tenants[1].tenantId).toBe('tenant-2');
    });

    it('should throw error when not authenticated', async () => {
      await expect(authService.listTenants()).rejects.toThrow('Not authenticated');
    });
  });

  describe('listSubscriptions', () => {
    it('should return list of subscriptions', async () => {
      const mockSubscriptions = [
        {
          subscriptionId: 'sub-1',
          displayName: 'Subscription 1',
          state: 'Enabled',
          tenantId: 'tenant-1',
        },
        {
          subscriptionId: 'sub-2',
          displayName: 'Subscription 2',
          state: 'Enabled',
          tenantId: 'tenant-1',
        },
      ];

      mockSubscriptionClient.subscriptions.list.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const sub of mockSubscriptions) {
            yield sub;
          }
        },
      });

      // First login to set credential
      mockCredential.getToken.mockResolvedValue({ token: 'mock-token' });
      mockSubscriptionClient.tenants.list.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { tenantId: 'tenant-1' };
        },
      });
      await authService.login();

      const subscriptions = await authService.listSubscriptions();

      expect(subscriptions).toHaveLength(2);
      expect(subscriptions[0].subscriptionId).toBe('sub-1');
      expect(subscriptions[1].displayName).toBe('Subscription 2');
    });

    it('should throw error when not authenticated', async () => {
      await expect(authService.listSubscriptions()).rejects.toThrow('Not authenticated');
    });
  });

  describe('getCredential', () => {
    it('should return credential after login', async () => {
      mockCredential.getToken.mockResolvedValue({ token: 'mock-token' });
      mockSubscriptionClient.tenants.list.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { tenantId: 'tenant-1' };
        },
      });

      await authService.login();
      const credential = authService.getCredential();

      expect(credential).toBeDefined();
    });

    it('should throw error when not authenticated', () => {
      expect(() => authService.getCredential()).toThrow('Not authenticated');
    });
  });

  describe('createCredential', () => {
    it('should create a tenant-specific credential', () => {
      const credential = authService.createCredential('tenant-123');

      expect(credential).toBeDefined();
      expect(InteractiveBrowserCredential).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        redirectUri: 'http://localhost:8080',
      });
    });
  });
});
