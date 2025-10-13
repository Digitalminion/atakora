"use strict";
/**
 * Context components for resource configuration.
 *
 * @remarks
 * This module provides context objects that are non-Azure specific.
 * These represent organizational and project configuration that can be
 * used across different cloud providers or deployment scenarios.
 *
 * Context components include:
 * - **Organization**: Business unit, department, or organizational division
 * - **Project**: Application, workload, or project name
 * - **Environment**: Deployment stage (dev, test, prod, etc.)
 * - **Instance**: Unique identifier for resource instances
 *
 * These components handle normalization, validation, and provide multiple
 * representations (original value, title case, resource name format).
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import { Organization, Project, Environment, Instance } from '@atakora/lib/core/context';
 *
 * const org = Organization.fromValue('Digital Minion');  // resourceName: "dp"
 * const project = new Project('authr');
 * const env = Environment.fromValue('production');         // abbreviation: "prod"
 * const instance = Instance.fromNumber(1);                 // resourceName: "01"
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Instance = exports.Environment = exports.Project = exports.Organization = void 0;
// Export context components
var organization_1 = require("./organization");
Object.defineProperty(exports, "Organization", { enumerable: true, get: function () { return organization_1.Organization; } });
var project_1 = require("./project");
Object.defineProperty(exports, "Project", { enumerable: true, get: function () { return project_1.Project; } });
var environment_1 = require("./environment");
Object.defineProperty(exports, "Environment", { enumerable: true, get: function () { return environment_1.Environment; } });
var instance_1 = require("./instance");
Object.defineProperty(exports, "Instance", { enumerable: true, get: function () { return instance_1.Instance; } });
