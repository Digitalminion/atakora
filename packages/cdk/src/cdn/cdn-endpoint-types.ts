/**
 * Type definitions for CDN Endpoint constructs.
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';
import type { ICdnProfile } from './cdn-profile-types';

/**
 * Query string caching behavior.
 */
export const QueryStringCachingBehavior = schema.cdn.QueryStringCachingBehavior;
export type QueryStringCachingBehavior = typeof QueryStringCachingBehavior[keyof typeof QueryStringCachingBehavior];

/**
 * Optimization type.
 */
export const OptimizationType = schema.cdn.OptimizationType;
export type OptimizationType = typeof OptimizationType[keyof typeof OptimizationType];

/**
 * Default compressible content types for CDN endpoints.
 */
export const DEFAULT_COMPRESSIBLE_CONTENT_TYPES = [
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/json',
  'application/xml',
  'text/xml',
  'text/plain',
  'image/svg+xml',
] as const;

/**
 * CDN origin configuration.
 */
export interface DeepCreatedOrigin {
  /**
   * Origin name.
   */
  readonly name: string;

  /**
   * Origin hostname (e.g., 'example.blob.core.windows.net').
   */
  readonly hostName: string;

  /**
   * HTTP port (default: 80).
   */
  readonly httpPort?: number;

  /**
   * HTTPS port (default: 443).
   */
  readonly httpsPort?: number;

  /**
   * Origin host header (defaults to hostName).
   */
  readonly originHostHeader?: string;

  /**
   * Priority for load balancing (default: 1).
   */
  readonly priority?: number;

  /**
   * Weight for load balancing (default: 1000).
   */
  readonly weight?: number;

  /**
   * Whether origin is enabled (default: true).
   */
  readonly enabled?: boolean;
}

/**
 * ARM properties for CDN Endpoint (L1).
 */
export interface ArmCdnEndpointsProps {
  /**
   * Parent CDN profile.
   */
  readonly profile: ICdnProfile;

  /**
   * Endpoint name.
   */
  readonly endpointName: string;

  /**
   * Location.
   */
  readonly location: string;

  /**
   * Origins (at least one required).
   */
  readonly origins: readonly DeepCreatedOrigin[];

  /**
   * Origin host header.
   */
  readonly originHostHeader?: string;

  /**
   * Origin path (e.g., '/media').
   */
  readonly originPath?: string;

  /**
   * Content types to compress.
   */
  readonly contentTypesToCompress?: readonly string[];

  /**
   * Whether HTTP is allowed (default: true).
   */
  readonly isHttpAllowed?: boolean;

  /**
   * Whether HTTPS is allowed (default: true).
   */
  readonly isHttpsAllowed?: boolean;

  /**
   * Query string caching behavior.
   */
  readonly queryStringCachingBehavior?: QueryStringCachingBehavior;

  /**
   * Optimization type.
   */
  readonly optimizationType?: OptimizationType;

  /**
   * Whether compression is enabled.
   */
  readonly isCompressionEnabled?: boolean;

  /**
   * Tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * L2 CDN Endpoint properties.
 */
export interface CdnEndpointsProps {
  /**
   * Parent CDN profile.
   */
  readonly profile: ICdnProfile;

  /**
   * Endpoint name (optional - auto-generated).
   */
  readonly endpointName?: string;

  /**
   * Origin hostname (required).
   */
  readonly originHostName: string;

  /**
   * Origin host header (defaults to originHostName).
   */
  readonly originHostHeader?: string;

  /**
   * Origin path.
   */
  readonly originPath?: string;

  /**
   * Content types to compress.
   */
  readonly contentTypesToCompress?: readonly string[];

  /**
   * Whether HTTP is allowed (default: false for security).
   */
  readonly isHttpAllowed?: boolean;

  /**
   * Whether HTTPS is allowed (default: true).
   */
  readonly isHttpsAllowed?: boolean;

  /**
   * Query string caching behavior.
   */
  readonly queryStringCachingBehavior?: QueryStringCachingBehavior;

  /**
   * Optimization type.
   */
  readonly optimizationType?: OptimizationType;

  /**
   * Whether compression is enabled (default: true).
   */
  readonly isCompressionEnabled?: boolean;

  /**
   * Location (defaults to parent profile location).
   */
  readonly location?: string;

  /**
   * Tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for CDN Endpoint reference.
 */
export interface ICdnEndpoint {
  /**
   * Endpoint name.
   */
  readonly endpointName: string;

  /**
   * Endpoint resource ID.
   */
  readonly endpointId: string;

  /**
   * Endpoint hostname (e.g., 'myendpoint.azureedge.net').
   */
  readonly hostName: string;

  /**
   * Parent profile name.
   */
  readonly profileName: string;
}
