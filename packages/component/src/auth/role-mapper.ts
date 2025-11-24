/**
 * Role Mapping Utilities
 *
 * Provides utilities for mapping authentication provider claims to application roles.
 * Supports multiple providers (Entra ID, API Keys, custom) and composition of mappers.
 *
 * @remarks
 * Role mappers transform provider-specific claims (like Azure AD group memberships)
 * into application-specific role names. This abstraction allows authorization rules
 * to work consistently across different authentication providers.
 *
 * @packageDocumentation
 */

import type { RoleMapper, ApiKey } from './types';

// ============================================================================
// Default Role Mappers
// ============================================================================

/**
 * Default role mapper for Entra ID (Azure AD)
 *
 * @param claims - JWT claims from Entra ID token
 * @returns Array of role names
 *
 * @remarks
 * Extracts roles from the `groups` claim in the JWT token. The groups claim
 * can contain:
 * - Array of strings (group IDs or names)
 * - Array of objects with `name` or `displayName` properties
 *
 * The mapper handles both formats and deduplicates the results.
 *
 * If no groups claim is present or it's not an array, returns an empty array.
 *
 * @example
 * ```typescript
 * // String array format
 * const claims1 = {
 *   sub: 'user-123',
 *   groups: ['admin', 'editor', 'viewer']
 * };
 * const roles1 = defaultEntraRoleMapper(claims1);
 * // Returns: ['admin', 'editor', 'viewer']
 *
 * // Object array format
 * const claims2 = {
 *   sub: 'user-123',
 *   groups: [
 *     { name: 'admin', displayName: 'Administrators' },
 *     { name: 'editor', displayName: 'Content Editors' }
 *   ]
 * };
 * const roles2 = defaultEntraRoleMapper(claims2);
 * // Returns: ['admin', 'editor']
 * ```
 */
export function defaultEntraRoleMapper(claims: Record<string, any>): string[] {
  const groups = claims.groups;

  // Handle missing or invalid groups claim
  if (!groups || !Array.isArray(groups)) {
    return [];
  }

  // Map groups to role names
  const roles: string[] = [];

  for (const group of groups) {
    if (typeof group === 'string') {
      // Group is a string (group ID or name)
      if (group.trim()) {
        roles.push(group);
      }
    } else if (group && typeof group === 'object') {
      // Group is an object with name/displayName
      const roleName = group.displayName || group.name;
      if (roleName && typeof roleName === 'string' && roleName.trim()) {
        roles.push(roleName);
      }
    }
    // Ignore other types
  }

  // Deduplicate roles
  return [...new Set(roles)];
}

/**
 * Default role mapper for API keys
 *
 * @param key - API key configuration
 * @returns Array of role names from the key
 *
 * @remarks
 * Simply returns the roles array from the API key configuration.
 * The roles are already defined in the key, so no transformation is needed.
 *
 * Returns an empty array if the key has no roles defined.
 *
 * @example
 * ```typescript
 * const key: ApiKey = {
 *   id: 'service-1',
 *   secret: 'secret-key',
 *   roles: ['service', 'monitoring']
 * };
 *
 * const roles = defaultApiKeyRoleMapper(key);
 * // Returns: ['service', 'monitoring']
 * ```
 */
export function defaultApiKeyRoleMapper(key: ApiKey): string[] {
  return key.roles || [];
}

// ============================================================================
// Role Mapper Composition
// ============================================================================

/**
 * Combine multiple role mappers
 *
 * @param mappers - Variable number of role mapper functions
 * @returns Combined role mapper that merges results from all mappers
 *
 * @remarks
 * Creates a new role mapper that applies all provided mappers to the claims
 * and combines their results. The final result is deduplicated to ensure
 * unique role names.
 *
 * This is useful when you want to combine roles from multiple sources or
 * apply multiple transformation strategies.
 *
 * @example
 * ```typescript
 * const mapper1 = (claims) => ['role1', 'role2'];
 * const mapper2 = (claims) => ['role2', 'role3'];
 * const mapper3 = (claims) => ['role4'];
 *
 * const combined = combineRoleMappers(mapper1, mapper2, mapper3);
 * const roles = combined({ sub: 'user-123' });
 * // Returns: ['role1', 'role2', 'role3', 'role4'] (deduplicated)
 * ```
 */
