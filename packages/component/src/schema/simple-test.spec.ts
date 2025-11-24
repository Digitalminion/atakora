/**
 * Simple test to diagnose import issues
 */

import { describe, it, expect } from 'vitest';
import { a } from './field-types';
import { StringFieldBuilder } from './field-types/string';

describe('Import Test', () => {
  it('should import a namespace', () => {
    expect(a).toBeDefined();
    expect(typeof a.string).toBe('function');
  });

  it('should create string builder', () => {
    const builder = a.string();
    expect(builder).toBeDefined();
    expect(builder).toBeInstanceOf(StringFieldBuilder);
  });

  it('should have required method', () => {
    const builder = a.string();
    expect(typeof builder.required).toBe('function');
  });

  it('should have optional method', () => {
    const builder = a.string();
    expect(typeof builder.optional).toBe('function');
  });

  it('should chain required', () => {
    const builder = a.string();
    const result = builder.required();
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(StringFieldBuilder);
    expect(typeof result.optional).toBe('function');
  });

  it('should use last call wins for conflicting modifiers', () => {
    const builder = a.string();
    const withRequired = builder.required();
    const withOptional = withRequired.optional();

    const config = withOptional._build();
    expect(config.required).toBe(false);
    expect(config.isOptional).toBe(true);
  });
});
