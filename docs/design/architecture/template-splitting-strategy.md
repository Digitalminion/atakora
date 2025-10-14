# Template Splitting Strategy

## Overview

This document defines the strategy for intelligently splitting large ARM templates into multiple linked templates. The splitting must preserve resource dependencies, optimize deployment parallelization, and maintain logical groupings while staying under Azure's 4MB limit.

## Splitting Principles

### 1. Size-Based Splitting
- **Hard limit**: 3.5MB per template (leaving 0.5MB buffer)
- **Soft limit**: 2.5MB triggers evaluation for splitting
- **Measurement**: UTF-8 encoded JSON string length

### 2. Logical Grouping
Templates should be split along logical boundaries that make sense for:
- Deployment ordering
- Failure isolation
- Reusability
- Developer understanding

### 3. Dependency Preservation
- Resources with direct dependencies should stay in the same template when possible
- Cross-template dependencies use ARM deployment outputs
- Circular dependencies must be broken before splitting

## Resource Categories and Grouping

### Tier 1: Foundation Resources (Deploy First)
These resources have no dependencies and others depend on them.

**Template Name**: `foundation-{index}.json`

Resources:
- Storage Accounts
- Cosmos DB Accounts
- SQL Servers
- Virtual Networks
- Network Security Groups
- Key Vaults
- Log Analytics Workspaces

Example grouping:
```json
{
  "foundation-storage": ["StorageAccounts", "BlobContainers"],
  "foundation-network": ["VirtualNetworks", "Subnets", "NSGs"],
  "foundation-data": ["CosmosDB", "SQLServer", "SQLDatabase"]
}
```

### Tier 2: Compute Resources
These depend on foundation but are independent of each other.

**Template Name**: `compute-{index}.json`

Resources:
- App Service Plans
- Function Apps (without code)
- Container Groups
- Virtual Machines
- AKS Clusters

Splitting strategy:
- Group by service plan (all apps on same plan together)
- Separate VM-based from PaaS compute
- Keep scale sets together

### Tier 3: Application Resources
These depend on compute and foundation resources.

**Template Name**: `application-{index}.json`

Resources:
- Function definitions (metadata only)
- API Management APIs
- Application Insights
- CDN Profiles
- Front Door configurations

Splitting strategy:
- Group by application boundary
- Keep API and its functions together
- Separate monitoring from application logic

### Tier 4: Configuration Resources
These configure other resources and can be deployed last.

**Template Name**: `configuration-{index}.json`

Resources:
- Role Assignments
- Diagnostic Settings
- Alert Rules
- Autoscale Settings
- Backup Policies

Splitting strategy:
- Group by target resource type
- Separate security from monitoring
- Can parallelize most configuration

## Splitting Algorithm

```typescript
interface SplitResult {
  templates: Map<string, ArmTemplate>;
  dependencies: Map<string, string[]>;
  deploymentOrder: string[];
}

class TemplateSplitter {
  private readonly MAX_TEMPLATE_SIZE = 3.5 * 1024 * 1024; // 3.5MB
  private readonly MAX_RESOURCES_PER_TEMPLATE = 200;

  split(resources: ArmResource[]): SplitResult {
    // Step 1: Categorize resources
    const categorized = this.categorizeResources(resources);

    // Step 2: Build dependency graph
    const dependencies = this.buildDependencyGraph(resources);

    // Step 3: Group related resources
    const groups = this.groupRelatedResources(categorized, dependencies);

    // Step 4: Split groups by size
    const templates = this.splitBySize(groups);

    // Step 5: Generate deployment order
    const order = this.topologicalSort(templates, dependencies);

    return {
      templates,
      dependencies: this.crossTemplateDependencies(templates, dependencies),
      deploymentOrder: order
    };
  }

  private categorizeResources(resources: ArmResource[]): Map<ResourceTier, ArmResource[]> {
    const tiers = new Map<ResourceTier, ArmResource[]>();

    for (const resource of resources) {
      const tier = this.getResourceTier(resource.type);
      const tierResources = tiers.get(tier) || [];
      tierResources.push(resource);
      tiers.set(tier, tierResources);
    }

    return tiers;
  }

  private groupRelatedResources(
    categorized: Map<ResourceTier, ArmResource[]>,
    dependencies: DependencyGraph
  ): ResourceGroup[] {
    const groups: ResourceGroup[] = [];

    // Group resources that must stay together
    for (const [tier, resources] of categorized) {
      const tierGroups = this.groupByAffinity(resources, dependencies);
      groups.push(...tierGroups);
    }

    return groups;
  }

  private splitBySize(groups: ResourceGroup[]): Map<string, ArmTemplate> {
    const templates = new Map<string, ArmTemplate>();

    for (const group of groups) {
      const size = this.calculateGroupSize(group);

      if (size > this.MAX_TEMPLATE_SIZE) {
        // Split large groups
        const subgroups = this.splitLargeGroup(group);
        for (const subgroup of subgroups) {
          const template = this.createTemplate(subgroup);
          templates.set(template.name, template);
        }
      } else {
        // Create template for group
        const template = this.createTemplate(group);
        templates.set(template.name, template);
      }
    }

    return templates;
  }
}
```

