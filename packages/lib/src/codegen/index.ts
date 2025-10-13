/**
 * ARM Schema Code Generation Tools.
 *
 * @packageDocumentation
 */

export * from './types';
export * from './schema-parser';
export * from './type-generator';
export * from './validation-generator';

// ============================================================================
// ATAKORA SCHEMA CODE GENERATORS
// ============================================================================

export {
  TypesGenerator,
  generateTypes,
  generateManyTypes,
} from './types-generator';

export type {
  TypeGeneratorOptions,
  GeneratedCode,
} from './types-generator';

export {
  SDKGenerator,
  generateSDK,
  generateManySDK,
} from './sdk-generator';

export type {
  SDKGeneratorOptions,
  GeneratedSDK,
} from './sdk-generator';

export {
  HooksGenerator,
  generateHooks,
  generateManyHooks,
} from './hooks-generator';

export type {
  HooksGeneratorOptions,
  GeneratedHooks,
} from './hooks-generator';
