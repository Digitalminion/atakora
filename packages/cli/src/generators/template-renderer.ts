import * as fs from 'fs';
import * as path from 'path';

/**
 * Template variable substitution values.
 */
export interface TemplateVariables {
  /** Organization name (e.g., 'contoso') */
  organization?: string;
  /** Project name (e.g., 'azure-infrastructure') */
  project?: string;
  /** Project name for package.json (e.g., 'azure-infrastructure') */
  projectName?: string;
  /** Package name (e.g., 'foundation') */
  packageName?: string;
  /** Default package name (e.g., 'foundation') */
  defaultPackage?: string;
}

/**
 * Renders template files with variable substitution.
 *
 * Supports simple {{variable}} placeholder syntax for string replacement.
 * Variables are replaced globally throughout the template content.
 *
 * @example
 * ```typescript
 * const renderer = new TemplateRenderer();
 * const content = renderer.render(
 *   '/path/to/template.ts.template',
 *   { organization: 'contoso', project: 'infra' }
 * );
 * ```
 */
export class TemplateRenderer {
  /**
   * Render a template file with variable substitution.
   *
   * @param templatePath - Absolute path to the template file
   * @param variables - Key-value pairs for variable substitution
   * @returns Rendered template content with variables replaced
   *
   * @throws Error if template file cannot be read
   */
  render(templatePath: string, variables: TemplateVariables): string {
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    const template = fs.readFileSync(templatePath, 'utf-8');

    // Simple string replacement for all variables
    // Replace {{key}} with value for each variable
    return Object.entries(variables).reduce((content, [key, value]) => {
      if (value !== undefined) {
        return content.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
      return content;
    }, template);
  }

  /**
   * Render a template file and write the output to disk.
   *
   * Creates parent directories if they don't exist.
   * Preserves line endings from the template file.
   *
   * @param templatePath - Absolute path to the template file
   * @param outputPath - Absolute path where rendered content should be written
   * @param variables - Key-value pairs for variable substitution
   *
   * @throws Error if template cannot be read or output cannot be written
   *
   * @example
   * ```typescript
   * renderer.renderToFile(
   *   '/templates/package.json.template',
   *   '/project/package.json',
   *   { organization: 'contoso', packageName: 'foundation' }
   * );
   * ```
   */
  renderToFile(templatePath: string, outputPath: string, variables: TemplateVariables): void {
    const content = this.render(templatePath, variables);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, content, 'utf-8');
  }

  /**
   * Batch render multiple templates to their output locations.
   *
   * Useful for scaffolding entire project structures.
   * All templates share the same variable substitution values.
   *
   * @param templates - Array of [templatePath, outputPath] tuples
   * @param variables - Key-value pairs for variable substitution
   *
   * @throws Error if any template cannot be rendered
   *
   * @example
   * ```typescript
   * renderer.renderBatch([
   *   ['/templates/package.json.template', '/project/package.json'],
   *   ['/templates/tsconfig.json.template', '/project/tsconfig.json'],
   * ], { organization: 'contoso', project: 'infra' });
   * ```
   */
  renderBatch(templates: Array<[string, string]>, variables: TemplateVariables): void {
    for (const [templatePath, outputPath] of templates) {
      this.renderToFile(templatePath, outputPath, variables);
    }
  }

  /**
   * Get the absolute path to a built-in template file.
   *
   * Resolves template names to their full paths in the templates directory.
   *
   * @param templateName - Name of the template file (e.g., 'package-main.ts.template')
   * @returns Absolute path to the template file
   *
   * @example
   * ```typescript
   * const templatePath = renderer.getTemplatePath('package-main.ts.template');
   * // Returns: '/path/to/cli/src/templates/package-main.ts.template'
   * ```
   */
  getTemplatePath(templateName: string): string {
    return path.join(__dirname, '..', 'templates', templateName);
  }
}
