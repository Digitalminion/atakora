/**
 * Debug test to understand import resolution
 */

import { describe, it, expect } from 'vitest';
import { StringFieldBuilder } from './field-types/string';
import { BaseFieldBuilder } from './field-types/base';

describe('Debug Import', () => {
  it('should check BaseFieldBuilder directly', () => {
    // Check if BaseFieldBuilder has the methods
    const baseMethods = Object.getOwnPropertyNames(BaseFieldBuilder.prototype);
    console.log('BaseFieldBuilder methods:', baseMethods);

    expect(baseMethods).toContain('required');
    expect(baseMethods).toContain('optional');
    expect(baseMethods).toContain('nullable');
  });

  it('should check StringFieldBuilder prototype chain', () => {
    const builder = new StringFieldBuilder();

    // Check prototype chain
    const proto1 = Object.getPrototypeOf(builder);
    const proto2 = Object.getPrototypeOf(proto1);

    console.log('Proto1 constructor:', proto1.constructor.name);
    console.log('Proto2 constructor:', proto2.constructor.name);

    console.log('Proto1 methods:', Object.getOwnPropertyNames(proto1));
    console.log('Proto2 methods:', Object.getOwnPropertyNames(proto2));

    // Check if methods exist
    console.log('Has required:', 'required' in builder);
    console.log('Has optional:', 'optional' in builder);
    console.log('typeof required:', typeof builder.required);
    console.log('typeof optional:', typeof builder.optional);
  });
});
