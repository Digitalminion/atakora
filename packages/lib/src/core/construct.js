"use strict";
/**
 * Re-export base construct from constructs library.
 *
 * @remarks
 * The constructs library provides the base Construct class that forms
 * the foundation of the construct tree pattern (inspired by AWS CDK).
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = exports.Construct = void 0;
var constructs_1 = require("constructs");
Object.defineProperty(exports, "Construct", { enumerable: true, get: function () { return constructs_1.Construct; } });
Object.defineProperty(exports, "Node", { enumerable: true, get: function () { return constructs_1.Node; } });
