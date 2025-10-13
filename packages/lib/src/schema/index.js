"use strict";
/**
 * Schema modules for Atakora.
 *
 * @remarks
 * Contains two main schema categories:
 * - **microsoft**: Azure resource type definitions and enums (Microsoft.* namespaces)
 * - **atakora**: Atakora data schema DSL for defining data models
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.atakora = exports.managedidentity = exports.eventhub = exports.resources = exports.consumption = exports.authorization = exports.signalr = exports.cdn = exports.cache = exports.storage = exports.apimanagement = exports.keyvault = exports.insights = exports.web = exports.network = exports.search = exports.cognitiveservices = exports.operationalinsights = exports.sql = exports.servicebus = exports.documentdb = void 0;
// ============================================================================
// MICROSOFT AZURE RESOURCE SCHEMAS
// Azure resource type definitions organized by namespace
// ============================================================================
// Export documentdb schema
exports.documentdb = require("./microsoft/documentdb");
// Export servicebus schema
exports.servicebus = require("./microsoft/servicebus");
// Export sql schema
exports.sql = require("./microsoft/sql");
// Export operationalinsights schema
exports.operationalinsights = require("./microsoft/operationalinsights");
// Export cognitiveservices schema
exports.cognitiveservices = require("./microsoft/cognitiveservices");
// Export search schema
exports.search = require("./microsoft/search");
// Export network schema
exports.network = require("./microsoft/network");
// Export web schema
exports.web = require("./microsoft/web");
// Export insights schema
exports.insights = require("./microsoft/insights");
// Export keyvault schema
exports.keyvault = require("./microsoft/keyvault");
// Export apimanagement schema
exports.apimanagement = require("./microsoft/apimanagement");
// Export storage schema
exports.storage = require("./microsoft/storage");
// Export cache schema
exports.cache = require("./microsoft/cache");
// Export cdn schema
exports.cdn = require("./microsoft/cdn");
// Export signalr schema
exports.signalr = require("./microsoft/signalr");
// Export authorization schema
exports.authorization = require("./microsoft/authorization");
// Export consumption schema
exports.consumption = require("./microsoft/consumption");
// Export resources schema
exports.resources = require("./microsoft/resources");
// Export eventhub schema
exports.eventhub = require("./microsoft/eventhub");
// Export managedidentity schema
exports.managedidentity = require("./microsoft/managedidentity");
// ============================================================================
// ATAKORA DATA SCHEMA DSL
// Data model definition system
// ============================================================================
// Export atakora data schema
exports.atakora = require("./atakora");
