"use strict";
/**
 * Types and interfaces for Azure Functions build pipeline
 *
 * @remarks
 * This module defines the core types used throughout the function build
 * pipeline including artifacts, packages, and deployment configurations.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentResolutionError = exports.ResourceLoadError = exports.DiscoveryError = exports.PackagingError = exports.BuildError = exports.PackagingStrategy = void 0;
/**
 * Packaging strategy for function deployment
 */
var PackagingStrategy;
(function (PackagingStrategy) {
    /**
     * Inline deployment - function code embedded in ARM template (<4KB)
     */
    PackagingStrategy["INLINE"] = "inline";
    /**
     * Storage deployment - function package uploaded to Azure Storage (<100MB)
     */
    PackagingStrategy["STORAGE"] = "storage";
    /**
     * Container deployment - function deployed as container image (>100MB or native modules)
     */
    PackagingStrategy["CONTAINER"] = "container";
    /**
     * External deployment - function package hosted externally
     */
    PackagingStrategy["EXTERNAL"] = "external";
})(PackagingStrategy || (exports.PackagingStrategy = PackagingStrategy = {}));
/**
 * Build error with context
 */
var BuildError = /** @class */ (function (_super) {
    __extends(BuildError, _super);
    function BuildError(message, functionId, cause) {
        var _this = _super.call(this, message) || this;
        _this.functionId = functionId;
        _this.cause = cause;
        _this.name = 'BuildError';
        // Maintain proper stack trace for V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(_this, BuildError);
        }
        return _this;
    }
    return BuildError;
}(Error));
exports.BuildError = BuildError;
/**
 * Packaging error with context
 */
var PackagingError = /** @class */ (function (_super) {
    __extends(PackagingError, _super);
    function PackagingError(message, strategy, cause) {
        var _this = _super.call(this, message) || this;
        _this.strategy = strategy;
        _this.cause = cause;
        _this.name = 'PackagingError';
        // Maintain proper stack trace for V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(_this, PackagingError);
        }
        return _this;
    }
    return PackagingError;
}(Error));
exports.PackagingError = PackagingError;
/**
 * Error thrown during discovery
 */
var DiscoveryError = /** @class */ (function (_super) {
    __extends(DiscoveryError, _super);
    function DiscoveryError(message, functionName, cause) {
        var _this = _super.call(this, message) || this;
        _this.functionName = functionName;
        _this.cause = cause;
        _this.name = 'DiscoveryError';
        // Maintain proper stack trace for where error was thrown (V8 only)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(_this, DiscoveryError);
        }
        return _this;
    }
    return DiscoveryError;
}(Error));
exports.DiscoveryError = DiscoveryError;
/**
 * Error thrown during resource loading
 */
var ResourceLoadError = /** @class */ (function (_super) {
    __extends(ResourceLoadError, _super);
    function ResourceLoadError(message, resourcePath, cause) {
        var _this = _super.call(this, message) || this;
        _this.resourcePath = resourcePath;
        _this.cause = cause;
        _this.name = 'ResourceLoadError';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(_this, ResourceLoadError);
        }
        return _this;
    }
    return ResourceLoadError;
}(Error));
exports.ResourceLoadError = ResourceLoadError;
/**
 * Error thrown during environment resolution
 */
var EnvironmentResolutionError = /** @class */ (function (_super) {
    __extends(EnvironmentResolutionError, _super);
    function EnvironmentResolutionError(message, placeholder, functionName, cause) {
        var _this = _super.call(this, message) || this;
        _this.placeholder = placeholder;
        _this.functionName = functionName;
        _this.cause = cause;
        _this.name = 'EnvironmentResolutionError';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(_this, EnvironmentResolutionError);
        }
        return _this;
    }
    return EnvironmentResolutionError;
}(Error));
exports.EnvironmentResolutionError = EnvironmentResolutionError;
