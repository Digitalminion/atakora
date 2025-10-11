# Testing Utilities Guide

**Navigation**: [Docs Home](../README.md) > [Guides](./README.md) > Testing Utilities

---

## Overview

Atakora provides comprehensive testing utilities for validating ARM templates, testing Azure Functions, and creating reliable infrastructure tests. The testing framework includes helpers for validation testing, ARM template assertions, deployment simulation, and function mocking.

## Testing Packages

### Import Path

```typescript
import {
  // Validation helpers
  expectValidationError,
  expectNoValidationError,
  createInvalidDelegationSubnet,

  // ARM matchers
  armTemplateMatchers,
  setupArmMatchers,

  // Deployment simulation
  DeploymentSimulator,

  // Function testing
  FunctionTestUtils,
  expectFunctionToThrow,

  // Mock bindings
  createMockBindings,
  MockBlobStorage
} from '@atakora/lib/testing';
```

## Validation Test Helpers

### Testing Validation Errors

Use validation helpers to ensure your constructs properly validate Azure constraints.

#### expectValidationError

Assert that a validation error occurs:

```typescript
import { expectValidationError, KnownValidationErrorCode } from '@atakora/lib/testing';

test('subnet delegation requires properties wrapper', () => {
  const stack = new Stack(app, 'TestStack');

  const vnet = new VirtualNetwork(stack, 'VNet', {
    addressSpace: '10.0.0.0/16',
    subnets: [
      {
        name: 'delegated',
        addressPrefix: '10.0.1.0/24',
        delegations: [{
          name: 'sqlDelegation',
          serviceName: 'Microsoft.Sql/managedInstances'  // Missing properties wrapper
        }]
      }
    ]
  });

  // Expect specific validation error
  expectValidationError(
    stack,
    KnownValidationErrorCode.INVALID_DELEGATION_STRUCTURE
  );
});
```

#### expectNoValidationError

Assert that validation passes:

```typescript
import { expectNoValidationError } from '@atakora/lib/testing';

test('valid subnet delegation structure', () => {
  const stack = new Stack(app, 'TestStack');

  const vnet = new VirtualNetwork(stack, 'VNet', {
    addressSpace: '10.0.0.0/16',
    subnets: [
      {
        name: 'delegated',
        addressPrefix: '10.0.1.0/24',
        delegations: [{
          name: 'sqlDelegation',
          properties: {
            serviceName: 'Microsoft.Sql/managedInstances'  // Correct structure
          }
        }]
      }
    ]
  });

  // Expect no validation errors
  expectNoValidationError(stack);
});
```

### Test Data Builders

Create test resources with known validation issues:

#### Invalid Delegation Subnet

```typescript
import { createInvalidDelegationSubnet } from '@atakora/lib/testing';

test('detects invalid delegation structure', () => {
  const invalidSubnet = createInvalidDelegationSubnet({
    name: 'test-subnet',
    addressPrefix: '10.0.1.0/24',
    delegationName: 'sqlDelegation',
    serviceName: 'Microsoft.Sql/managedInstances'
  });

  // This subnet will fail Azure deployment
  // serviceName is at wrong level (should be in properties)
  expect(invalidSubnet.properties.delegations[0].serviceName).toBeDefined();
  expect(invalidSubnet.properties.delegations[0].properties).toBeUndefined();
});
```

#### Valid Delegation Subnet

```typescript
import { createValidDelegationSubnet } from '@atakora/lib/testing';

test('creates valid delegation structure', () => {
  const validSubnet = createValidDelegationSubnet({
    name: 'test-subnet',
    addressPrefix: '10.0.1.0/24',
    delegationName: 'sqlDelegation',
    serviceName: 'Microsoft.Sql/managedInstances'
  });

  // This subnet will pass Azure deployment
  expect(validSubnet.properties.delegations[0].properties.serviceName)
    .toBe('Microsoft.Sql/managedInstances');
});
```

#### Misplaced Address Prefix

