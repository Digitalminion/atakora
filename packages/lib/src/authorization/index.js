"use strict";
/**
 * Azure RBAC Authorization module.
 *
 * @remarks
 * This module provides role assignment constructs and utilities for
 * implementing Azure RBAC permissions in infrastructure code.
 *
 * **Core Components**:
 * - RoleAssignment constructs (L1 and L2)
 * - WellKnownRoleIds registry
 * - GrantResult implementation
 *
 * **Related Modules**:
 * - `@atakora/lib/core/grants` - IGrantable interface and grant system foundations
 * - `@atakora/lib/core/grantable-resource` - GrantableResource base class
 *
 * @packageDocumentation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// L1 (ARM-level) constructs
__exportStar(require("./role-assignment-arm"), exports);
// L2 (developer-friendly) constructs
__exportStar(require("./role-assignment"), exports);
// Grant result implementation
__exportStar(require("./grant-result"), exports);
// Well-known role definitions
__exportStar(require("./well-known-role-ids"), exports);
// Cross-stack grant utilities
__exportStar(require("./cross-stack-grant"), exports);
// Resource role grant helper
__exportStar(require("./grant-resource-role"), exports);