## Resource Affinity Rules

Resources that MUST stay in the same template:

### Strong Affinity (Never Split)
```typescript
const STRONG_AFFINITY = [
  // Parent-child relationships
  ['Microsoft.Web/sites', 'Microsoft.Web/sites/functions'],
  ['Microsoft.Web/sites', 'Microsoft.Web/sites/config'],
  ['Microsoft.DocumentDB/databaseAccounts', 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases'],
  ['Microsoft.Storage/storageAccounts', 'Microsoft.Storage/storageAccounts/blobServices'],

  // Tightly coupled resources
  ['Microsoft.Network/virtualNetworks', 'Microsoft.Network/virtualNetworks/subnets'],
  ['Microsoft.Compute/virtualMachines', 'Microsoft.Compute/virtualMachines/extensions'],
];
```

### Weak Affinity (Prefer Together)
```typescript
const WEAK_AFFINITY = [
  // Related but independent
  ['Microsoft.Web/sites', 'Microsoft.Insights/components'],
  ['Microsoft.Storage/storageAccounts', 'Microsoft.Web/sites'],
  ['Microsoft.Network/networkSecurityGroups', 'Microsoft.Network/virtualNetworks'],
];
```

## Cross-Template Dependencies

When resources in different templates depend on each other:

### Output-based References
```json
// Template A: foundation-storage.json
{
  "outputs": {
    "storageAccountId": {
      "type": "string",
      "value": "[resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName'))]"
    },
    "storageConnectionString": {
      "type": "securestring",
      "value": "[concat('DefaultEndpointsProtocol=https;AccountName=', parameters('storageAccountName'), ';AccountKey=', listKeys(...))]"
    }
  }
}

// Template B: compute-functions.json
{
  "parameters": {
    "storageAccountId": {
      "type": "string"
    },
    "storageConnectionString": {
      "type": "securestring"
    }
  }
}
```

### Root Template Orchestration
```json
{
  "resources": [
    {
      "type": "Microsoft.Resources/deployments",
      "name": "foundation-storage",
      "properties": {
        "mode": "Incremental",
        "templateLink": {
          "uri": "[concat(variables('baseUri'), '/foundation-storage.json')]"
        }
      }
    },
    {
      "type": "Microsoft.Resources/deployments",
      "name": "compute-functions",
      "dependsOn": [
        "[resourceId('Microsoft.Resources/deployments', 'foundation-storage')]"
      ],
      "properties": {
        "mode": "Incremental",
        "templateLink": {
          "uri": "[concat(variables('baseUri'), '/compute-functions.json')]"
        },
        "parameters": {
          "storageAccountId": {
            "value": "[reference('foundation-storage').outputs.storageAccountId.value]"
          }
        }
      }
    }
  ]
}
```

## Size Calculation and Optimization

### Size Calculation Method
```typescript
function calculateTemplateSize(template: ArmTemplate): number {
  // Serialize to JSON with minimal formatting
  const json = JSON.stringify(template, null, 0);

  // Convert to UTF-8 bytes
  const bytes = new TextEncoder().encode(json);

  // Return size in bytes
  return bytes.length;
}
```

### Size Optimization Techniques