```typescript
import { createSubnetWithMisplacedAddressPrefix } from '@atakora/lib/testing';

test('detects misplaced addressPrefix', () => {
  const invalidSubnet = createSubnetWithMisplacedAddressPrefix({
    name: 'test-subnet',
    addressPrefix: '10.0.1.0/24'
  });

  // addressPrefix at root level instead of properties
  expect(invalidSubnet.addressPrefix).toBe('10.0.1.0/24');
  expect(invalidSubnet.properties.addressPrefix).toBeUndefined();
});
```

#### Invalid NSG Reference

```typescript
import { createLiteralNsgReference, createValidNsgReference } from '@atakora/lib/testing';

test('detects literal NSG reference', () => {
  const invalidNsg = createLiteralNsgReference({
    subnetName: 'test-subnet',
    nsgId: 'my-nsg-id'  // Literal string instead of ARM reference
  });

  // Will fail - NSG ID should be ARM resourceId() expression
  expect(typeof invalidNsg.properties.networkSecurityGroup.id).toBe('string');
  expect(invalidNsg.properties.networkSecurityGroup.id).not.toMatch(/\[resourceId\(/);
});

test('creates valid NSG reference', () => {
  const validNsg = createValidNsgReference({
    subnetName: 'test-subnet',
    nsgName: 'my-nsg'
  });

  // Correct ARM expression
  expect(validNsg.properties.networkSecurityGroup.id)
    .toMatch(/\[resourceId\('Microsoft.Network\/networkSecurityGroups'/);
});
```

#### Network-Locked Resources

```typescript
import {
  createNetworkLockedStorageAccount,
  createNetworkLockedOpenAIService
} from '@atakora/lib/testing';

test('storage with network rules requires service endpoint', () => {
  const lockedStorage = createNetworkLockedStorageAccount({
    name: 'teststorage',
    vnetRules: [{ subnetId: '/subscriptions/.../subnets/data' }]
  });

  // This will fail unless subnet has Microsoft.Storage service endpoint
  expect(lockedStorage.properties.networkAcls.virtualNetworkRules).toHaveLength(1);
});

test('openai with network rules requires private endpoint', () => {
  const lockedOpenAI = createNetworkLockedOpenAIService({
    name: 'testopenai',
    publicAccess: false
  });

  // This will fail unless private endpoint is configured
  expect(lockedOpenAI.properties.publicNetworkAccess).toBe('Disabled');
});
```

### Invalid Resource Builder

Build custom invalid resources for testing:

```typescript
import { InvalidResourceBuilder } from '@atakora/lib/testing';

test('custom invalid resource structure', () => {
  const builder = new InvalidResourceBuilder('Microsoft.Network/virtualNetworks');

  const invalidVnet = builder
    .withName('test-vnet')
    .withProperty('addressSpace', '10.0.0.0/16')  // Should be addressSpace.addressPrefixes
    .withMissingRequiredProperty('location')
    .build();

  // Test that validation catches the issues
  const errors = validateResource(invalidVnet);
  expect(errors).toContainEqual(expect.objectContaining({
    code: 'MISSING_REQUIRED_PROPERTY',
    path: 'location'
  }));
});
```

## ARM Template Matchers

Custom Jest matchers for ARM template assertions.

### Setup

```typescript
import { setupArmMatchers } from '@atakora/lib/testing';

// In your test setup file (e.g., jest.setup.ts)
setupArmMatchers();
```

### Available Matchers

#### toHaveResource

Assert that a template contains a specific resource:

```typescript
test('stack contains virtual network', () => {
  const stack = new Stack(app, 'TestStack');

  new VirtualNetwork(stack, 'VNet', {
    addressSpace: '10.0.0.0/16'
  });

  const template = Template.fromStack(stack);

  expect(template).toHaveResource('Microsoft.Network/virtualNetworks', {
    properties: {
      addressSpace: {
        addressPrefixes: ['10.0.0.0/16']
      }
    }
  });
});
```

