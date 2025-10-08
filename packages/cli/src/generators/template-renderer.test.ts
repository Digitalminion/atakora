import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TemplateRenderer } from './template-renderer';

describe('TemplateRenderer', () => {
  let renderer: TemplateRenderer;
  let tempDir: string;

  beforeEach(() => {
    renderer = new TemplateRenderer();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'template-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('render', () => {
    it('should replace single variable in template', () => {
      const templatePath = path.join(tempDir, 'test.template');
      fs.writeFileSync(templatePath, 'Hello {{name}}!');

      const result = renderer.render(templatePath, { organization: 'World' });

      expect(result).toBe('Hello {{name}}!'); // organization != name
    });

    it('should replace multiple occurrences of same variable', () => {
      const templatePath = path.join(tempDir, 'test.template');
      fs.writeFileSync(templatePath, '{{project}} is a {{project}} project for {{project}}');

      const result = renderer.render(templatePath, { project: 'atakora' });

      expect(result).toBe('atakora is a atakora project for atakora');
    });

    it('should replace multiple different variables', () => {
      const templatePath = path.join(tempDir, 'test.template');
      fs.writeFileSync(templatePath, '@{{organization}}/{{packageName}}');

      const result = renderer.render(templatePath, {
        organization: 'contoso',
        packageName: 'foundation',
      });

      expect(result).toBe('@contoso/foundation');
    });

    it('should handle templates with no variables', () => {
      const templatePath = path.join(tempDir, 'test.template');
      const content = 'This has no variables';
      fs.writeFileSync(templatePath, content);

      const result = renderer.render(templatePath, {});

      expect(result).toBe(content);
    });

    it('should leave unmatched placeholders unchanged', () => {
      const templatePath = path.join(tempDir, 'test.template');
      fs.writeFileSync(templatePath, 'Hello {{name}} from {{organization}}');

      const result = renderer.render(templatePath, { organization: 'contoso' });

      expect(result).toBe('Hello {{name}} from contoso');
    });

    it('should handle undefined variable values', () => {
      const templatePath = path.join(tempDir, 'test.template');
      fs.writeFileSync(templatePath, 'Hello {{organization}}');

      const result = renderer.render(templatePath, { organization: undefined });

      expect(result).toBe('Hello {{organization}}');
    });

    it('should throw error if template file does not exist', () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.template');

      expect(() => {
        renderer.render(nonExistentPath, {});
      }).toThrow('Template file not found');
    });

    it('should preserve line endings', () => {
      const templatePath = path.join(tempDir, 'test.template');
      fs.writeFileSync(templatePath, 'Line 1\nLine 2\r\nLine 3');

      const result = renderer.render(templatePath, {});

      expect(result).toBe('Line 1\nLine 2\r\nLine 3');
    });
  });

  describe('renderToFile', () => {
    it('should render template and write to file', () => {
      const templatePath = path.join(tempDir, 'test.template');
      const outputPath = path.join(tempDir, 'output.txt');
      fs.writeFileSync(templatePath, 'Project: {{project}}');

      renderer.renderToFile(templatePath, outputPath, { project: 'atakora' });

      expect(fs.existsSync(outputPath)).toBe(true);
      expect(fs.readFileSync(outputPath, 'utf-8')).toBe('Project: atakora');
    });

    it('should create parent directories if they do not exist', () => {
      const templatePath = path.join(tempDir, 'test.template');
      const outputPath = path.join(tempDir, 'nested', 'dir', 'output.txt');
      fs.writeFileSync(templatePath, 'Content');

      renderer.renderToFile(templatePath, outputPath, {});

      expect(fs.existsSync(outputPath)).toBe(true);
      expect(fs.readFileSync(outputPath, 'utf-8')).toBe('Content');
    });

    it('should overwrite existing files', () => {
      const templatePath = path.join(tempDir, 'test.template');
      const outputPath = path.join(tempDir, 'output.txt');
      fs.writeFileSync(templatePath, 'New content');
      fs.writeFileSync(outputPath, 'Old content');

      renderer.renderToFile(templatePath, outputPath, {});

      expect(fs.readFileSync(outputPath, 'utf-8')).toBe('New content');
    });
  });

  describe('renderBatch', () => {
    it('should render multiple templates', () => {
      const template1 = path.join(tempDir, 'template1.template');
      const template2 = path.join(tempDir, 'template2.template');
      const output1 = path.join(tempDir, 'output1.txt');
      const output2 = path.join(tempDir, 'output2.txt');

      fs.writeFileSync(template1, 'Org: {{organization}}');
      fs.writeFileSync(template2, 'Project: {{project}}');

      renderer.renderBatch(
        [
          [template1, output1],
          [template2, output2],
        ],
        { organization: 'contoso', project: 'infra' }
      );

      expect(fs.readFileSync(output1, 'utf-8')).toBe('Org: contoso');
      expect(fs.readFileSync(output2, 'utf-8')).toBe('Project: infra');
    });

    it('should use same variables for all templates', () => {
      const template1 = path.join(tempDir, 'template1.template');
      const template2 = path.join(tempDir, 'template2.template');
      const output1 = path.join(tempDir, 'output1.txt');
      const output2 = path.join(tempDir, 'output2.txt');

      fs.writeFileSync(template1, '{{organization}}');
      fs.writeFileSync(template2, '{{organization}}');

      renderer.renderBatch(
        [
          [template1, output1],
          [template2, output2],
        ],
        { organization: 'contoso' }
      );

      expect(fs.readFileSync(output1, 'utf-8')).toBe('contoso');
      expect(fs.readFileSync(output2, 'utf-8')).toBe('contoso');
    });
  });

  describe('getTemplatePath', () => {
    it('should return absolute path to template', () => {
      const templateName = 'package-main.ts.template';

      const result = renderer.getTemplatePath(templateName);

      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain('templates');
      expect(result).toContain(templateName);
    });

    it('should resolve path relative to templates directory', () => {
      const templateName = 'readme.md.template';

      const result = renderer.getTemplatePath(templateName);

      expect(result).toMatch(/templates[/\\]readme\.md\.template$/);
    });
  });
});
