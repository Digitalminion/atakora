# Templates Reference

Documentation for Atakora's template systems including ARM template output and CLI code generation templates.

## Overview

Atakora uses templates for generating Azure Resource Manager (ARM) templates and scaffolding new infrastructure code. This section documents the template formats and generation processes.

## Template Types

### ARM Templates
- **[ARM Template Output](./ARM-Template-Output.md)** - Understanding generated ARM templates
  - Template structure
  - Resource definitions
  - Parameter handling
  - Output values
  - Linked templates

### CLI Templates
- **[CLI Templates](./CLI-Templates.md)** - Code generation templates
  - Project scaffolding
  - Resource templates
  - Function templates
  - Test templates

## ARM Template Structure

### Basic Template Format

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]"
    }
  },
  "variables": {},
  "resources": [],
  "outputs": {}
}
```

### Generated File Structure

```
.atakora/arm.out/
├── main.json                 # Main deployment template
├── nested/
│   ├── storage.json         # Storage resources
│   ├── network.json         # Network resources
│   └── compute.json         # Compute resources
└── artifacts/
    ├── functions/           # Function app packages
    └── policies/            # Policy definitions
```

## CLI Template System

### Available Templates

| Template | Command | Description |
|----------|---------|-------------|
| Project | `atakora init` | New project structure |
| Stack | `atakora add` | Environment-specific stack |
| Function | `atakora function create` | Azure Function handler |
| CRUD API | `atakora add-crud` | Complete CRUD operations |

### Template Variables

Templates support variable substitution:

```typescript
// Template: templates/function.ts.template
import { AzureFunction, Context, HttpRequest } from '@azure/functions';

const {{functionName}}: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log('HTTP trigger function processed a request.');

  context.res = {
    status: 200,
    body: "Hello from {{functionName}}"
  };
};

export default {{functionName}};
```

### Custom Templates

Create custom templates in `.atakora/templates/`:

```typescript
// .atakora/templates/custom-resource.ts
import { Construct } from '@atakora/lib';
import { {{resourceType}} } from '@atakora/cdk/{{namespace}}';

export class {{className}} extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new {{resourceType}}(this, '{{resourceId}}', {
      // Configuration
    });
  }
}
```

## Template Generation Process

### Synthesis Pipeline

1. **Code Analysis**: Parse TypeScript infrastructure code
2. **Resource Discovery**: Identify all Azure resources
3. **Dependency Resolution**: Order resources by dependencies
4. **Template Generation**: Create ARM JSON
5. **Validation**: Validate against Azure schemas
6. **Optimization**: Minimize template size
7. **Output**: Write to `.atakora/arm.out/`

### Linked Templates

For large deployments, templates are automatically split:

```json
{
  "type": "Microsoft.Resources/deployments",
  "apiVersion": "2021-04-01",
  "name": "linkedTemplate",
  "properties": {
    "mode": "Incremental",
    "templateLink": {
      "uri": "[concat(parameters('artifactsLocation'), '/nested/storage.json')]"
    },
    "parameters": {
      "location": { "value": "[parameters('location')]" }
    }
  }
}
```

## Template Customization

### Override Default Templates

```typescript
import { App, Stack } from '@atakora/lib';

class MyStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id, {
      // Custom synthesis options
      synthesizer: {
        templatePath: './custom-templates',
        linkedTemplates: true,
        maxTemplateSize: 4194304 // 4MB
      }
    });
  }
}
```

### Template Hooks

```typescript
stack.onSynthesize((template) => {
  // Modify template before output
  template.metadata = {
    ...template.metadata,
    customField: 'value'
  };
  return template;
});
```

## Best Practices

1. **Keep Templates Small**: Use linked templates for large deployments
2. **Use Parameters**: Make templates reusable with parameters
3. **Validate Early**: Test templates before deployment
4. **Version Templates**: Track template changes in source control
5. **Document Outputs**: Clearly document template output values

## Template Limits

| Limit | Value | Notes |
|-------|-------|-------|
| Template file size | 4 MB | Use linked templates if larger |
| Parameters | 256 | Maximum number of parameters |
| Variables | 256 | Maximum number of variables |
| Resources | 800 | Per template file |
| Outputs | 64 | Maximum number of outputs |
| Template nesting | 5 levels | Maximum nesting depth |

## Troubleshooting

### Common Issues

**Template Too Large**
```bash
# Enable linked templates
atakora synth --linked-templates
```

**Invalid Template**
```bash
# Validate template
az deployment group validate \
  --resource-group myapp-rg \
  --template-file .atakora/arm.out/main.json
```

**Missing Artifacts**
```bash
# Upload artifacts before deployment
atakora deploy --upload-artifacts
```

## Related Documentation

- [Synthesis Guide](../../guides/fundamentals/synthesis.md) - How synthesis works
- [Deployment Guide](../../guides/fundamentals/deployment.md) - Deploying templates
- [CLI Reference](../cli/README.md) - CLI commands for templates