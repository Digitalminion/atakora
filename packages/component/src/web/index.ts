/**
 * Web Application Components
 *
 * @remarks
 * High-level components for web application infrastructure including:
 * - Static sites with CDN (SPAs, documentation sites, marketing sites)
 * - Web apps with databases (traditional web applications)
 * - API gateways and backends
 *
 * These components abstract away the complexity of configuring multiple
 * Azure resources and provide production-ready patterns with sensible defaults.
 *
 * @packageDocumentation
 */

// Static Site with CDN
export { StaticSiteWithCdn } from './static-site-with-cdn';
export type { StaticSiteWithCdnProps } from './types';
export { CdnSku, DEFAULT_CACHEABLE_FILE_TYPES, DEFAULT_COMPRESSIBLE_CONTENT_TYPES } from './types';
