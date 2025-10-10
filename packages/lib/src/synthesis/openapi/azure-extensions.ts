/**
 * Azure-specific OpenAPI extensions handler.
 *
 * Handles Azure Resource Manager-specific extensions including:
 * - x-ms-enum: Enhanced enum metadata
 * - x-ms-discriminator-value: Polymorphic type discrimination
 * - x-ms-client-flatten: Property flattening
 * - x-ms-azure-resource: Azure resource marker
 * - x-ms-mutability: Property mutability metadata
 * - x-ms-paths: Query parameter-based versioning
 * - x-ms-pageable: Pagination metadata
 * - x-ms-long-running-operation: Async operation marker
 */

import { JsonSchema, OpenApiDefinition, OpenApiOperation } from './types';

/**
 * Azure x-ms-paths extension for query parameter versioning.
 */
export interface AzureMsPaths {
  readonly [path: string]: {
    readonly get?: OpenApiOperation;
    readonly put?: OpenApiOperation;
    readonly post?: OpenApiOperation;
    readonly delete?: OpenApiOperation;
    readonly patch?: OpenApiOperation;
  };
}

/**
 * Azure x-ms-enum extension.
 */
export interface AzureMsEnumExtension {
  readonly name: string;
  readonly modelAsString?: boolean;
  readonly values?: readonly {
    readonly value: string;
    readonly description?: string;
    readonly name?: string;
  }[];
}

/**
 * Azure x-ms-pageable extension.
 */
export interface AzureMsPageable {
  readonly nextLinkName?: string;
  readonly itemName?: string;
  readonly operationName?: string;
}

/**
 * Azure x-ms-mutability values.
 */
export type AzureMsMutability = readonly ('create' | 'read' | 'update')[];

/**
 * Azure x-ms-parameter-location extension.
 */
export type AzureMsParameterLocation = 'method' | 'client';

/**
 * Azure extensions handler for OpenAPI specifications.
 */
export class AzureExtensionsHandler {
  /**
   * Extract x-ms-enum metadata from a schema.
   */
  extractMsEnum(schema: JsonSchema): AzureMsEnumExtension | undefined {
    const msEnum = schema['x-ms-enum'];
    if (!msEnum || typeof msEnum !== 'object') {
      return undefined;
    }

    return msEnum as AzureMsEnumExtension;
  }

  /**
   * Extract x-ms-discriminator-value from a schema.
   */
  extractDiscriminatorValue(schema: JsonSchema): string | undefined {
    const value = schema['x-ms-discriminator-value'];
    return typeof value === 'string' ? value : undefined;
  }

  /**
   * Check if x-ms-client-flatten is enabled.
   */
  shouldFlatten(schema: JsonSchema): boolean {
    return schema['x-ms-client-flatten'] === true;
  }

  /**
   * Check if schema is marked as Azure resource.
   */
  isAzureResource(schema: JsonSchema): boolean {
    return schema['x-ms-azure-resource'] === true;
  }

  /**
   * Extract x-ms-mutability metadata.
   */
  extractMutability(schema: JsonSchema): AzureMsMutability | undefined {
    const mutability = schema['x-ms-mutability'];
    if (!Array.isArray(mutability)) {
      return undefined;
    }

    return mutability as AzureMsMutability;
  }

  /**
   * Check if property is read-only based on mutability.
   */
  isReadOnly(schema: JsonSchema): boolean {
    // Standard OpenAPI readOnly
    if (schema.readOnly === true) {
      return true;
    }

    // Azure mutability
    const mutability = this.extractMutability(schema);
    if (mutability) {
      // Read-only if only 'read' is present
      return mutability.length === 1 && mutability[0] === 'read';
    }

    return false;
  }

  /**
   * Check if property is write-only based on mutability.
   */
  isWriteOnly(schema: JsonSchema): boolean {
    // Standard OpenAPI writeOnly
    if (schema.writeOnly === true) {
      return true;
    }

    // Azure mutability
    const mutability = this.extractMutability(schema);
    if (mutability) {
      // Write-only if only 'create' and/or 'update' is present (no 'read')
      return !mutability.includes('read') && mutability.length > 0;
    }

    return false;
  }

  /**
   * Extract x-ms-paths from OpenAPI spec.
   */
  extractMsPaths(spec: OpenApiDefinition): AzureMsPaths | undefined {
    const msPaths = spec['x-ms-paths'];
    if (!msPaths || typeof msPaths !== 'object') {
      return undefined;
    }

    return msPaths as AzureMsPaths;
  }

  /**
   * Extract x-ms-pageable from operation.
   */
  extractPageable(operation: OpenApiOperation): AzureMsPageable | undefined {
    const pageable = operation['x-ms-pageable'];
    if (!pageable || typeof pageable !== 'object') {
      return undefined;
    }

    return pageable as AzureMsPageable;
  }

  /**
   * Check if operation is a long-running operation.
   */
  isLongRunningOperation(operation: OpenApiOperation): boolean {
    return operation['x-ms-long-running-operation'] === true;
  }

  /**
   * Flatten properties based on x-ms-client-flatten.
   *
   * @param schema - Schema to flatten
   * @returns Flattened properties
   */
  flattenProperties(schema: JsonSchema): Record<string, JsonSchema> {
    const flattened: Record<string, JsonSchema> = {};

    if (!schema.properties) {
      return flattened;
    }

    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (this.shouldFlatten(propSchema) && propSchema.properties) {
        // Flatten nested properties
        Object.assign(flattened, this.flattenProperties(propSchema));
      } else {
        flattened[propName] = propSchema;
      }
    }

