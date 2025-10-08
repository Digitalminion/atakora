/**
 * Tests for ARM Expression Validator
 *
 * These tests verify that the validator catches common ARM template mistakes
 * that would cause deployment failures.
 */

import { describe, it, expect } from 'vitest';
import { ArmExpressionValidator } from './arm-expression-validator';
import { ArmTemplate } from '../types';

describe('ArmExpressionValidator', () => {
  const validator = new ArmExpressionValidator();
  const stackName = 'test-stack';

  describe('Valid Templates', () => {
    it('should validate a simple valid template', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'myVNet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
            },
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate VNet with inline subnets with correct structure', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'myVNet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
              subnets: [
                {
                  name: 'default',
                  properties: {
                    addressPrefix: '10.0.1.0/24',
                  },
                },
              ],
            },
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate subnet with correct delegation structure', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'myVNet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
              subnets: [
                {
                  name: 'aci-subnet',
                  properties: {
                    addressPrefix: '10.0.1.0/24',
                    delegations: [
                      {
                        name: 'aci-delegation',
                        properties: {
                          serviceName: 'Microsoft.ContainerInstance/containerGroups',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate subnet with NSG reference using resourceId expression', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'myVNet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
              subnets: [
                {
                  name: 'default',
                  properties: {
                    addressPrefix: '10.0.1.0/24',
                    networkSecurityGroup: {
                      id: "[resourceId('Microsoft.Network/networkSecurityGroups', 'myNSG')]",
                    },
                  },
                },
              ],
            },
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate dependencies with resourceId expressions', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'myVNet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
            },
            dependsOn: [
              "[resourceId('Microsoft.Network/networkSecurityGroups', 'myNSG')]",
              "[resourceId('Microsoft.Network/routeTables', 'myRouteTable')]",
            ],
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid Subnet Structure', () => {
    it('should error when subnet is missing properties wrapper', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'myVNet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
              subnets: [
                {
                  name: 'default',
                  // WRONG: Missing properties wrapper
                  addressPrefix: '10.0.1.0/24',
                } as any,
              ],
            },
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_SUBNET_PROPERTIES_WRAPPER');
      expect(result.errors[0].message).toContain('properties wrapper');
      expect(result.errors[0].suggestion).toContain('properties: { addressPrefix:');
    });

    it('should error when delegation is missing properties wrapper', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'myVNet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
              subnets: [
                {
                  name: 'aci-subnet',
                  properties: {
                    addressPrefix: '10.0.1.0/24',
                    delegations: [
                      {
                        name: 'aci-delegation',
                        // WRONG: Missing properties wrapper
                        serviceName: 'Microsoft.ContainerInstance/containerGroups',
                      } as any,
                    ],
                  },
                },
              ],
            },
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_DELEGATION_PROPERTIES_WRAPPER');
      expect(result.errors[0].message).toContain('Delegation');
      expect(result.errors[0].message).toContain('properties wrapper');
      expect(result.errors[0].suggestion).toContain('properties: { serviceName:');
    });
  });

  describe('Invalid NSG References', () => {
    it('should error when NSG reference uses literal resource ID', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'myVNet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
              subnets: [
                {
                  name: 'default',
                  properties: {
                    addressPrefix: '10.0.1.0/24',
                    networkSecurityGroup: {
                      // WRONG: Literal resource ID instead of ARM expression
                      id: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myRG/providers/Microsoft.Network/networkSecurityGroups/myNSG',
                    },
                  },
                },
              ],
            },
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LITERAL_NSG_REFERENCE');
      expect(result.errors[0].message).toContain('literal resource ID');
      expect(result.errors[0].suggestion).toContain('resourceId()');
    });

    it('should error when NSG reference is not an ARM expression', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'myVNet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
              subnets: [
                {
                  name: 'default',
                  properties: {
                    addressPrefix: '10.0.1.0/24',
                    networkSecurityGroup: {
                      // WRONG: Plain string instead of ARM expression
                      id: 'myNSG',
                    },
                  },
                },
              ],
            },
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_NSG_REFERENCE');
      expect(result.errors[0].suggestion).toContain('resourceId');
    });
  });

  describe('Invalid Dependencies', () => {
    it('should error when dependency uses literal resource ID', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'myVNet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
            },
            // WRONG: Literal resource ID in dependency
            dependsOn: [
              '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myRG/providers/Microsoft.Network/networkSecurityGroups/myNSG',
            ],
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LITERAL_RESOURCE_ID_IN_DEPENDENCY');
      expect(result.errors[0].suggestion).toContain('resourceId()');
    });

    it('should error when dependency is missing brackets around ARM expression', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'myVNet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
            },
            // WRONG: Missing brackets around resourceId()
            dependsOn: ["resourceId('Microsoft.Network/networkSecurityGroups', 'myNSG')"],
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_EXPRESSION_BRACKETS');
      expect(result.errors[0].message).toContain('missing brackets');
    });
  });

  describe('Network Security Group Validation', () => {
    it('should error when security rule is missing properties wrapper', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/networkSecurityGroups',
            apiVersion: '2023-04-01',
            name: 'myNSG',
            location: 'eastus',
            properties: {
              securityRules: [
                {
                  name: 'allow-http',
                  // WRONG: Missing properties wrapper
                  protocol: 'Tcp',
                  access: 'Allow',
                  priority: 100,
                  direction: 'Inbound',
                } as any,
              ],
            },
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_RULE_PROPERTIES_WRAPPER');
      expect(result.errors[0].message).toContain('Security rule');
      expect(result.errors[0].message).toContain('properties wrapper');
    });
  });

  describe('Storage Account Validation', () => {
    it('should error when virtual network rule uses literal resource ID', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'mystorageaccount',
            location: 'eastus',
            kind: 'StorageV2',
            sku: {
              name: 'Standard_LRS',
            },
            properties: {
              networkAcls: {
                defaultAction: 'Deny',
                virtualNetworkRules: [
                  {
                    // WRONG: Literal resource ID instead of ARM expression
                    id: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myRG/providers/Microsoft.Network/virtualNetworks/myVNet/subnets/default',
                  },
                ],
              },
            },
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LITERAL_RESOURCE_REFERENCE');
      expect(result.errors[0].message).toContain('literal resource ID');
    });
  });

  describe('Output Validation', () => {
    it('should error when output is missing brackets around ARM expression', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [],
        outputs: {
          vnetId: {
            type: 'string',
            // WRONG: Missing brackets around resourceId()
            value: "resourceId('Microsoft.Network/virtualNetworks', 'myVNet')",
          },
        },
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_EXPRESSION_BRACKETS');
      expect(result.errors[0].path).toContain('outputs/vnetId/value');
    });
  });

  describe('Property Validation', () => {
    it('should error when nested property is missing brackets around ARM expression', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'myVNet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
              customProperty: {
                // WRONG: Missing brackets around concat()
                value: "concat('prefix-', parameters('suffix'))",
              } as any,
            },
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('MISSING_EXPRESSION_BRACKETS');
    });

    it('should warn when property uses literal resource ID', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'myVNet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
              customResourceId:
                '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myRG/providers/Microsoft.Network/routeTables/myRT',
            } as any,
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe('LITERAL_RESOURCE_ID');
      expect(result.warnings[0].suggestion).toContain('resourceId');
    });
  });

  describe('Complex Scenarios', () => {
    it('should validate complex VNet with multiple subnets, NSGs, and delegations', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'myVNet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
              subnets: [
                {
                  name: 'default',
                  properties: {
                    addressPrefix: '10.0.1.0/24',
                    networkSecurityGroup: {
                      id: "[resourceId('Microsoft.Network/networkSecurityGroups', 'defaultNSG')]",
                    },
                  },
                },
                {
                  name: 'aci-subnet',
                  properties: {
                    addressPrefix: '10.0.2.0/24',
                    networkSecurityGroup: {
                      id: "[resourceId('Microsoft.Network/networkSecurityGroups', 'aciNSG')]",
                    },
                    delegations: [
                      {
                        name: 'aci-delegation',
                        properties: {
                          serviceName: 'Microsoft.ContainerInstance/containerGroups',
                        },
                      },
                    ],
                  },
                },
                {
                  name: 'app-service-subnet',
                  properties: {
                    addressPrefix: '10.0.3.0/24',
                    delegations: [
                      {
                        name: 'app-service-delegation',
                        properties: {
                          serviceName: 'Microsoft.Web/serverFarms',
                        },
                      },
                    ],
                  },
                },
              ],
            },
            dependsOn: [
              "[resourceId('Microsoft.Network/networkSecurityGroups', 'defaultNSG')]",
              "[resourceId('Microsoft.Network/networkSecurityGroups', 'aciNSG')]",
            ],
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect multiple errors in a single template', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'myVNet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
              subnets: [
                {
                  name: 'subnet1',
                  // ERROR 1: Missing properties wrapper
                  addressPrefix: '10.0.1.0/24',
                } as any,
                {
                  name: 'subnet2',
                  properties: {
                    addressPrefix: '10.0.2.0/24',
                    networkSecurityGroup: {
                      // ERROR 2: Literal resource ID in NSG reference
                      id: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myRG/providers/Microsoft.Network/networkSecurityGroups/myNSG',
                    },
                  },
                },
              ],
            },
            // ERROR 3: Missing brackets in dependency
            dependsOn: ["resourceId('Microsoft.Network/networkSecurityGroups', 'myNSG')"],
          },
        ],
      };

      const result = validator.validate(template, stackName);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
