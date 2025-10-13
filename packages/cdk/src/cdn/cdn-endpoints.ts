/**
 * L2 construct for Azure CDN Endpoint.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import type { IResourceGroup } from '@atakora/cdk';
import { ArmCdnEndpoints } from './cdn-endpoint-arm';
import type {
  CdnEndpointsProps,
  ICdnEndpoint,
  QueryStringCachingBehavior,
  OptimizationType,
} from './cdn-endpoint-types';
import { DEFAULT_COMPRESSIBLE_CONTENT_TYPES } from './cdn-endpoint-types';

/**
 * L2 construct for Azure CDN Endpoint.
 *
 * @remarks
 * Intent-based API with sensible defaults.
 *
 * @example
 * ```typescript
 * import { CdnEndpoints } from '@atakora/cdk/cdn';
 *
 * const endpoint = new CdnEndpoints(resourceGroup, 'MyEndpoint', {
 *   profile: cdnProfile,
 *   originHostName: 'myapp.blob.core.windows.net'
 * });
 * ```
 */
export class CdnEndpoints extends Construct implements ICdnEndpoint {
  private readonly armCdnEndpoint: ArmCdnEndpoints;
  private readonly parentResourceGroup: IResourceGroup;

  public readonly endpointName: string;
  public readonly endpointId: string;
  public readonly hostName: string;
  public readonly profileName: string;
  public readonly location: string;
  public readonly tags: Record<string, string>;

  constructor(scope: Construct, id: string, props: CdnEndpointsProps) {
    super(scope, id);

    this.parentResourceGroup = this.getParentResourceGroup(scope);
    this.endpointName = this.resolveCdnEndpointName(id, props);
    this.profileName = props.profile.profileName;
    this.location = props.location ?? props.profile.location;

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props.tags,
    };

    // Create underlying L1 resource
    this.armCdnEndpoint = new ArmCdnEndpoints(scope, `${id}CdnEndpoint`, {
      profile: props.profile,
      endpointName: this.endpointName,
      location: this.location,
      origins: [
        {
          name: 'origin1',
          hostName: props.originHostName,
          originHostHeader: props.originHostHeader ?? props.originHostName,
          enabled: true,
        },
      ],
      originHostHeader: props.originHostHeader ?? props.originHostName,
      originPath: props.originPath,
      contentTypesToCompress: props.contentTypesToCompress ?? DEFAULT_COMPRESSIBLE_CONTENT_TYPES,
      isHttpAllowed: props.isHttpAllowed ?? false, // Default to HTTPS only for security
      isHttpsAllowed: props.isHttpsAllowed ?? true,
      queryStringCachingBehavior: props.queryStringCachingBehavior ?? ('IgnoreQueryString' as QueryStringCachingBehavior),
      optimizationType: props.optimizationType ?? ('GeneralWebDelivery' as OptimizationType),
      isCompressionEnabled: props.isCompressionEnabled ?? true,
      tags: this.tags,
    });

    this.endpointId = this.armCdnEndpoint.endpointId;
    this.hostName = this.armCdnEndpoint.hostName;
  }

  private getParentResourceGroup(scope: Construct): IResourceGroup {
    let current: Construct | undefined = scope;

    while (current) {
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error('CdnEndpoints must be created within or under a ResourceGroup');
  }

  private isResourceGroup(construct: any): construct is IResourceGroup {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      typeof construct.location === 'string'
    );
  }

  private getParentTags(scope: Construct): Record<string, string> {
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }

  private resolveCdnEndpointName(id: string, props?: CdnEndpointsProps): string {
    if (props?.endpointName) {
      return props.endpointName;
    }

    // Auto-generate name
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = id.toLowerCase();
      return subscriptionStack.generateResourceName('cdn-ep', purpose);
    }

    // Fallback
    return `cdn-ep-${id.toLowerCase()}`;
  }

  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      if (
        current &&
        typeof (current as any).generateResourceName === 'function'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }
}
