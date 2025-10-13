"use strict";
/**
 * Azure ARM Private Construct Library
 *
 * @remarks
 * Infrastructure as Code library for Azure Resource Manager (ARM) templates.
 * Provides type-safe constructs for defining Azure infrastructure with both
 * low-level (L1) and high-level (L2) abstractions.
 *
 * ## Architecture
 *
 * The library follows a layered construct model:
 *
 * - **L1 Constructs** (Arm prefix): Direct ARM template mapping with full control
 *   - Example: `ArmVirtualNetwork`, `ArmStorageAccount`
 *   - Provides 1:1 mapping to ARM resource properties
 *   - Maximum flexibility and control
 *
 * - **L2 Constructs** (no prefix): Intent-based API with sensible defaults
 *   - Example: `VirtualNetwork`, `StorageAccount`
 *   - Auto-generates resource names following conventions
 *   - Merges tags from parent constructs
 *   - Validates configuration at construct time
 *
 * ## Core Concepts
 *
 * - **App**: Root of the construct tree
 * - **Stack**: Deployment boundary (subscription or resource group scope)
 * - **Construct**: Base class for all infrastructure components
 * - **Resource**: Base class for ARM resources
 *
 * ## Usage
 *
 * @example
 * Basic usage with L2 constructs:
 * ```typescript
 * import { App, SubscriptionStack, ResourceGroup, StorageAccount } from '@atakora/lib';
 *
 * const app = new App();
 *
 * const stack = new SubscriptionStack(app, 'MyStack', {
 *   subscription: Subscription.fromId('...'),
 *   geography: Geography.fromValue('eastus'),
 *   organization: Organization.fromValue('engineering'),
 *   project: new Project('myapp'),
 *   environment: Environment.fromValue('prod'),
 *   instance: Instance.fromNumber(1)
 * });
 *
 * const rg = new ResourceGroup(stack, 'Resources', {
 *   location: 'eastus'
 * });
 *
 * const storage = new StorageAccount(rg, 'Data', {
 *   sku: { name: StorageAccountSkuName.STANDARD_LRS }
 * });
 *
 * app.synth();
 * ```
 *
 * @example
 * Advanced usage with L1 constructs:
 * ```typescript
 * import { ArmStorageAccount } from '@atakora/lib';
 *
 * const storage = new ArmStorageAccount(stack, 'Storage', {
 *   name: 'mystorageaccount',
 *   location: 'eastus',
 *   sku: { name: 'Standard_LRS' },
 *   kind: 'StorageV2',
 *   properties: {
 *     accessTier: 'Hot',
 *     minimumTlsVersion: 'TLS1_2',
 *     allowBlobPublicAccess: false
 *   }
 * });
 * ```
 *
 * @packageDocumentation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphql = exports.generateManyHooks = exports.generateHooks = exports.generateManySDK = exports.generateSDK = exports.generateManyTypes = exports.generateTypes = exports.createRelationshipLoader = exports.RelationshipLoader = exports.createMutationBuilder = exports.MutationBuilder = exports.createQueryBuilder = exports.QueryBuilder = exports.polymorphic = exports.manyToMany = exports.belongsTo = exports.hasOne = exports.hasMany = exports.allow = exports.Fields = exports.defineSchema = exports.schema = exports.ResolverOperation = exports.EventType = exports.DataType = exports.IndexKind = exports.IndexingMode = exports.validateDataStackManifest = exports.validateResolverSynthesis = exports.validateEventSynthesis = exports.validateContainerConfig = exports.synthesizeResolvers = exports.synthesizeEventTopics = exports.synthesizeCosmosContainer = exports.DataStackSynthesizer = void 0;
// Core types and classes
__exportStar(require("./core"), exports);
// Naming conventions and utilities
__exportStar(require("./naming"), exports);
var synthesis_1 = require("./synthesis");
Object.defineProperty(exports, "DataStackSynthesizer", { enumerable: true, get: function () { return synthesis_1.DataStackSynthesizer; } });
Object.defineProperty(exports, "synthesizeCosmosContainer", { enumerable: true, get: function () { return synthesis_1.synthesizeCosmosContainer; } });
Object.defineProperty(exports, "synthesizeEventTopics", { enumerable: true, get: function () { return synthesis_1.synthesizeEventTopics; } });
Object.defineProperty(exports, "synthesizeResolvers", { enumerable: true, get: function () { return synthesis_1.synthesizeResolvers; } });
Object.defineProperty(exports, "validateContainerConfig", { enumerable: true, get: function () { return synthesis_1.validateContainerConfig; } });
Object.defineProperty(exports, "validateEventSynthesis", { enumerable: true, get: function () { return synthesis_1.validateEventSynthesis; } });
Object.defineProperty(exports, "validateResolverSynthesis", { enumerable: true, get: function () { return synthesis_1.validateResolverSynthesis; } });
Object.defineProperty(exports, "validateDataStackManifest", { enumerable: true, get: function () { return synthesis_1.validateDataStackManifest; } });
Object.defineProperty(exports, "IndexingMode", { enumerable: true, get: function () { return synthesis_1.IndexingMode; } });
Object.defineProperty(exports, "IndexKind", { enumerable: true, get: function () { return synthesis_1.IndexKind; } });
Object.defineProperty(exports, "DataType", { enumerable: true, get: function () { return synthesis_1.DataType; } });
Object.defineProperty(exports, "EventType", { enumerable: true, get: function () { return synthesis_1.EventType; } });
Object.defineProperty(exports, "ResolverOperation", { enumerable: true, get: function () { return synthesis_1.ResolverOperation; } });
// Managed Identity constructs
__exportStar(require("./managedidentity"), exports);
// Azure RBAC authorization (role assignments and well-known roles)
__exportStar(require("./authorization"), exports);
// Azure resource schemas (centralized type definitions and enums)
exports.schema = require("./schema");
// Atakora schema DSL for data modeling
var atakora_1 = require("./schema/atakora");
Object.defineProperty(exports, "defineSchema", { enumerable: true, get: function () { return atakora_1.defineSchema; } });
Object.defineProperty(exports, "Fields", { enumerable: true, get: function () { return atakora_1.Fields; } });
Object.defineProperty(exports, "allow", { enumerable: true, get: function () { return atakora_1.allow; } });
Object.defineProperty(exports, "hasMany", { enumerable: true, get: function () { return atakora_1.hasMany; } });
Object.defineProperty(exports, "hasOne", { enumerable: true, get: function () { return atakora_1.hasOne; } });
Object.defineProperty(exports, "belongsTo", { enumerable: true, get: function () { return atakora_1.belongsTo; } });
Object.defineProperty(exports, "manyToMany", { enumerable: true, get: function () { return atakora_1.manyToMany; } });
Object.defineProperty(exports, "polymorphic", { enumerable: true, get: function () { return atakora_1.polymorphic; } });
// Atakora runtime SDK (query and mutation builders, relationship loading)
var runtime_1 = require("./runtime");
Object.defineProperty(exports, "QueryBuilder", { enumerable: true, get: function () { return runtime_1.QueryBuilder; } });
Object.defineProperty(exports, "createQueryBuilder", { enumerable: true, get: function () { return runtime_1.createQueryBuilder; } });
Object.defineProperty(exports, "MutationBuilder", { enumerable: true, get: function () { return runtime_1.MutationBuilder; } });
Object.defineProperty(exports, "createMutationBuilder", { enumerable: true, get: function () { return runtime_1.createMutationBuilder; } });
Object.defineProperty(exports, "RelationshipLoader", { enumerable: true, get: function () { return runtime_1.RelationshipLoader; } });
Object.defineProperty(exports, "createRelationshipLoader", { enumerable: true, get: function () { return runtime_1.createRelationshipLoader; } });
// Atakora code generation (types, SDK, React hooks)
var codegen_1 = require("./codegen");
Object.defineProperty(exports, "generateTypes", { enumerable: true, get: function () { return codegen_1.generateTypes; } });
Object.defineProperty(exports, "generateManyTypes", { enumerable: true, get: function () { return codegen_1.generateManyTypes; } });
Object.defineProperty(exports, "generateSDK", { enumerable: true, get: function () { return codegen_1.generateSDK; } });
Object.defineProperty(exports, "generateManySDK", { enumerable: true, get: function () { return codegen_1.generateManySDK; } });
Object.defineProperty(exports, "generateHooks", { enumerable: true, get: function () { return codegen_1.generateHooks; } });
Object.defineProperty(exports, "generateManyHooks", { enumerable: true, get: function () { return codegen_1.generateManyHooks; } });
// API Management GraphQL types
exports.graphql = require("./apimanagement/graphql");
