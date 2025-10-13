import { NamingComponent, type NamingComponentOptions } from '../types';
/**
 * Represents a project name in Azure resource naming.
 *
 * @remarks
 * Projects are applications, workloads, or initiatives that use Azure resources.
 * This class normalizes project names for consistent use across resource names.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const project = new Project('authr');
 * console.log(project.value);        // "authr"
 * console.log(project.title);        // "Colorai"
 * console.log(project.resourceName); // "authr"
 * ```
 *
 * @example
 * Multi-word project:
 * ```typescript
 * const project = new Project('customer portal');
 * console.log(project.value);        // "customer portal"
 * console.log(project.title);        // "Customer Portal"
 * console.log(project.resourceName); // "customer-portal"
 * ```
 */
export declare class Project extends NamingComponent {
    /**
     * Creates a new Project instance.
     *
     * @param options - Project name or configuration options
     *
     * @throws {Error} If project value is empty or invalid
     *
     * @example
     * ```typescript
     * // Simple string
     * const project1 = new Project('authr');
     *
     * // With custom values
     * const project2 = new Project({
     *   value: 'AuthR',
     *   resourceName: 'authr',
     *   title: 'AuthR Platform'
     * });
     * ```
     */
    constructor(options: string | NamingComponentOptions);
    /**
     * Validates the project value.
     *
     * @throws {Error} If validation fails
     */
    protected validate(): void;
}
//# sourceMappingURL=project.d.ts.map