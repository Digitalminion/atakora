"use strict";
/**
 * REST API Type Definitions
 *
 * Core type definitions for REST API operations following OpenAPI 3.0/3.1 specifications.
 * These types are used by both the CDK constructs and the synthesis layer.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSchemaObject = exports.isReferenceObject = void 0;
var types_1 = require("./openapi/types");
Object.defineProperty(exports, "isReferenceObject", { enumerable: true, get: function () { return types_1.isReferenceObject; } });
Object.defineProperty(exports, "isSchemaObject", { enumerable: true, get: function () { return types_1.isSchemaObject; } });
