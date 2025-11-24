/**
 * Test namespace imports
 */

import { describe, it, expect } from 'vitest';
import { a } from './field-types';
import { StringFieldBuilder } from './field-types/string';

describe('Namespace Test', () => {
  it('should check a.string() return type', () => {
    const fromNamespace = a.string();
    const direct = new StringFieldBuilder();

    console.log('From namespace constructor:', fromNamespace.constructor.name);
    console.log('Direct constructor:', direct.constructor.name);

    console.log('From namespace proto:', Object.getPrototypeOf(fromNamespace).constructor.name);
    console.log('Direct proto:', Object.getPrototypeOf(direct).constructor.name);

    // Check if they are the same class
    console.log('Same class?:', fromNamespace.constructor === direct.constructor);
    console.log(
      'Same prototype?:',
      Object.getPrototypeOf(fromNamespace) === Object.getPrototypeOf(direct)
    );

    // Check methods
    console.log('Namespace has required:', 'required' in fromNamespace);
    console.log('Direct has required:', 'required' in direct);

    // Check BaseFieldBuilder in the chain
    const nsProto2 = Object.getPrototypeOf(Object.getPrototypeOf(fromNamespace));
    const dirProto2 = Object.getPrototypeOf(Object.getPrototypeOf(direct));

    console.log('Namespace base proto:', nsProto2.constructor.name);
    console.log('Direct base proto:', dirProto2.constructor.name);
    console.log('Same base proto?:', nsProto2 === dirProto2);

    // List all properties
    console.log('Namespace object keys:', Object.keys(fromNamespace));
    console.log(
      'Namespace proto keys:',
      Object.getOwnPropertyNames(Object.getPrototypeOf(fromNamespace))
    );
    console.log('Direct object keys:', Object.keys(direct));
    console.log('Direct proto keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(direct)));
  });
});
