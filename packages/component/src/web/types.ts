/**
 * Web Component Types
 *
 * @remarks
 * Type definitions for web application components including static sites,
 * web apps, and CDN configurations.
 *
 * @packageDocumentation
 */

import type { IStorageAccount } from '@atakora/cdk/storage';
import type { IPublicDnsZone } from '@atakora/cdk/network';

/**
 * CDN SKU tiers
 */
export enum CdnSku {
  /**
   * Microsoft CDN - Good balance of features and cost
   */
  STANDARD_MICROSOFT = 'Standard_Microsoft',

  /**
   * Akamai CDN - High performance, good for media
   */
  STANDARD_AKAMAI = 'Standard_Akamai',

  /**
   * Verizon CDN - Enterprise features
   */
  STANDARD_VERIZON = 'Standard_Verizon',

  /**
   * Verizon Premium CDN - Advanced features and rules engine
   */
  PREMIUM_VERIZON = 'Premium_Verizon',
}

/**
 * Properties for StaticSiteWithCdn component
 */
export interface StaticSiteWithCdnProps {
  /**
   * Storage account for static files (optional - created if not provided)
   */
  readonly storageAccount?: IStorageAccount;

  /**
   * Index document (default: 'index.html')
   *
   * @remarks
   * The document to serve when a directory is requested.
   * For SPAs, this is typically 'index.html'.
   */
  readonly indexDocument?: string;

  /**
   * Error document (default: '404.html')
   *
   * @remarks
   * The document to serve when a file is not found.
   * For SPAs with client-side routing, set this to 'index.html'.
   */
  readonly errorDocument?: string;

  /**
   * Custom domain name (e.g., 'www.example.com')
   *
   * @remarks
   * If provided, DNS zone and CDN custom domain will be configured.
   * Requires dnsZoneName to also be provided.
   */
  readonly customDomain?: string;

  /**
   * DNS zone name (e.g., 'example.com')
   *
   * @remarks
   * Required if customDomain is provided.
   * This is the parent zone where DNS records will be created.
   */
  readonly dnsZoneName?: string;

  /**
   * Use existing DNS zone or create new one
   *
   * @remarks
   * If not provided and customDomain is specified, a new DNS zone
   * will be created.
   */
  readonly existingDnsZone?: IPublicDnsZone;

  /**
   * CDN SKU tier
   *
   * @default CdnSku.STANDARD_MICROSOFT
   *
   * @remarks
   * - Standard_Microsoft: Good balance, includes compression, custom domains, HTTPS
   * - Standard_Akamai: High performance, good for media streaming
   * - Standard_Verizon: Enterprise features, advanced caching
   * - Premium_Verizon: Advanced rules engine, real-time analytics
   */
  readonly cdnSku?: CdnSku;

  /**
   * Enable HTTPS redirect
   *
   * @default true
   *
   * @remarks
   * Automatically redirect HTTP requests to HTTPS.
   */
  readonly httpsRedirect?: boolean;

  /**
   * Enable compression
   *
   * @default true
   *
   * @remarks
   * Enable gzip compression for text-based content.
   * Reduces bandwidth and improves load times.
   */
  readonly enableCompression?: boolean;

  /**
   * Cache control max-age in seconds
   *
   * @default 3600 (1 hour)
   *
   * @remarks
   * How long CDN edge locations should cache content before
   * checking the origin for updates.
   */
  readonly cacheMaxAge?: number;

  /**
   * File types to cache
   *
   * @default Common web assets (js, css, html, png, jpg, etc.)
   *
   * @remarks
   * List of file extensions that should be cached by the CDN.
   * Leave undefined to use sensible defaults.
   */
  readonly cacheableFileTypes?: string[];

  /**
   * CORS allowed origins
   *
   * @remarks
   * Configure CORS on the storage account to allow requests from these origins.
   * Useful when your API and static site are on different domains.
   */
  readonly corsAllowedOrigins?: string[];

  /**
   * Enable SPA mode
   *
   * @default false
   *
   * @remarks
   * When enabled, all 404 errors will serve the index document instead.
   * This enables client-side routing for SPAs (React Router, Vue Router, etc.).
   *
   * When true, errorDocument will be set to indexDocument.
   */
  readonly enableSpaMode?: boolean;

  /**
   * Query string caching behavior
   *
   * @default 'IgnoreQueryString'
   *
   * @remarks
   * - IgnoreQueryString: Cache one version, ignore query strings
   * - BypassCaching: Don't cache URLs with query strings
   * - UseQueryString: Cache separate versions for each unique query string
   */
  readonly queryStringCachingBehavior?: 'IgnoreQueryString' | 'BypassCaching' | 'UseQueryString';

  /**
   * Resource location
   *
   * @remarks
   * Azure region for resources. If not specified, will be inherited from parent stack.
   */
  readonly location?: string;

  /**
   * Resource tags
   *
   * @remarks
   * Tags to apply to all resources created by this component.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Default cacheable file types for static websites
 */
export const DEFAULT_CACHEABLE_FILE_TYPES = [
  // HTML
  'html',
  'htm',

  // Stylesheets
  'css',

  // JavaScript
  'js',
  'mjs',

  // Images
  'jpg',
  'jpeg',
  'png',
  'gif',
  'svg',
  'webp',
  'ico',

  // Fonts
  'woff',
  'woff2',
  'ttf',
  'eot',
  'otf',

  // Documents
  'pdf',

  // Data
  'json',
  'xml',

  // Media
  'mp4',
  'webm',
  'mp3',
  'wav',
];

/**
 * Default compressible content types
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
];
