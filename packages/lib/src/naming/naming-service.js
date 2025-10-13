"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamingService = void 0;
var crypto = require("crypto");
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
var NamingService = /** @class */ (function () {
    /**
     * Creates a new NamingService instance.
     *
     * @param seed - Optional seed for hash generation. If not provided,
     *               uses timestamp + random bytes for true uniqueness.
     */
    function NamingService(seed) {
        if (seed) {
            // Use provided seed for deterministic hash (useful for testing)
            this.synthesisUniqueHash = this.generateDeterministicHash(seed);
        }
        else {
            // Generate truly unique hash using timestamp + random data
            var timestamp = Date.now().toString();
            var randomBytes = crypto.randomBytes(16).toString('hex');
            var uniqueInput = "".concat(timestamp, "-").concat(randomBytes);
            this.synthesisUniqueHash = this.generateDeterministicHash(uniqueInput);
        }
    }
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
    NamingService.prototype.getUniqueHash = function (length) {
        if (length === void 0) { length = 8; }
        if (length > this.synthesisUniqueHash.length) {
            throw new Error("Requested hash length ".concat(length, " exceeds available hash length ").concat(this.synthesisUniqueHash.length));
        }
        return this.synthesisUniqueHash.substring(0, length);
    };
    /**
     * Gets the full unique hash for this synthesis.
     *
     * @returns Full unique hash (40 characters)
     */
    NamingService.prototype.getFullHash = function () {
        return this.synthesisUniqueHash;
    };
    /**
     * Generates a deterministic hash from input string.
     *
     * @param input - Input string to hash
     * @returns 40-character hex hash (SHA-1)
     */
    NamingService.prototype.generateDeterministicHash = function (input) {
        var hash = crypto.createHash('sha1');
        hash.update(input);
        return hash.digest('hex'); // Returns 40-character hex string
    };
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
    NamingService.prototype.getResourceHash = function (length) {
        if (length === void 0) { length = 8; }
        if (length > this.synthesisUniqueHash.length) {
            throw new Error("Requested hash length ".concat(length, " exceeds available hash length ").concat(this.synthesisUniqueHash.length));
        }
        return this.synthesisUniqueHash.substring(0, length);
    };
    return NamingService;
}());
exports.NamingService = NamingService;
