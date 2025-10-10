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
export const INLINE_CODE_MAX_SIZE = 4096;

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
export class InlinePackager {
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
  public package(code: string): InlinePackageResult {
    const originalSize = Buffer.byteLength(code, 'utf8');
    const encodedCode = Buffer.from(code, 'utf8').toString('base64');
    const size = Buffer.byteLength(encodedCode, 'utf8');
    const fitsInline = size <= INLINE_CODE_MAX_SIZE;

    return {
      encodedCode,
      size,
      fitsInline,
      originalSize,
    };
  }

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
  public unpackage(encodedCode: string): string {
    return Buffer.from(encodedCode, 'base64').toString('utf8');
  }

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
  public canPackageInline(code: string): boolean {
    const result = this.package(code);
    return result.fitsInline;
  }

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
  public getEncodedSize(code: string): number {
    const originalSize = Buffer.byteLength(code, 'utf8');
    // Base64 encoding formula: ceil(originalSize / 3) * 4
    return Math.ceil(originalSize / 3) * 4;
  }

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
  public minify(code: string): string {
    let minified = code;

    // Remove single-line comments
    minified = minified.replace(/\/\/.*$/gm, '');

    // Remove multi-line comments
    minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');

    // Remove extra whitespace
    minified = minified.replace(/\s+/g, ' ');

    // Remove blank lines
    minified = minified.replace(/^\s*[\r\n]/gm, '');

    // Trim
    minified = minified.trim();

    return minified;
  }

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
  public wrapHandler(code: string, handlerType: 'http' | 'timer' = 'http'): string {
    if (handlerType === 'http') {
      return `module.exports = async function (context, req) {
  ${code}
};`;
    } else {
      return `module.exports = async function (context, timer) {
  ${code}
};`;
    }
  }
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
export function createInlinePackager(): InlinePackager {
  return new InlinePackager();
}

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
export function packageInline(
  code: string,
  options: {
    minify?: boolean;
    wrap?: 'http' | 'timer' | false;
  } = {}
): string {
  const packager = new InlinePackager();

  let processedCode = code;

  // Wrap if requested
  if (options.wrap) {
    processedCode = packager.wrapHandler(processedCode, options.wrap);
  }

  // Minify if requested
  if (options.minify) {
    processedCode = packager.minify(processedCode);
  }

  const result = packager.package(processedCode);

  if (!result.fitsInline) {
    throw new Error(
      `Code is too large for inline packaging: ${result.size} bytes (max ${INLINE_CODE_MAX_SIZE} bytes). ` +
        `Consider using external packaging or reducing code size.`
    );
  }

  return result.encodedCode;
}

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
export function canPackageInline(code: string): boolean {
  const packager = new InlinePackager();
  return packager.canPackageInline(code);
}

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
export function estimateEncodedSize(code: string): number {
  const packager = new InlinePackager();
  return packager.getEncodedSize(code);
}

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
export function decodeInlinePackage(encodedCode: string): string {
  const packager = new InlinePackager();
  return packager.unpackage(encodedCode);
}