#### toHaveResourceWithProperties

Assert resource has specific properties:

```typescript
test('storage account has correct SKU', () => {
  const stack = new Stack(app, 'TestStack');

  new StorageAccount(stack, 'Storage', {
    sku: 'Standard_LRS'
  });

  const template = Template.fromStack(stack);

  expect(template).toHaveResourceWithProperties(
    'Microsoft.Storage/storageAccounts',
    {
      sku: { name: 'Standard_LRS' }
    }
  );
});
```

#### toHaveOutput

Assert template has an output:

```typescript
test('stack exports storage connection string', () => {
  const stack = new Stack(app, 'TestStack');

  const storage = new StorageAccount(stack, 'Storage');

  new ArmOutput(stack, 'StorageConnectionString', {
    value: storage.connectionString
  });

  const template = Template.fromStack(stack);

  expect(template).toHaveOutput('StorageConnectionString');
});
```

#### toHaveParameter

Assert template has a parameter:

```typescript
test('stack has environment parameter', () => {
  const stack = new Stack(app, 'TestStack');

  const env = new ArmParameter(stack, 'Environment', {
    type: 'string',
    allowedValues: ['dev', 'prod']
  });

  const template = Template.fromStack(stack);

  expect(template).toHaveParameter('Environment', {
    type: 'string',
    allowedValues: ['dev', 'prod']
  });
});
```

#### toHaveResourceCount

Assert number of resources of a type:

```typescript
test('stack has 3 subnets', () => {
  const stack = new Stack(app, 'TestStack');

  const vnet = new VirtualNetwork(stack, 'VNet', {
    addressSpace: '10.0.0.0/16',
    subnets: [
      { name: 'subnet1', addressPrefix: '10.0.1.0/24' },
      { name: 'subnet2', addressPrefix: '10.0.2.0/24' },
      { name: 'subnet3', addressPrefix: '10.0.3.0/24' }
    ]
  });

  const template = Template.fromStack(stack);

  expect(template).toHaveResourceCount('Microsoft.Network/virtualNetworks/subnets', 3);
});
```

## Deployment Simulator

Simulate Azure deployment to catch issues before actual deployment.

### Basic Usage

```typescript
import { DeploymentSimulator } from '@atakora/lib/testing';

test('simulates successful deployment', async () => {
  const stack = new Stack(app, 'TestStack');

  new ResourceGroup(stack, 'RG', {
    location: 'eastus'
  });

  const simulator = new DeploymentSimulator();
  const result = await simulator.simulate(stack);

  expect(result.success).toBe(true);
  expect(result.errors).toHaveLength(0);
  expect(result.deployedResources).toHaveLength(1);
});
```

### Deployment Result

```typescript
interface DeploymentSimulationResult {
  success: boolean;
  errors: DeploymentError[];
  warnings: DeploymentWarning[];
  deployedResources: DeployedResource[];
  duration: number;
  state: ResourceState[];
}

test('checks deployment result', async () => {
  const result = await simulator.simulate(stack);

  if (!result.success) {
    console.error('Deployment failed:');
    result.errors.forEach(err => {
      console.error(`  - ${err.code}: ${err.message}`);
      console.error(`    Resource: ${err.resourceType} ${err.resourceName}`);
    });
  }

  expect(result.success).toBe(true);
});
```

### Dependency Validation

```typescript
test('validates resource dependencies', async () => {
  const stack = new Stack(app, 'TestStack');

  const vnet = new VirtualNetwork(stack, 'VNet', {
    addressSpace: '10.0.0.0/16'
  });

  const subnet = new Subnet(stack, 'Subnet', {
    addressPrefix: '10.0.1.0/24',
    virtualNetwork: vnet  // Dependency
  });

  const simulator = new DeploymentSimulator();
  const result = await simulator.simulate(stack);

  // Verify VNet deployed before Subnet
  const vnetIndex = result.deployedResources.findIndex(r => r.type === 'Microsoft.Network/virtualNetworks');
  const subnetIndex = result.deployedResources.findIndex(r => r.type === 'Microsoft.Network/virtualNetworks/subnets');

  expect(vnetIndex).toBeLessThan(subnetIndex);
});
```