    return flattened;
  }

  /**
   * Generate TypeScript enum from x-ms-enum.
   *
   * @param msEnum - Azure enum metadata
   * @returns TypeScript enum code
   */
  generateEnumCode(msEnum: AzureMsEnumExtension): string {
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * ${msEnum.name} enum.`);
    if (msEnum.values && msEnum.values.length > 0) {
      lines.push(` *`);
      lines.push(` * Values:`);
      for (const value of msEnum.values) {
        lines.push(` * - ${value.value}${value.description ? `: ${value.description}` : ''}`);
      }
    }
    lines.push(` */`);
    lines.push(`export enum ${msEnum.name} {`);

    if (msEnum.values) {
      for (const value of msEnum.values) {
        const memberName = value.name || this.toEnumMemberName(value.value);

        if (value.description) {
          lines.push(`  /** ${value.description} */`);
        }

        lines.push(`  ${memberName} = '${value.value}',`);
      }
    }

    lines.push(`}`);

    return lines.join('\n');
  }

  /**
   * Generate TypeScript type guard for discriminated union.
   *
   * @param typeName - Type name
   * @param discriminatorValue - Discriminator value
   * @param discriminatorProperty - Discriminator property name
   * @returns Type guard code
   */
  generateTypeGuard(
    typeName: string,
    discriminatorValue: string,
    discriminatorProperty: string = 'type'
  ): string {
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * Type guard for ${typeName}.`);
    lines.push(` */`);
    lines.push(
      `export function is${typeName}(value: unknown): value is ${typeName} {`
    );
    lines.push(`  return (`);
    lines.push(`    typeof value === 'object' &&`);
    lines.push(`    value !== null &&`);
    lines.push(`    '${discriminatorProperty}' in value &&`);
    lines.push(
      `    (value as Record<string, unknown>).${discriminatorProperty} === '${discriminatorValue}'`
    );
    lines.push(`  );`);
    lines.push(`}`);

    return lines.join('\n');
  }

  /**
   * Generate TSDoc for mutability constraints.
   *
   * @param mutability - Mutability metadata
   * @returns TSDoc comment
   */
  generateMutabilityDoc(mutability: AzureMsMutability): string {
    const operations = mutability.join(', ');
    return `Mutability: ${operations}`;
  }

  /**
   * Merge x-ms-paths with standard paths.
   *
   * @param spec - OpenAPI specification
   * @returns Merged paths
   */
  mergePaths(spec: OpenApiDefinition): Record<string, unknown> {
    const merged = { ...spec.paths };

    const msPaths = this.extractMsPaths(spec);
    if (msPaths) {
      // Merge x-ms-paths into paths
      Object.assign(merged, msPaths);
    }

    return merged;
  }

  /**
   * Extract resource properties based on Azure conventions.
   *
   * @param schema - Schema to analyze
   * @returns Resource metadata
   */
  extractResourceMetadata(schema: JsonSchema): {
    readonly isResource: boolean;
    readonly resourceType?: string;
    readonly apiVersion?: string;
  } {
    const isResource = this.isAzureResource(schema);

    if (!isResource) {
      return { isResource: false };
    }

    // Extract resource type from properties
    const properties = schema.properties || {};
    const resourceType =
      properties.type && typeof properties.type === 'object'
        ? (properties.type as JsonSchema).const?.toString()
        : undefined;

    return {
      isResource: true,
      resourceType,
    };
  }

  /**
   * Validate Azure extension compatibility.
   *
   * @param schema - Schema to validate
   * @returns Validation warnings
   */
  validateExtensions(schema: JsonSchema): string[] {
    const warnings: string[] = [];

    // Check for x-ms-enum without enum
    if (schema['x-ms-enum'] && !schema.enum) {
      warnings.push('x-ms-enum is present but enum is missing');
    }

    // Check for x-ms-discriminator-value without discriminator
    if (schema['x-ms-discriminator-value'] && !schema.discriminator) {
      warnings.push('x-ms-discriminator-value is present but discriminator is missing');
    }

    // Check for conflicting mutability
    const mutability = this.extractMutability(schema);
    if (mutability) {
      if (schema.readOnly && mutability.includes('create')) {
        warnings.push('readOnly conflicts with mutability: create');
      }
      if (schema.writeOnly && mutability.includes('read')) {
        warnings.push('writeOnly conflicts with mutability: read');
      }
    }

    // Check for x-ms-client-flatten on non-object
    if (schema['x-ms-client-flatten'] && schema.type !== 'object') {
      warnings.push('x-ms-client-flatten should only be used on object types');
    }

    return warnings;
  }

  /**
   * Convert string to enum member name (PascalCase).
   */
  private toEnumMemberName(value: string): string {
    // Convert kebab-case, snake_case, or dot.case to PascalCase
    return value
      .split(/[-_.]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }
}

/**
 * Default Azure extensions handler instance.
 */
export const azureExtensions = new AzureExtensionsHandler();

/**
 * Helper function to check if a schema has Azure extensions.
 */
export function hasAzureExtensions(schema: JsonSchema): boolean {
  return (
    schema['x-ms-enum'] !== undefined ||
    schema['x-ms-discriminator-value'] !== undefined ||
    schema['x-ms-client-flatten'] !== undefined ||
    schema['x-ms-azure-resource'] !== undefined ||
    schema['x-ms-mutability'] !== undefined
  );
}

/**
 * Helper function to extract all Azure extensions from a schema.
 */
export function extractAllAzureExtensions(schema: JsonSchema): Record<string, unknown> {
  const extensions: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (key.startsWith('x-ms-')) {
      extensions[key] = value;
    }
  }

  return extensions;
}