export function combineRoleMappers(...mappers: RoleMapper[]): RoleMapper {
  return (claims: Record<string, any>) => {
    // Apply all mappers and flatten results
    const allRoles = mappers.flatMap((mapper) => {
      try {
        return mapper(claims) || [];
      } catch (error) {
        // If a mapper throws, skip it and continue
        console.warn('Role mapper error:', error);
        return [];
      }
    });

    // Deduplicate roles
    return [...new Set(allRoles)];
  };
}

// ============================================================================
// Role Filtering
// ============================================================================

/**
 * Filter roles by whitelist
 *
 * @param allowedRoles - Array of allowed role names
 * @returns Role mapper that filters roles to only include allowed ones
 *
 * @remarks
 * Creates a role mapper that first extracts roles using the default Entra
 * mapper, then filters them to only include roles in the whitelist.
 *
 * This is useful for limiting which roles from an external provider
 * (like Azure AD) are recognized by your application.
 *
 * @example
 * ```typescript
 * // Only allow specific roles
 * const filterMapper = filterRoles(['admin', 'editor', 'viewer']);
 *
 * const claims = {
 *   sub: 'user-123',
 *   groups: ['admin', 'editor', 'finance', 'hr']
 * };
 *
 * const roles = filterMapper(claims);
 * // Returns: ['admin', 'editor'] (finance and hr are filtered out)
 * ```
 */
export function filterRoles(allowedRoles: string[]): RoleMapper {
  // Create Set for O(1) lookup
  const allowedSet = new Set(allowedRoles);

  return (claims: Record<string, any>) => {
    // Get all roles using default mapper
    const roles = defaultEntraRoleMapper(claims);

    // Filter to only allowed roles
    return roles.filter((role) => allowedSet.has(role));
  };
}

/**
 * Create a role mapper with custom filtering logic
 *
 * @param baseMapper - Base role mapper to extract initial roles
 * @param filterFn - Function to determine if a role should be included
 * @returns Role mapper that applies filtering
 *
 * @remarks
 * More flexible than `filterRoles()`, this allows custom filtering logic
 * beyond simple whitelisting.
 *
 * @example
 * ```typescript
 * // Only include roles that start with 'app_'
 * const customFilter = createFilteredMapper(
 *   defaultEntraRoleMapper,
 *   (role) => role.startsWith('app_')
 * );
 *
 * const claims = {
 *   groups: ['app_admin', 'azure_group', 'app_user']
 * };
 *
 * const roles = customFilter(claims);
 * // Returns: ['app_admin', 'app_user']
 * ```
 */
export function createFilteredMapper(
  baseMapper: RoleMapper,
  filterFn: (role: string) => boolean
): RoleMapper {
  return (claims: Record<string, any>) => {
    const roles = baseMapper(claims);
    return roles.filter(filterFn);
  };
}

// ============================================================================
// Role Transformation
// ============================================================================

/**
 * Transform role names
 *
 * @param transformer - Function to transform each role name
 * @returns Role mapper that applies transformation to all roles
 *
 * @remarks
 * Creates a role mapper that first extracts roles using the default Entra
 * mapper, then transforms each role name using the provided function.
 *
 * Common transformations include:
 * - Lowercasing or uppercasing
 * - Adding prefixes or suffixes
 * - Removing prefixes
 * - Mapping to different names
 *
 * Results are deduplicated after transformation.
 *
 * @example
 * ```typescript
 * // Convert all roles to lowercase
 * const lowercaseMapper = transformRoles(role => role.toLowerCase());
 *
 * const claims = {
 *   groups: ['ADMIN', 'Editor', 'VIEWER']
 * };
 *
 * const roles = lowercaseMapper(claims);
 * // Returns: ['admin', 'editor', 'viewer']
 * ```
 *
 * @example
 * ```typescript
 * // Add prefix to all roles
 * const prefixMapper = transformRoles(role => `app_${role}`);
 *
 * const claims = {
 *   groups: ['admin', 'editor']
 * };
 *
 * const roles = prefixMapper(claims);
 * // Returns: ['app_admin', 'app_editor']
 * ```
 */
