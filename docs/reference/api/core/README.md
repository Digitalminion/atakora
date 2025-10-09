# Core Library API (@atakora/lib)

**Navigation**: [Docs Home](../../../README.md) > [Reference](../../README.md) > [API Reference](../README.md) > Core Library

---

## Overview

The core library provides fundamental constructs and abstractions for building Azure infrastructure. All infrastructure code starts with these core classes.

## Installation

```bash
npm install @atakora/lib
```

## Import

```typescript
import { App, Stack, Construct, Resource } from '@atakora/lib';
```

## Core Classes

### App

The root of the construct tree. Every Atakora project has exactly one App.

#### Class Signature

```typescript
class App extends Construct {
  constructor();
  synth(): SynthesisResult;
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `stacks` | `Stack[]` | All stacks in this app |
| `outdir` | `string` | Output directory for synthesis |

#### Methods

##### `synth()`

Synthesizes all stacks to ARM templates.

**Returns**: `SynthesisResult`

**Example**:
```typescript
const app = new App();
new MyStack(app, 'my-stack');

const result = app.synth();
console.log(`Generated ${result.stacks.length} stacks`);
```

#### Usage Examples

**Basic App**:
```typescript
import { App } from '@atakora/lib';

const app = new App();
// Add stacks...
app.synth();
```

**Multiple Stacks**:
```typescript
const app = new App();
new DevStack(app, 'dev');
new StagingStack(app, 'staging');
new ProductionStack(app, 'production');
app.synth();
```

**Custom Output Directory**:
```typescript
const app = new App();
app.outdir = './build/arm';
app.synth();
```

---

### Stack

A deployment boundary representing a set of resources deployed together.

#### Class Signature

```typescript
class Stack extends Construct {
  constructor(scope: App, id: string, props?: StackProps);
}
```

#### Constructor Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scope` | `App` | Yes | Parent app |
| `id` | `string` | Yes | Stack identifier |
| `props` | `StackProps` | No | Stack configuration |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `environment` | `string` | Environment name (dev, staging, production) |
| `location` | `string` | Azure region |
| `stackName` | `string` | Generated stack name |
| `tags` | `Record<string, string>` | Stack-level tags |
| `resources` | `Resource[]` | All resources in stack |

#### StackProps Interface

```typescript
interface StackProps {
  /**
   * Environment name
   * Used for resource naming and tagging
   * @default 'production'
   */
  readonly environment?: string;

  /**
   * Azure region for resources
   * @default 'eastus'
   */
  readonly location?: string;

  /**
   * Tags applied to all resources in stack
   * @default { managedBy: 'atakora' }
   */
  readonly tags?: Record<string, string>;

  /**
   * Stack description
   */
  readonly description?: string;
}
```

#### Methods

##### `addResource(resource: Resource): void`

Adds a resource to this stack.

**Parameters**:
- `resource`: Resource to add

**Example**:
```typescript
const resource = new Resource(this, 'MyResource', {});
this.addResource(resource);
```

##### `getResource(id: string): Resource | undefined`

Retrieves a resource by ID.

**Parameters**:
- `id`: Resource identifier

**Returns**: Resource if found, undefined otherwise

##### `synthesize(): StackTemplate`

Synthesizes this stack to ARM template.

**Returns**: ARM template object

#### Usage Examples

**Basic Stack**:
```typescript
import { App, Stack } from '@atakora/lib';

class MyStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id, {
      environment: 'production',
      location: 'eastus'
    });

    // Add resources...
  }
}

const app = new App();
new MyStack(app, 'my-stack');
app.synth();
```

**Multi-Region Stack**:
```typescript
class RegionalStack extends Stack {
  constructor(scope: App, id: string, region: string) {
    super(scope, id, {
      environment: 'production',
      location: region,
      tags: {
        region: region,
        deploymentType: 'regional'
      }
    });
  }
}

const app = new App();
new RegionalStack(app, 'eastus-stack', 'eastus');
new RegionalStack(app, 'westus-stack', 'westus2');
app.synth();
```

**Environment-Specific Stack**:
```typescript
interface EnvStackProps extends StackProps {
  readonly dbSku: string;
  readonly appServicePlan: string;
}

class EnvironmentStack extends Stack {
  constructor(scope: App, id: string, props: EnvStackProps) {
    super(scope, id, props);

    // Use environment-specific configuration
    console.log(`DB SKU: ${props.dbSku}`);
    console.log(`App Plan: ${props.appServicePlan}`);
  }
}

// Development
new EnvironmentStack(app, 'dev', {
  environment: 'development',
  location: 'eastus',
  dbSku: 'Basic',
  appServicePlan: 'B1'
});

// Production
new EnvironmentStack(app, 'prod', {
  environment: 'production',
  location: 'eastus',
  dbSku: 'S3',
  appServicePlan: 'P2v2'
});
```

---

### Construct

