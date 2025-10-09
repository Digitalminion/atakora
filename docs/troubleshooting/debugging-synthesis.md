# Debugging Synthesis

**Navigation**: [Docs Home](../README.md) > [Troubleshooting](./README.md) > Debugging Synthesis

---

## Overview

This guide helps you debug issues during ARM template synthesis.

## Verbose Output

Enable detailed logging:

```bash
atakora synth --verbose
```

Output shows:
- Construct creation
- Property resolution
- Validation steps
- Template generation

## Common Synthesis Issues

### Missing Properties

**Error**:
```
Validation Error: Missing required property 'addressSpace'
```

**Debug**:
```typescript
console.log('Creating VNet:', {
  id: 'VNet',
  addressSpace: props.addressSpace  // Check if defined
});

new VirtualNetwork(this, 'VNet', props);
```

**Fix**:
```typescript
new VirtualNetwork(this, 'VNet', {
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
});
```

### Reference Resolution

**Error**:
```
Cannot resolve reference to ResourceGroup
```

**Debug**: Check construct tree:
```typescript
const app = new App();
const stack = new Stack(app, 'test');

console.log('App children:', app.node.children.length);
console.log('Stack children:', stack.node.children.length);
```

**Fix**: Ensure parent-child relationship:
```typescript
const rg = new ResourceGroup(stack, 'RG', {});  // Parent: stack
const vnet = new VirtualNetwork(stack, 'VNet', {
  resourceGroup: rg  // Reference sibling
});
```

### Validation Failures

**Error**:
```
Validation failed with 3 errors
```

**Debug**: Run synthesis with validation details:
```typescript
try {
  app.synth();
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation errors:', error.errors);
    error.errors.forEach((err, i) => {
      console.error(`${i + 1}. ${err}`);
    });
  }
}
```

## Inspection Tools

### View Construct Tree

```typescript
import { App, Stack } from '@atakora/lib';

const app = new App();
const stack = new Stack(app, 'test');

// Add resources...

// Inspect tree
function printTree(node: any, indent = 0) {
  const prefix = '  '.repeat(indent);
  console.log(`${prefix}${node.node.id} (${node.constructor.name})`);

  node.node.children.forEach((child: any) => {
    printTree(child, indent + 1);
  });
}

printTree(app);
```

### View ARM Template

```bash
# Synthesize
atakora synth

# View template
cat .atakora/arm.out/production/template.json | jq .

# View specific resource
cat .atakora/arm.out/production/template.json | \
  jq '.resources[] | select(.type == "Microsoft.Network/virtualNetworks")'
```

### View Metadata

```bash
cat .atakora/arm.out/production/metadata.json | jq .
```

## Debugging Strategies

### Incremental Development

Build infrastructure incrementally:

```typescript
// Step 1: Just resource group
const rg = new ResourceGroup(this, 'RG', {});
app.synth();  // Test

// Step 2: Add network
const vnet = new VirtualNetwork(this, 'VNet', {
  resourceGroup: rg,
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
});
app.synth();  // Test

// Step 3: Add more resources...
```

### Isolate Issues

Create minimal reproduction:

```typescript
import { App, Stack } from '@atakora/lib';
import { VirtualNetwork } from '@atakora/cdk/network';

// Minimal test case
const app = new App();
const stack = new Stack(app, 'test', {
  environment: 'test',
  location: 'eastus'
});

new VirtualNetwork(stack, 'VNet', {
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
});

app.synth();
```

### Skip Validation

For debugging, temporarily skip validation:

```bash
atakora synth --no-validate
```

**Warning**: Only for debugging. Always validate before deployment.

## See Also

- [Common Issues](./common-issues.md)
- [Synthesis Guide](../guides/fundamentals/synthesis.md)
- [Validation Overview](../guides/validation/overview.md)

---

**Last Updated**: 2025-10-08
