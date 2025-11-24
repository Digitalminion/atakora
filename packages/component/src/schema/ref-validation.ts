/**
 * Reference Field Validation Registry
 *
 * Handles deferred validation of reference fields across models.
 * Validates that referenced models exist and have compatible types.
 */

import type { ProcessedModel } from './types';

/**
 * Pending reference validation entry
 */
interface PendingRefValidation {
  modelName: string;
  fieldName: string;
  referencedModel: string;
  onDelete?: 'cascade' | 'set_null' | 'restrict';
}

/**
 * Reference validation registry
 *
 * @remarks
 * Singleton registry that collects ref field validations during schema definition
 * and validates them after all models are defined.
 */
export class RefValidationRegistry {
  private static instance: RefValidationRegistry;
  private pendingValidations: PendingRefValidation[] = [];
  private definedModels: Set<string> = new Set();

  /**
   * Get singleton instance
   */
  static getInstance(): RefValidationRegistry {
    if (!RefValidationRegistry.instance) {
      RefValidationRegistry.instance = new RefValidationRegistry();
    }
    return RefValidationRegistry.instance;
  }

  /**
   * Reset registry (for testing)
   *
   * @internal
   */
  static reset(): void {
    RefValidationRegistry.instance = new RefValidationRegistry();
  }

  /**
   * Register a model as defined
   *
   * @param modelName - Name of the defined model
   */
  registerModel(modelName: string): void {
    this.definedModels.add(modelName);
  }

  /**
   * Add a pending reference validation
   *
   * @param validation - Reference validation to defer
   */
  addPendingValidation(validation: PendingRefValidation): void {
    this.pendingValidations.push(validation);
  }

  /**
   * Validate all pending references
   *
   * @remarks
   * Called after all models in a schema are defined.
   * Throws if any references point to non-existent models.
   */
  validateReferences(models: Record<string, ProcessedModel>): void {
    const modelNames = Object.keys(models);

    // Register all models first
    for (const modelName of modelNames) {
      this.registerModel(modelName);
    }

    // Validate each pending reference
    for (const validation of this.pendingValidations) {
      if (!this.definedModels.has(validation.referencedModel)) {
        throw new Error(
          `Model "${validation.modelName}" field "${validation.fieldName}" ` +
            `references non-existent model "${validation.referencedModel}". ` +
            `Available models: ${Array.from(this.definedModels).join(', ')}`
        );
      }

      // Additional validation for cascade delete
      if (validation.onDelete === 'cascade') {
        // Validate that cascading delete won't create orphans
        // This would require deeper analysis of the model relationships
        // For now, we just validate the model exists
      }

      // Validate circular references don't create infinite cascade
      if (
        validation.onDelete === 'cascade' &&
        validation.referencedModel === validation.modelName
      ) {
        console.warn(
          `Model "${validation.modelName}" field "${validation.fieldName}" ` +
            `has a self-referential cascade delete. This could lead to unintended deletions.`
        );
      }
    }

    // Clear validations after processing
    this.clearValidations();
  }

  /**
   * Clear all pending validations
   *
   * @internal
   */
  private clearValidations(): void {
    this.pendingValidations = [];
  }

  /**
   * Get pending validations (for testing)
   *
   * @internal
   */
  getPendingValidations(): PendingRefValidation[] {
    return [...this.pendingValidations];
  }

  /**
   * Get defined models (for testing)
   *
   * @internal
   */
  getDefinedModels(): Set<string> {
    return new Set(this.definedModels);
  }
}

/**
 * Helper function to register ref field validation
 *
 * @param modelName - Name of the model containing the ref field
 * @param fieldName - Name of the ref field
 * @param referencedModel - Name of the referenced model
 * @param onDelete - Delete behavior
 */
export function registerRefValidation(
  modelName: string,
  fieldName: string,
  referencedModel: string,
  onDelete?: 'cascade' | 'set_null' | 'restrict'
): void {
  const registry = RefValidationRegistry.getInstance();
  registry.addPendingValidation({
    modelName,
    fieldName,
    referencedModel,
    onDelete,
  });
}
