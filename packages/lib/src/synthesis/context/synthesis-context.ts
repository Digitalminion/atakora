/**
 * Synthesis context for context-aware ARM template generation.
 *
 * This module implements the core context management for the refactored synthesis pipeline.
 * The SynthesisContext provides information about template assignments during ARM generation,
 * enabling resources to generate correct references whether they're in the same template or
 * across different templates.
 *
 * @see ADR-018: Context-Aware Synthesis Pipeline Refactoring
 * @see docs/design/architecture/synthesis-refactor-implementation-spec.md
 *
 * @module synthesis/context
 */

import { TemplateMetadata } from '../types';

/**
 * ARM expression structure for template references.
 *
 * Represents an ARM template expression that can be serialized to the
 * Azure Resource Manager template format (e.g., "[resourceId(...)]").
 *
 * @example Simple function call
 * ```typescript
 * const expr: ArmExpression = {
 *   type: 'function',
 *   name: 'resourceId',
 *   parameters: ['Microsoft.Storage/storageAccounts', 'mystorageaccount']
 * };
 * // Serializes to: [resourceId('Microsoft.Storage/storageAccounts', 'mystorageaccount')]
 * ```
 *
 * @example Nested function call
 * ```typescript
 * const expr: ArmExpression = {
 *   type: 'function',
 *   name: 'reference',
 *   parameters: [
 *     {
 *       type: 'function',
 *       name: 'resourceId',
 *       parameters: ['Microsoft.Resources/deployments', 'storage-deployment']
 *     },
 *     'outputs',
 *     'storageAccountId',
 *     'value'
 *   ]
 * };
 * // Serializes to: [reference(resourceId('Microsoft.Resources/deployments', 'storage-deployment')).outputs.storageAccountId.value]
 * ```
 */
export interface ArmExpression {
  /**
   * Expression type (function call or property access).
   */
  readonly type: 'function' | 'property';

  /**
   * Function or property name.
   *
   * Common ARM functions:
   * - resourceId: Generate resource ID
   * - reference: Get resource properties
   * - parameters: Access template parameter
   * - variables: Access template variable
   * - concat: Concatenate strings
   * - subscription: Access subscription properties
   * - resourceGroup: Access resource group properties
   */
  readonly name: string;

  /**
   * Function parameters or property path components.
   *
   * Can contain:
   * - String literals
   * - Nested ArmExpression objects
   * - Other primitive values (numbers, booleans)
   */
  readonly parameters?: readonly (string | number | boolean | ArmExpression)[];
}

/**
 * Provides context about template assignments during ARM generation.
 *
 * This is the core component of the context-aware synthesis pipeline. Resources
 * receive a SynthesisContext when generating ARM templates, allowing them to:
 * - Generate correct references based on template assignment
 * - Create cross-template references using deployment outputs
 * - Handle parameters that may exist in different templates
 * - Know which resources are co-located in the same template
 *
 * Design Philosophy:
 * - Immutable: Context never changes during ARM generation
 * - Lightweight: Only essential information needed for reference generation
 * - Type-safe: All methods return strongly-typed expressions
 * - Defensive: Validates all inputs and provides clear error messages
 *
 * Usage Pattern:
 * ```typescript
 * class MyResource extends Resource {
 *   toArmTemplate(context?: SynthesisContext): ArmResource {
 *     if (!context) {
 *       // Backwards compatibility: generate without context
 *       return this.generateWithoutContext();
 *     }
 *
 *     // Check if dependency is in same template
 *     if (context.isInSameTemplate(this.storageAccountId)) {
 *       // Use direct reference
 *       const storageRef = context.getResourceReference(this.storageAccountId);
 *     } else {
 *       // Use cross-template reference
 *       const storageRef = context.getCrossTemplateReference(this.storageAccountId);
 *     }
 *
 *     return {
 *       type: this.resourceType,
 *       // ... rest of ARM resource
 *     };
 *   }
 * }
 * ```
 *
 * @example Creating a context
 * ```typescript
 * const resourceTemplates = new Map([
 *   ['storageAccount1', 'Foundation-storage.json'],
 *   ['functionApp1', 'Compute-functions.json']
 * ]);
 *
 * const templateMetadata = new Map([
 *   ['Foundation-storage.json', {
 *     fileName: 'Foundation-storage.json',
 *     isMain: false,
 *     outputs: new Set(['storageAccountId', 'storageAccountName'])
 *   }],
 *   ['Compute-functions.json', {
 *     fileName: 'Compute-functions.json',
 *     isMain: false,
 *     parameters: new Set(['storageAccountId'])
 *   }]
 * ]);
 *
 * const context = new SynthesisContext(
 *   'Compute-functions.json',
 *   resourceTemplates,
 *   templateMetadata
 * );
 * ```
 */
