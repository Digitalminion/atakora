import * as fs from 'fs';
import * as path from 'path';

/**
 * Options for generating a CRUD stack
 */
export interface GenerateCrudOptions {
  /**
   * Resource name (e.g., "user", "product")
   */
  readonly resourceName: string;

  /**
   * Workspace root directory
   */
  readonly workspaceRoot: string;

  /**
   * Package name where CRUD stack will be generated
   */
  readonly packageName: string;
}

/**
 * Generates CRUD stack with REST API and Azure Functions
 */
export class CrudGenerator {
  /**
   * Generates a complete CRUD stack
   *
   * Creates:
   * - packages/{package}/rest/{resource}/
   * - packages/{package}/rest/{resource}/stack.ts
   * - packages/{package}/rest/{resource}/resource.ts
   * - packages/{package}/rest/{resource}/{resource}-create/
   * - packages/{package}/rest/{resource}/{resource}-read/
   * - packages/{package}/rest/{resource}/{resource}-update/
   * - packages/{package}/rest/{resource}/{resource}-delete/
   * - packages/{package}/rest/{resource}/{resource}-list/
   *
   * @param options - CRUD generation options
   */
  public generate(options: GenerateCrudOptions): void {
    const basePath = path.join(
      options.workspaceRoot,
      'packages',
      options.packageName,
      'src',
      'rest',
      this.toKebabCase(options.resourceName)
    );

    // Check if directory already exists
    if (fs.existsSync(basePath)) {
      throw new Error(`CRUD stack already exists at: ${basePath}`);
    }

    // Create base directory
    fs.mkdirSync(basePath, { recursive: true });

    // Generate case variations
    const pascalCase = this.toPascalCase(options.resourceName);
    const camelCase = this.toCamelCase(options.resourceName);
    const kebabCase = this.toKebabCase(options.resourceName);
    const pluralPascalCase = this.pluralize(pascalCase);
    const pluralCamelCase = this.pluralize(camelCase);
    const pluralKebabCase = this.pluralize(kebabCase);

    const replacements = {
      '{{pascalCase}}': pascalCase,
      '{{camelCase}}': camelCase,
      '{{kebabCase}}': kebabCase,
      '{{pluralPascalCase}}': pluralPascalCase,
      '{{pluralCamelCase}}': pluralCamelCase,
      '{{pluralKebabCase}}': pluralKebabCase,
    };

    // Generate main files
    this.generateFromTemplate(
      'crud/stack.ts.template',
      path.join(basePath, 'stack.ts'),
      replacements
    );

    this.generateFromTemplate(
      'crud/resource.ts.template',
      path.join(basePath, 'resource.ts'),
      replacements
    );

    // Generate CRUD operations
    const operations = [
      { name: 'create', needsWrite: true },
      { name: 'read', needsWrite: false },
      { name: 'update', needsWrite: true },
      { name: 'delete', needsWrite: true },
      { name: 'list', needsWrite: false },
    ];

    for (const operation of operations) {
      const operationDir = path.join(basePath, `${kebabCase}-${operation.name}`);
      fs.mkdirSync(operationDir, { recursive: true });

      const operationReplacements = {
        ...replacements,
        '{{operationPascal}}': this.toPascalCase(operation.name),
        '{{operationCamel}}': this.toCamelCase(operation.name),
        '{{operationKebab}}': this.toKebabCase(operation.name),
        '{{operationLower}}': operation.name.toLowerCase(),
        '{{operationSuffix}}': operation.name === 'list' ? 's' : '',
        '{{#if needsWrite}}': operation.needsWrite ? '' : undefined,
        '{{else}}': !operation.needsWrite ? '' : undefined,
        '{{/if}}': '',
      };

      // Generate handler
      this.generateFromTemplate(
        `crud/${operation.name}-handler.ts.template`,
        path.join(operationDir, 'handler.ts'),
        operationReplacements
      );

      // Generate resource
      this.generateFromTemplate(
        'crud/operation-resource.ts.template',
        path.join(operationDir, 'resource.ts'),
        operationReplacements
      );
    }
  }

  /**
   * Generates a file from a template
   */
  private generateFromTemplate(
    templatePath: string,
    outputPath: string,
    replacements: Record<string, string | undefined>
  ): void {
    // In bundled mode, __dirname points to dist folder
    // In dev mode, __dirname points to src/generators
    // Try dist/templates first (bundled), then src/templates (dev)
    let templatesDir = path.join(__dirname, 'templates');
    if (!fs.existsSync(templatesDir)) {
      templatesDir = path.join(__dirname, '..', 'templates');
    }
    const fullTemplatePath = path.join(templatesDir, templatePath);

    let content = fs.readFileSync(fullTemplatePath, 'utf-8');

    // Handle conditional blocks
    content = this.processConditionals(content, replacements);

    // Replace all placeholders
    for (const [key, value] of Object.entries(replacements)) {
      if (value !== undefined) {
        content = content.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
      }
    }

    fs.writeFileSync(outputPath, content, 'utf-8');
  }

  /**
   * Process conditional blocks in templates
   */
  private processConditionals(
    content: string,
    replacements: Record<string, string | undefined>
  ): string {
    // Handle {{#if condition}}...{{else}}...{{/if}}
    const ifElsePattern = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;
    content = content.replace(ifElsePattern, (match, condition, truePart, falsePart) => {
      const key = `{{#if ${condition}}}`;
      return replacements[key] !== undefined ? truePart : falsePart;
    });

    // Handle {{#if condition}}...{{/if}} (no else)
    const ifPattern = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    content = content.replace(ifPattern, (match, condition, truePart) => {
      const key = `{{#if ${condition}}}`;
      return replacements[key] !== undefined ? truePart : '';
    });

    return content;
  }

  /**
   * Converts string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (c) => c.toUpperCase());
  }

  /**
   * Converts string to camelCase
   */
  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * Converts string to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Simple pluralization
   */
  private pluralize(str: string): string {
    if (str.endsWith('y')) {
      return str.slice(0, -1) + 'ies';
    } else if (str.endsWith('s') || str.endsWith('x') || str.endsWith('ch') || str.endsWith('sh')) {
      return str + 'es';
    } else {
      return str + 's';
    }
  }
}
