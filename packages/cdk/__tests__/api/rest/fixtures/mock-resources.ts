/**
 * Mock Azure resources for testing.
 *
 * Provides realistic mock implementations of Azure resources
 * to support testing without actual Azure dependencies.
 */

import type {
  IApiManagement,
  IFunctionApp,
  IWebApp,
  IContainerApp,
} from '../utils';

// ============================================================================
// Mock API Management Services
// ============================================================================

/**
 * Mock API Management service (Commercial cloud).
 */
export const mockCommercialApim: IApiManagement = {
  name: 'test-apim-commercial',
  resourceGroup: 'test-rg',
};

/**
 * Mock API Management service (Government cloud).
 */
export const mockGovernmentApim: IApiManagement = {
  name: 'test-apim-government',
  resourceGroup: 'test-rg-gov',
};

/**
 * Mock API Management service (Premium tier).
 */
export const mockPremiumApim: IApiManagement = {
  name: 'test-apim-premium',
  resourceGroup: 'test-rg',
};

// ============================================================================
// Mock Function Apps
// ============================================================================

/**
 * Mock Function App (User service).
 */
export const mockUserFunctionApp: IFunctionApp = {
  name: 'user-function-app',
  defaultHostName: 'user-function-app.azurewebsites.net',
};

/**
 * Mock Function App (Order service).
 */
export const mockOrderFunctionApp: IFunctionApp = {
  name: 'order-function-app',
  defaultHostName: 'order-function-app.azurewebsites.net',
};

/**
 * Mock Function App (Payment service).
 */
export const mockPaymentFunctionApp: IFunctionApp = {
  name: 'payment-function-app',
  defaultHostName: 'payment-function-app.azurewebsites.net',
};

/**
 * Mock Function App (Government cloud).
 */
export const mockGovFunctionApp: IFunctionApp = {
  name: 'gov-function-app',
  defaultHostName: 'gov-function-app.azurewebsites.us',
};

// ============================================================================
// Mock App Services
// ============================================================================

/**
 * Mock App Service (API backend).
 */
export const mockApiAppService: IWebApp = {
  name: 'api-app-service',
  defaultHostName: 'api-app-service.azurewebsites.net',
};

/**
 * Mock App Service (Web frontend).
 */
export const mockWebAppService: IWebApp = {
  name: 'web-app-service',
  defaultHostName: 'web-app-service.azurewebsites.net',
};

/**
 * Mock App Service (Admin portal).
 */
export const mockAdminAppService: IWebApp = {
  name: 'admin-app-service',
  defaultHostName: 'admin-app-service.azurewebsites.net',
};

// ============================================================================
// Mock Container Apps
// ============================================================================

/**
 * Mock Container App (Microservice).
 */
export const mockMicroserviceContainerApp: IContainerApp = {
  name: 'microservice-container-app',
  configuration: {
    ingress: {
      fqdn: 'microservice.azurecontainerapps.io',
      targetPort: 8080,
    },
  },
};

/**
 * Mock Container App (API Gateway).
 */
export const mockGatewayContainerApp: IContainerApp = {
  name: 'gateway-container-app',
  configuration: {
    ingress: {
      fqdn: 'gateway.azurecontainerapps.io',
      targetPort: 80,
    },
  },
};

/**
 * Mock Container App (Background worker).
 */
export const mockWorkerContainerApp: IContainerApp = {
  name: 'worker-container-app',
  configuration: {
    ingress: {
      fqdn: 'worker.azurecontainerapps.io',
      targetPort: 3000,
    },
  },
};

// ============================================================================
// Export Collections
// ============================================================================

/**
 * All mock resources grouped by type.
 */
export const mockResources = {
  apiManagement: {
    commercial: mockCommercialApim,
    government: mockGovernmentApim,
    premium: mockPremiumApim,
  },
  functionApps: {
    user: mockUserFunctionApp,
    order: mockOrderFunctionApp,
    payment: mockPaymentFunctionApp,
    government: mockGovFunctionApp,
  },
  appServices: {
    api: mockApiAppService,
    web: mockWebAppService,
    admin: mockAdminAppService,
  },
  containerApps: {
    microservice: mockMicroserviceContainerApp,
    gateway: mockGatewayContainerApp,
    worker: mockWorkerContainerApp,
  },
};

export default mockResources;
