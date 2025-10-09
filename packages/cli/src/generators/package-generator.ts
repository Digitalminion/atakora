import * as fs from 'fs';
import * as path from 'path';

/**
 * Options for generating a new package
 */
export interface GeneratePackageOptions {
  /**
   * Package name
   */
  readonly packageName: string;

  /**
   * Workspace root directory
   */
  readonly workspaceRoot: string;

  /**
   * Organization name for package.json
   */
  readonly organization: string;

  /**
   * Entry point file path relative to package
   * @default "bin/app.ts"
   */
  readonly entryPoint?: string;
}

/**
 * Generates package directory structure and files
 */
export class PackageGenerator {
  /**
   * Generates a new package with standard directory structure
   *
   * Creates:
   * - packages/{name}/
   * - packages/{name}/bin/app.ts
   * - packages/{name}/lib/
   * - packages/{name}/package.json
   * - packages/{name}/tsconfig.json
   *
   * @param options - Package generation options
   */
  public generate(options: GeneratePackageOptions): void {
    const packagePath = path.join(options.workspaceRoot, 'packages', options.packageName);
    const entryPoint = options.entryPoint || 'bin/app.ts';

    // Check if package directory already exists
    if (fs.existsSync(packagePath)) {
      throw new Error(`Package directory already exists: ${packagePath}`);
    }

    // Create directory structure
    this.createDirectories(packagePath, entryPoint);

    // Generate files
    this.generatePackageJson(packagePath, options.packageName, options.organization);
    this.generateTsConfig(packagePath);
    this.generateAppFile(packagePath, entryPoint, options.packageName);
    this.generateReadme(packagePath, options.packageName);
  }

  /**
   * Creates directory structure for package
   */
  private createDirectories(packagePath: string, entryPoint: string): void {
    // Create main package directory
    fs.mkdirSync(packagePath, { recursive: true });

    // Create bin directory if entry point is in bin/
    const entryDir = path.dirname(entryPoint);
    if (entryDir !== '.') {
      fs.mkdirSync(path.join(packagePath, entryDir), { recursive: true });
    }

    // Create lib directory for additional code
    fs.mkdirSync(path.join(packagePath, 'lib'), { recursive: true });
  }

  /**
   * Generates package.json file
   */
  private generatePackageJson(
    packagePath: string,
    packageName: string,
    organization: string
  ): void {
    const packageJson = {
      name: `@${this.slugify(organization)}/${packageName}`,
      version: '0.1.0',
      private: true,
      description: `${packageName} infrastructure package`,
      main: './dist/index.js',
      scripts: {
        build: 'tsc',
        synth: 'atakora synth',
        clean: 'rm -rf ./dist',
      },
      dependencies: {
        '@atakora/lib': '*',
        '@atakora/cdk': '*',
        constructs: '^10.4.2',
      },
      devDependencies: {
        '@types/node': '^24.6.2',
        typescript: '^5.9.3',
      },
    };

    fs.writeFileSync(
      path.join(packagePath, 'package.json'),
      JSON.stringify(packageJson, null, 2) + '\n',
      'utf-8'
    );
  }

  /**
   * Generates tsconfig.json file
   */
  private generateTsConfig(packagePath: string): void {
    const tsConfig = {
      extends: '../../tsconfig.json',
      compilerOptions: {
        outDir: './dist',
        rootDir: '.',
        composite: true,
        declaration: true,
        declarationMap: true,
      },
      include: ['**/*.ts'],
      exclude: ['node_modules', 'dist'],
    };

    fs.writeFileSync(
      path.join(packagePath, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2) + '\n',
      'utf-8'
    );
  }

  /**
   * Generates app entry point file
   */
  private generateAppFile(packagePath: string, entryPoint: string, packageName: string): void {
    const appContent = `import { App } from '@atakora/lib';
// Import Azure resources from @atakora/cdk namespaces
// import { VirtualNetworks, NetworkSecurityGroups } from '@atakora/cdk/network';
// import { StorageAccounts } from '@atakora/cdk/storage';

/**
 * ${packageName} infrastructure application
 *
 * This is the entry point for your infrastructure definition.
 * Define your Azure resources using Atakora constructs here.
 */

// Create app instance
export const app = new App();

// TODO: Add your infrastructure stacks here
// Example:
// import { MyStack } from '../lib/my-stack';
// new MyStack(app, 'MyStack', {
//   // stack configuration
// });

// Synthesize ARM templates
if (require.main === module) {
  app.synth();
}
`;

    const appPath = path.join(packagePath, entryPoint);
    fs.writeFileSync(appPath, appContent, 'utf-8');
  }

  /**
   * Generates README.md file
   */
  private generateReadme(packagePath: string, packageName: string): void {
    const readme = `# ${packageName}

Infrastructure package for ${packageName}.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Define your infrastructure in \`bin/app.ts\`

3. Synthesize ARM templates:
   \`\`\`bash
   npm run synth
   \`\`\`

## Project Structure

- \`bin/\` - Entry point and application definition
- \`lib/\` - Reusable infrastructure constructs
- \`dist/\` - Compiled TypeScript output

## Available Scripts

- \`npm run build\` - Compile TypeScript
- \`npm run synth\` - Synthesize ARM templates
- \`npm run clean\` - Remove build artifacts
`;

    fs.writeFileSync(path.join(packagePath, 'README.md'), readme, 'utf-8');
  }

  /**
   * Converts organization name to URL-safe slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