### What-If Analysis

```typescript
test('performs what-if analysis', async () => {
  const stack = new Stack(app, 'TestStack');

  // ... create resources ...

  const simulator = new DeploymentSimulator({
    mode: 'whatif',
    existingResources: [
      // Simulate existing resources in Azure
      {
        type: 'Microsoft.Network/virtualNetworks',
        name: 'existing-vnet',
        properties: { addressSpace: { addressPrefixes: ['10.0.0.0/16'] } }
      }
    ]
  });

  const result = await simulator.simulate(stack);

  // Shows what would change
  expect(result.changes).toContainEqual({
    action: 'Create',
    resourceType: 'Microsoft.Storage/storageAccounts',
    resourceName: 'newstorage'
  });

  expect(result.changes).toContainEqual({
    action: 'Modify',
    resourceType: 'Microsoft.Network/virtualNetworks',
    resourceName: 'existing-vnet',
    diff: { /* property changes */ }
  });
});
```

## Function Testing

Utilities for testing Azure Functions.

### Function Test Utils

```typescript
import { FunctionTestUtils } from '@atakora/lib/testing';

describe('HTTP Function', () => {
  let testUtils: FunctionTestUtils;

  beforeEach(() => {
    testUtils = new FunctionTestUtils();
  });

  test('returns 200 for valid request', async () => {
    const context = testUtils.createContext();
    const request = testUtils.createHttpRequest({
      method: 'GET',
      query: { name: 'Alice' }
    });

    await myHttpFunction(context, request);

    expect(context.res).toMatchObject({
      status: 200,
      body: expect.objectContaining({
        message: 'Hello, Alice!'
      })
    });
  });
});
```

### Creating Test Contexts

```typescript
const context = testUtils.createContext({
  invocationId: 'test-123',
  executionContext: {
    functionName: 'MyFunction',
    functionDirectory: '/home/site/wwwroot/MyFunction'
  },
  bindings: {
    myInput: { /* input binding data */ }
  }
});

// Mock logging
context.log('Test message');
expect(context.log).toHaveBeenCalledWith('Test message');
```

### Creating HTTP Requests

```typescript
// GET request
const getRequest = testUtils.createHttpRequest({
  method: 'GET',
  url: 'https://example.com/api/users',
  query: { id: '123' },
  headers: { 'Authorization': 'Bearer token' }
});

// POST request with body
const postRequest = testUtils.createHttpRequest({
  method: 'POST',
  url: 'https://example.com/api/users',
  body: { name: 'Alice', email: 'alice@example.com' },
  headers: { 'Content-Type': 'application/json' }
});
```

### Testing Timer Functions

```typescript
test('timer function runs on schedule', async () => {
  const context = testUtils.createContext();
  const timer = testUtils.createTimerInfo({
    isPastDue: false,
    schedule: { adjustForDST: true }
  });

  await myTimerFunction(context, timer);

  expect(context.log).toHaveBeenCalledWith(
    expect.stringContaining('Timer executed')
  );
});

test('handles past due timer', async () => {
  const context = testUtils.createContext();
  const timer = testUtils.createTimerInfo({
    isPastDue: true
  });

  await myTimerFunction(context, timer);

  expect(context.log).toHaveBeenCalledWith(
    expect.stringContaining('Timer is running late')
  );
});
```

### Testing Queue Functions

```typescript
test('processes queue message', async () => {
  const context = testUtils.createContext();
  const message = {
    orderId: '12345',
    items: [{ id: 'item1', quantity: 2 }]
  };

  await myQueueFunction(context, message);

  expect(context.bindings.outputQueue).toEqual({
    orderId: '12345',
    status: 'processed'
  });
});
```

