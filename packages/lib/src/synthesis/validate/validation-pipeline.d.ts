/**
 * Validation pipeline orchestrator
 *
 * @remarks
 * Coordinates multi-layer validation in the correct order:
 * 1. Construct validation (done in constructors)
 * 2. Transformation validation (type-safe transforms)
 * 3. ARM structure validation
 * 4. Deployment sequence validation
 * 5. Schema validation
 *
 * Provides early exit on errors and configurable strictness levels.
 *
 * @packageDocumentation
 */
import { Resource } from '../../core/resource';
import { ArmTemplate, ValidationResult } from '../types';
import { ValidatorRegistry } from './validator-registry';
/**
 * Validation level configuration
 */
export declare enum ValidationLevel {
    /**
     * Lenient - only fail on critical errors
     */
    LENIENT = "lenient",
    /**
     * Normal - fail on errors, warn on issues
     */
    NORMAL = "normal",
    /**
     * Strict - treat warnings as errors
     */
    STRICT = "strict"
}
/**
 * Options for validation pipeline
 */
export interface ValidationOptions {
    /**
     * Validation strictness level
     * @default ValidationLevel.NORMAL
     */
    level?: ValidationLevel;
    /**
     * Treat warnings as errors (same as level: STRICT)
     * @default false
     */
    strict?: boolean;
    /**
     * Skip specific validation layers
     */
    skip?: {
        transformation?: boolean;
        structure?: boolean;
        deployment?: boolean;
        schema?: boolean;
    };
}
/**
 * Orchestrates multi-layer validation pipeline
 */
export declare class ValidationPipeline {
    private validatorRegistry;
    constructor(validatorRegistry?: ValidatorRegistry);
    /**
     * Run complete validation pipeline
     *
     * @param resources - Resources from construct tree
     * @param template - Generated ARM template
     * @param stackName - Name of the stack being validated
     * @param options - Validation options
     * @returns Aggregated validation result
     */
    validate(resources: Resource[], template: ArmTemplate, stackName: string, options?: ValidationOptions): Promise<ValidationResult>;
    /**
     * Normalize validation options with defaults
     */
    private normalizeOptions;
    /**
     * Run a validation layer with timing
     */
    private runLayer;
    /**
     * Check if validation should exit early
     */
    private shouldEarlyExit;
    /**
     * Layer 2: Validate transformations
     *
     * @remarks
     * Validates that resources were correctly transformed to ARM format.
     * This layer checks for type-safe transformation errors.
     */
    private validateTransformations;
    /**
     * Layer 3: Validate ARM structure
     *
     * @remarks
     * Validates the overall ARM template structure and relationships.
     */
    private validateArmStructure;
    /**
     * Layer 4: Validate deployment sequence
     *
     * @remarks
     * Validates that resource dependencies form a valid deployment graph.
     */
    private validateDeploymentSequence;
    /**
     * Layer 5: Validate schema
     *
     * @remarks
     * Delegates to existing schema validator from registry.
     */
    private validateSchema;
    /**
     * Aggregate results from all layers
     */
    private aggregateResults;
    /**
     * Extract resource name from dependency string
     *
     * @remarks
     * Handles both formats:
     * - "[resourceId('Microsoft.Network/virtualNetworks', 'vnet-name')]"
     * - "vnet-name"
     */
    private extractResourceNameFromDependency;
    /**
     * Check if a resource type typically requires a properties object
     */
    private requiresProperties;
}
//# sourceMappingURL=validation-pipeline.d.ts.map