export class SynthesisContext {
  /**
   * The template currently being generated.
   *
   * This is the template name that the resource being transformed
   * has been assigned to.
   *
   * @example "main.json"
   * @example "Foundation-storage.json"
   * @example "Compute-functions.json"
   */
  public readonly currentTemplate: string;

  /**
   * Map of all resource IDs to their assigned template names.
   *
   * This is the complete template assignment produced by the
   * TemplateSplitter during Phase 2 of synthesis.
   *
   * Used to determine if resources are in the same template and
   * to look up where dependencies have been placed.
   */
  private readonly resourceTemplates: Map<string, string>;

  /**
   * Metadata about each template in the deployment.
   *
   * Contains information needed to generate cross-template references,
   * including URIs, parameters, and outputs.
   */
  private readonly templateMetadata: Map<string, TemplateMetadata>;

  /**
   * Creates a new SynthesisContext.
   *
   * @param currentTemplate - Name of the template being generated
   * @param resourceTemplates - Map of resource IDs to template names
   * @param templateMetadata - Metadata about each template
   *
   * @throws {Error} If currentTemplate is not found in templateMetadata
   *
   * @example
   * ```typescript
   * const context = new SynthesisContext(
   *   'Compute-functions.json',
   *   new Map([['storage1', 'Foundation.json'], ['func1', 'Compute-functions.json']]),
   *   new Map([
   *     ['Foundation.json', { fileName: 'Foundation.json', isMain: false }],
   *     ['Compute-functions.json', { fileName: 'Compute-functions.json', isMain: false }]
   *   ])
   * );
   * ```
   */
  constructor(
    currentTemplate: string,
    resourceTemplates: Map<string, string>,
    templateMetadata: Map<string, TemplateMetadata>
  ) {
    this.currentTemplate = currentTemplate;
    this.resourceTemplates = resourceTemplates;
    this.templateMetadata = templateMetadata;

    // Validate that current template exists in metadata
    if (!this.templateMetadata.has(currentTemplate)) {
      throw new Error(
        `Current template '${currentTemplate}' not found in template metadata. ` +
        `Available templates: ${Array.from(templateMetadata.keys()).join(', ')}`
      );
    }
  }

  /**
   * Get a reference to a resource, handling cross-template scenarios.
   *
   * Generates the appropriate ARM expression to reference a resource:
   * - Same template: Direct resourceId() reference
   * - Different template: Cross-template reference via deployment outputs
   *
   * @param resourceId - ID of the resource to reference
   * @returns ARM expression for referencing the resource
   *
   * @throws {Error} If resourceId is not found in template assignments
   *
   * @example Same template reference
   * ```typescript
   * const ref = context.getResourceReference('storageAccount1');
   * // Returns: [resourceId('Microsoft.Storage/storageAccounts', 'mystorageaccount')]
   * ```
   *
   * @example Cross-template reference
   * ```typescript
   * const ref = context.getResourceReference('storageAccount1');
   * // Returns: [reference(resourceId('Microsoft.Resources/deployments', 'foundation-storage-deployment')).outputs.storageAccount1_id.value]
   * ```
   */
  getResourceReference(resourceId: string): string {
    const targetTemplate = this.resourceTemplates.get(resourceId);

    if (!targetTemplate) {
      throw new Error(
        `Resource '${resourceId}' not found in template assignments. ` +
        `This resource was not assigned to any template during the splitting phase. ` +
        `Available resources: ${Array.from(this.resourceTemplates.keys()).slice(0, 10).join(', ')}${this.resourceTemplates.size > 10 ? '...' : ''}`
      );
    }

    if (targetTemplate === this.currentTemplate) {
      // Same template - generate direct reference
      // The resource type and name will be extracted from the actual resource
      // This returns a placeholder that should be replaced with actual resourceId call
      return `[resourceId('__RESOURCE_TYPE__', '${resourceId}')]`;
    } else {
      // Cross-template - use deployment output
      return this.getCrossTemplateReference(resourceId);
    }
  }

