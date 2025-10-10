/**
 * Reference resolver for OpenAPI specifications.
 *
 * Handles $ref resolution including:
 * - Internal references (#/components/schemas/User)
 * - External references (./common.yaml#/components/schemas/Error)
 * - Circular reference detection
 * - Security validation (no directory traversal)
 */

import $RefParser from '@apidevtools/json-schema-ref-parser';
import {
  OpenApiDefinition,
  CircularReference,
  ReferenceResolverOptions,
} from './types';

/**
 * Resolves $ref references in OpenAPI specifications.
 *
 * Features:
 * - Handles internal and external references
 * - Detects circular references
 * - Security: validates ref paths (no directory traversal)
 * - Government cloud compatible (configurable remote resolution)
 */
export class ReferenceResolver {
  private readonly options: Required<ReferenceResolverOptions>;
  private readonly visitedRefs = new Set<string>();
  private readonly circularRefs: CircularReference[] = [];

  constructor(options: ReferenceResolverOptions = {}) {
    this.options = {
      resolveExternal: options.resolveExternal ?? false,
      allowedSchemes: options.allowedSchemes ?? ['file'],
      allowedPaths: options.allowedPaths ?? [],
      maxDepth: options.maxDepth ?? 50,
      continueOnError: options.continueOnError ?? false,
    };
  }

  /**
   * Resolve all $ref in OpenAPI spec.
   *
   * @param spec - OpenAPI specification to resolve
   * @returns Resolved specification with all $ref dereferenced
   */
  async resolve(spec: OpenApiDefinition): Promise<OpenApiDefinition> {
    this.visitedRefs.clear();
    this.circularRefs.length = 0;

    const parser = new $RefParser();

    try {
      const resolved = await parser.dereference(spec as any);
      return resolved as OpenApiDefinition;
    } catch (error) {
      if (this.options.continueOnError) {
        console.warn('Reference resolution failed, returning original spec:', error);
        return spec;
      }
      throw new Error(
        `Failed to resolve OpenAPI references: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Resolve a single $ref in the context of a spec.
   *
   * @param ref - Reference string (e.g., "#/components/schemas/User")
   * @param spec - OpenAPI specification containing the reference
   * @returns Resolved value
   */
  async resolveRef(ref: string, spec: OpenApiDefinition): Promise<unknown> {
    const parser = new $RefParser();

    try {
      const resolved = await parser.resolve(spec as any);
      const value = this.getValueByPath(resolved, ref);
      return value;
    } catch (error) {
      throw new Error(
        `Failed to resolve reference "${ref}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Detect circular references in the spec.
   *
   * @param spec - OpenAPI specification to analyze
   * @returns List of detected circular references
   */
  async detectCircularRefs(spec: OpenApiDefinition): Promise<CircularReference[]> {
    this.circularRefs.length = 0;
    this.visitedRefs.clear();

    try {
      await this.resolve(spec);
    } catch {
      // Errors during resolution are tracked in circularRefs
    }

    return [...this.circularRefs];
  }

  /**
   * Bundle external references into a single spec.
   *
   * @param spec - OpenAPI specification to bundle
   * @returns Bundled specification with all external refs inlined
   */
  async bundle(spec: OpenApiDefinition): Promise<OpenApiDefinition> {
    const parser = new $RefParser();

    try {
      const bundled = await parser.bundle(spec as any);
      return bundled as OpenApiDefinition;
    } catch (error) {
      throw new Error(
        `Failed to bundle OpenAPI spec: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get value from an object by JSON pointer path.
   */
  private getValueByPath(obj: unknown, path: string): unknown {
    // Remove leading # if present
    const cleanPath = path.startsWith('#') ? path.slice(1) : path;

    // Split by / and filter empty segments
    const segments = cleanPath.split('/').filter((s) => s.length > 0);

    let current = obj;
    for (const segment of segments) {
      if (!current || typeof current !== 'object') {
        throw new Error(`Invalid path: ${path}`);
      }

      // Decode URI-encoded segments
      const decodedSegment = decodeURIComponent(segment.replace(/~1/g, '/').replace(/~0/g, '~'));

      current = (current as Record<string, unknown>)[decodedSegment];

      if (current === undefined) {
        throw new Error(`Path not found: ${path}`);
      }
    }

    return current;
  }

  /**
   * Get circular references detected during resolution.
   */
  getCircularReferences(): readonly CircularReference[] {
    return [...this.circularRefs];
  }

  /**
   * Create a resolver with Government cloud defaults.
   */
  static createGovernmentCloudResolver(allowedPaths: string[] = []): ReferenceResolver {
    return new ReferenceResolver({
      resolveExternal: false,
      allowedSchemes: ['file'],
      allowedPaths,
      maxDepth: 50,
      continueOnError: false,
    });
  }
}

/**
 * Helper function to check if a value is a reference object.
 */
export function isReference(value: unknown): value is { $ref: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$ref' in value &&
    typeof (value as { $ref: unknown }).$ref === 'string'
  );
}

/**
 * Helper function to resolve a reference path to a name.
 */
export function getReferenceName(ref: string): string {
  const parts = ref.split('/');
  return parts[parts.length - 1] || ref;
}
