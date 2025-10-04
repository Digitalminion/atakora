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
 * const project = new Project('colorai');
 * console.log(project.value);        // "colorai"
 * console.log(project.title);        // "Colorai"
 * console.log(project.resourceName); // "colorai"
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
export class Project extends NamingComponent {
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
   * const project1 = new Project('colorai');
   *
   * // With custom values
   * const project2 = new Project({
   *   value: 'ColorAI',
   *   resourceName: 'colorai',
   *   title: 'ColorAI Platform'
   * });
   * ```
   */
  constructor(options: string | NamingComponentOptions) {
    super(options);
  }

  /**
   * Validates the project value.
   *
   * @throws {Error} If validation fails
   */
  protected validate(): void {
    super.validate();

    // Project-specific validation
    if (this.resourceName.length < 2) {
      throw new Error(
        `Project resource name must be at least 2 characters (current: ${this.resourceName.length})`
      );
    }

    if (this.resourceName.length > 40) {
      throw new Error(
        `Project resource name must not exceed 40 characters (current: ${this.resourceName.length})`
      );
    }

    if (!/^[a-z0-9-]+$/.test(this.resourceName)) {
      throw new Error(
        `Project resource name can only contain lowercase letters, numbers, and hyphens`
      );
    }

    if (this.resourceName.startsWith('-') || this.resourceName.endsWith('-')) {
      throw new Error(
        `Project resource name cannot start or end with a hyphen`
      );
    }
  }
}