Base class for all constructs in the tree.

#### Class Signature

```typescript
abstract class Construct {
  constructor(scope: Construct, id: string);
}
```

#### Constructor Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scope` | `Construct` | Yes | Parent construct |
| `id` | `string` | Yes | Construct identifier |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `node` | `ConstructNode` | Construct tree node |
| `scope` | `Construct` | Parent construct |

#### ConstructNode Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Construct ID |
| `path` | `string` | Full path in tree |
| `children` | `Construct[]` | Child constructs |
| `metadata` | `MetadataEntry[]` | Construct metadata |

#### Methods

##### `toString(): string`

String representation of construct.

**Returns**: Construct path

##### `validate(): string[]`

Validates construct configuration.

**Returns**: Array of validation errors (empty if valid)

#### Usage Examples

**Custom Construct**:
```typescript
import { Construct } from '@atakora/lib';
import { VirtualNetwork, Subnet } from '@atakora/cdk/network';

class NetworkStack extends Construct {
  public readonly vnet: VirtualNetwork;
  public readonly appSubnet: Subnet;
  public readonly dataSubnet: Subnet;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.vnet = new VirtualNetwork(this, 'VNet', {
      addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
    });

    this.appSubnet = new Subnet(this, 'AppSubnet', {
      virtualNetwork: this.vnet,
      addressPrefix: '10.0.1.0/24'
    });

    this.dataSubnet = new Subnet(this, 'DataSubnet', {
      virtualNetwork: this.vnet,
      addressPrefix: '10.0.2.0/24'
    });
  }
}

// Usage
const network = new NetworkStack(stack, 'Network');
// Access subnets: network.appSubnet, network.dataSubnet
```

**Reusable Component**:
```typescript
interface WebAppComponentProps {
  readonly sku: string;
  readonly instances: number;
}

class WebAppComponent extends Construct {
  public readonly plan: AppServicePlan;
  public readonly webapp: WebApp;

  constructor(scope: Construct, id: string, props: WebAppComponentProps) {
    super(scope, id);

    this.plan = new AppServicePlan(this, 'Plan', {
      sku: { name: props.sku }
    });

    this.webapp = new WebApp(this, 'WebApp', {
      serverFarmId: this.plan.id,
      siteConfig: {
        numberOfWorkers: props.instances
      }
    });
  }
}

// Usage
const component = new WebAppComponent(stack, 'MyApp', {
  sku: 'P1v2',
  instances: 3
});
```

---

### Resource

Base class for all Azure resources.

#### Class Signature

```typescript
abstract class Resource extends Construct {
  constructor(scope: Construct, id: string, props: ResourceProps);
}
```

#### Constructor Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scope` | `Construct` | Yes | Parent construct |
| `id` | `string` | Yes | Resource identifier |
| `props` | `ResourceProps` | No | Resource configuration |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `resourceType` | `string` | Azure resource type (e.g., Microsoft.Network/virtualNetworks) |
| `name` | `string` | Resource name |
| `id` | `string` | ARM resource ID |
| `location` | `string` | Azure region |
| `tags` | `Record<string, string>` | Resource tags |

#### ResourceProps Interface

```typescript
interface ResourceProps {
  /**
   * Resource name
   * Auto-generated if not provided
   */
  readonly name?: string;

  /**
   * Azure location
   * Inherited from stack if not provided
   */
  readonly location?: string;

  /**
   * Resource tags
   * Merged with parent tags
   */
  readonly tags?: Record<string, string>;
}
```

#### Methods

##### `toArmTemplate(): ArmResource`

Converts resource to ARM template format.

**Returns**: ARM resource object

##### `validate(): string[]`

Validates resource configuration.

**Returns**: Validation errors

#### Usage Examples

**Custom Resource**:
```typescript
import { Resource, ResourceProps } from '@atakora/lib';

interface CustomResourceProps extends ResourceProps {
  readonly customProperty: string;
}

class CustomResource extends Resource {
  constructor(scope: Construct, id: string, props: CustomResourceProps) {
    super(scope, id, props);

    this.resourceType = 'Custom.Provider/customResources';
    console.log(`Custom property: ${props.customProperty}`);
  }

  protected validate(): string[] {
    const errors: string[] = [];

    if (this.name.length > 50) {
      errors.push('Resource name must be 50 characters or less');
    }

    return errors;
  }

  public toArmTemplate(): ArmResource {
    return {
      type: this.resourceType,
      apiVersion: '2023-01-01',
      name: this.name,
      location: this.location,
      tags: this.tags,
      properties: {
        // Custom properties
      }
    };
  }
}
```

---

## Utility Functions

### Naming Utilities

#### `generateResourceName()`

Generates Azure-compliant resource names.

```typescript
function generateResourceName(
  resourceType: string,
  id: string,
  environment: string,
  location: string
): string;
```

