/**
 * Azure Resource Lock types and interfaces.
 *
 * @packageDocumentation
 */
import { schema } from '@atakora/lib';
/**
 * Lock level that controls what operations are blocked.
 *
 * @public
 */
export declare const LockLevel: typeof schema.resources.LockLevel;
export type LockLevel = typeof LockLevel[keyof typeof LockLevel];
/**
 * Properties for Resource Lock construct.
 *
 * @public
 *
 * @example
 * Lock at subscription level:
 * ```typescript
 * {
 *   level: LockLevel.CAN_NOT_DELETE,
 *   notes: 'Prevent accidental deletion of production resources'
 * }
 * ```
 *
 * @example
 * Lock at resource group level:
 * ```typescript
 * {
 *   level: LockLevel.READ_ONLY,
 *   notes: 'Compliance freeze - no modifications allowed during audit'
 * }
 * ```
 */
export interface ResourceLockProps {
    /**
     * Lock level.
     */
    readonly level: LockLevel;
    /**
     * Notes about the lock.
     *
     * @remarks
     * Optional but highly recommended to document why the lock exists.
     * Maximum 512 characters.
     */
    readonly notes?: string;
    /**
     * Display name for the lock.
     *
     * @remarks
     * Optional. If not specified, construct ID is used.
     */
    readonly displayName?: string;
}
//# sourceMappingURL=lock-types.d.ts.map