### Expect Helpers

```typescript
import {
  expectFunctionToThrow,
  expectResponseStatus,
  expectResponseHeaders
} from '@atakora/lib/testing';

test('function throws on invalid input', async () => {
  const context = testUtils.createContext();
  const request = testUtils.createHttpRequest({
    body: { /* invalid data */ }
  });

  await expectFunctionToThrow(
    () => myHttpFunction(context, request),
    'Invalid input'
  );
});

test('returns correct status code', async () => {
  const context = testUtils.createContext();
  const request = testUtils.createHttpRequest({ method: 'GET' });

  await myHttpFunction(context, request);

  expectResponseStatus(context, 200);
});

test('sets correct headers', async () => {
  const context = testUtils.createContext();
  const request = testUtils.createHttpRequest({ method: 'GET' });

  await myHttpFunction(context, request);

  expectResponseHeaders(context, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  });
});
```

## Mock Bindings

Mock Azure Function bindings for testing.

### Blob Storage Mock

```typescript
import { MockBlobStorage, createMockBindings } from '@atakora/lib/testing';

test('function reads from blob storage', async () => {
  const blobStorage = new MockBlobStorage();

  // Setup test data
  blobStorage.uploadBlob('mycontainer', 'test.json', {
    data: 'test content'
  });

  const context = testUtils.createContext();
  context.bindings.inputBlob = blobStorage.getBlob('mycontainer', 'test.json');

  await myBlobFunction(context, context.bindings.inputBlob);

  expect(context.log).toHaveBeenCalledWith(
    expect.stringContaining('test content')
  );
});
```

### Queue Storage Mock

```typescript
import { MockQueueStorage } from '@atakora/lib/testing';

test('function writes to queue', async () => {
  const queueStorage = new MockQueueStorage();
  const context = testUtils.createContext();

  await myFunction(context);

  // Verify queue message
  const messages = queueStorage.getMessages('output-queue');
  expect(messages).toHaveLength(1);
  expect(messages[0]).toEqual({
    status: 'processed',
    timestamp: expect.any(String)
  });
});
```

### Table Storage Mock

```typescript
import { MockTableStorage } from '@atakora/lib/testing';

test('function queries table storage', async () => {
  const tableStorage = new MockTableStorage();

  // Setup test data
  tableStorage.insertEntity('Users', {
    PartitionKey: 'users',
    RowKey: '123',
    Name: 'Alice',
    Email: 'alice@example.com'
  });

  const context = testUtils.createContext();

  await myTableFunction(context);

  // Verify entity was updated
  const entity = tableStorage.getEntity('Users', 'users', '123');
  expect(entity.Status).toBe('active');
});
```

### Cosmos DB Mock

```typescript
import { MockCosmosDb } from '@atakora/lib/testing';

test('function writes to cosmos db', async () => {
  const cosmosDb = new MockCosmosDb();
  const context = testUtils.createContext();

  await myCosmosFunction(context, {
    id: '123',
    name: 'Test Item'
  });

  // Verify document created
  const doc = cosmosDb.getDocument('MyDatabase', 'MyContainer', '123');
  expect(doc).toMatchObject({
    id: '123',
    name: 'Test Item',
    processed: true
  });
});
```

### Complete Mock Bindings

```typescript
import { createMockBindings } from '@atakora/lib/testing';

test('function with multiple bindings', async () => {
  const bindings = createMockBindings({
    blob: {
      container: 'uploads',
      blob: 'file.json',
      content: { data: 'test' }
    },
    queue: {
      name: 'processing-queue'
    },
    table: {
      name: 'ProcessingStatus'
    },
    cosmos: {
      database: 'MyDb',
      container: 'Items'
    }
  });

  const context = testUtils.createContext({
    bindings: bindings.input
  });

  await myComplexFunction(context, context.bindings.inputBlob);

  // Verify outputs
  expect(bindings.queue.getMessages('processing-queue')).toHaveLength(1);
  expect(bindings.table.getEntity('ProcessingStatus', 'status', '123')).toBeDefined();
  expect(bindings.cosmos.getDocument('MyDb', 'Items', '123')).toBeDefined();
});
```

