/**
 * Type Extraction Example
 *
 * @remarks
 * Demonstrates how to use the model type extractors for code generation.
 * These utilities are used by the synthesis orchestration layer to generate
 * TypeScript types for models, API endpoints, and function handlers.
 */

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
} from '../type-extraction';
import type { ModelInfo } from '../types';

// ============================================================================
// Example 1: Basic Type Extraction
// ============================================================================

console.log('=== Example 1: Basic Type Extraction ===\n');

// Get TypeScript types for field types
console.log('Field Type Mappings:');
console.log(`  string -> ${getTypeScriptType('string')}`);
console.log(`  number -> ${getTypeScriptType('number')}`);
console.log(`  boolean -> ${getTypeScriptType('boolean')}`);
console.log(`  datetime -> ${getTypeScriptType('datetime')}`);
console.log(`  array -> ${getTypeScriptType('array')}`);
console.log(`  ref -> ${getTypeScriptType('ref')}`);
console.log();

// ============================================================================
// Example 2: Generate Interface from Model
// ============================================================================

console.log('=== Example 2: Generate TypeScript Interface ===\n');

const userModel: ModelInfo = {
  name: 'User',
  type: 'crud',
  definition: {
    fields: [
      { name: 'id', type: 'id', required: true },
      { name: 'email', type: 'email', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'age', type: 'number', required: false },
      { name: 'bio', type: 'string', required: false },
      { name: 'isActive', type: 'boolean', required: true },
      { name: 'createdAt', type: 'datetime', required: true },
      { name: 'updatedAt', type: 'datetime', required: true },
    ],
  },
};

const userInterface = generateInterface(userModel);
console.log(userInterface);
console.log();

// ============================================================================
// Example 3: Generate Create Input Type
// ============================================================================

console.log('=== Example 3: Generate Create Input Type ===\n');

const createInput = generateCreateInputType(userModel);
console.log(createInput);
console.log();

// ============================================================================
// Example 4: Generate Update Input Type
// ============================================================================

console.log('=== Example 4: Generate Update Input Type ===\n');

const updateInput = generateUpdateInputType(userModel);
console.log(updateInput);
console.log();

// ============================================================================
// Example 5: Generate All Types at Once
// ============================================================================

console.log('=== Example 5: Generate All Types ===\n');

const allTypes = generateModelTypes(userModel);
console.log('Main Interface:');
console.log(allTypes.interface);
console.log('\nCreate Input:');
console.log(allTypes.createInput);
console.log('\nUpdate Input:');
console.log(allTypes.updateInput);
console.log();

// ============================================================================
// Example 6: Extract Model Metadata
// ============================================================================

console.log('=== Example 6: Extract Model Metadata ===\n');

console.log('All Fields:', getFieldNames(userModel));
console.log('Required Fields:', getRequiredFields(userModel));
console.log('Optional Fields:', getOptionalFields(userModel));
console.log('Partition Key:', getPartitionKeyField(userModel));
console.log();

// ============================================================================
// Example 7: Complex Model with Custom Partition Key
// ============================================================================

console.log('=== Example 7: Custom Partition Key ===\n');

const orderModel: ModelInfo = {
  name: 'Order',
  type: 'crud',
  definition: {
    fields: [
      { name: 'id', type: 'id', required: true },
      { name: 'userId', type: 'ref', required: true, _partitionKey: true },
      { name: 'items', type: 'array', required: true },
      { name: 'total', type: 'number', required: true },
      { name: 'status', type: 'enum', required: true },
      { name: 'createdAt', type: 'datetime', required: true },
    ],
  },
};

console.log('Partition Key:', getPartitionKeyField(orderModel));
console.log('Required Fields:', getRequiredFields(orderModel));
console.log();

const orderInterface = generateInterface(orderModel);
console.log(orderInterface);
console.log();

// ============================================================================
// Example 8: Model with Read-Only and Computed Fields
// ============================================================================

console.log('=== Example 8: Read-Only and Computed Fields ===\n');

const profileModel: ModelInfo = {
  name: 'Profile',
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
        name: 'firstName',
        type: 'string',
        required: true,
      },
      {
        name: 'lastName',
        type: 'string',
        required: true,
      },
      {
        name: 'fullName',
        type: 'string',
        required: false,
        definition: {
          type: 'string',
          required: false,
          nullable: false,
          validations: [],
          metadata: {
            computed: true,
            readOnly: true,
          },
        },
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

console.log('Read-Only Fields:', getReadOnlyFields(profileModel));
console.log('Computed Fields:', getComputedFields(profileModel));
console.log();

const profileCreateInput = generateCreateInputType(profileModel);
console.log('Create Input (excludes id, createdAt, and computed fields):');
console.log(profileCreateInput);
console.log();

// ============================================================================
// Example 9: Using Type Extraction in Code Generation
// ============================================================================

console.log('=== Example 9: Code Generation Workflow ===\n');

/**
 * Simulate generating a complete TypeScript file for a model
 */
function generateModelFile(model: ModelInfo): string {
  const types = generateModelTypes(model);

  return `
/**
 * Generated types for ${model.name} model
 *
 * @remarks
 * This file is auto-generated by the synthesis system.
 * Do not edit manually.
 */

// ============================================================================
// Main Model Interface
// ============================================================================

${types.interface}

// ============================================================================
// Create Input Type
// ============================================================================

${types.createInput}

// ============================================================================
// Update Input Type
// ============================================================================

${types.updateInput}

// ============================================================================
// Model Metadata
// ============================================================================

export const ${model.name}Metadata = {
  name: '${model.name}',
  type: '${model.type}',
  partitionKey: '${getPartitionKeyField(model)}',
  requiredFields: ${JSON.stringify(getRequiredFields(model))},
  optionalFields: ${JSON.stringify(getOptionalFields(model))},
  readOnlyFields: ${JSON.stringify(getReadOnlyFields(model))},
  computedFields: ${JSON.stringify(getComputedFields(model))},
} as const;
`.trim();
}

const userFile = generateModelFile(userModel);
console.log('Generated User Model File:');
console.log('─'.repeat(80));
console.log(userFile);
console.log('─'.repeat(80));
console.log();

// ============================================================================
// Example 10: Batch Type Generation
// ============================================================================

console.log('=== Example 10: Batch Type Generation ===\n');

const models: ModelInfo[] = [userModel, orderModel, profileModel];

console.log('Generating types for multiple models:');
for (const model of models) {
  const types = generateModelTypes(model);
  console.log(`\n${model.name}:`);
  console.log(`  - Interface: ${types.interface.split('\n').length} lines`);
  console.log(`  - Create Input: ${types.createInput.split('\n').length} lines`);
  console.log(`  - Update Input: ${types.updateInput.split('\n').length} lines`);
  console.log(`  - Partition Key: ${getPartitionKeyField(model)}`);
  console.log(`  - Required Fields: ${getRequiredFields(model).length}`);
  console.log(`  - Optional Fields: ${getOptionalFields(model).length}`);
}
console.log();

console.log('=== Type Extraction Examples Complete ===');
