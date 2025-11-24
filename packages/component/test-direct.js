// Direct test without TypeScript compilation
const { a } = require('./src/schema/field-types/index.ts');
const { c } = require('./src/schema/crud-model.ts');

// Test 1: Check if methods exist
console.log('StringFieldBuilder methods:');
const stringBuilder = a.string();
console.log('- required:', typeof stringBuilder.required);
console.log('- optional:', typeof stringBuilder.optional);
console.log('- readOnly:', typeof stringBuilder.readOnly);
console.log('- computed:', typeof stringBuilder.computed);

// Test 2: Field validation
try {
  const field = a.string().required()._build();
  console.log('\nBuilt required field:', field);
} catch (e) {
  console.log('\nError building required field:', e.message);
}

// Test 3: CRUD model validation
try {
  const model = c
    .model({
      id: a.id(),
      name: a.string(),
    })
    .partitionKey('nonExistent')
    ._build();
  console.log('\nModel built (should have failed)');
} catch (e) {
  console.log('\nCRUD validation error (expected):', e.message);
}