## Best Practices

### 1. Test Resource Validation

```typescript
describe('VirtualNetwork validation', () => {
  test('requires valid CIDR notation', () => {
    const stack = new Stack(app, 'Test');

    expect(() => {
      new VirtualNetwork(stack, 'VNet', {
        addressSpace: 'invalid-cidr'  // Should fail
      });
    }).toThrow('Invalid CIDR notation');
  });

  test('validates subnet sizes', () => {
    const stack = new Stack(app, 'Test');

    expectValidationError(stack, () => {
      new VirtualNetwork(stack, 'VNet', {
        addressSpace: '10.0.0.0/16',
        subnets: [
          { name: 'too-small', addressPrefix: '10.0.0.0/30' }  // Too small
        ]
      });
    });
  });
});
```

### 2. Test ARM Template Structure

```typescript
describe('ARM template generation', () => {
  test('generates correct resource structure', () => {
    const stack = new Stack(app, 'Test');
    const storage = new StorageAccount(stack, 'Storage');

    const template = Template.fromStack(stack);

    expect(template).toHaveResource('Microsoft.Storage/storageAccounts', {
      type: 'Microsoft.Storage/storageAccounts',
      apiVersion: expect.stringMatching(/2023-\d{2}-\d{2}/),
      properties: expect.objectContaining({
        sku: expect.any(Object)
      })
    });
  });
});
```

### 3. Test Deployment Simulation

```typescript
describe('Deployment simulation', () => {
  test('validates dependencies', async () => {
    const stack = new Stack(app, 'Test');

    // ... create resources with dependencies ...

    const simulator = new DeploymentSimulator();
    const result = await simulator.simulate(stack);

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

### 4. Test Function Logic

```typescript
describe('HTTP Function', () => {
  let testUtils: FunctionTestUtils;

  beforeEach(() => {
    testUtils = new FunctionTestUtils();
  });

  test('validates input', async () => {
    const context = testUtils.createContext();
    const request = testUtils.createHttpRequest({
      body: { /* missing required fields */ }
    });

    await myFunction(context, request);

    expectResponseStatus(context, 400);
    expect(context.res.body).toMatchObject({
      error: 'Invalid input'
    });
  });

  test('handles errors gracefully', async () => {
    const context = testUtils.createContext();
    const request = testUtils.createHttpRequest({
      body: { id: 'non-existent' }
    });

    await myFunction(context, request);

    expectResponseStatus(context, 404);
  });
});
```

## Troubleshooting

### Validation Not Triggered

**Problem**: Validation errors not caught in tests

**Solution**:
```typescript
// Ensure synthesis happens
const template = Template.fromStack(stack);

// Or explicitly synthesize
stack.synthesize();

// Then check for errors
expectValidationError(stack, errorCode);
```

### Matcher Not Found

**Problem**: `expect(...).toHaveResource is not a function`

**Solution**:
```typescript
// Add to test setup file
import { setupArmMatchers } from '@atakora/lib/testing';

beforeAll(() => {
  setupArmMatchers();
});
```

### Mock Bindings Not Working

**Problem**: Function can't access mock bindings

**Solution**:
```typescript
// Ensure bindings are passed to context
const context = testUtils.createContext({
  bindings: {
    inputBlob: mockBlob,
    outputQueue: mockQueue
  }
});

// Access via context.bindings
const input = context.bindings.inputBlob;
```

## See Also

- [Testing Guide](../contributing/testing-guide.md)
- [Validation Architecture](./validation/overview.md)
- [ARM Template Matchers API](../reference/api/lib/testing.md)
- [Function Testing Utilities](../reference/api/lib/function-testing.md)

---

**Last Updated**: 2025-10-10
**Version**: 1.0.0+
