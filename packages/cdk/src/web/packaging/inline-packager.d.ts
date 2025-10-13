/**
 * Inline packaging strategy for Azure Functions.
 *
 * @remarks
 * Provides utilities for packaging small functions inline in ARM templates.
 * Functions must be less than 4KB when Base64-encoded to fit within ARM template property limits.
 *
 * @packageDocumentation
 */
/**
 * Maximum size for inline function code in bytes (4KB ARM template property limit).
 */
export declare const INLINE_CODE_MAX_SIZE = 4096;
/**
 * Result of inline packaging operation.
 */
export interface InlinePackageResult {
    /**
     * Base64-encoded function code.
     */
    readonly encodedCode: string;
    /**
     * Size of encoded code in bytes.
     */
    readonly size: number;
    /**
     * Whether the code fits within ARM template limits.
     */
    readonly fitsInline: boolean;
    /**
     * Original code size before encoding.
     */
    readonly originalSize: number;
}
/**
 * Inline packager for small Azure Functions.
 *
 * @remarks
 * This packager encodes function code as Base64 for inline deployment in ARM templates.
 * Suitable for small functions (<4KB after encoding).
 *
 * @example
 * ```typescript
 * const packager = new InlinePackager();
 * const code = `
 *   module.exports = async function (context, req) {
 *     context.log('HTTP trigger function processed a request.');
 *     return { body: 'Hello, World!' };
 *   };
 * `;
 * const result = packager.package(code);
 * console.log(result.fitsInline); // true or false
 * ```
 */
export declare class InlinePackager {
    /**
     * Packages function code for inline deployment.
     *
     * @param code - Function code to package
     * @returns Packaging result with encoded code and metadata
     *
     * @example
     * ```typescript
     * const result = packager.package(functionCode);
     * if (result.fitsInline) {
     *   // Use result.encodedCode in ARM template
     * }
     * ```
     */
    package(code: string): InlinePackageResult;
    /**
     * Decodes Base64-encoded function code.
     *
     * @param encodedCode - Base64-encoded code
     * @returns Decoded function code
     *
     * @example
     * ```typescript
     * const decoded = packager.unpackage(encodedCode);
     * ```
     */
    unpackage(encodedCode: string): string;
    /**
     * Validates that code can be packaged inline.
     *
     * @param code - Function code to validate
     * @returns True if code fits within inline limits
     *
     * @example
     * ```typescript
     * if (packager.canPackageInline(code)) {
     *   const result = packager.package(code);
     * } else {
     *   // Use external packaging strategy
     * }
     * ```
     */
    canPackageInline(code: string): boolean;
    /**
     * Gets the size of encoded code without actually encoding.
     *
     * @param code - Function code
     * @returns Estimated encoded size in bytes
     *
     * @remarks
     * Base64 encoding increases size by approximately 33%.
     *
     * @example
     * ```typescript
     * const estimatedSize = packager.getEncodedSize(code);
     * ```
     */
    getEncodedSize(code: string): number;
    /**
     * Minifies JavaScript code to reduce size.
     *
     * @param code - JavaScript code to minify
     * @returns Minified code
     *
     * @remarks
     * Performs basic minification:
     * - Removes comments
     * - Removes extra whitespace
     * - Removes blank lines
     *
     * For production use, consider using a proper minifier like terser or esbuild.
     *
     * @example
     * ```typescript
     * const minified = packager.minify(code);
     * const result = packager.package(minified);
     * ```
     */
    minify(code: string): string;
    /**
     * Wraps code in a function handler template.
     *
     * @param code - Handler logic
     * @param handlerType - Type of handler ('http' or 'timer')
     * @returns Complete function code
     *
     * @example
     * ```typescript
     * const logic = 'context.log("Hello"); return { body: "World" };';
     * const wrapped = packager.wrapHandler(logic, 'http');
     * ```
     */
    wrapHandler(code: string, handlerType?: 'http' | 'timer'): string;
}
/**
 * Creates a new inline packager instance.
 *
 * @returns New InlinePackager instance
 *
 * @example
 * ```typescript
 * const packager = createInlinePackager();
 * const result = packager.package(code);
 * ```
 */
export declare function createInlinePackager(): InlinePackager;
/**
 * Quick helper to package code inline.
 *
 * @param code - Function code
 * @param options - Packaging options
 * @returns Packaging result
 *
 * @throws {Error} If code is too large for inline packaging
 *
 * @example
 * ```typescript
 * const encoded = packageInline(code, { minify: true });
 * ```
 */
export declare function packageInline(code: string, options?: {
    minify?: boolean;
    wrap?: 'http' | 'timer' | false;
}): string;
/**
 * Validates that code can be packaged inline.
 *
 * @param code - Function code
 * @returns True if code fits within inline limits
 *
 * @example
 * ```typescript
 * if (canPackageInline(code)) {
 *   const encoded = packageInline(code);
 * } else {
 *   console.log('Code too large, use external packaging');
 * }
 * ```
 */
export declare function canPackageInline(code: string): boolean;
/**
 * Estimates the encoded size without actually encoding.
 *
 * @param code - Function code
 * @returns Estimated encoded size in bytes
 *
 * @example
 * ```typescript
 * const size = estimateEncodedSize(code);
 * console.log(`Estimated size: ${size} bytes`);
 * ```
 */
export declare function estimateEncodedSize(code: string): number;
/**
 * Decodes Base64-encoded function code.
 *
 * @param encodedCode - Base64-encoded code
 * @returns Decoded function code
 *
 * @example
 * ```typescript
 * const decoded = decodeInlinePackage(encodedCode);
 * ```
 */
export declare function decodeInlinePackage(encodedCode: string): string;
//# sourceMappingURL=inline-packager.d.ts.map