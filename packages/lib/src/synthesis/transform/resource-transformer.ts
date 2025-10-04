import { Resource } from '../../core/resource';
import { ArmResource } from '../types';

/**
 * Transforms construct resources to ARM JSON format
 */
export class ResourceTransformer {
  /**
   * Transform a Resource construct to ARM JSON
   *
   * @param resource - Resource construct to transform
   * @returns ARM resource JSON
   */
  transform(resource: Resource): ArmResource {
    // Extract ARM properties from resource
    const armResource: ArmResource = {
      type: resource.resourceType,
      apiVersion: this.extractApiVersion(resource),
      name: resource.name,
    };

    // Add optional properties
    if (resource.location) {
      armResource.location = resource.location;
    }

    if (resource.tags && Object.keys(resource.tags).length > 0) {
      armResource.tags = resource.tags;
    }

    // Extract properties from the resource
    const properties = this.extractProperties(resource);
    if (properties && Object.keys(properties).length > 0) {
      armResource.properties = properties;
    }

    // Extract SKU if present
    const sku = this.extractSku(resource);
    if (sku) {
      armResource.sku = sku;
    }

    // Extract kind if present
    const kind = this.extractKind(resource);
    if (kind) {
      armResource.kind = kind;
    }

    // Extract identity if present
    const identity = this.extractIdentity(resource);
    if (identity) {
      armResource.identity = identity;
    }

    // Clean up undefined values
    return this.cleanUndefined(armResource);
  }

  /**
   * Transform multiple resources
   */
  transformAll(resources: Resource[]): ArmResource[] {
    return resources.map((resource) => this.transform(resource));
  }

  /**
   * Extract API version from resource
   */
  private extractApiVersion(resource: Resource): string {
    // Check if resource has apiVersion property
    const apiVersion = (resource as any).apiVersion;
    if (apiVersion) {
      return apiVersion;
    }

    // Default API versions by resource type
    const defaultVersions: Record<string, string> = {
      'Microsoft.Storage/storageAccounts': '2023-01-01',
      'Microsoft.Network/virtualNetworks': '2023-04-01',
      'Microsoft.Compute/virtualMachines': '2023-03-01',
      'Microsoft.Resources/resourceGroups': '2021-04-01',
      'Microsoft.KeyVault/vaults': '2023-02-01',
    };

    const defaultVersion = defaultVersions[resource.resourceType];
    if (defaultVersion) {
      return defaultVersion;
    }

    // Fallback to a recent date-based version
    return '2023-01-01';
  }

  /**
   * Extract properties from resource
   */
  private extractProperties(resource: Resource): Record<string, any> | undefined {
    const properties = (resource as any).properties;
    if (!properties) {
      return undefined;
    }

    return this.cleanUndefined(properties);
  }

  /**
   * Extract SKU from resource
   */
  private extractSku(resource: Resource): any {
    return (resource as any).sku;
  }

  /**
   * Extract kind from resource
   */
  private extractKind(resource: Resource): string | undefined {
    return (resource as any).kind;
  }

  /**
   * Extract identity from resource
   */
  private extractIdentity(resource: Resource): any {
    return (resource as any).identity;
  }

  /**
   * Remove undefined values from an object recursively
   */
  private cleanUndefined<T extends Record<string, any>>(obj: T): T {
    const cleaned: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        continue;
      }

      if (value === null) {
        cleaned[key] = value;
        continue;
      }

      if (Array.isArray(value)) {
        cleaned[key] = value.map((item) =>
          typeof item === 'object' && item !== null
            ? this.cleanUndefined(item)
            : item
        );
        continue;
      }

      if (typeof value === 'object') {
        const cleanedValue = this.cleanUndefined(value);
        if (Object.keys(cleanedValue).length > 0) {
          cleaned[key] = cleanedValue;
        }
        continue;
      }

      cleaned[key] = value;
    }

    return cleaned as T;
  }

  /**
   * Generate resource ID for ARM template reference
   */
  static generateResourceId(resource: ArmResource): string {
    return `[resourceId('${resource.type}', '${resource.name}')]`;
  }
}
