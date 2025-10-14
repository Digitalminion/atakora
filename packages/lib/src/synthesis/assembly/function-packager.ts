/**
 * Function Packager - Packages Azure Functions code for "run from package" deployment
 *
 * @remarks
 * This component extracts inline function code from constructs and packages it into
 * ZIP files suitable for Azure Functions "run from package" pattern. This solves the
 * ARM template size limit problem by removing code from templates.
 *
 * Package structure:
 * ```
 * package.zip
 * ├── host.json              # Function app configuration
 * ├── {functionName}/
 * │   ├── function.json      # Function triggers and bindings
 * │   └── index.js           # Function code
 * ```
 *
 * @see docs/design/architecture/function-deployment-pattern.md
 */

import JSZip from 'jszip';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Function metadata for packaging
 */
export interface FunctionMetadata {
  /**
   * Function name (used for directory name in package)
   */
  readonly functionName: string;

  /**
   * JavaScript code for the function
   */
  readonly code: string;

  /**
   * HTTP trigger configuration
   */
  readonly httpTrigger?: {
    methods: string[];
    authLevel?: 'anonymous' | 'function' | 'admin';
    route?: string;
  };

  /**
   * Other bindings (Cosmos, Storage, etc.)
   */
  readonly bindings?: FunctionBinding[];
}

/**
 * Function binding configuration
 */
export interface FunctionBinding {
  readonly type: string;
  readonly direction: 'in' | 'out';
  readonly name: string;
  readonly [key: string]: any;
}

/**
 * Function App metadata for packaging
 */
export interface FunctionAppMetadata {
  /**
   * Function App name
   */
  readonly functionAppName: string;

  /**
   * Functions to include in package
   */
  readonly functions: FunctionMetadata[];

  /**
   * Node.js runtime version
   */
  readonly runtime?: string;

  /**
   * Extension bundle version
   */
  readonly extensionBundle?: {
    id: string;
    version: string;
  };
}

/**
 * Function package result
 */
export interface FunctionPackage {
  /**
   * Path to the ZIP package file
   */
  readonly packagePath: string;

  /**
   * Function App name this package belongs to
   */
  readonly functionAppName: string;

  /**
   * List of function names in this package
   */
  readonly functions: readonly string[];

  /**
   * Package size in bytes
   */
  readonly size: number;

  /**
   * SHA-256 hash of the package
   */
  readonly hash: string;

  /**
   * Package structure metadata
   */
  readonly structure: PackageStructure;
}

/**
 * Package structure metadata
 */
export interface PackageStructure {
  readonly hostJson: object;
  readonly functionJsons: Record<string, object>;
  readonly codeFiles: Record<string, string>;
}

/**
 * Function Packager options
 */
export interface FunctionPackagerOptions {
  /**
   * Output directory for packages (default: temp directory)
   */
  outputDir?: string;

  /**
   * Enable code minification (default: false)
   */
  minify?: boolean;

  /**
   * Compression level 0-9 (default: 9)
   */
  compressionLevel?: number;
}

/**
 * Function Packager - creates deployment packages for Azure Functions
 */
export class FunctionPackager {
  private readonly outputDir: string;
  private readonly minify: boolean;
  private readonly compressionLevel: number;

  constructor(options: FunctionPackagerOptions = {}) {
    this.outputDir = options.outputDir || os.tmpdir();
    this.minify = options.minify ?? false;
    this.compressionLevel = options.compressionLevel ?? 9;
  }

