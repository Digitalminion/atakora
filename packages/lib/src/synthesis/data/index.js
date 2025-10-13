"use strict";
/**
 * Data synthesis exports.
 *
 * @remarks
 * Synthesizers for transforming Atakora schemas into Azure data infrastructure.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDataStackManifest = exports.DataStackSynthesizer = exports.ResolverOperation = exports.generateResolverCode = exports.validateResolverSynthesis = exports.synthesizeResolvers = exports.EventType = exports.validateEventSynthesis = exports.synthesizeEventTopics = exports.DataType = exports.IndexKind = exports.IndexingMode = exports.validateContainerConfig = exports.synthesizeCosmosContainer = void 0;
// Cosmos DB Synthesizer
var cosmos_synthesizer_1 = require("./cosmos-synthesizer");
Object.defineProperty(exports, "synthesizeCosmosContainer", { enumerable: true, get: function () { return cosmos_synthesizer_1.synthesizeCosmosContainer; } });
Object.defineProperty(exports, "validateContainerConfig", { enumerable: true, get: function () { return cosmos_synthesizer_1.validateContainerConfig; } });
Object.defineProperty(exports, "IndexingMode", { enumerable: true, get: function () { return cosmos_synthesizer_1.IndexingMode; } });
Object.defineProperty(exports, "IndexKind", { enumerable: true, get: function () { return cosmos_synthesizer_1.IndexKind; } });
Object.defineProperty(exports, "DataType", { enumerable: true, get: function () { return cosmos_synthesizer_1.DataType; } });
// Event Synthesizer
var event_synthesizer_1 = require("./event-synthesizer");
Object.defineProperty(exports, "synthesizeEventTopics", { enumerable: true, get: function () { return event_synthesizer_1.synthesizeEventTopics; } });
Object.defineProperty(exports, "validateEventSynthesis", { enumerable: true, get: function () { return event_synthesizer_1.validateEventSynthesis; } });
Object.defineProperty(exports, "EventType", { enumerable: true, get: function () { return event_synthesizer_1.EventType; } });
// Resolver Synthesizer
var resolver_synthesizer_1 = require("./resolver-synthesizer");
Object.defineProperty(exports, "synthesizeResolvers", { enumerable: true, get: function () { return resolver_synthesizer_1.synthesizeResolvers; } });
Object.defineProperty(exports, "validateResolverSynthesis", { enumerable: true, get: function () { return resolver_synthesizer_1.validateResolverSynthesis; } });
Object.defineProperty(exports, "generateResolverCode", { enumerable: true, get: function () { return resolver_synthesizer_1.generateResolverCode; } });
Object.defineProperty(exports, "ResolverOperation", { enumerable: true, get: function () { return resolver_synthesizer_1.ResolverOperation; } });
// Data Stack Synthesizer
var data_stack_synthesizer_1 = require("./data-stack-synthesizer");
Object.defineProperty(exports, "DataStackSynthesizer", { enumerable: true, get: function () { return data_stack_synthesizer_1.DataStackSynthesizer; } });
Object.defineProperty(exports, "validateDataStackManifest", { enumerable: true, get: function () { return data_stack_synthesizer_1.validateDataStackManifest; } });
