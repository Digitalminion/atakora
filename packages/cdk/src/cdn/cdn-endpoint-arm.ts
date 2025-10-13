/**
 * L1 ARM construct for Azure CDN Endpoint.
 *
 * @packageDocumentation
 */

import { Construct, Resource, DeploymentScope, ValidationResult, ValidationResultBuilder } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmCdnEndpointsProps, DeepCreatedOrigin } from './cdn-endpoint-types';

/**
 * L1 construct for Azure CDN Endpoint.
 *
 * @remarks
 * Direct mapping to Microsoft.Cdn/profiles/endpoints ARM resource.
 *
 * **ARM Resource Type**: `Microsoft.Cdn/profiles/endpoints`
 * **API Version**: `2024-02-01`
 * **Deployment Scope**: ResourceGroup
 */
export class ArmCdnEndpoints extends Resource {
  public readonly resourceType: string = 'Microsoft.Cdn/profiles/endpoints';
  public readonly apiVersion: string = '2024-02-01';
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  public readonly endpointName: string;
  public readonly name: string;
  public readonly profileName: string;
  public readonly location: string;
  public readonly origins: readonly DeepCreatedOrigin[];
  public readonly originHostHeader?: string;
  public readonly originPath?: string;
  public readonly contentTypesToCompress?: readonly string[];
  public readonly isHttpAllowed: boolean;
  public readonly isHttpsAllowed: boolean;
  public readonly queryStringCachingBehavior?: string;
  public readonly optimizationType?: string;
  public readonly isCompressionEnabled: boolean;
  public readonly tags: Record<string, string>;
  public readonly resourceId: string;
  public readonly endpointId: string;
  public readonly hostName: string;

  constructor(scope: Construct, id: string, props: ArmCdnEndpointsProps) {
    super(scope, id);

    this.validateProps(props);

    this.endpointName = props.endpointName;
    this.name = `${props.profile.profileName}/${props.endpointName}`;
    this.profileName = props.profile.profileName;
    this.location = props.location;
    this.origins = props.origins;
    this.originHostHeader = props.originHostHeader;
    this.originPath = props.originPath;
    this.contentTypesToCompress = props.contentTypesToCompress;
    this.isHttpAllowed = props.isHttpAllowed ?? true;
    this.isHttpsAllowed = props.isHttpsAllowed ?? true;
    this.queryStringCachingBehavior = props.queryStringCachingBehavior;
    this.optimizationType = props.optimizationType;
    this.isCompressionEnabled = props.isCompressionEnabled ?? false;
    this.tags = props.tags ?? {};

    // Construct resource IDs
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Cdn/profiles/${this.profileName}/endpoints/${this.endpointName}`;
    this.endpointId = this.resourceId;

    // CDN endpoint hostname format: {endpointName}.azureedge.net
    this.hostName = `${this.endpointName}.azureedge.net`;
  }

  protected validateProps(props: ArmCdnEndpointsProps): void {
    if (!props.endpointName || props.endpointName.trim() === '') {
      throw new Error('CDN endpoint name cannot be empty');
    }

    // Endpoint name validation: 1-50 chars, alphanumeric and hyphens
    if (props.endpointName.length < 1 || props.endpointName.length > 50) {
      throw new Error(`CDN endpoint name must be 1-50 characters (got ${props.endpointName.length})`);
    }

    const namePattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
    if (!namePattern.test(props.endpointName)) {
      throw new Error(
        `CDN endpoint name must be alphanumeric with hyphens, cannot start/end with hyphen (got: ${props.endpointName})`
      );
    }

    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    if (!props.origins || props.origins.length === 0) {
      throw new Error('At least one origin is required');
    }

    if (!props.profile) {
      throw new Error('Parent CDN profile is required');
    }
  }

  public validateArmStructure(): ValidationResult {
    const builder = new ValidationResultBuilder();
    const armTemplate = this.toArmTemplate() as any;

    if (!armTemplate.type) {
      builder.addError('ARM template missing type field', '', '', 'armTemplate.type');
    }

    if (!armTemplate.apiVersion) {
      builder.addError('ARM template missing apiVersion field', '', '', 'armTemplate.apiVersion');
    }

    if (!armTemplate.name) {
      builder.addError('ARM template missing name field', '', '', 'armTemplate.name');
    }

    if (!armTemplate.properties || !armTemplate.properties.origins) {
      builder.addError('Endpoints must have at least one origin', '', '', 'armTemplate.properties.origins');
    }

    return builder.build();
  }

  public toArmTemplate(): ArmResource {
    const properties: any = {
      origins: this.origins.map((origin) => ({
        name: origin.name,
        properties: {
          hostName: origin.hostName,
          httpPort: origin.httpPort ?? 80,
          httpsPort: origin.httpsPort ?? 443,
          ...(origin.originHostHeader && { originHostHeader: origin.originHostHeader }),
          ...(origin.priority !== undefined && { priority: origin.priority }),
          ...(origin.weight !== undefined && { weight: origin.weight }),
          enabled: origin.enabled ?? true,
        },
      })),
      isHttpAllowed: this.isHttpAllowed,
      isHttpsAllowed: this.isHttpsAllowed,
      isCompressionEnabled: this.isCompressionEnabled,
    };

    if (this.originHostHeader) {
      properties.originHostHeader = this.originHostHeader;
    }

    if (this.originPath) {
      properties.originPath = this.originPath;
    }

    if (this.contentTypesToCompress && this.contentTypesToCompress.length > 0) {
      properties.contentTypesToCompress = this.contentTypesToCompress;
    }

    if (this.queryStringCachingBehavior) {
      properties.queryStringCachingBehavior = this.queryStringCachingBehavior;
    }

    if (this.optimizationType) {
      properties.optimizationType = this.optimizationType;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      location: this.location,
      properties,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    } as ArmResource;
  }
}
