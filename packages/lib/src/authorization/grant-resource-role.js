"use strict";
/**
 * Helper function to grant resource-level RBAC roles.
 *
 * @remarks
 * Simplifies granting Azure RBAC roles at the resource scope.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.grantResourceRole = grantResourceRole;
var role_assignment_1 = require("./role-assignment");
/**
 * Grant a role to a principal at resource scope.
 *
 * @param scope - CDK construct scope
 * @param id - Construct ID for the role assignment
 * @param props - Grant properties
 * @returns The created RoleAssignment
 *
 * @example
 * ```typescript
 * // Grant Storage Blob Data Reader role
 * grantResourceRole(this, 'BlobReaderGrant', {
 *   principal: managedIdentity,
 *   roleDefinitionId: '/providers/Microsoft.Authorization/roleDefinitions/2a2b9908-6ea1-4ae2-8e65-a410df84e7d1',
 *   scope: storageAccount.resourceId
 * });
 * ```
 */
function grantResourceRole(scope, id, props) {
    // Extract principal ID (handle both managed identities and other principals)
    var principalId = props.principal.principalId ||
        props.principal.identityId ||
        props.principal.objectId ||
        props.principal.id;
    if (!principalId) {
        throw new Error("Unable to determine principal ID from principal. " +
            "Expected principal to have one of: principalId, identityId, objectId, or id properties.");
    }
    var roleProps = {
        principalId: principalId,
        roleDefinitionId: props.roleDefinitionId,
        scope: props.scope,
    };
    if (props.principalType) {
        roleProps.principalType = props.principalType;
    }
    if (props.condition) {
        roleProps.condition = props.condition;
        roleProps.conditionVersion = props.conditionVersion;
    }
    return new role_assignment_1.RoleAssignment(scope, id, roleProps);
}