export function transformRoles(transformer: (role: string) => string): RoleMapper {
  return (claims: Record<string, any>) => {
    // Get all roles using default mapper
    const roles = defaultEntraRoleMapper(claims);

    // Transform each role
    const transformed = roles.map((role) => {
      try {
        return transformer(role);
      } catch (error) {
        // If transformation fails, return original role
        console.warn(`Failed to transform role "${role}":`, error);
        return role;
      }
    });

    // Deduplicate after transformation
    return [...new Set(transformed)];
  };
}

/**
 * Create a role mapper with custom transformation logic
 *
 * @param baseMapper - Base role mapper to extract initial roles
 * @param transformFn - Function to transform each role name
 * @returns Role mapper that applies transformation
 *
 * @remarks
 * More flexible than `transformRoles()`, this allows you to specify
 * a custom base mapper instead of always using the default Entra mapper.
 *
 * @example
 * ```typescript
 * // Transform API key roles to uppercase
 * const apiKeyTransform = createTransformedMapper(
 *   (claims) => defaultApiKeyRoleMapper(claims),
 *   (role) => role.toUpperCase()
 * );
 * ```
 */
export function createTransformedMapper(
  baseMapper: RoleMapper,
  transformFn: (role: string) => string
): RoleMapper {
  return (claims: Record<string, any>) => {
    const roles = baseMapper(claims);
    const transformed = roles.map((role) => {
      try {
        return transformFn(role);
      } catch (error) {
        console.warn(`Failed to transform role "${role}":`, error);
        return role;
      }
    });

    // Deduplicate after transformation
    return [...new Set(transformed)];
  };
}

// ============================================================================
// Group ID to Role Name Mapping
// ============================================================================

/**
 * Map Entra group IDs to role names
 *
 * @param groupMap - Map of Azure AD group IDs to application role names
 * @returns Role mapper that translates group IDs to role names
 *
 * @remarks
 * Azure AD often returns group memberships as GUIDs rather than group names.
 * This mapper allows you to define a mapping from those GUIDs to meaningful
 * application role names.
 *
 * Groups not in the map are ignored (not included in the result).
 *
 * @example
 * ```typescript
 * const mapper = mapGroupsToRoles({
 *   '12345678-1234-1234-1234-123456789012': 'admin',
 *   '87654321-4321-4321-4321-210987654321': 'editor',
 *   'abcdef00-0000-0000-0000-000000abcdef': 'viewer'
 * });
 *
 * const claims = {
 *   sub: 'user-123',
 *   groups: [
 *     '12345678-1234-1234-1234-123456789012',
 *     '87654321-4321-4321-4321-210987654321',
 *     'unknown-group-id'
 *   ]
 * };
 *
 * const roles = mapper(claims);
 * // Returns: ['admin', 'editor'] (unknown-group-id is ignored)
 * ```
 */
export function mapGroupsToRoles(groupMap: Record<string, string>): RoleMapper {
  return (claims: Record<string, any>) => {
    const groups = claims.groups;

    // Handle missing or invalid groups claim
    if (!groups || !Array.isArray(groups)) {
      return [];
    }

    const roles: string[] = [];

    for (const group of groups) {
      // Handle string group IDs
      if (typeof group === 'string') {
        const mappedRole = groupMap[group];
        if (mappedRole && typeof mappedRole === 'string') {
          roles.push(mappedRole);
        }
      }
      // Handle object groups with id property
      else if (group && typeof group === 'object' && group.id) {
        const groupId = group.id;
        if (typeof groupId === 'string') {
          const mappedRole = groupMap[groupId];
          if (mappedRole && typeof mappedRole === 'string') {
            roles.push(mappedRole);
          }
        }
      }
    }

    // Deduplicate roles
    return [...new Set(roles)];
  };
}

