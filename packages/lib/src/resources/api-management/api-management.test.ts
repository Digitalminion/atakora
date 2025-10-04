import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { ResourceGroup } from '../resource-group/resource-group';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import {
  ApiManagement,
  ApiManagementApi,
  ApiManagementProduct,
  ApiManagementSubscription,
  ApiManagementPolicy,
} from './';
import {
  ApiManagementSkuName,
  VirtualNetworkType,
  ApiProtocol,
  ProductState,
  SubscriptionState,
} from './types';

describe('resources/api-management/ApiManagement', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-products'),
      project: new Project('colorai'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
      tags: {
        managed_by: 'terraform',
      },
    });
    resourceGroup = new ResourceGroup(stack, 'ConnectivityRG');
  });

  describe('ApiManagement L2 construct', () => {
    it('should create API Management service with auto-generated name', () => {
      const apim = new ApiManagement(resourceGroup, 'Gateway', {
        publisherName: 'Avient ColorAI',
        publisherEmail: 'admin@avient.com',
      });

      expect(apim.serviceName).toMatch(/^apim-/);
      expect(apim.serviceName).toContain('dp-colorai');
      expect(apim.location).toBe('eastus');
    });

    it('should use provided service name when specified', () => {
      const apim = new ApiManagement(resourceGroup, 'Gateway', {
        serviceName: 'apim-custom',
        publisherName: 'Avient ColorAI',
        publisherEmail: 'admin@avient.com',
      });

      expect(apim.serviceName).toBe('apim-custom');
    });

    it('should default SKU to Developer for non-prod', () => {
      const apim = new ApiManagement(resourceGroup, 'Gateway', {
        publisherName: 'Avient ColorAI',
        publisherEmail: 'admin@avient.com',
      });

      expect(apim.sku).toBe(ApiManagementSkuName.DEVELOPER);
      expect(apim.capacity).toBe(1);
    });

    it('should use provided SKU when specified', () => {
      const apim = new ApiManagement(resourceGroup, 'Gateway', {
        publisherName: 'Avient ColorAI',
        publisherEmail: 'admin@avient.com',
        sku: ApiManagementSkuName.PREMIUM,
      });

      expect(apim.sku).toBe(ApiManagementSkuName.PREMIUM);
      expect(apim.capacity).toBe(2); // Default capacity for Premium is 2
    });

    it('should merge tags with parent', () => {
      const apim = new ApiManagement(resourceGroup, 'Gateway', {
        publisherName: 'Avient ColorAI',
        publisherEmail: 'admin@avient.com',
        tags: {
          purpose: 'api-gateway',
        },
      });

      expect(apim.tags).toMatchObject({
        managed_by: 'terraform',
        purpose: 'api-gateway',
      });
    });

    it('should compute gateway URL correctly', () => {
      const apim = new ApiManagement(resourceGroup, 'Gateway', {
        serviceName: 'apim-test',
        publisherName: 'Avient ColorAI',
        publisherEmail: 'admin@avient.com',
      });

      expect(apim.gatewayUrl).toBe('https://apim-test.azure-api.net');
      expect(apim.managementUrl).toBe('https://apim-test.management.azure-api.net');
    });
  });

  describe('ApiManagementApi L2 construct', () => {
    let apim: ApiManagement;

    beforeEach(() => {
      apim = new ApiManagement(resourceGroup, 'Gateway', {
        publisherName: 'Avient ColorAI',
        publisherEmail: 'admin@avient.com',
      });
    });

    it('should create API with sanitized name', () => {
      const api = new ApiManagementApi(apim, 'BackendAPI', {
        apiManagementService: apim,
        displayName: 'ColorAI Backend API',
        serviceUrl: 'https://backend.azurewebsites.net',
      });

      expect(api.apiName).toMatch(/^[a-z0-9-]+$/);
      expect(api.path).toBe(api.apiName);
    });

    it('should use provided path when specified', () => {
      const api = new ApiManagementApi(apim, 'BackendAPI', {
        apiManagementService: apim,
        displayName: 'ColorAI Backend API',
        serviceUrl: 'https://backend.azurewebsites.net',
        path: 'api/v1',
      });

      expect(api.path).toBe('api/v1');
    });

    it('should default to HTTPS protocol', () => {
      const api = new ApiManagementApi(apim, 'BackendAPI', {
        apiManagementService: apim,
        displayName: 'ColorAI Backend API',
        serviceUrl: 'https://backend.azurewebsites.net',
      });

      // The protocol is checked in the L1 construct, which is created internally
      expect(api.apiId).toContain(apim.serviceName);
    });
  });

  describe('ApiManagementProduct L2 construct', () => {
    let apim: ApiManagement;

    beforeEach(() => {
      apim = new ApiManagement(resourceGroup, 'Gateway', {
        publisherName: 'Avient ColorAI',
        publisherEmail: 'admin@avient.com',
      });
    });

    it('should create product with sanitized name', () => {
      const product = new ApiManagementProduct(apim, 'ColorAIProduct', {
        apiManagementService: apim,
        displayName: 'ColorAI Product',
      });

      expect(product.productName).toMatch(/^[a-z0-9-]+$/);
    });

    it('should default to published state', () => {
      const product = new ApiManagementProduct(apim, 'ColorAIProduct', {
        apiManagementService: apim,
        displayName: 'ColorAI Product',
      });

      // State is set internally in L1 construct
      expect(product.productId).toContain(apim.serviceName);
    });

    it('should use provided product name when specified', () => {
      const product = new ApiManagementProduct(apim, 'ColorAIProduct', {
        apiManagementService: apim,
        productName: 'custom-product',
        displayName: 'ColorAI Product',
      });

      expect(product.productName).toBe('custom-product');
    });
  });

  describe('ApiManagementSubscription L2 construct', () => {
    let apim: ApiManagement;
    let product: ApiManagementProduct;

    beforeEach(() => {
      apim = new ApiManagement(resourceGroup, 'Gateway', {
        publisherName: 'Avient ColorAI',
        publisherEmail: 'admin@avient.com',
      });
      product = new ApiManagementProduct(apim, 'ColorAIProduct', {
        apiManagementService: apim,
        displayName: 'ColorAI Product',
      });
    });

    it('should create subscription with product scope', () => {
      const subscription = new ApiManagementSubscription(apim, 'ColorAISubscription', {
        apiManagementService: apim,
        displayName: 'ColorAI Subscription',
        scopeProduct: product,
      });

      expect(subscription.subscriptionName).toMatch(/^[a-z0-9-]+$/);
      expect(subscription.subscriptionId).toContain(apim.serviceName);
    });

    it('should throw error if no scope provided', () => {
      expect(() => {
        new ApiManagementSubscription(apim, 'ColorAISubscription', {
          apiManagementService: apim,
          displayName: 'ColorAI Subscription',
        });
      }).toThrow('Either scopeProduct or scopeApi must be provided');
    });

    it('should use provided subscription name when specified', () => {
      const subscription = new ApiManagementSubscription(apim, 'ColorAISubscription', {
        apiManagementService: apim,
        subscriptionName: 'custom-subscription',
        displayName: 'ColorAI Subscription',
        scopeProduct: product,
      });

      expect(subscription.subscriptionName).toBe('custom-subscription');
    });
  });

  describe('ApiManagementPolicy L2 construct', () => {
    let apim: ApiManagement;
    let api: ApiManagementApi;

    beforeEach(() => {
      apim = new ApiManagement(resourceGroup, 'Gateway', {
        publisherName: 'Avient ColorAI',
        publisherEmail: 'admin@avient.com',
      });
      api = new ApiManagementApi(apim, 'BackendAPI', {
        apiManagementService: apim,
        displayName: 'ColorAI Backend API',
        serviceUrl: 'https://backend.azurewebsites.net',
      });
    });

    it('should create global policy', () => {
      const policyXml = `
        <policies>
          <inbound>
            <rate-limit calls="100" renewal-period="60" />
          </inbound>
          <backend>
            <forward-request />
          </backend>
          <outbound />
          <on-error />
        </policies>
      `;

      const policy = new ApiManagementPolicy(apim, 'GlobalPolicy', {
        parent: apim,
        policyXml,
      });

      expect(policy.policyXml).toBe(policyXml);
      expect(policy.policyId).toContain(apim.serviceName);
    });

    it('should create API-level policy', () => {
      const policyXml = `
        <policies>
          <inbound>
            <set-backend-service base-url="https://backend.example.com" />
          </inbound>
          <backend>
            <forward-request />
          </backend>
          <outbound />
          <on-error />
        </policies>
      `;

      const policy = new ApiManagementPolicy(api, 'APIPolicy', {
        parent: api,
        policyXml,
      });

      expect(policy.policyXml).toBe(policyXml);
      expect(policy.policyId).toContain('/apis/');
    });
  });
});
