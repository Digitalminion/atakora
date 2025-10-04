import { describe, it, expect } from 'vitest';
import * as lib from './index';

describe('@azure-arm-priv/lib', () => {
  it('should export naming module', () => {
    expect(lib).toHaveProperty('ResourceNameGenerator');
    expect(lib).toHaveProperty('DEFAULT_CONVENTIONS');
    expect(lib).toHaveProperty('validateResourceName');
  });

  it('should export core types', () => {
    expect(lib).toHaveProperty('NamingComponent');
  });

  it('should have ResourceNameGenerator constructor', () => {
    expect(lib.ResourceNameGenerator).toBeInstanceOf(Function);
  });
});
