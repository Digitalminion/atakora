/**
 * REST API Advanced Features
 *
 * Comprehensive advanced features for production-ready REST APIs including:
 * - API versioning (path, header, query, content negotiation)
 * - Pagination (offset, cursor, page-based)
 * - Filtering, sorting, and field selection
 * - HTTP caching (ETag, Last-Modified, Cache-Control)
 * - Authentication & authorization (OAuth2, Azure AD, API Key, RBAC/ABAC)
 * - Rate limiting & throttling (fixed window, sliding window, token bucket)
 * - Request/response validation (JSON Schema, Content-Type, size limits)
 * - RFC 7807 Problem Details error handling
 * - Observability & tracing (W3C Trace Context, correlation IDs, Application Insights)
 *
 * @see ADR-015 REST Advanced Features
 */

// Version Management
export {
  ApiVersionManager,
  VersionDeprecationManager,
  VersionFormatValidator,
  type ApiVersioningConfig,
  type VersioningStrategy,
  type VersionFormat,
  type DeprecatedVersion,
  type VersionConfig,
  type PathVersioningConfig,
  type HeaderVersioningConfig,
  type QueryVersioningConfig,
  type ContentVersioningConfig,
} from './version-manager';

// Pagination
export {
  offsetPagination,
  cursorPagination,
  pagePagination,
  LinkHeaderBuilder,
  type PaginationStrategy,
  type PaginationConfig,
  type BasePaginationParams,
  type OffsetPaginationParams,
  type CursorPaginationParams,
  type PagePaginationParams,
  type PaginationMetadata,
  type OffsetPaginationMetadata,
  type CursorPaginationMetadata,
  type PagePaginationMetadata,
  type PaginatedResponse,
  type OffsetPaginationConfig,
  type CursorPaginationConfig,
  type PagePaginationConfig,
  type PaginationHelper,
} from './pagination';

// Filtering, Sorting, and Field Selection
export {
  FilterParser,
  FilteringHelper,
  SortingHelper,
  FieldSelectionHelper,
  sorting,
  fieldSelection,
  type FilterSyntax,
  type FilterOperator,
  type FilteringConfig,
  type SortingConfig,
  type SortField,
  type FieldSelectionConfig,
  type FilterExpression,
  type FilterValidationResult,
  type SortValidationResult,
  type FieldSelectionValidationResult,
} from './filtering';

// HTTP Caching
export {
  ETagCache,
  LastModifiedCache,
  CacheControl,
  VaryConfigBuilder,
  CacheHeaderBuilder,
  NotModifiedResponse,
  CacheHelper,
  type ETagType,
  type CacheDirective,
  type CacheControlConfig,
  type ETagConfig,
  type LastModifiedConfig,
  type VaryConfig,
  type CacheConfig,
  type HttpRequest,
  type ConditionalRequestResult,
} from './caching';

// Authentication & Authorization
export {
  OAuth2Config,
  AzureADAuth,
  ApiKeyAuth,
  BearerAuth,
  BasicAuth,
  CertificateAuth,
  JwtAuth,
  AuthorizationRules,
  SecurityRequirementBuilder,
  AuthenticationHelper,
  type OAuth2GrantType,
  type AuthScheme,
  type AuthConfig,
  type OAuth2BaseConfig,
  type OAuth2AuthorizationCodeConfig,
  type OAuth2ClientCredentialsConfig,
  type OAuth2ImplicitConfig,
  type OAuth2DeviceCodeConfig,
  type AzureAdTenantType,
  type AzureAdAuthConfig,
  type ApiKeyLocation,
  type ApiKeyAuthConfig,
  type BearerAuthConfig,
  type BasicAuthConfig,
  type CertificateAuthConfig,
  type JwtValidationConfig,
  type JwtAuthConfig,
  type TokenCachingConfig,
  type AuthRuleType,
  type AuthRule,
  type RoleAuthRule,
  type ClaimAuthRule,
  type ScopeAuthRule,
  type PolicyAuthRule,
  type CustomAuthRule,
  type AuthenticationConfig,
} from './auth';

// Rate Limiting & Throttling
export {
  RateLimiter,
  RateLimitScope,
  RateLimitHeaderBuilder,
  RateLimitResponse,
  QuotaPolicyBuilder,
  RateLimitHelper,
  type RateLimitStrategy,
  type RateLimitScope as RateLimitScopeType,
  type Duration,
  type RateLimitConfig,
  type FixedWindowConfig,
  type SlidingWindowConfig,
  type TokenBucketConfig,
  type LeakyBucketConfig,
  type QuotaPolicy,
  type RateLimitHeaders,
  type RateLimitMetadata,
  type RateLimitExceededResponse,
} from './rate-limiting';

// RFC 7807 Problem Details
export {
  ProblemDetailsFactory,
  ProblemDetailsValidator,
  type ProblemDetails,
  type ValidationError,
} from './problem-details';

// Request/Response Validation
export {
  JsonSchemaValidator,
  ContentTypeValidator,
  SizeValidator,
  Sanitizer,
  type ValidationConfig,
  type ValidationResult,
  type ContentTypeConfig,
  type SizeConfig,
  type SanitizationConfig,
  type SanitizationPattern,
  type CustomValidator,
} from './validation';

// Observability & Tracing
export {
  TraceContext,
  RequestLogger,
  Metrics,
  AppInsightsIntegration,
  CorrelationId,
  type TracingConfig,
  type LoggingOptions,
  type LogLevel,
  type LoggingConfig,
  type MaskPattern,
  type MetricConfig,
  type ObservabilityConfig,
  type CorrelationConfig,
} from './observability';
