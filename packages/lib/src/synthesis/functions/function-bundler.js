"use strict";
/**
 * Function Bundler - Bundles TypeScript handler files for inline ARM deployment
 *
 * @remarks
 * This module handles bundling Azure Function handlers into minified JavaScript
 * that can be embedded directly into ARM templates as inline code.
 *
 * **Bundle Process**:
 * 1. Uses esbuild to compile TypeScript → JavaScript
 * 2. Tree-shakes dependencies (only includes what's actually used)
 * 3. Minifies code for smaller ARM template size
 * 4. Bundles all dependencies into a single file
 * 5. Escapes strings for JSON embedding
 *
 * **Why Inline Deployment?**
 * - Single ARM template contains both infrastructure AND code
 * - No separate deployment step required
 * - Simplified CI/CD pipeline
 * - Atomic deployments (infra + code together)
 *
 * @packageDocumentation
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionBundler = void 0;
var esbuild_1 = require("esbuild");
var fs = require("fs");
var path = require("path");
/**
 * Bundles Azure Function handlers for inline ARM deployment
 *
 * @remarks
 * This class uses esbuild to bundle TypeScript function handlers into
 * minified JavaScript that can be embedded directly into ARM templates.
 *
 * **Default Configuration**:
 * - Target: ES2020 (supported by Azure Functions Node.js 18+)
 * - Minification: Enabled
 * - Tree-shaking: Enabled
 * - Source maps: Disabled (not useful in ARM templates)
 * - External: @azure/functions (provided by runtime)
 *
 * @example
 * Bundle a single handler:
 * ```typescript
 * const bundler = new FunctionBundler();
 * const result = bundler.bundle({
 *   handlerPath: './src/rest/feedback/feedback-create/handler.ts'
 * });
 *
 * console.log(`Bundled code size: ${result.size} bytes`);
 * // Use result.code in ARM template
 * ```
 *
 * @example
 * Bundle multiple handlers:
 * ```typescript
 * const bundler = new FunctionBundler();
 * const handlers = [
 *   './feedback-create/handler.ts',
 *   './feedback-read/handler.ts',
 * ];
 *
 * const results = bundler.bundleMany(handlers.map(h => ({ handlerPath: h })));
 * ```
 */
var FunctionBundler = /** @class */ (function () {
    function FunctionBundler() {
    }
    /**
     * Bundle a single function handler
     *
     * @param options - Bundler options
     * @returns Bundle result with code and metadata
     *
     * @throws {Error} If handler file doesn't exist
     * @throws {Error} If esbuild fails
     */
    FunctionBundler.prototype.bundle = function (options) {
        var _a, _b;
        // Validate handler exists
        if (!fs.existsSync(options.handlerPath)) {
            throw new Error("Handler file not found: ".concat(options.handlerPath));
        }
        // Prepare esbuild options
        var esbuildOptions = {
            entryPoints: [options.handlerPath],
            bundle: true,
            platform: 'node',
            target: options.target || 'es2020',
            format: 'cjs',
            minify: options.minify !== false, // Default true
            sourcemap: options.sourcemap || false,
            external: __spreadArray(__spreadArray([], (options.external || []), true), FunctionBundler.DEFAULT_EXTERNAL, true),
            write: false, // Return output instead of writing to disk
            logLevel: 'warning',
            treeShaking: true,
            // Remove console.log in production builds
            pure: options.minify !== false ? ['console.log'] : [],
        };
        // Bundle with esbuild
        var result = (0, esbuild_1.buildSync)(esbuildOptions);
        // Check for errors
        if (result.errors.length > 0) {
            throw new Error("esbuild failed:\n".concat(result.errors.map(function (e) { return e.text; }).join('\n')));
        }
        // Extract bundled code
        var code = (_b = (_a = result.outputFiles) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text;
        if (!code) {
            throw new Error('esbuild did not produce any output files');
        }
        // Collect warnings
        var warnings = result.warnings.map(function (w) { return w.text; });
        return {
            code: code,
            size: Buffer.byteLength(code, 'utf8'),
            handlerPath: options.handlerPath,
            warnings: warnings,
        };
    };
    /**
     * Bundle multiple function handlers
     *
     * @param optionsArray - Array of bundler options
     * @returns Array of bundle results
     *
     * @remarks
     * Bundles handlers in parallel for better performance.
     */
    FunctionBundler.prototype.bundleMany = function (optionsArray) {
        var _this = this;
        return optionsArray.map(function (options) { return _this.bundle(options); });
    };
    /**
     * Escape bundled code for JSON embedding in ARM templates
     *
     * @param code - The bundled JavaScript code
     * @returns Escaped code safe for JSON strings
     *
     * @remarks
     * ARM templates are JSON, so we need to escape:
     * - Quotes
     * - Newlines
     * - Backslashes
     */
    FunctionBundler.escapeForJson = function (code) {
        return code
            .replace(/\\/g, '\\\\') // Escape backslashes
            .replace(/"/g, '\\"') // Escape quotes
            .replace(/\n/g, '\\n') // Escape newlines
            .replace(/\r/g, '\\r') // Escape carriage returns
            .replace(/\t/g, '\\t'); // Escape tabs
    };
    /**
     * Get the function name from a handler path
     *
     * @param handlerPath - Path to handler.ts file
     * @returns Function name (e.g., "feedback-create")
     *
     * @example
     * ```typescript
     * FunctionBundler.getFunctionName('./feedback/feedback-create/handler.ts')
     * // Returns: 'feedback-create'
     * ```
     */
    FunctionBundler.getFunctionName = function (handlerPath) {
        // Get parent directory name (e.g., "feedback-create")
        var parentDir = path.basename(path.dirname(handlerPath));
        return parentDir;
    };
    /**
     * Default external packages (provided by Azure Functions runtime)
     */
    FunctionBundler.DEFAULT_EXTERNAL = [
        '@azure/functions',
    ];
    return FunctionBundler;
}());
exports.FunctionBundler = FunctionBundler;