  /**
   * Get a reference to a parameter, handling cross-template scenarios.
   *
   * Generates an ARM expression to access a parameter:
   * - If parameter exists in current template: Direct parameters() reference
   * - If parameter is from parent: Still use parameters() (will be propagated)
   *
   * @param paramName - Name of the parameter
   * @returns ARM expression for accessing the parameter
   *
   * @example
   * ```typescript
   * const ref = context.getParameterReference('location');
   * // Returns: [parameters('location')]
   * ```
   */
  getParameterReference(paramName: string): string {
    const metadata = this.templateMetadata.get(this.currentTemplate);

    if (metadata?.parameters?.has(paramName)) {
      // Parameter exists in current template
      return `[parameters('${paramName}')]`;
    } else {
      // Parameter might be in parent template - return as-is
      // The parent template will handle parameter propagation
      return `[parameters('${paramName}')]`;
    }
  }

  /**
   * Get a cross-template reference using deployment outputs.
   *
   * Generates an ARM expression that references a resource in a different
   * template through the linked deployment's outputs.
   *
   * Format: [reference(resourceId('Microsoft.Resources/deployments', '{deploymentName}')).outputs.{outputName}.value]
   *
   * @param resourceId - ID of the resource in another template
   * @param expression - Optional property expression (e.g., 'properties.endpoint')
   * @returns ARM expression for cross-template reference
   *
   * @throws {Error} If resourceId is in the same template or not found
   *
   * @example Basic cross-template reference
   * ```typescript
   * const ref = context.getCrossTemplateReference('storageAccount1');
   * // Returns: [reference(resourceId('Microsoft.Resources/deployments', 'foundation-storage-deployment')).outputs.storageAccount1_id.value]
   * ```
   *
   * @example Cross-template reference with property expression
   * ```typescript
   * const ref = context.getCrossTemplateReference('cosmosDb1', 'properties.documentEndpoint');
   * // Returns: [reference(resourceId('Microsoft.Resources/deployments', 'foundation-data-deployment')).outputs.cosmosDb1_documentEndpoint.value]
   * ```
   */
  getCrossTemplateReference(resourceId: string, expression?: string): string {
    const targetTemplate = this.resourceTemplates.get(resourceId);

    if (!targetTemplate) {
      throw new Error(
        `Resource '${resourceId}' not found in template assignments. ` +
        `Cannot create cross-template reference for unknown resource.`
      );
    }

    if (targetTemplate === this.currentTemplate) {
      throw new Error(
        `Invalid cross-template reference: Resource '${resourceId}' is in the same template ('${this.currentTemplate}'). ` +
        `Use getResourceReference() instead for same-template references.`
      );
    }

    // Generate deployment name from template name
    const deploymentName = this.getDeploymentName(targetTemplate);

    // Generate output name for the resource reference
    const outputName = this.getOutputName(resourceId, expression);

    // Build the ARM expression for cross-template reference
    // Format: [reference(resourceId('Microsoft.Resources/deployments', 'deploymentName')).outputs.outputName.value]
    return `[reference(resourceId('Microsoft.Resources/deployments', '${deploymentName}')).outputs.${outputName}.value]`;
  }

  /**
   * Check if a resource is in the same template as the current template.
   *
   * This is a key method for resource implementations to determine whether
   * they should use direct references or cross-template references.
   *
   * @param resourceId - ID of the resource to check
   * @returns true if the resource is in the current template, false otherwise
   *
   * @example
   * ```typescript
   * if (context.isInSameTemplate('storageAccount1')) {
   *   // Use direct reference
   *   const ref = context.getResourceReference('storageAccount1');
   * } else {
   *   // Use cross-template reference
   *   const ref = context.getCrossTemplateReference('storageAccount1');
   * }
   * ```
   */
  isInSameTemplate(resourceId: string): boolean {
    const targetTemplate = this.resourceTemplates.get(resourceId);
    return targetTemplate === this.currentTemplate;
  }

