"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrelationId = exports.AppInsightsIntegration = exports.Metrics = exports.RequestLogger = exports.TraceContext = exports.Sanitizer = exports.SizeValidator = exports.ContentTypeValidator = exports.JsonSchemaValidator = exports.ProblemDetailsValidator = exports.ProblemDetailsFactory = exports.RateLimitHelper = exports.QuotaPolicyBuilder = exports.RateLimitResponse = exports.RateLimitHeaderBuilder = exports.RateLimiter = exports.AuthenticationHelper = exports.SecurityRequirementBuilder = exports.AuthorizationRules = exports.JwtAuth = exports.CertificateAuth = exports.BasicAuth = exports.BearerAuth = exports.ApiKeyAuth = exports.AzureADAuth = exports.OAuth2Config = exports.CacheHelper = exports.NotModifiedResponse = exports.CacheHeaderBuilder = exports.VaryConfigBuilder = exports.CacheControl = exports.LastModifiedCache = exports.ETagCache = exports.fieldSelection = exports.sorting = exports.FieldSelectionHelper = exports.SortingHelper = exports.FilteringHelper = exports.FilterParser = exports.LinkHeaderBuilder = exports.pagePagination = exports.cursorPagination = exports.offsetPagination = exports.VersionFormatValidator = exports.VersionDeprecationManager = exports.ApiVersionManager = void 0;
// Version Management
var version_manager_1 = require("./version-manager");
Object.defineProperty(exports, "ApiVersionManager", { enumerable: true, get: function () { return version_manager_1.ApiVersionManager; } });
Object.defineProperty(exports, "VersionDeprecationManager", { enumerable: true, get: function () { return version_manager_1.VersionDeprecationManager; } });
Object.defineProperty(exports, "VersionFormatValidator", { enumerable: true, get: function () { return version_manager_1.VersionFormatValidator; } });
// Pagination
var pagination_1 = require("./pagination");
Object.defineProperty(exports, "offsetPagination", { enumerable: true, get: function () { return pagination_1.offsetPagination; } });
Object.defineProperty(exports, "cursorPagination", { enumerable: true, get: function () { return pagination_1.cursorPagination; } });
Object.defineProperty(exports, "pagePagination", { enumerable: true, get: function () { return pagination_1.pagePagination; } });
Object.defineProperty(exports, "LinkHeaderBuilder", { enumerable: true, get: function () { return pagination_1.LinkHeaderBuilder; } });
// Filtering, Sorting, and Field Selection
var filtering_1 = require("./filtering");
Object.defineProperty(exports, "FilterParser", { enumerable: true, get: function () { return filtering_1.FilterParser; } });
Object.defineProperty(exports, "FilteringHelper", { enumerable: true, get: function () { return filtering_1.FilteringHelper; } });
Object.defineProperty(exports, "SortingHelper", { enumerable: true, get: function () { return filtering_1.SortingHelper; } });
Object.defineProperty(exports, "FieldSelectionHelper", { enumerable: true, get: function () { return filtering_1.FieldSelectionHelper; } });
Object.defineProperty(exports, "sorting", { enumerable: true, get: function () { return filtering_1.sorting; } });
Object.defineProperty(exports, "fieldSelection", { enumerable: true, get: function () { return filtering_1.fieldSelection; } });
// HTTP Caching
var caching_1 = require("./caching");
Object.defineProperty(exports, "ETagCache", { enumerable: true, get: function () { return caching_1.ETagCache; } });
Object.defineProperty(exports, "LastModifiedCache", { enumerable: true, get: function () { return caching_1.LastModifiedCache; } });
Object.defineProperty(exports, "CacheControl", { enumerable: true, get: function () { return caching_1.CacheControl; } });
Object.defineProperty(exports, "VaryConfigBuilder", { enumerable: true, get: function () { return caching_1.VaryConfigBuilder; } });
Object.defineProperty(exports, "CacheHeaderBuilder", { enumerable: true, get: function () { return caching_1.CacheHeaderBuilder; } });
Object.defineProperty(exports, "NotModifiedResponse", { enumerable: true, get: function () { return caching_1.NotModifiedResponse; } });
Object.defineProperty(exports, "CacheHelper", { enumerable: true, get: function () { return caching_1.CacheHelper; } });
// Authentication & Authorization
var auth_1 = require("./auth");
Object.defineProperty(exports, "OAuth2Config", { enumerable: true, get: function () { return auth_1.OAuth2Config; } });
Object.defineProperty(exports, "AzureADAuth", { enumerable: true, get: function () { return auth_1.AzureADAuth; } });
Object.defineProperty(exports, "ApiKeyAuth", { enumerable: true, get: function () { return auth_1.ApiKeyAuth; } });
Object.defineProperty(exports, "BearerAuth", { enumerable: true, get: function () { return auth_1.BearerAuth; } });
Object.defineProperty(exports, "BasicAuth", { enumerable: true, get: function () { return auth_1.BasicAuth; } });
Object.defineProperty(exports, "CertificateAuth", { enumerable: true, get: function () { return auth_1.CertificateAuth; } });
Object.defineProperty(exports, "JwtAuth", { enumerable: true, get: function () { return auth_1.JwtAuth; } });
Object.defineProperty(exports, "AuthorizationRules", { enumerable: true, get: function () { return auth_1.AuthorizationRules; } });
Object.defineProperty(exports, "SecurityRequirementBuilder", { enumerable: true, get: function () { return auth_1.SecurityRequirementBuilder; } });
Object.defineProperty(exports, "AuthenticationHelper", { enumerable: true, get: function () { return auth_1.AuthenticationHelper; } });
// Rate Limiting & Throttling
var rate_limiting_1 = require("./rate-limiting");
Object.defineProperty(exports, "RateLimiter", { enumerable: true, get: function () { return rate_limiting_1.RateLimiter; } });
Object.defineProperty(exports, "RateLimitHeaderBuilder", { enumerable: true, get: function () { return rate_limiting_1.RateLimitHeaderBuilder; } });
Object.defineProperty(exports, "RateLimitResponse", { enumerable: true, get: function () { return rate_limiting_1.RateLimitResponse; } });
Object.defineProperty(exports, "QuotaPolicyBuilder", { enumerable: true, get: function () { return rate_limiting_1.QuotaPolicyBuilder; } });
Object.defineProperty(exports, "RateLimitHelper", { enumerable: true, get: function () { return rate_limiting_1.RateLimitHelper; } });
// RFC 7807 Problem Details
var problem_details_1 = require("./problem-details");
Object.defineProperty(exports, "ProblemDetailsFactory", { enumerable: true, get: function () { return problem_details_1.ProblemDetailsFactory; } });
Object.defineProperty(exports, "ProblemDetailsValidator", { enumerable: true, get: function () { return problem_details_1.ProblemDetailsValidator; } });
// Request/Response Validation
var validation_1 = require("./validation");
Object.defineProperty(exports, "JsonSchemaValidator", { enumerable: true, get: function () { return validation_1.JsonSchemaValidator; } });
Object.defineProperty(exports, "ContentTypeValidator", { enumerable: true, get: function () { return validation_1.ContentTypeValidator; } });
Object.defineProperty(exports, "SizeValidator", { enumerable: true, get: function () { return validation_1.SizeValidator; } });
Object.defineProperty(exports, "Sanitizer", { enumerable: true, get: function () { return validation_1.Sanitizer; } });
// Observability & Tracing
var observability_1 = require("./observability");
Object.defineProperty(exports, "TraceContext", { enumerable: true, get: function () { return observability_1.TraceContext; } });
Object.defineProperty(exports, "RequestLogger", { enumerable: true, get: function () { return observability_1.RequestLogger; } });
Object.defineProperty(exports, "Metrics", { enumerable: true, get: function () { return observability_1.Metrics; } });
Object.defineProperty(exports, "AppInsightsIntegration", { enumerable: true, get: function () { return observability_1.AppInsightsIntegration; } });
Object.defineProperty(exports, "CorrelationId", { enumerable: true, get: function () { return observability_1.CorrelationId; } });
