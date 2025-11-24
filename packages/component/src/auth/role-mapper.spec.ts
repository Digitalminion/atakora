/**
 * Tests for Role Mapping Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  defaultEntraRoleMapper,
  defaultApiKeyRoleMapper,
  combineRoleMappers,
  filterRoles,
  createFilteredMapper,
  transformRoles,
  createTransformedMapper,
  mapGroupsToRoles,
  mapGroupsToRolesWithFallback,
  staticRoles,
  emptyRoles,
  conditionalRoles,
} from './role-mapper';
import type { ApiKey, RoleMapper } from './types';

// ============================================================================
// defaultEntraRoleMapper() Tests
// ============================================================================

describe('defaultEntraRoleMapper', () => {
  describe('string array format', () => {
    it('should extract roles from string array', () => {
      const claims = {
        sub: 'user-123',
        groups: ['admin', 'editor', 'viewer'],
      };

      const roles = defaultEntraRoleMapper(claims);
      expect(roles).toEqual(['admin', 'editor', 'viewer']);
    });

    it('should handle empty array', () => {
      const claims = { groups: [] };
      const roles = defaultEntraRoleMapper(claims);
      expect(roles).toEqual([]);
    });

    it('should filter out empty strings', () => {
      const claims = { groups: ['admin', '', '  ', 'editor'] };
      const roles = defaultEntraRoleMapper(claims);
      expect(roles).toEqual(['admin', 'editor']);
    });

    it('should deduplicate roles', () => {
      const claims = { groups: ['admin', 'editor', 'admin', 'editor'] };
      const roles = defaultEntraRoleMapper(claims);
      expect(roles).toEqual(['admin', 'editor']);
    });
  });

  describe('object array format', () => {
    it('should extract from displayName property', () => {
      const claims = {
        groups: [{ displayName: 'Administrators' }, { displayName: 'Editors' }],
      };

      const roles = defaultEntraRoleMapper(claims);
      expect(roles).toEqual(['Administrators', 'Editors']);
    });

    it('should extract from name property', () => {
      const claims = {
        groups: [{ name: 'admin' }, { name: 'editor' }],
      };

      const roles = defaultEntraRoleMapper(claims);
      expect(roles).toEqual(['admin', 'editor']);
    });

    it('should prefer displayName over name', () => {
      const claims = {
        groups: [
          { name: 'admin', displayName: 'Administrators' },
          { name: 'editor', displayName: 'Editors' },
        ],
      };

      const roles = defaultEntraRoleMapper(claims);
      expect(roles).toEqual(['Administrators', 'Editors']);
    });

    it('should handle mixed object formats', () => {
      const claims = {
        groups: [
          { displayName: 'Admin' },
          { name: 'editor' },
          { name: 'viewer', displayName: 'Viewers' },
        ],
      };

      const roles = defaultEntraRoleMapper(claims);
      expect(roles).toEqual(['Admin', 'editor', 'Viewers']);
    });

    it('should filter out objects without name or displayName', () => {
      const claims = {
        groups: [{ displayName: 'Admin' }, { id: '123' }, { other: 'field' }],
      };

      const roles = defaultEntraRoleMapper(claims);
      expect(roles).toEqual(['Admin']);
    });
  });

  describe('mixed format', () => {
    it('should handle mix of strings and objects', () => {
      const claims = {
        groups: ['admin', { displayName: 'Editors' }, 'viewer', { name: 'analyst' }],
      };

      const roles = defaultEntraRoleMapper(claims);
      expect(roles).toEqual(['admin', 'Editors', 'viewer', 'analyst']);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for missing groups claim', () => {
      const roles = defaultEntraRoleMapper({});
      expect(roles).toEqual([]);
    });

    it('should return empty array for null groups', () => {
      const claims = { groups: null };
      const roles = defaultEntraRoleMapper(claims);
      expect(roles).toEqual([]);
    });

    it('should return empty array for undefined groups', () => {
      const claims = { groups: undefined };
      const roles = defaultEntraRoleMapper(claims);
      expect(roles).toEqual([]);
    });

    it('should return empty array for non-array groups', () => {
      const claims = { groups: 'not-an-array' };
      const roles = defaultEntraRoleMapper(claims);
      expect(roles).toEqual([]);
    });

    it('should ignore non-string, non-object items', () => {
      const claims = {
        groups: ['admin', 123, null, undefined, { displayName: 'Editor' }],
      };

      const roles = defaultEntraRoleMapper(claims);
      expect(roles).toEqual(['admin', 'Editor']);
    });
  });
});

// ============================================================================
// defaultApiKeyRoleMapper() Tests
// ============================================================================

describe('defaultApiKeyRoleMapper', () => {
  it('should return roles from API key', () => {
    const key: ApiKey = {
      id: 'key-1',
      secret: 'secret',
      roles: ['service', 'monitoring'],
    };

    const roles = defaultApiKeyRoleMapper(key);
    expect(roles).toEqual(['service', 'monitoring']);
  });

  it('should return empty array for missing roles', () => {
    const key = {
      id: 'key-1',
      secret: 'secret',
    } as ApiKey;

    const roles = defaultApiKeyRoleMapper(key);
    expect(roles).toEqual([]);
  });

  it('should return empty array for null roles', () => {
    const key = {
      id: 'key-1',
      secret: 'secret',
      roles: null as any,
    };

    const roles = defaultApiKeyRoleMapper(key);
    expect(roles).toEqual([]);
  });

  it('should return empty array for undefined roles', () => {
    const key = {
      id: 'key-1',
      secret: 'secret',
      roles: undefined as any,
    };

    const roles = defaultApiKeyRoleMapper(key);
    expect(roles).toEqual([]);
  });

  it('should handle empty roles array', () => {
    const key: ApiKey = {
      id: 'key-1',
      secret: 'secret',
      roles: [],
    };

    const roles = defaultApiKeyRoleMapper(key);
    expect(roles).toEqual([]);
  });
});

// ============================================================================
// combineRoleMappers() Tests
// ============================================================================

describe('combineRoleMappers', () => {
  it('should combine roles from multiple mappers', () => {
    const mapper1: RoleMapper = () => ['role1', 'role2'];
    const mapper2: RoleMapper = () => ['role3', 'role4'];
    const mapper3: RoleMapper = () => ['role5'];

    const combined = combineRoleMappers(mapper1, mapper2, mapper3);
    const roles = combined({});

    expect(roles).toEqual(['role1', 'role2', 'role3', 'role4', 'role5']);
  });

  it('should deduplicate roles across mappers', () => {
    const mapper1: RoleMapper = () => ['admin', 'editor'];
    const mapper2: RoleMapper = () => ['editor', 'viewer'];
    const mapper3: RoleMapper = () => ['admin', 'viewer'];

    const combined = combineRoleMappers(mapper1, mapper2, mapper3);
    const roles = combined({});

    expect(roles).toEqual(['admin', 'editor', 'viewer']);
  });

  it('should handle empty mappers', () => {
    const mapper1: RoleMapper = () => [];
    const mapper2: RoleMapper = () => [];

    const combined = combineRoleMappers(mapper1, mapper2);
    const roles = combined({});

    expect(roles).toEqual([]);
  });

  it('should handle single mapper', () => {
    const mapper: RoleMapper = () => ['admin'];

    const combined = combineRoleMappers(mapper);
    const roles = combined({});

    expect(roles).toEqual(['admin']);
  });

  it('should handle mapper errors gracefully', () => {
    const mapper1: RoleMapper = () => ['role1'];
    const mapper2: RoleMapper = () => {
      throw new Error('Mapper error');
    };
    const mapper3: RoleMapper = () => ['role3'];

    const combined = combineRoleMappers(mapper1, mapper2, mapper3);
    const roles = combined({});

    // Should skip erroring mapper and continue
    expect(roles).toEqual(['role1', 'role3']);
  });

  it('should pass claims to all mappers', () => {
    const claims = { userId: 'user-123', tenant: 'tenant-1' };
    const mapper1: RoleMapper = (c) => (c.userId === 'user-123' ? ['role1'] : []);
    const mapper2: RoleMapper = (c) => (c.tenant === 'tenant-1' ? ['role2'] : []);

    const combined = combineRoleMappers(mapper1, mapper2);
    const roles = combined(claims);

    expect(roles).toEqual(['role1', 'role2']);
  });
});

// ============================================================================
// filterRoles() Tests
// ============================================================================

describe('filterRoles', () => {
  it('should filter roles to whitelist', () => {
    const filterMapper = filterRoles(['admin', 'editor', 'viewer']);
    const claims = {
      groups: ['admin', 'editor', 'finance', 'hr'],
    };

    const roles = filterMapper(claims);
    expect(roles).toEqual(['admin', 'editor']);
  });

  it('should return empty array when no roles match', () => {
    const filterMapper = filterRoles(['admin', 'editor']);
    const claims = { groups: ['finance', 'hr'] };

    const roles = filterMapper(claims);
    expect(roles).toEqual([]);
  });

  it('should return all roles if all match', () => {
    const filterMapper = filterRoles(['admin', 'editor', 'viewer']);
    const claims = { groups: ['admin', 'editor'] };

    const roles = filterMapper(claims);
    expect(roles).toEqual(['admin', 'editor']);
  });

  it('should handle empty whitelist', () => {
    const filterMapper = filterRoles([]);
    const claims = { groups: ['admin', 'editor'] };

    const roles = filterMapper(claims);
    expect(roles).toEqual([]);
  });
});

// ============================================================================
// createFilteredMapper() Tests
// ============================================================================

describe('createFilteredMapper', () => {
  it('should filter using custom logic', () => {
    const baseMapper: RoleMapper = () => ['app_admin', 'azure_group', 'app_user'];
    const filtered = createFilteredMapper(baseMapper, (role) => role.startsWith('app_'));

    const roles = filtered({});
    expect(roles).toEqual(['app_admin', 'app_user']);
  });

  it('should handle complex filtering', () => {
    const baseMapper: RoleMapper = () => ['ADMIN', 'editor', 'VIEWER', 'analyst'];
    const filtered = createFilteredMapper(baseMapper, (role) => role === role.toUpperCase());

    const roles = filtered({});
    expect(roles).toEqual(['ADMIN', 'VIEWER']);
  });
});

// ============================================================================
// transformRoles() Tests
// ============================================================================

describe('transformRoles', () => {
  it('should transform roles to lowercase', () => {
    const transformer = transformRoles((role) => role.toLowerCase());
    const claims = { groups: ['ADMIN', 'Editor', 'VIEWER'] };

    const roles = transformer(claims);
    expect(roles).toEqual(['admin', 'editor', 'viewer']);
  });

  it('should add prefix to roles', () => {
    const transformer = transformRoles((role) => `app_${role}`);
    const claims = { groups: ['admin', 'editor'] };

    const roles = transformer(claims);
    expect(roles).toEqual(['app_admin', 'app_editor']);
  });

  it('should remove prefix from roles', () => {
    const transformer = transformRoles((role) =>
      role.startsWith('azure_') ? role.substring(6) : role
    );
    const claims = { groups: ['azure_admin', 'editor', 'azure_viewer'] };

    const roles = transformer(claims);
    expect(roles).toEqual(['admin', 'editor', 'viewer']);
  });

  it('should deduplicate after transformation', () => {
    const transformer = transformRoles((role) => role.toLowerCase());
    const claims = { groups: ['ADMIN', 'admin', 'Admin'] };

    const roles = transformer(claims);
    expect(roles).toEqual(['admin']);
  });

  it('should handle transformation errors', () => {
    const transformer = transformRoles((role) => {
      if (role === 'bad') throw new Error('Bad role');
      return role.toUpperCase();
    });
    const claims = { groups: ['admin', 'bad', 'editor'] };

    const roles = transformer(claims);
    // Bad role should be preserved (error handling)
    expect(roles).toEqual(['ADMIN', 'bad', 'EDITOR']);
  });
});

// ============================================================================
// createTransformedMapper() Tests
// ============================================================================

describe('createTransformedMapper', () => {
  it('should transform with custom base mapper', () => {
    const baseMapper: RoleMapper = () => ['admin', 'editor', 'viewer'];
    const transformed = createTransformedMapper(baseMapper, (role) => role.toUpperCase());

    const roles = transformed({});
    expect(roles).toEqual(['ADMIN', 'EDITOR', 'VIEWER']);
  });
});

// ============================================================================
// mapGroupsToRoles() Tests
// ============================================================================

describe('mapGroupsToRoles', () => {
  it('should map group IDs to role names', () => {
    const mapper = mapGroupsToRoles({
      'group-123': 'admin',
      'group-456': 'editor',
      'group-789': 'viewer',
    });

    const claims = {
      groups: ['group-123', 'group-456'],
    };

    const roles = mapper(claims);
    expect(roles).toEqual(['admin', 'editor']);
  });

  it('should ignore unmapped groups', () => {
    const mapper = mapGroupsToRoles({
      'group-123': 'admin',
    });

    const claims = {
      groups: ['group-123', 'group-456', 'group-789'],
    };

    const roles = mapper(claims);
    expect(roles).toEqual(['admin']);
  });

  it('should handle object groups with id property', () => {
    const mapper = mapGroupsToRoles({
      'group-123': 'admin',
      'group-456': 'editor',
    });

    const claims = {
      groups: [{ id: 'group-123' }, { id: 'group-456' }],
    };

    const roles = mapper(claims);
    expect(roles).toEqual(['admin', 'editor']);
  });

  it('should handle mix of string and object groups', () => {
    const mapper = mapGroupsToRoles({
      'group-123': 'admin',
      'group-456': 'editor',
    });

    const claims = {
      groups: ['group-123', { id: 'group-456' }],
    };

    const roles = mapper(claims);
    expect(roles).toEqual(['admin', 'editor']);
  });

  it('should deduplicate mapped roles', () => {
    const mapper = mapGroupsToRoles({
      'group-123': 'admin',
      'group-456': 'admin', // Same role for different group
    });

    const claims = {
      groups: ['group-123', 'group-456'],
    };

    const roles = mapper(claims);
    expect(roles).toEqual(['admin']);
  });

  it('should return empty array for missing groups claim', () => {
    const mapper = mapGroupsToRoles({
      'group-123': 'admin',
    });

    const roles = mapper({});
    expect(roles).toEqual([]);
  });

  it('should return empty array for non-array groups', () => {
    const mapper = mapGroupsToRoles({
      'group-123': 'admin',
    });

    const roles = mapper({ groups: 'not-an-array' });
    expect(roles).toEqual([]);
  });
});

// ============================================================================
// mapGroupsToRolesWithFallback() Tests
// ============================================================================

describe('mapGroupsToRolesWithFallback', () => {
  it('should map known groups and fallback for unknown', () => {
    const mapper = mapGroupsToRolesWithFallback({
      'group-123': 'admin',
    });

    const claims = {
      groups: [
        'group-123', // Mapped to 'admin'
        { id: 'group-456', displayName: 'Editors' }, // Falls back to 'Editors'
      ],
    };

    const roles = mapper(claims);
    expect(roles).toEqual(['admin', 'Editors']);
  });

  it('should use string groups as-is when not in map', () => {
    const mapper = mapGroupsToRolesWithFallback({
      'admin-id': 'administrator',
    });

    const claims = {
      groups: ['admin-id', 'editor', 'viewer'],
    };

    const roles = mapper(claims);
    expect(roles).toEqual(['administrator', 'editor', 'viewer']);
  });

  it('should prefer displayName over name for fallback', () => {
    const mapper = mapGroupsToRolesWithFallback({});

    const claims = {
      groups: [{ id: 'group-123', name: 'admin', displayName: 'Administrators' }],
    };

    const roles = mapper(claims);
    expect(roles).toEqual(['Administrators']);
  });

  it('should handle empty map (all fallback)', () => {
    const mapper = mapGroupsToRolesWithFallback({});

    const claims = {
      groups: ['admin', 'editor', { id: 'group-789', displayName: 'Viewers' }],
    };

    const roles = mapper(claims);
    expect(roles).toEqual(['admin', 'editor', 'Viewers']);
  });
});

// ============================================================================
// staticRoles() Tests
// ============================================================================

describe('staticRoles', () => {
  it('should return static roles regardless of claims', () => {
    const mapper = staticRoles(['admin', 'user']);

    expect(mapper({})).toEqual(['admin', 'user']);
    expect(mapper({ groups: ['other'] })).toEqual(['admin', 'user']);
    expect(mapper({ anyField: 'anyValue' })).toEqual(['admin', 'user']);
  });

  it('should deduplicate static roles', () => {
    const mapper = staticRoles(['admin', 'user', 'admin']);

    expect(mapper({})).toEqual(['admin', 'user']);
  });

  it('should handle empty roles array', () => {
    const mapper = staticRoles([]);

    expect(mapper({})).toEqual([]);
  });
});

// ============================================================================
// emptyRoles() Tests
// ============================================================================

describe('emptyRoles', () => {
  it('should always return empty array', () => {
    const mapper = emptyRoles();

    expect(mapper({})).toEqual([]);
    expect(mapper({ groups: ['admin'] })).toEqual([]);
    expect(mapper({ anyField: 'anyValue' })).toEqual([]);
  });
});

// ============================================================================
// conditionalRoles() Tests
// ============================================================================

describe('conditionalRoles', () => {
  it('should use true mapper when condition is true', () => {
    const mapper = conditionalRoles(
      (claims) => claims.tenant === 'internal',
      defaultEntraRoleMapper,
      emptyRoles()
    );

    const claims = {
      tenant: 'internal',
      groups: ['admin', 'editor'],
    };

    const roles = mapper(claims);
    expect(roles).toEqual(['admin', 'editor']);
  });

  it('should use false mapper when condition is false', () => {
    const mapper = conditionalRoles(
      (claims) => claims.tenant === 'internal',
      defaultEntraRoleMapper,
      emptyRoles()
    );

    const claims = {
      tenant: 'external',
      groups: ['admin', 'editor'],
    };

    const roles = mapper(claims);
    expect(roles).toEqual([]);
  });

  it('should handle condition errors', () => {
    const mapper = conditionalRoles(
      () => {
        throw new Error('Condition error');
      },
      defaultEntraRoleMapper,
      emptyRoles()
    );

    const claims = { groups: ['admin'] };

    // Should use false mapper on error
    const roles = mapper(claims);
    expect(roles).toEqual([]);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration: Complex role mapping scenarios', () => {
  it('should combine filtering and transformation', () => {
    const baseMapper = defaultEntraRoleMapper;
    const filtered = createFilteredMapper(baseMapper, (role) => role.startsWith('app_'));
    const transformed = createTransformedMapper(filtered, (role) => role.toUpperCase());

    const claims = {
      groups: ['app_admin', 'azure_group', 'app_user', 'other'],
    };

    const roles = transformed(claims);
    expect(roles).toEqual(['APP_ADMIN', 'APP_USER']);
  });

  it('should map groups then transform', () => {
    const groupMapper = mapGroupsToRoles({
      'group-123': 'admin',
      'group-456': 'editor',
    });
    const transformed = createTransformedMapper(groupMapper, (role) => `role_${role}`);

    const claims = {
      groups: ['group-123', 'group-456'],
    };

    const roles = transformed(claims);
    expect(roles).toEqual(['role_admin', 'role_editor']);
  });

  it('should combine multiple strategies', () => {
    const entraMapper = defaultEntraRoleMapper;
    const staticMapper = staticRoles(['system']);
    const combined = combineRoleMappers(entraMapper, staticMapper);

    const claims = {
      groups: ['admin', 'editor'],
    };

    const roles = combined(claims);
    expect(roles).toEqual(['admin', 'editor', 'system']);
  });

  it('should apply conditional logic with transformation', () => {
    const internalMapper = transformRoles((role) => `internal_${role}`);
    const externalMapper = transformRoles((role) => `external_${role}`);
    const conditional = conditionalRoles(
      (claims) => claims.tenant === 'internal',
      internalMapper,
      externalMapper
    );

    const internalClaims = {
      tenant: 'internal',
      groups: ['admin'],
    };
    const externalClaims = {
      tenant: 'external',
      groups: ['viewer'],
    };

    expect(conditional(internalClaims)).toEqual(['internal_admin']);
    expect(conditional(externalClaims)).toEqual(['external_viewer']);
  });
});
