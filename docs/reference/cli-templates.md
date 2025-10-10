# Atakora Project Templates

This directory contains template files used by `atakora init` and `atakora add` commands to scaffold new Azure infrastructure projects and packages.

## Template Files

### Root Project Templates

**`root-package.json.template`**

- Root workspace package.json
- Configures npm workspaces
- Defines project-level scripts
- Variables: `{{projectName}}`, `{{defaultPackage}}`

**`root-tsconfig.json.template`**

- Root TypeScript configuration
- Shared compiler options for all packages
- No variables

**`gitignore.template`**

- Standard .gitignore for Atakora projects
- Excludes node_modules, dist, ARM outputs
- No variables

**`readme.md.template`**

- Project README with getting started instructions
- Documents project structure and common commands
- Variables: `{{project}}`, `{{organization}}`, `{{defaultPackage}}`

### Package Templates

**`package-main.ts.template`**

- Main infrastructure entrypoint (src/main.ts)
- Creates AzureApp and SubscriptionStack
- Includes example comments
- Variables: `{{organization}}`, `{{project}}`

**`package-package.json.template`**

- Package-specific package.json
- Scoped to organization namespace
- Variables: `{{organization}}`, `{{packageName}}`

**`package-tsconfig.json.template`**

- Package-specific TypeScript configuration
- Extends root tsconfig
- No variables

## Template Variables

All templates support these variable placeholders:

| Variable             | Description                   | Example                |
| -------------------- | ----------------------------- | ---------------------- |
| `{{organization}}`   | Organization/company name     | `contoso`              |
| `{{project}}`        | Project name                  | `azure-infrastructure` |
| `{{projectName}}`    | Project name for package.json | `azure-infrastructure` |
| `{{packageName}}`    | Package name                  | `foundation`           |
| `{{defaultPackage}}` | Default package name          | `foundation`           |

## Variable Substitution

Templates use simple `{{variable}}` syntax. The `TemplateRenderer` performs global string replacement:

```typescript
import { TemplateRenderer } from '../generators';

const renderer = new TemplateRenderer();
const content = renderer.render(renderer.getTemplatePath('package-main.ts.template'), {
  organization: 'contoso',
  project: 'azure-infra',
});
```

## Adding New Templates

1. Create a new `.template` file in this directory
2. Use `{{variable}}` syntax for placeholders
3. Document the template in this README
4. Update `TemplateRenderer` if new functionality is needed
5. Add tests for the new template

## Template Best Practices

- **Include helpful comments** - Generated code should guide new users
- **Follow TypeScript conventions** - Proper indentation, naming, structure
- **Keep templates minimal** - Only include essential boilerplate
- **Use consistent formatting** - Match existing project style
- **Support cross-platform** - Templates work on Windows and Unix
- **Document constraints** - Explain what users can/should customize

## Usage in Commands

### `atakora init`

```typescript
const renderer = new TemplateRenderer();
const variables = {
  organization: 'contoso',
  project: 'azure-infra',
  projectName: 'azure-infra',
  packageName: 'foundation',
  defaultPackage: 'foundation',
};

renderer.renderBatch(
  [
    [renderer.getTemplatePath('root-package.json.template'), path.join(projectDir, 'package.json')],
    [renderer.getTemplatePath('package-main.ts.template'), path.join(packageDir, 'src', 'main.ts')],
  ],
  variables
);
```

### `atakora add`

```typescript
const renderer = new TemplateRenderer();
const variables = {
  organization: manifest.organization,
  packageName: packageName,
};

renderer.renderToFile(
  renderer.getTemplatePath('package-main.ts.template'),
  path.join(packageDir, 'src', 'main.ts'),
  variables
);
```

## Testing Templates

Template rendering is tested in `generators/template-renderer.test.ts`:

```bash
npm test -- template-renderer.test.ts
```

To manually test a template:

```typescript
import { TemplateRenderer } from './generators';

const renderer = new TemplateRenderer();
console.log(
  renderer.render(renderer.getTemplatePath('package-main.ts.template'), {
    organization: 'test',
    project: 'test-project',
  })
);
```