  /**
   * Package functions for a Function App
   *
   * @param functionApp - Function App metadata
   * @returns Function package with path and metadata
   *
   * @remarks
   * This method creates a complete Azure Functions deployment package:
   * 1. Generate host.json for function app configuration
   * 2. For each function:
   *    - Generate function.json with triggers and bindings
   *    - Include JavaScript code (optionally minified)
   * 3. Create ZIP package with proper structure
   * 4. Calculate hash for integrity validation
   */
  async package(functionApp: FunctionAppMetadata): Promise<FunctionPackage> {
    const zip = new JSZip();

    // Generate host.json
    const hostJson = this.generateHostJson(functionApp);
    zip.file('host.json', JSON.stringify(hostJson, null, 2));

    // Generate function.json and code for each function
    const functionJsons: Record<string, object> = {};
    const codeFiles: Record<string, string> = {};

    for (const func of functionApp.functions) {
      const functionJson = this.generateFunctionJson(func);
      functionJsons[func.functionName] = functionJson;

      // Create function directory
      const funcDir = `${func.functionName}/`;
      zip.file(`${funcDir}function.json`, JSON.stringify(functionJson, null, 2));

      // Add function code (optionally minified)
      const code = this.minify ? await this.minifyCode(func.code) : func.code;
      zip.file(`${funcDir}index.js`, code);
      codeFiles[func.functionName] = `${funcDir}index.js`;
    }

    // Generate ZIP package
    const packageBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: this.compressionLevel,
      },
    });

    // Write to file
    const packagePath = path.join(
      this.outputDir,
      `${functionApp.functionAppName}-${Date.now()}.zip`
    );
    await fs.writeFile(packagePath, packageBuffer);

    // Calculate hash
    const hash = this.calculateHash(packageBuffer);

    // Get file size
    const stats = await fs.stat(packagePath);

    return {
      packagePath,
      functionAppName: functionApp.functionAppName,
      functions: functionApp.functions.map((f) => f.functionName),
      size: stats.size,
      hash,
      structure: {
        hostJson,
        functionJsons,
        codeFiles,
      },
    };
  }

  /**
   * Generate host.json for Function App
   *
   * @param functionApp - Function App metadata
   * @returns host.json object
   *
   * @remarks
   * host.json configures the function app runtime, logging, and extension bundles.
   * The extension bundle allows using bindings without explicitly installing extensions.
   */
  generateHostJson(functionApp: FunctionAppMetadata): object {
    return {
      version: '2.0',
      logging: {
        applicationInsights: {
          samplingSettings: {
            isEnabled: true,
            excludedTypes: 'Request',
          },
        },
      },
      extensionBundle: functionApp.extensionBundle || {
        id: 'Microsoft.Azure.Functions.ExtensionBundle',
        version: '[3.*, 4.0.0)',
      },
    };
  }

  /**
   * Generate function.json for a function
   *
   * @param func - Function metadata
   * @returns function.json object
   *
   * @remarks
   * function.json defines the triggers and bindings for the function.
   * Each function must have exactly one trigger and can have multiple input/output bindings.
   */
  generateFunctionJson(func: FunctionMetadata): object {
    const bindings: any[] = [];

    // Add HTTP trigger if present
    if (func.httpTrigger) {
      bindings.push({
        authLevel: func.httpTrigger.authLevel || 'function',
        type: 'httpTrigger',
        direction: 'in',
        name: 'req',
        methods: func.httpTrigger.methods,
        route: func.httpTrigger.route,
      });

      // Add HTTP output binding
      bindings.push({
        type: 'http',
        direction: 'out',
        name: 'res',
      });
    }

    // Add additional bindings
    if (func.bindings) {
      bindings.push(...func.bindings);
    }

    return {
      bindings,
    };
  }

  /**
   * Minify JavaScript code
   *
   * @param code - JavaScript code to minify
   * @returns Minified code
   *
   * @remarks
   * This is a simple minification that removes comments and extra whitespace.
   * For production, consider using a proper minifier like terser.
   */
  private async minifyCode(code: string): Promise<string> {
    // Simple minification: remove comments and extra whitespace
    // For production, use terser or similar
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*/g, '') // Remove line comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();
  }

  /**
   * Calculate SHA-256 hash of buffer
   *
   * @param buffer - Buffer to hash
   * @returns Hash string in format "sha256:hexdigest"
   */
  private calculateHash(buffer: Buffer): string {
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return `sha256:${hash.digest('hex')}`;
  }

  /**
   * Create a ZIP package from files
   *
   * @param files - Map of file paths to content
   * @returns Buffer containing ZIP data
   *
   * @remarks
   * This is a lower-level method for creating custom packages.
   * Most users should use the `package()` method instead.
   */
  async createZipPackage(files: Map<string, string | Buffer>): Promise<Buffer> {
    const zip = new JSZip();

    for (const [filePath, content] of files) {
      zip.file(filePath, content);
    }

    return zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: this.compressionLevel,
      },
    });
  }

  /**
   * Extract package to directory (for debugging)
   *
   * @param packagePath - Path to ZIP package
   * @param extractDir - Directory to extract to
   *
   * @remarks
   * Useful for debugging package contents during development.
   */
  async extractPackage(packagePath: string, extractDir: string): Promise<void> {
    const data = await fs.readFile(packagePath);
    const zip = await JSZip.loadAsync(data);

    for (const [relativePath, file] of Object.entries(zip.files)) {
      if (file.dir) continue;

      const content = await file.async('nodebuffer');
      const fullPath = path.join(extractDir, relativePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
    }
  }

  /**
   * Validate package structure
   *
   * @param packagePath - Path to ZIP package
   * @returns Validation result
   *
   * @remarks
   * Checks that the package has required files:
   * - host.json must exist
   * - Each function must have function.json and index.js
   */
  async validatePackage(packagePath: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const data = await fs.readFile(packagePath);
    const zip = await JSZip.loadAsync(data);

    // Check for host.json
    if (!zip.files['host.json']) {
      errors.push('Missing host.json');
    }

    // Find all function.json files
    const functionJsonFiles = Object.keys(zip.files).filter((path) =>
      path.endsWith('function.json')
    );

    if (functionJsonFiles.length === 0) {
      errors.push('No functions found in package');
    }

    // Check each function has index.js
    for (const functionJsonPath of functionJsonFiles) {
      const functionDir = path.dirname(functionJsonPath);
      const indexPath = path.join(functionDir, 'index.js').replace(/\\/g, '/');

      if (!zip.files[indexPath]) {
        errors.push(`Missing index.js for function: ${functionDir}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
