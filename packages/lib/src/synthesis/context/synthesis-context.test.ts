/**
 * Unit tests for SynthesisContext class.
 *
 * Tests cover:
 * - Context construction and validation
 * - Resource reference generation (same-template and cross-template)
 * - Parameter reference generation
 * - Cross-template reference generation
 * - Template membership checks
 * - Helper methods for deployment and output names
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SynthesisContext } from './synthesis-context';
import { TemplateMetadata } from '../types';

describe('SynthesisContext', () => {
  let resourceTemplates: Map<string, string>;
  let templateMetadata: Map<string, TemplateMetadata>;

  beforeEach(() => {
    // Set up a typical multi-template deployment scenario
    resourceTemplates = new Map([
      ['storageAccount1', 'Foundation-storage.json'],
      ['cosmosDb1', 'Foundation-data.json'],
      ['functionApp1', 'Compute-functions.json'],
      ['functionApp1/config/appsettings', 'Compute-functions.json'],
      ['appInsights1', 'Foundation-monitoring.json'],
    ]);

    templateMetadata = new Map([
      [
        'Foundation-storage.json',
        {
          fileName: 'Foundation-storage.json',
          uri: 'https://storage.blob.core.windows.net/templates/Foundation-storage.json',
          parameters: new Set(['location']),
          outputs: new Set(['storageAccount1_id', 'storageAccount1_name']),
          isMain: false,
          estimatedSize: 2048000,
          resourceCount: 1,
          resources: ['storageAccount1'],
        },
      ],
      [
        'Foundation-data.json',
        {
          fileName: 'Foundation-data.json',
          uri: 'https://storage.blob.core.windows.net/templates/Foundation-data.json',
          outputs: new Set(['cosmosDb1_id', 'cosmosDb1_properties_documentEndpoint']),
          isMain: false,
          estimatedSize: 1536000,
          resourceCount: 1,
          resources: ['cosmosDb1'],
        },
      ],
      [
        'Compute-functions.json',
        {
          fileName: 'Compute-functions.json',
          uri: 'https://storage.blob.core.windows.net/templates/Compute-functions.json',
          parameters: new Set(['location', 'storageAccountId']),
          outputs: new Set(['functionApp1_id']),
          isMain: false,
          estimatedSize: 3072000,
          resourceCount: 2,
          resources: ['functionApp1', 'functionApp1/config/appsettings'],
        },
      ],
      [
        'Foundation-monitoring.json',
        {
          fileName: 'Foundation-monitoring.json',
          isMain: false,
          estimatedSize: 1024000,
          resourceCount: 1,
          resources: ['appInsights1'],
        },
      ],
      [
        'main.json',
        {
          fileName: 'main.json',
          isMain: true,
          estimatedSize: 512000,
          resourceCount: 0,
          resources: [],
        },
      ],
    ]);
  });

  describe('constructor', () => {
    it('should create a valid context', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      expect(context.currentTemplate).toBe('Compute-functions.json');
      expect(context).toBeInstanceOf(SynthesisContext);
    });

    it('should throw error if current template not in metadata', () => {
      expect(() => {
        new SynthesisContext(
          'NonExistent.json',
          resourceTemplates,
          templateMetadata
        );
      }).toThrowError(/not found in template metadata/);
    });

    it('should list available templates in error message', () => {
      try {
        new SynthesisContext(
          'NonExistent.json',
          resourceTemplates,
          templateMetadata
        );
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Foundation-storage.json');
        expect(error.message).toContain('Compute-functions.json');
      }
    });
  });

  describe('getResourceReference', () => {
    it('should return placeholder for same-template resource', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      const ref = context.getResourceReference('functionApp1');

      // Same template should return direct reference placeholder
      expect(ref).toContain('resourceId');
      expect(ref).toContain('functionApp1');
    });

    it('should return cross-template reference for different template', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      const ref = context.getResourceReference('storageAccount1');

      // Different template should return deployment output reference
      expect(ref).toContain('reference');
      expect(ref).toContain('Microsoft.Resources/deployments');
      expect(ref).toContain('foundation-storage-deployment');
      expect(ref).toContain('storageAccount1_id');
    });

    it('should throw error for unknown resource', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      expect(() => {
        context.getResourceReference('unknownResource');
      }).toThrowError(/not found in template assignments/);
    });

    it('should list available resources in error message', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      try {
        context.getResourceReference('unknownResource');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('storageAccount1');
        expect(error.message).toContain('cosmosDb1');
      }
    });
  });

  describe('getParameterReference', () => {
    it('should return parameter reference for parameter in current template', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      const ref = context.getParameterReference('location');

      expect(ref).toBe("[parameters('location')]");
    });

    it('should return parameter reference for parameter from parent', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      const ref = context.getParameterReference('environment');

      // Parameter not in current template, but should still return reference
      // (parent template will propagate it)
      expect(ref).toBe("[parameters('environment')]");
    });

    it('should handle special characters in parameter names', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      const ref = context.getParameterReference('my-param_name');

      expect(ref).toBe("[parameters('my-param_name')]");
    });
  });

  describe('getCrossTemplateReference', () => {
    it('should generate cross-template reference without expression', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      const ref = context.getCrossTemplateReference('storageAccount1');

      expect(ref).toBe(
        "[reference(resourceId('Microsoft.Resources/deployments', 'foundation-storage-deployment')).outputs.storageAccount1_id.value]"
      );
    });

    it('should generate cross-template reference with expression', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      const ref = context.getCrossTemplateReference(
        'cosmosDb1',
        'properties.documentEndpoint'
      );

      expect(ref).toBe(
        "[reference(resourceId('Microsoft.Resources/deployments', 'foundation-data-deployment')).outputs.cosmosDb1_properties_documentEndpoint.value]"
      );
    });

    it('should throw error for same-template resource', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      expect(() => {
        context.getCrossTemplateReference('functionApp1');
      }).toThrowError(/is in the same template/);
      expect(() => {
        context.getCrossTemplateReference('functionApp1');
      }).toThrowError(/Use getResourceReference/);
    });

    it('should throw error for unknown resource', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      expect(() => {
        context.getCrossTemplateReference('unknownResource');
      }).toThrowError(/not found in template assignments/);
    });

    it('should handle complex property expressions', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      const ref = context.getCrossTemplateReference(
        'cosmosDb1',
        'properties.writeLocations[0].endpoint'
      );

      // Special characters should be converted to underscores
      expect(ref).toContain('cosmosDb1_properties_writeLocations_0__endpoint');
    });
  });

  describe('isInSameTemplate', () => {
    it('should return true for resource in same template', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      expect(context.isInSameTemplate('functionApp1')).toBe(true);
      expect(context.isInSameTemplate('functionApp1/config/appsettings')).toBe(true);
    });

    it('should return false for resource in different template', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      expect(context.isInSameTemplate('storageAccount1')).toBe(false);
      expect(context.isInSameTemplate('cosmosDb1')).toBe(false);
      expect(context.isInSameTemplate('appInsights1')).toBe(false);
    });

    it('should return false for unknown resource', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      // Unknown resources are not in same template
      expect(context.isInSameTemplate('unknownResource')).toBe(false);
    });
  });

  describe('getResourcesInCurrentTemplate', () => {
    it('should return all resources in current template', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      const resources = context.getResourcesInCurrentTemplate();

      expect(resources).toHaveLength(2);
      expect(resources).toContain('functionApp1');
      expect(resources).toContain('functionApp1/config/appsettings');
    });

    it('should return empty array if no resources in template', () => {
      const context = new SynthesisContext(
        'main.json',
        resourceTemplates,
        templateMetadata
      );

      const resources = context.getResourcesInCurrentTemplate();

      expect(resources).toHaveLength(0);
    });

    it('should not include resources from other templates', () => {
      const context = new SynthesisContext(
        'Foundation-storage.json',
        resourceTemplates,
        templateMetadata
      );

      const resources = context.getResourcesInCurrentTemplate();

      expect(resources).toContain('storageAccount1');
      expect(resources).not.toContain('cosmosDb1');
      expect(resources).not.toContain('functionApp1');
    });
  });

  describe('getCurrentTemplateMetadata', () => {
    it('should return metadata for current template', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      const metadata = context.getCurrentTemplateMetadata();

      expect(metadata.fileName).toBe('Compute-functions.json');
      expect(metadata.isMain).toBe(false);
      expect(metadata.parameters).toContain('location');
      expect(metadata.parameters).toContain('storageAccountId');
    });

    it('should return main template metadata', () => {
      const context = new SynthesisContext(
        'main.json',
        resourceTemplates,
        templateMetadata
      );

      const metadata = context.getCurrentTemplateMetadata();

      expect(metadata.fileName).toBe('main.json');
      expect(metadata.isMain).toBe(true);
    });
  });

  describe('getResourceTemplate', () => {
    it('should return template name for resource', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      expect(context.getResourceTemplate('storageAccount1')).toBe(
        'Foundation-storage.json'
      );
      expect(context.getResourceTemplate('cosmosDb1')).toBe(
        'Foundation-data.json'
      );
      expect(context.getResourceTemplate('functionApp1')).toBe(
        'Compute-functions.json'
      );
    });

    it('should throw error for unknown resource', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      expect(() => {
        context.getResourceTemplate('unknownResource');
      }).toThrowError(/not found in template assignments/);
    });
  });

  describe('hasTemplate', () => {
    it('should return true for existing template', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      expect(context.hasTemplate('Foundation-storage.json')).toBe(true);
      expect(context.hasTemplate('Compute-functions.json')).toBe(true);
      expect(context.hasTemplate('main.json')).toBe(true);
    });

    it('should return false for non-existent template', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      expect(context.hasTemplate('NonExistent.json')).toBe(false);
      expect(context.hasTemplate('Application.json')).toBe(false);
    });
  });

  describe('getAllTemplates', () => {
    it('should return all template names', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      const templates = context.getAllTemplates();

      expect(templates).toHaveLength(5);
      expect(templates).toContain('Foundation-storage.json');
      expect(templates).toContain('Foundation-data.json');
      expect(templates).toContain('Compute-functions.json');
      expect(templates).toContain('Foundation-monitoring.json');
      expect(templates).toContain('main.json');
    });
  });

  describe('deployment name generation', () => {
    it('should convert template name to deployment name', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      // Test via getCrossTemplateReference since getDeploymentName is private
      const ref = context.getCrossTemplateReference('storageAccount1');

      expect(ref).toContain('foundation-storage-deployment');
    });

    it('should handle uppercase in template names', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      const ref = context.getCrossTemplateReference('cosmosDb1');

      // Should be lowercase
      expect(ref).toContain('foundation-data-deployment');
      expect(ref).not.toContain('Foundation');
    });
  });

  describe('output name generation', () => {
    it('should generate output name for resource ID', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      const ref = context.getCrossTemplateReference('storageAccount1');

      expect(ref).toContain('storageAccount1_id');
    });

    it('should generate output name for property expression', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      const ref = context.getCrossTemplateReference(
        'cosmosDb1',
        'properties.documentEndpoint'
      );

      expect(ref).toContain('cosmosDb1_properties_documentEndpoint');
    });

    it('should sanitize special characters in expressions', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      const ref = context.getCrossTemplateReference(
        'cosmosDb1',
        'properties.locations[0].name'
      );

      // Dots and brackets should be replaced with underscores
      expect(ref).toContain('cosmosDb1_properties_locations_0__name');
    });
  });

  describe('integration scenarios', () => {
    it('should handle function app referencing storage in different template', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      // Check if storage is in same template
      expect(context.isInSameTemplate('storageAccount1')).toBe(false);

      // Get cross-template reference
      const storageRef = context.getCrossTemplateReference('storageAccount1');

      expect(storageRef).toContain('reference');
      expect(storageRef).toContain('foundation-storage-deployment');
      expect(storageRef).toContain('storageAccount1_id');
    });

    it('should handle nested resources in same template', () => {
      const context = new SynthesisContext(
        'Compute-functions.json',
        resourceTemplates,
        templateMetadata
      );

      // Function app and its config should be in same template
      expect(context.isInSameTemplate('functionApp1')).toBe(true);
      expect(context.isInSameTemplate('functionApp1/config/appsettings')).toBe(true);

      // Both should be in the list of current template resources
      const resources = context.getResourcesInCurrentTemplate();
      expect(resources).toContain('functionApp1');
      expect(resources).toContain('functionApp1/config/appsettings');
    });

    it('should handle main template orchestrating linked templates', () => {
      const context = new SynthesisContext(
        'main.json',
        resourceTemplates,
        templateMetadata
      );

      const metadata = context.getCurrentTemplateMetadata();

      expect(metadata.isMain).toBe(true);
      expect(context.getResourcesInCurrentTemplate()).toHaveLength(0);

      // All resources are in other templates
      expect(context.isInSameTemplate('storageAccount1')).toBe(false);
      expect(context.isInSameTemplate('functionApp1')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty resource templates', () => {
      const emptyResourceTemplates = new Map<string, string>();
      const context = new SynthesisContext(
        'main.json',
        emptyResourceTemplates,
        templateMetadata
      );

      expect(context.getResourcesInCurrentTemplate()).toHaveLength(0);
      expect(context.isInSameTemplate('anyResource')).toBe(false);
    });

    it('should handle template with no metadata fields', () => {
      const minimalMetadata = new Map<string, TemplateMetadata>([
        [
          'minimal.json',
          {
            fileName: 'minimal.json',
            isMain: false,
            estimatedSize: 1000,
            resourceCount: 0,
            resources: [],
          },
        ],
      ]);

      const context = new SynthesisContext(
        'minimal.json',
        new Map(),
        minimalMetadata
      );

      const metadata = context.getCurrentTemplateMetadata();
      expect(metadata.fileName).toBe('minimal.json');
      expect(metadata.parameters).toBeUndefined();
      expect(metadata.outputs).toBeUndefined();
    });

    it('should handle resource IDs with special characters', () => {
      const specialResourceTemplates = new Map([
        ['resource-with-dashes', 'template1.json'],
        ['resource_with_underscores', 'template1.json'],
        ['resource.with.dots', 'template2.json'],
      ]);

      const specialMetadata = new Map<string, TemplateMetadata>([
        [
          'template1.json',
          {
            fileName: 'template1.json',
            isMain: false,
            estimatedSize: 1000,
            resourceCount: 2,
            resources: ['resource-with-dashes', 'resource_with_underscores'],
          },
        ],
        [
          'template2.json',
          {
            fileName: 'template2.json',
            isMain: false,
            estimatedSize: 1000,
            resourceCount: 1,
            resources: ['resource.with.dots'],
          },
        ],
      ]);

      const context = new SynthesisContext(
        'template1.json',
        specialResourceTemplates,
        specialMetadata
      );

      expect(context.isInSameTemplate('resource-with-dashes')).toBe(true);
      expect(context.isInSameTemplate('resource_with_underscores')).toBe(true);
      expect(context.isInSameTemplate('resource.with.dots')).toBe(false);

      const ref = context.getCrossTemplateReference('resource.with.dots');
      expect(ref).toContain('resource.with.dots_id');
    });
  });
});