1. **Remove Comments**: Strip all comments from JSON
2. **Minimize Whitespace**: Use compact JSON formatting
3. **Deduplicate Variables**: Share common values through parameters
4. **Externalize Large Values**: Move large strings to parameters
5. **Use Copy Loops**: Replace repetitive resources with copy loops

Example optimization:
```json
// Before: 3 similar resources (600KB)
{
  "resources": [
    { "type": "Microsoft.Web/sites", "name": "app1", /* 200KB of config */ },
    { "type": "Microsoft.Web/sites", "name": "app2", /* 200KB of config */ },
    { "type": "Microsoft.Web/sites", "name": "app3", /* 200KB of config */ }
  ]
}

// After: Copy loop (250KB)
{
  "resources": [
    {
      "type": "Microsoft.Web/sites",
      "name": "[concat('app', copyIndex())]",
      "copy": {
        "name": "appCopy",
        "count": 3
      },
      /* 200KB of config */
    }
  ]
}
```

## Special Cases

### Function Apps with Inline Code
Function apps with inline code are handled specially:

1. **Extract code** during transform phase
2. **Package into ZIP** files
3. **Upload to storage** with SAS tokens
4. **Reference via app settings** (WEBSITE_RUN_FROM_PACKAGE)

Template structure:
```json
{
  "type": "Microsoft.Web/sites",
  "name": "functionapp",
  "properties": {
    "siteConfig": {
      "appSettings": [
        {
          "name": "WEBSITE_RUN_FROM_PACKAGE",
          "value": "[parameters('packageUri')]"
        }
      ]
    }
  }
}
```

### Large Parameter Sets
When parameter objects are large:

1. **Use Parameter Files**: Separate parameter files per environment
2. **Reference from Storage**: Load parameters from storage at deployment time
3. **Use Key Vault**: Store sensitive/large values in Key Vault

### Resource Arrays
When dealing with many similar resources:

1. **Use Copy Loops**: Reduce template size dramatically
2. **Split by Count**: If >50 similar resources, split into multiple templates
3. **Parameterize Names**: Use naming conventions with indexes

## Validation Rules

### Pre-Split Validation
- Verify no circular dependencies exist
- Check all resource types are recognized
- Ensure all dependencies are explicit

### Post-Split Validation
- Each template is under 3.5MB
- No template has >200 resources
- All dependencies are satisfied
- Deployment order is deterministic

### Size Monitoring
```typescript
interface TemplateSizeReport {
  totalSize: number;
  templateCount: number;
  largestTemplate: {
    name: string;
    size: number;
    resourceCount: number;
  };
  sizeDistribution: {
    under1MB: number;
    under2MB: number;
    under3MB: number;
    over3MB: number;
  };
}
```

## Performance Considerations

### Parallel Deployment
Templates at the same tier can deploy in parallel:

```json
{
  "deployments": {
    "parallel": [
      ["foundation-storage", "foundation-network", "foundation-data"],
      ["compute-functions", "compute-containers"],
      ["application-api", "application-monitoring"],
      ["configuration-rbac", "configuration-diagnostics"]
    ]
  }
}
```

### Deployment Optimization
- Deploy independent templates in parallel
- Use `dependsOn` only when necessary
- Cache unchanged templates
- Skip redeployment of unchanged resources

## Error Handling

### Split Failure Scenarios

1. **Resource too large**: Single resource >3.5MB
   - Solution: Extract large properties to parameters or external files

2. **Circular dependencies**: Resources depend on each other circularly
   - Solution: Break cycle by introducing intermediate resource

3. **Unknown resource type**: Splitter doesn't recognize resource
   - Solution: Add to tier mapping or use default tier

### Recovery Strategy
- Log detailed splitting decisions
- Provide clear error messages
- Allow manual override of splitting rules
- Support debugging with verbose output

## Testing Strategy

### Unit Tests
- Test each grouping rule
- Verify size calculations
- Check dependency preservation
- Validate output structure

### Integration Tests
- Deploy split templates to Azure
- Verify resource creation order
- Check cross-template references work
- Measure deployment performance

### Edge Cases
- Single resource at limit
- Hundreds of small resources
- Deep dependency chains
- Circular dependency detection