/**
 * Map group IDs to roles with fallback to group names
 *
 * @param groupMap - Map of Azure AD group IDs to application role names
 * @returns Role mapper that translates group IDs or uses group names as fallback
 *
 * @remarks
 * Similar to `mapGroupsToRoles()`, but includes groups that aren't in the map
 * by using their display name or name property as the role name.
 *
 * This is useful when you want to map some specific groups to custom roles
 * while still preserving other group names.
 *
 * @example
 * ```typescript
 * const mapper = mapGroupsToRolesWithFallback({
 *   '12345678-1234-1234-1234-123456789012': 'admin'
 * });
 *
 * const claims = {
 *   groups: [
 *     '12345678-1234-1234-1234-123456789012',  // Mapped to 'admin'
 *     { id: 'other-id', displayName: 'editors' } // Falls back to 'editors'
 *   ]
 * };
 *
 * const roles = mapper(claims);
 * // Returns: ['admin', 'editors']
 * ```
 */
export function mapGroupsToRolesWithFallback(groupMap: Record<string, string>): RoleMapper {
  return (claims: Record<string, any>) => {
    const groups = claims.groups;

    if (!groups || !Array.isArray(groups)) {
      return [];
    }

    const roles: string[] = [];

    for (const group of groups) {
      if (typeof group === 'string') {
        // Check map first, then use group string itself
        const role = groupMap[group] || group;
        if (role.trim()) {
          roles.push(role);
        }
      } else if (group && typeof group === 'object') {
        // Check map by ID, then fall back to displayName or name
        const groupId = group.id;
        if (groupId && typeof groupId === 'string') {
          const mappedRole = groupMap[groupId];
          if (mappedRole) {
            roles.push(mappedRole);
          } else {
            // Fallback to displayName or name
            const roleName = group.displayName || group.name;
            if (roleName && typeof roleName === 'string' && roleName.trim()) {
              roles.push(roleName);
            }
          }
        }
      }
    }

    // Deduplicate roles
    return [...new Set(roles)];
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a role mapper that always returns the same roles
 *
 * @param roles - Static array of role names
 * @returns Role mapper that always returns the same roles
 *
 * @remarks
 * Useful for testing or for providers that don't have dynamic roles.
 *
 * @example
 * ```typescript
 * const staticMapper = staticRoles(['admin', 'user']);
 *
 * const roles = staticMapper({ sub: 'user-123' });
 * // Returns: ['admin', 'user'] (always)
 * ```
 */
export function staticRoles(roles: string[]): RoleMapper {
  const staticRoleSet = [...new Set(roles)]; // Deduplicate once
  return () => staticRoleSet;
}

/**
 * Create a role mapper that returns no roles
 *
 * @returns Role mapper that always returns an empty array
 *
 * @remarks
 * Useful for disabling role-based access or for testing.
 *
 * @example
 * ```typescript
 * const noRoles = emptyRoles();
 *
 * const roles = noRoles({ groups: ['admin', 'editor'] });
 * // Returns: [] (always)
 * ```
 */
export function emptyRoles(): RoleMapper {
  return () => [];
}

/**
 * Create a conditional role mapper
 *
 * @param condition - Function to test if mapper should be applied
 * @param trueMapper - Mapper to use if condition is true
 * @param falseMapper - Mapper to use if condition is false
 * @returns Conditional role mapper
 *
 * @remarks
 * Allows different role mapping strategies based on claims or other conditions.
 *
 * @example
 * ```typescript
 * const conditionalMapper = conditionalRoles(
 *   (claims) => claims.tenant === 'internal',
 *   defaultEntraRoleMapper,  // Use for internal users
 *   emptyRoles()              // No roles for external users
 * );
 * ```
 */
export function conditionalRoles(
  condition: (claims: Record<string, any>) => boolean,
  trueMapper: RoleMapper,
  falseMapper: RoleMapper
): RoleMapper {
  return (claims: Record<string, any>) => {
    try {
      const useTrue = condition(claims);
      return useTrue ? trueMapper(claims) : falseMapper(claims);
    } catch (error) {
      console.warn('Conditional role mapper error:', error);
      return falseMapper(claims); // Default to false mapper on error
    }
  };
}
