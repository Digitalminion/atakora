"use strict";
/**
 * OpenAPI Type Interfaces
 *
 * Defines TypeScript interfaces for OpenAPI 3.0.x and 3.1.0 specifications.
 * These types provide a type-safe representation of OpenAPI documents that can be
 * imported from external specifications or exported from IRestOperation definitions.
 *
 * Based on the official OpenAPI Specification:
 * - OpenAPI 3.0.3: https://spec.openapis.org/oas/v3.0.3
 * - OpenAPI 3.1.0: https://spec.openapis.org/oas/v3.1.0
 *
 * @see ADR-014 REST API Core Architecture - Section 3: OpenAPI Integration
 * @see docs/design/architecture/openapi-library-evaluation.md - Felix's library recommendations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isReferenceObject = isReferenceObject;
exports.isSchemaObject = isSchemaObject;
/**
 * Type guard to check if an object is a ReferenceObject
 *
 * @param obj - Object to check
 * @returns true if object is a ReferenceObject
 */
function isReferenceObject(obj) {
    return obj !== null && typeof obj === 'object' && '$ref' in obj;
}
/**
 * Type guard to check if an object is a SchemaObject
 *
 * @param obj - Object to check
 * @returns true if object is a SchemaObject
 */
function isSchemaObject(obj) {
    return obj !== null && typeof obj === 'object' && !('$ref' in obj);
}
