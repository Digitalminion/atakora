import * as fs from 'fs';
import * as path from 'path';
import { ArmTemplate, CloudAssembly, StackManifest } from '../types';

/**
 * Writes ARM templates and manifest to disk
 */
export class FileWriter {
  /**
   * Write ARM templates to disk
   *
   * @param outdir - Output directory
   * @param stacks - Map of stack name to ARM template
   * @param prettyPrint - Whether to pretty-print JSON
   * @returns Cloud assembly with manifest
   */
  write(
    outdir: string,
    stacks: Map<string, ArmTemplate>,
    prettyPrint: boolean = true
  ): CloudAssembly {
    // Create output directory
    this.ensureDirectory(outdir);

    const stackManifests: Record<string, StackManifest> = {};

    // Write each stack template
    for (const [stackName, template] of stacks.entries()) {
      const templatePath = path.join(outdir, `${stackName}.json`);
      const relativePath = path.relative(outdir, templatePath);

      // Write template file
      this.writeJsonFile(templatePath, template, prettyPrint);

      // Create stack manifest
      stackManifests[stackName] = {
        name: stackName,
        templatePath: relativePath,
        resourceCount: template.resources.length,
        parameterCount: Object.keys(template.parameters || {}).length,
        outputCount: Object.keys(template.outputs || {}).length,
        dependencies: this.extractDependencies(template),
      };
    }

    // Create cloud assembly
    const assembly: CloudAssembly = {
      version: '1.0.0',
      stacks: stackManifests,
      directory: outdir,
    };

    // Write manifest file
    const manifestPath = path.join(outdir, 'manifest.json');
    this.writeJsonFile(manifestPath, assembly, prettyPrint);

    return assembly;
  }

  /**
   * Ensure directory exists with proper permissions
   */
  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
  }

  /**
   * Write JSON file with proper formatting
   */
  private writeJsonFile(filePath: string, data: any, prettyPrint: boolean): void {
    const json = prettyPrint ? JSON.stringify(data, null, 2) : JSON.stringify(data);

    fs.writeFileSync(filePath, json, { mode: 0o644, encoding: 'utf-8' });
  }

  /**
   * Extract dependencies from template
   */
  private extractDependencies(template: ArmTemplate): string[] {
    const dependencies = new Set<string>();

    for (const resource of template.resources) {
      if (resource.dependsOn) {
        for (const dep of resource.dependsOn) {
          // Extract resource type from dependsOn string
          const match = dep.match(/'([^']+)'/);
          if (match) {
            dependencies.add(match[1]);
          }
        }
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Clean output directory
   */
  clean(outdir: string): void {
    if (fs.existsSync(outdir)) {
      const files = fs.readdirSync(outdir);
      for (const file of files) {
        const filePath = path.join(outdir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          this.clean(filePath);
          fs.rmdirSync(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }
    }
  }
}