**Example**:
```typescript
import { generateResourceName } from '@atakora/lib/utils';

const name = generateResourceName(
  'virtualNetwork',
  'MyVNet',
  'production',
  'eastus'
);
// Returns: vnet-myvnet-prod-eastus
```

#### `generateStorageAccountName()`

Generates storage account names (24 chars, alphanumeric).

```typescript
function generateStorageAccountName(
  id: string,
  environment: string
): string;
```

**Example**:
```typescript
import { generateStorageAccountName } from '@atakora/lib/utils';

const name = generateStorageAccountName('MyStorage', 'production');
// Returns: stmystorageprod
```

### Tagging Utilities

#### `mergeTags()`

Merges tag objects with precedence.

```typescript
function mergeTags(
  ...tagSets: Array<Record<string, string> | undefined>
): Record<string, string>;
```

**Example**:
```typescript
import { mergeTags } from '@atakora/lib/utils';

const stackTags = { environment: 'production', managedBy: 'atakora' };
const resourceTags = { component: 'database' };

const merged = mergeTags(stackTags, resourceTags);
// Returns: { environment: 'production', managedBy: 'atakora', component: 'database' }
```

### Validation Utilities

#### `validateAzureResourceName()`

Validates Azure resource name against rules.

```typescript
function validateAzureResourceName(
  name: string,
  resourceType: string
): ValidationResult;
```

**Example**:
```typescript
import { validateAzureResourceName } from '@atakora/lib/utils';

const result = validateAzureResourceName(
  'my-vnet',
  'Microsoft.Network/virtualNetworks'
);

if (!result.valid) {
  console.error(result.errors);
}
```

---

## Type Definitions

### Common Interfaces

#### `IResource`

Base interface for all resources.

```typescript
interface IResource {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly location: string;
}
```

#### `IResourceGroup`

Resource group interface.

```typescript
interface IResourceGroup extends IResource {
  readonly resourceGroupName: string;
}
```

#### `ArmResource`

ARM template resource object.

```typescript
interface ArmResource {
  readonly type: string;
  readonly apiVersion: string;
  readonly name: string;
  readonly location?: string;
  readonly tags?: Record<string, string>;
  readonly properties?: Record<string, any>;
  readonly dependsOn?: string[];
}
```

#### `SynthesisResult`

Result of app synthesis.

```typescript
interface SynthesisResult {
  readonly stacks: StackSynthesis[];
  readonly manifest: ProjectManifest;
}

interface StackSynthesis {
  readonly stackName: string;
  readonly template: ArmTemplate;
  readonly metadata: StackMetadata;
}
```

---

## Error Handling

### ValidationError

Thrown when resource validation fails.

```typescript
class ValidationError extends Error {
  constructor(
    public readonly resource: string,
    public readonly errors: string[]
  );
}
```

**Example**:
```typescript
import { ValidationError } from '@atakora/lib';

try {
  app.synth();
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Validation failed for ${error.resource}:`);
    error.errors.forEach(err => console.error(`  - ${err}`));
  }
}
```

### SynthesisError

Thrown when synthesis fails.

```typescript
class SynthesisError extends Error {
  constructor(
    public readonly stack: string,
    public readonly cause: Error
  );
}
```

---

## Advanced Usage

### Custom Stack Base Class

Create organization-specific stack base:

```typescript
import { App, Stack, StackProps } from '@atakora/lib';

interface OrgStackProps extends StackProps {
  readonly costCenter: string;
  readonly owner: string;
}

abstract class OrgStack extends Stack {
  constructor(scope: App, id: string, props: OrgStackProps) {
    super(scope, id, {
      ...props,
      tags: {
        ...props.tags,
        costCenter: props.costCenter,
        owner: props.owner,
        organization: 'Acme Corp'
      }
    });
  }
}

// Usage
class ProductionStack extends OrgStack {
  constructor(scope: App, id: string) {
    super(scope, id, {
      environment: 'production',
      location: 'eastus',
      costCenter: 'CC-1234',
      owner: 'platform-team@acme.com'
    });
  }
}
```

### Aspect Pattern

Apply cross-cutting concerns:

```typescript
import { Construct, IAspect, IConstruct } from '@atakora/lib';

class TaggingAspect implements IAspect {
  constructor(private readonly tags: Record<string, string>) {}

  visit(node: IConstruct): void {
    if (node instanceof Resource) {
      node.tags = { ...node.tags, ...this.tags };
    }
  }
}

// Apply to all resources
const app = new App();
app.node.applyAspect(new TaggingAspect({
  compliance: 'SOC2',
  dataClassification: 'confidential'
}));
```

## See Also

- [Network Resources](../cdk/network.md)
- [Storage Resources](../cdk/storage.md)
- [Getting Started Guide](../../../getting-started/README.md)
- [Fundamentals](../../../guides/fundamentals/README.md)

---

**Last Updated**: 2025-10-08
**Version**: @atakora/lib 1.0.0
