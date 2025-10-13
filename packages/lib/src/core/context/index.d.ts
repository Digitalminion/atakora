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
export { Organization } from './organization';
export { Project } from './project';
export { Environment } from './environment';
export { Instance } from './instance';
//# sourceMappingURL=index.d.ts.map