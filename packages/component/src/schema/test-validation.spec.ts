/**
 * Simple test to verify validation works
 */

import { describe, it, expect } from 'vitest';
import { a } from './field-types';
import { c } from './crud-model';

describe('Simple Validation Tests', () => {
  it('should build a string field', () => {
    const field = a.string()._build();
    expect(field.type).toBe('string');
  });

  it('should build a string field with required', () => {
    const field = a.string().required()._build();
    expect(field.isRequired).toBe(true);
  });

  it('should test if readOnly exists', () => {
    const builder = a.string();
    expect(typeof builder.readOnly).toBe('function');
  });

  it('should mark string field as readonly', () => {
    const field = a.string().readOnly()._build();
    expect(field.isReadOnly).toBe(true);
  });

  it('should use last call wins when field is required then optional', () => {
    const field = a.string().required().optional()._build();
    expect(field.required).toBe(false);
    expect(field.isOptional).toBe(true);
  });

  it('should validate partition key exists', () => {
    expect(() => {
      c.model({
        id: a.id(),
        name: a.string(),
      })
        .partitionKey('nonExistent')
        ._build();
    }).toThrow('Partition key field "nonExistent" does not exist');
  });

  it('should validate index fields exist', () => {
    expect(() => {
      c.model({
        id: a.id(),
        name: a.string(),
      })
        .indexes(['email'])
        ._build();
    }).toThrow('Index field "email" does not exist');
  });
});
