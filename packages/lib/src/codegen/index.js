"use strict";
/**
 * ARM Schema Code Generation Tools.
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
exports.generateManyHooks = exports.generateHooks = exports.HooksGenerator = exports.generateManySDK = exports.generateSDK = exports.SDKGenerator = exports.generateManyTypes = exports.generateTypes = exports.TypesGenerator = void 0;
__exportStar(require("./types"), exports);
__exportStar(require("./schema-parser"), exports);
__exportStar(require("./type-generator"), exports);
__exportStar(require("./validation-generator"), exports);
// ============================================================================
// ATAKORA SCHEMA CODE GENERATORS
// ============================================================================
var types_generator_1 = require("./types-generator");
Object.defineProperty(exports, "TypesGenerator", { enumerable: true, get: function () { return types_generator_1.TypesGenerator; } });
Object.defineProperty(exports, "generateTypes", { enumerable: true, get: function () { return types_generator_1.generateTypes; } });
Object.defineProperty(exports, "generateManyTypes", { enumerable: true, get: function () { return types_generator_1.generateManyTypes; } });
var sdk_generator_1 = require("./sdk-generator");
Object.defineProperty(exports, "SDKGenerator", { enumerable: true, get: function () { return sdk_generator_1.SDKGenerator; } });
Object.defineProperty(exports, "generateSDK", { enumerable: true, get: function () { return sdk_generator_1.generateSDK; } });
Object.defineProperty(exports, "generateManySDK", { enumerable: true, get: function () { return sdk_generator_1.generateManySDK; } });
var hooks_generator_1 = require("./hooks-generator");
Object.defineProperty(exports, "HooksGenerator", { enumerable: true, get: function () { return hooks_generator_1.HooksGenerator; } });
Object.defineProperty(exports, "generateHooks", { enumerable: true, get: function () { return hooks_generator_1.generateHooks; } });
Object.defineProperty(exports, "generateManyHooks", { enumerable: true, get: function () { return hooks_generator_1.generateManyHooks; } });
