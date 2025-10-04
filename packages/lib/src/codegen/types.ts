/**
 * Type definitions for ARM schema code generation.
 *
 * @packageDocumentation
 */

/**
 * Intermediate representation of ARM schema.
 */
export interface SchemaIR {
  /** Resource provider (e.g., Microsoft.Network) */
  readonly provider: string;

  /** API version */
  readonly apiVersion: string;

  /** Resource type definitions */
  readonly resources: ResourceDefinition[];

  /** Shared type definitions */
  readonly definitions: Map<string, TypeDefinition>;

  /** Schema metadata */
  readonly metadata: SchemaMetadata;
}

/**
 * Resource type definition.
 */
export interface ResourceDefinition {
  /** Resource type (e.g., virtualNetworks) */
  readonly name: string;

  /** Full ARM type (e.g., Microsoft.Network/virtualNetworks) */
  readonly armType: string;

  /** Resource description */
  readonly description?: string;

  /** Properties */
  readonly properties: PropertyDefinition[];

  /** Required property names */
  readonly required: string[];

  /** Child resources */
  readonly childResources?: ResourceDefinition[];
}

/**
 * Property definition.
 */
export interface PropertyDefinition {
  /** Property name */
  readonly name: string;

  /** TypeScript type */
  readonly type: TypeDefinition;

  /** Property description */
  readonly description?: string;

  /** Is required */
  readonly required: boolean;

  /** Constraints */
  readonly constraints?: PropertyConstraints;
}

/**
 * Type definition.
 */
export interface TypeDefinition {
  /** Type kind */
  readonly kind: 'primitive' | 'object' | 'array' | 'enum' | 'union' | 'reference';

  /** TypeScript type string */
  readonly tsType: string;

  /** For objects: nested properties */
  readonly properties?: PropertyDefinition[];

  /** For arrays: element type */
  readonly elementType?: TypeDefinition;

  /** For enums: allowed values */
  readonly enumValues?: string[];

  /** For unions: member types */
  readonly unionTypes?: TypeDefinition[];

  /** For references: referenced type name */
  readonly refName?: string;
}

/**
 * Property constraints for validation.
 */
export interface PropertyConstraints {
  /** Min length (strings/arrays) */
  readonly minLength?: number;

  /** Max length (strings/arrays) */
  readonly maxLength?: number;

  /** Min value (numbers) */
  readonly minimum?: number;

  /** Max value (numbers) */
  readonly maximum?: number;

  /** Regex pattern */
  readonly pattern?: string;

  /** Allowed values (enum) */
  readonly enum?: any[];

  /** Const value */
  readonly const?: any;
}

/**
 * Schema metadata.
 */
export interface SchemaMetadata {
  /** Schema file path */
  readonly schemaPath: string;

  /** Provider namespace */
  readonly provider: string;

  /** API version */
  readonly apiVersion: string;

  /** Schema ID */
  readonly schemaId: string;

  /** Generation timestamp */
  readonly generatedAt: string;
}
