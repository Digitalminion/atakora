/**
 * Central naming service for resource name generation.
 *
 * @remarks
 * Provides:
 * - Unique hash generation per synthesis/deployment
 * - Consistent naming conventions
 * - Configurable hash length per resource type
 *
 * Similar to AWS CDK's Names.uniqueId() - generates a unique identifier
 * once per synthesis that all resources can use.
 */
export declare class NamingService {
    /**
     * Unique hash generated once per synthesis.
     * This ensures true uniqueness across deployments.
     */
    private readonly synthesisUniqueHash;
    /**
     * Creates a new NamingService instance.
     *
     * @param seed - Optional seed for hash generation. If not provided,
     *               uses timestamp + random bytes for true uniqueness.
     */
    constructor(seed?: string);
    /**
     * Gets a unique hash substring of specified length.
     *
     * @param length - Desired hash length (default: 8)
     * @returns Unique hash substring
     *
     * @example
     * ```typescript
     * const namingService = new NamingService();
     * const hash8 = namingService.getUniqueHash(8);  // "a3f5c9d1"
     * const hash12 = namingService.getUniqueHash(12); // "a3f5c9d1b2e4"
     * ```
     */
    getUniqueHash(length?: number): string;
    /**
     * Gets the full unique hash for this synthesis.
     *
     * @returns Full unique hash (40 characters)
     */
    getFullHash(): string;
    /**
     * Generates a deterministic hash from input string.
     *
     * @param input - Input string to hash
     * @returns 40-character hex hash (SHA-1)
     */
    private generateDeterministicHash;
    /**
     * Gets a hash substring for a specific resource.
     *
     * @param length - Desired hash length (default: 8)
     * @returns Hash substring from the shared synthesis hash
     *
     * @remarks
     * All resources in the same synthesis share the same base hash,
     * they just use different lengths of it. This makes resources from
     * the same deployment visually related.
     *
     * @example
     * ```typescript
     * const namingService = new NamingService();
     * const hash8 = namingService.getResourceHash(8);   // "a3f5c9d1"
     * const hash10 = namingService.getResourceHash(10); // "a3f5c9d1b2"
     * const hash12 = namingService.getResourceHash(12); // "a3f5c9d1b2e4"
     * // All start with the same characters
     * ```
     */
    getResourceHash(length?: number): string;
}
//# sourceMappingURL=naming-service.d.ts.map