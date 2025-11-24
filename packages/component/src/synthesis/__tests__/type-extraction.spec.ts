/**
 * Tests for Model Type Extractors
 *
 * @remarks
 * Validates type extraction utilities for generating TypeScript types
 * from schema model definitions.
 */

import { describe, it, expect } from 'vitest';
import {
  getTypeScriptType,
  generateInterface,
  generateCreateInputType,
  generateUpdateInputType,
  generateModelTypes,
  getPartitionKeyField,
  getRequiredFields,
  getOptionalFields,
  getFieldNames,
  getReadOnlyFields,
  getComputedFields,
  type FieldInfo,
} from '../type-extraction';
import type { ModelInfo } from '../types';

describe('Type Extraction Utilities', () => {
  describe('getTypeScriptType', () => {
    it('should map string types correctly', () => {
      expect(getTypeScriptType('string')).toBe('string');
      expect(getTypeScriptType('email')).toBe('string');
      expect(getTypeScriptType('url')).toBe('string');
      expect(getTypeScriptType('uuid')).toBe('string');
    });

    it('should map number types correctly', () => {
      expect(getTypeScriptType('number')).toBe('number');
      expect(getTypeScriptType('integer')).toBe('number');
    });

    it('should map boolean type correctly', () => {
      expect(getTypeScriptType('boolean')).toBe('boolean');
    });

    it('should map date types to strings', () => {
      expect(getTypeScriptType('date')).toBe('string');
      expect(getTypeScriptType('datetime')).toBe('string');
    });

    it('should map special types correctly', () => {
      expect(getTypeScriptType('id')).toBe('string');
      expect(getTypeScriptType('ref')).toBe('string');
      expect(getTypeScriptType('binary')).toBe('Buffer');
      expect(getTypeScriptType('json')).toBe('any');
    });

    it('should map complex types with defaults', () => {
      expect(getTypeScriptType('array')).toBe('any[]');
      expect(getTypeScriptType('object')).toBe('Record<string, any>');
      expect(getTypeScriptType('enum')).toBe('string');
    });

    it('should default to any for unknown types', () => {
      expect(getTypeScriptType('unknown')).toBe('any');
    });
  });

  describe('generateInterface', () => {
    it('should generate basic interface', () => {
      const model: ModelInfo = {
        name: 'User',
        type: 'crud',
        definition: {
          fields: [
            { name: 'id', type: 'id', required: true },
            { name: 'email', type: 'email', required: true },
            { name: 'name', type: 'string', required: true },
          ],
        },
      };

      const result = generateInterface(model);
      expect(result).toContain('export interface User {');
      expect(result).toContain('id: string;');
      expect(result).toContain('email: string;');
      expect(result).toContain('name: string;');
      expect(result).toContain('}');
    });

    it('should mark optional fields with ?', () => {
      const model: ModelInfo = {
        name: 'User',
        type: 'crud',
        definition: {
          fields: [
            { name: 'id', type: 'id', required: true },
            { name: 'bio', type: 'string', required: false },
          ],
        },
      };

      const result = generateInterface(model);
      expect(result).toContain('id: string;');
      expect(result).toContain('bio?: string;');
    });

    it('should handle all field types', () => {
      const model: ModelInfo = {
        name: 'TestModel',
        type: 'crud',
        definition: {
          fields: [
            { name: 'stringField', type: 'string', required: true },
            { name: 'numberField', type: 'number', required: true },
            { name: 'booleanField', type: 'boolean', required: true },
            { name: 'dateField', type: 'datetime', required: true },
            { name: 'arrayField', type: 'array', required: true },
            { name: 'objectField', type: 'object', required: true },
          ],
        },
      };

      const result = generateInterface(model);
      expect(result).toContain('stringField: string;');
      expect(result).toContain('numberField: number;');
      expect(result).toContain('booleanField: boolean;');
      expect(result).toContain('dateField: string;');
      expect(result).toContain('arrayField: any[];');
      expect(result).toContain('objectField: Record<string, any>;');
    });
  });

  describe('generateCreateInputType', () => {
    it('should exclude system fields', () => {
      const model: ModelInfo = {
        name: 'User',
        type: 'crud',
        definition: {
          fields: [
            { name: 'id', type: 'id', required: true },
            { name: 'email', type: 'email', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'createdAt', type: 'datetime', required: true },
            { name: 'updatedAt', type: 'datetime', required: true },
          ],
        },
      };

      const result = generateCreateInputType(model);
      expect(result).toContain('export interface CreateUserInput {');
      expect(result).not.toContain('id:');
      expect(result).not.toContain('createdAt:');
      expect(result).not.toContain('updatedAt:');
      expect(result).toContain('email: string;');
      expect(result).toContain('name: string;');
    });

    it('should preserve required/optional status', () => {
      const model: ModelInfo = {
        name: 'User',
        type: 'crud',
        definition: {
          fields: [
            { name: 'id', type: 'id', required: true },
            { name: 'email', type: 'email', required: true },
            { name: 'bio', type: 'string', required: false },
          ],
        },
      };

      const result = generateCreateInputType(model);
      expect(result).toContain('email: string;');
      expect(result).toContain('bio?: string;');
    });
  });

  describe('generateUpdateInputType', () => {
    it('should require id and make all other fields optional', () => {
      const model: ModelInfo = {
        name: 'User',
        type: 'crud',
        definition: {
          fields: [
            { name: 'id', type: 'id', required: true },
            { name: 'email', type: 'email', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'createdAt', type: 'datetime', required: true },
            { name: 'updatedAt', type: 'datetime', required: true },
          ],
        },
      };

      const result = generateUpdateInputType(model);
      expect(result).toContain('export interface UpdateUserInput {');
      expect(result).toContain('id: string; // Required for updates');
      expect(result).toContain('email?: string;');
      expect(result).toContain('name?: string;');
      expect(result).not.toContain('createdAt?:');
      expect(result).not.toContain('updatedAt?:');
    });
  });

  describe('generateModelTypes', () => {
    it('should generate all three types', () => {
      const model: ModelInfo = {
        name: 'User',
        type: 'crud',
        definition: {
          fields: [
            { name: 'id', type: 'id', required: true },
            { name: 'email', type: 'email', required: true },
          ],
        },
      };

      const result = generateModelTypes(model);
      expect(result.interface).toContain('export interface User {');
      expect(result.createInput).toContain('export interface CreateUserInput {');
      expect(result.updateInput).toContain('export interface UpdateUserInput {');
    });
  });

  describe('getPartitionKeyField', () => {
    it('should return id as default partition key', () => {
      const model: ModelInfo = {
        name: 'User',
        type: 'crud',
        definition: {
          fields: [
            { name: 'id', type: 'id', required: true },
            { name: 'email', type: 'email', required: true },
          ],
        },
      };

      expect(getPartitionKeyField(model)).toBe('id');
    });

    it('should detect explicit partition key', () => {
      const model: ModelInfo = {
        name: 'Order',
        type: 'crud',
        definition: {
          fields: [
            { name: 'id', type: 'id', required: true },
            { name: 'userId', type: 'ref', required: true, _partitionKey: true },
          ],
        },
      };

      expect(getPartitionKeyField(model)).toBe('userId');
    });
  });

  describe('getRequiredFields', () => {
    it('should extract required field names', () => {
      const model: ModelInfo = {
        name: 'User',
        type: 'crud',
        definition: {
          fields: [
            { name: 'id', type: 'id', required: true },
            { name: 'email', type: 'email', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'bio', type: 'string', required: false },
          ],
        },
      };

      const required = getRequiredFields(model);
      expect(required).toEqual(['id', 'email', 'name']);
    });
  });

  describe('getOptionalFields', () => {
    it('should extract optional field names', () => {
      const model: ModelInfo = {
        name: 'User',
        type: 'crud',
        definition: {
          fields: [
            { name: 'id', type: 'id', required: true },
            { name: 'email', type: 'email', required: true },
            { name: 'bio', type: 'string', required: false },
            { name: 'avatar', type: 'string', required: false },
          ],
        },
      };

      const optional = getOptionalFields(model);
      expect(optional).toEqual(['bio', 'avatar']);
    });
  });

  describe('getFieldNames', () => {
    it('should extract all field names', () => {
      const model: ModelInfo = {
        name: 'User',
        type: 'crud',
        definition: {
          fields: [
            { name: 'id', type: 'id', required: true },
            { name: 'email', type: 'email', required: true },
            { name: 'bio', type: 'string', required: false },
          ],
        },
      };

      const names = getFieldNames(model);
      expect(names).toEqual(['id', 'email', 'bio']);
    });
  });

  describe('getReadOnlyFields', () => {
    it('should extract read-only field names', () => {
      const model: ModelInfo = {
        name: 'User',
        type: 'crud',
        definition: {
          fields: [
            {
              name: 'id',
              type: 'id',
              required: true,
              definition: {
                type: 'id',
                required: true,
                nullable: false,
                validations: [],
                metadata: { readOnly: true },
              },
            },
            {
              name: 'email',
              type: 'email',
              required: true,
            },
            {
              name: 'createdAt',
              type: 'datetime',
              required: true,
              definition: {
                type: 'datetime',
                required: true,
                nullable: false,
                validations: [],
                metadata: { readOnly: true },
              },
            },
          ],
        },
      };

      const readOnly = getReadOnlyFields(model);
      expect(readOnly).toEqual(['id', 'createdAt']);
    });
  });

  describe('getComputedFields', () => {
    it('should extract computed field names', () => {
      const model: ModelInfo = {
        name: 'User',
        type: 'crud',
        definition: {
          fields: [
            { name: 'firstName', type: 'string', required: true },
            { name: 'lastName', type: 'string', required: true },
            {
              name: 'fullName',
              type: 'string',
              required: false,
              definition: {
                type: 'string',
                required: false,
                nullable: false,
                validations: [],
                metadata: { computed: true },
              },
            },
          ],
        },
      };

      const computed = getComputedFields(model);
      expect(computed).toEqual(['fullName']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty field list', () => {
      const model: ModelInfo = {
        name: 'Empty',
        type: 'crud',
        definition: {
          fields: [],
        },
      };

      expect(generateInterface(model)).toContain('export interface Empty {');
      expect(getFieldNames(model)).toEqual([]);
      expect(getRequiredFields(model)).toEqual([]);
    });

    it('should handle model definition as field map', () => {
      const model: ModelInfo = {
        name: 'User',
        type: 'crud',
        definition: {
          id: {
            type: 'id',
            required: true,
            nullable: false,
            validations: [],
          },
          email: {
            type: 'email',
            required: true,
            nullable: false,
            validations: [],
          },
        },
      };

      const names = getFieldNames(model);
      expect(names).toContain('id');
      expect(names).toContain('email');
    });
  });
});