  /**
   * Get all resources assigned to the current template.
   *
   * Useful for debugging and validation during template generation.
   *
   * @returns Array of resource IDs in the current template
   *
   * @example
   * ```typescript
   * const resources = context.getResourcesInCurrentTemplate();
   * console.log(`Generating template '${context.currentTemplate}' with ${resources.length} resources`);
   * ```
   */
  getResourcesInCurrentTemplate(): string[] {
    return Array.from(this.resourceTemplates.entries())
      .filter(([_, template]) => template === this.currentTemplate)
      .map(([id, _]) => id);
  }

  /**
   * Get the deployment name for a linked template.
   *
   * Converts a template file name to a deployment resource name
   * following Azure naming conventions.
   *
   * Format: Remove .json extension and append '-deployment'
   *
   * @param templateName - Name of the template file
   * @returns Deployment name for ARM deployment resource
   *
   * @example
   * ```typescript
   * const deploymentName = context.getDeploymentName('Foundation-storage.json');
   * // Returns: 'foundation-storage-deployment'
   * ```
   *
   * @private
   */
  private getDeploymentName(templateName: string): string {
    // Remove .json extension and convert to lowercase
    const baseName = templateName.replace(/\.json$/i, '').toLowerCase();
    // Append deployment suffix
    return `${baseName}-deployment`;
  }

  /**
   * Get the output name for a cross-template reference.
   *
   * Generates a consistent output name for referencing a resource
   * or resource property from another template.
   *
   * Format:
   * - Resource ID only: {resourceId}_id
   * - With expression: {resourceId}_{expression}
   *
   * Special characters in expressions are converted to underscores.
   *
   * @param resourceId - ID of the resource
   * @param expression - Optional property expression
   * @returns Output name for the cross-template reference
   *
   * @example Resource ID output
   * ```typescript
   * const outputName = context.getOutputName('storageAccount1');
   * // Returns: 'storageAccount1_id'
   * ```
   *
   * @example Property expression output
   * ```typescript
   * const outputName = context.getOutputName('cosmosDb1', 'properties.documentEndpoint');
   * // Returns: 'cosmosDb1_properties_documentEndpoint'
   * ```
   *
   * @private
   */
  private getOutputName(resourceId: string, expression?: string): string {
    if (expression) {
      // Convert property path to safe output name
      // Replace dots and special chars with underscores
      const safePath = expression.replace(/[.\[\]]/g, '_');
      return `${resourceId}_${safePath}`;
    } else {
      // Default to resource ID output
      return `${resourceId}_id`;
    }
  }

  /**
   * Get metadata for the current template.
   *
   * @returns Metadata for the current template
   *
   * @example
   * ```typescript
   * const metadata = context.getCurrentTemplateMetadata();
   * console.log(`Current template: ${metadata.fileName}`);
   * console.log(`Is main: ${metadata.isMain}`);
   * ```
   */
  getCurrentTemplateMetadata(): TemplateMetadata {
    const metadata = this.templateMetadata.get(this.currentTemplate);
    if (!metadata) {
      throw new Error(`Metadata not found for current template '${this.currentTemplate}'`);
    }
    return metadata;
  }

  /**
   * Get the template name for a specific resource.
   *
   * @param resourceId - ID of the resource
   * @returns Template name where the resource is located
   *
   * @throws {Error} If resourceId is not found in template assignments
   *
   * @example
   * ```typescript
   * const templateName = context.getResourceTemplate('storageAccount1');
   * console.log(`Storage account is in template: ${templateName}`);
   * ```
   */
  getResourceTemplate(resourceId: string): string {
    const template = this.resourceTemplates.get(resourceId);
    if (!template) {
      throw new Error(
        `Resource '${resourceId}' not found in template assignments. ` +
        `Cannot determine which template this resource belongs to.`
      );
    }
    return template;
  }

  /**
   * Check if a template exists in the deployment.
   *
   * @param templateName - Name of the template to check
   * @returns true if the template exists, false otherwise
   *
   * @example
   * ```typescript
   * if (context.hasTemplate('Foundation-storage.json')) {
   *   console.log('Foundation storage template exists');
   * }
   * ```
   */
  hasTemplate(templateName: string): boolean {
    return this.templateMetadata.has(templateName);
  }

  /**
   * Get all template names in the deployment.
   *
   * @returns Array of template names
   *
   * @example
   * ```typescript
   * const templates = context.getAllTemplates();
   * console.log(`Deployment has ${templates.length} templates:`, templates);
   * ```
   */
  getAllTemplates(): string[] {
    return Array.from(this.templateMetadata.keys());
  }
}
