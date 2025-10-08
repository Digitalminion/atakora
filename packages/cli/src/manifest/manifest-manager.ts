import * as fs from 'fs';
import * as path from 'path';
import { Manifest, PackageConfig, CreateManifestOptions, AddPackageOptions } from './types';

/**
 * Manages reading and writing of the Atakora project manifest
 *
 * The manifest is stored at `.atakora/manifest.json` and contains
 * project configuration including organization, packages, and settings.
 */
export class ManifestManager {
  /**
   * Path to manifest file relative to workspace root
   */
  public static readonly MANIFEST_PATH = '.atakora/manifest.json';

  /**
   * Path to manifest directory relative to workspace root
   */
  public static readonly MANIFEST_DIR = '.atakora';

  /**
   * Current manifest schema version
   */
  public static readonly MANIFEST_VERSION = '1.0.0';

  /**
   * Default output directory for ARM templates
   */
  public static readonly DEFAULT_OUTPUT_DIR = '.atakora/arm.out';

  private readonly workspaceRoot: string;

  /**
   * Creates a new ManifestManager instance
   *
   * @param workspaceRoot - Root directory of the workspace
   */
  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Gets the absolute path to the manifest file
   *
   * @returns Absolute path to manifest.json
   */
  public getManifestPath(): string {
    return path.join(this.workspaceRoot, ManifestManager.MANIFEST_PATH);
  }

  /**
   * Gets the absolute path to the manifest directory
   *
   * @returns Absolute path to .atakora directory
   */
  public getManifestDir(): string {
    return path.join(this.workspaceRoot, ManifestManager.MANIFEST_DIR);
  }

  /**
   * Checks if manifest file exists
   *
   * @returns True if manifest exists
   */
  public exists(): boolean {
    return fs.existsSync(this.getManifestPath());
  }

  /**
   * Reads the manifest file
   *
   * @returns Parsed manifest object
   * @throws Error if manifest does not exist or is invalid JSON
   */
  public read(): Manifest {
    const manifestPath = this.getManifestPath();

    if (!this.exists()) {
      throw new Error(
        `Manifest not found at ${manifestPath}. Run 'atakora init' to initialize a project.`
      );
    }

    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      return JSON.parse(content) as Manifest;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in manifest file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Writes manifest to file
   *
   * @param manifest - Manifest object to write
   */
  public write(manifest: Manifest): void {
    const manifestPath = this.getManifestPath();
    const manifestDir = this.getManifestDir();

    // Ensure manifest directory exists
    if (!fs.existsSync(manifestDir)) {
      fs.mkdirSync(manifestDir, { recursive: true });
    }

    // Write manifest with pretty formatting
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  }

  /**
   * Creates a new manifest with initial configuration
   *
   * @param options - Options for creating manifest
   * @returns Created manifest object
   * @throws Error if manifest already exists
   */
  public create(options: CreateManifestOptions): Manifest {
    if (this.exists()) {
      throw new Error(`Project already initialized. Manifest exists at ${this.getManifestPath()}`);
    }

    const now = new Date().toISOString();

    const manifest: Manifest = {
      version: ManifestManager.MANIFEST_VERSION,
      organization: options.organization,
      project: options.project,
      defaultPackage: options.firstPackageName,
      packages: [
        {
          name: options.firstPackageName,
          path: `packages/${options.firstPackageName}`,
          entryPoint: 'bin/app.ts',
          enabled: true,
        },
      ],
      outputDirectory: options.outputDirectory || ManifestManager.DEFAULT_OUTPUT_DIR,
      createdAt: now,
      updatedAt: now,
    };

    this.write(manifest);
    return manifest;
  }

  /**
   * Adds a new package to the manifest
   *
   * @param options - Options for adding package
   * @throws Error if package already exists or manifest not found
   */
  public addPackage(options: AddPackageOptions): void {
    const manifest = this.read();

    // Check if package already exists
    const existing = manifest.packages.find((pkg) => pkg.name === options.name);
    if (existing) {
      throw new Error(`Package '${options.name}' already exists in manifest`);
    }

    // Create new package config
    const newPackage: PackageConfig = {
      name: options.name,
      path: `packages/${options.name}`,
      entryPoint: options.entryPoint || 'bin/app.ts',
      enabled: options.enabled !== false,
    };

    // Update manifest
    const updatedManifest: Manifest = {
      ...manifest,
      packages: [...manifest.packages, newPackage],
      defaultPackage: options.setAsDefault ? options.name : manifest.defaultPackage,
      updatedAt: new Date().toISOString(),
    };

    this.write(updatedManifest);
  }

  /**
   * Sets the default package
   *
   * @param packageName - Name of package to set as default
   * @throws Error if package does not exist in manifest
   */
  public setDefaultPackage(packageName: string): void {
    const manifest = this.read();

    // Validate package exists
    const pkg = manifest.packages.find((p) => p.name === packageName);
    if (!pkg) {
      throw new Error(`Package '${packageName}' not found in manifest`);
    }

    // Update manifest
    const updatedManifest: Manifest = {
      ...manifest,
      defaultPackage: packageName,
      updatedAt: new Date().toISOString(),
    };

    this.write(updatedManifest);
  }

  /**
   * Gets a package configuration by name
   *
   * @param packageName - Name of package to retrieve
   * @returns Package configuration or undefined if not found
   */
  public getPackage(packageName: string): PackageConfig | undefined {
    const manifest = this.read();
    return manifest.packages.find((pkg) => pkg.name === packageName);
  }

  /**
   * Gets the default package configuration
   *
   * @returns Default package configuration or undefined if not set
   */
  public getDefaultPackage(): PackageConfig | undefined {
    const manifest = this.read();
    if (!manifest.defaultPackage) {
      return undefined;
    }
    return this.getPackage(manifest.defaultPackage);
  }

  /**
   * Lists all packages in the manifest
   *
   * @returns Array of package configurations
   */
  public listPackages(): ReadonlyArray<PackageConfig> {
    const manifest = this.read();
    return manifest.packages;
  }
}
