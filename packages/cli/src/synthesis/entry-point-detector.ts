/**
 * Entry Point Detection System
 *
 * Detects whether an entry point module exports a CDK-style app or
 * a component-style backend, enabling dual-path synthesis in the CLI.
 *
 * @module @atakora/cli/synthesis/entry-point-detector
 *
 * @remarks
 * This detector is the first step in the CLI synthesis pipeline. It analyzes
 * module exports to determine the appropriate synthesis strategy without
 * breaking backwards compatibility with existing CDK apps.
 *
 * Detection Priority (intentional):
 * 1. CDK app (`exports.app` or `exports.default` with synth())
 * 2. Component backend (`exports.backend` or `exports.default` with schema/settings)
 * 3. Unknown (error case)
 *
 * The CDK app check comes first to ensure backwards compatibility - if a module
 * exports both an app and a backend, the app takes precedence.
 *
 * @example
 * Detecting CDK app:
 * ```typescript
 * // app.ts
 * export const app = new App();
 * new MyStack(app, 'Stack');
 *
 * // In CLI
 * const detector = new EntryPointDetector();
 * const result = detector.detect(require('./app.ts'));
 * // result.type === EntryPointType.CDK_APP
 * ```
 *
 * @example
 * Detecting component backend:
 * ```typescript
 * // backend.ts
 * export const backend = defineBackend({ schema, settings });
 *
 * // In CLI
 * const detector = new EntryPointDetector();
 * const result = detector.detect(require('./backend.ts'));
 * // result.type === EntryPointType.COMPONENT_BACKEND
 * ```
 */

/**
 * Entry point types supported by the CLI
 */
export enum EntryPointType {
  /** CDK-style app with construct tree and synth() method */
  CDK_APP = 'cdk-app',
  /** Component-style backend with schema and settings */
  COMPONENT_BACKEND = 'component-backend',
  /** Unknown or unsupported entry point type */
  UNKNOWN = 'unknown',
}

/**
 * Metadata about a detected backend
 */
export interface BackendMetadata {
  /** Backend has a schema definition */
  hasBackendSchema: boolean;
  /** Backend has settings configuration */
  hasBackendSettings: boolean;
  /** Backend has authentication configuration */
  hasBackendAuth: boolean;
}

/**
 * Metadata about a detected CDK app
 */
export interface CdkAppMetadata {
  /** App has synth() method */
  hasSynthMethod: boolean;
}

/**
 * Result of entry point detection
 */
export interface DetectionResult {
  /** Type of entry point detected */
  type: EntryPointType;
  /** The actual entry point object (app or backend) */
  entryPoint: any;
  /** Metadata about the detected entry point */
  metadata?: BackendMetadata | CdkAppMetadata;
}

/**
 * Entry Point Detector
 *
 * Analyzes module exports to determine synthesis strategy.
 *
 * @remarks
 * This class provides robust type detection with clear error messages
 * for unsupported entry points. It prioritizes backwards compatibility
 * by checking for CDK apps before component backends.
 *
 * Detection Logic:
 * 1. Check `exports.app` for CDK app
 * 2. Check `exports.default` for CDK app
 * 3. Check `exports.backend` for component backend
 * 4. Check `exports.default` for component backend
 * 5. Return UNKNOWN if no match
 *
 * Type Guards:
 * - CDK app: Has synth() method
 * - Component backend: Has schema and settings objects
 *
 * @example
 * Basic usage:
 * ```typescript
 * const detector = new EntryPointDetector();
 * const module = require('./my-entry-point.ts');
 * const result = detector.detect(module);
 *
 * if (result.type === EntryPointType.CDK_APP) {
 *   console.log('Detected CDK app');
 *   await result.entryPoint.synth();
 * } else if (result.type === EntryPointType.COMPONENT_BACKEND) {
 *   console.log('Detected component backend');
 *   // Use BackendSynthesisStrategy
 * } else {
 *   console.error('Unknown entry point type');
 * }
 * ```
 */
export class EntryPointDetector {
  /**
   * Detect entry point type from module exports
   *
   * @param moduleExports - Module exports object (from require() or import)
   * @returns Detection result with type and metadata
   *
   * @remarks
   * This method checks for CDK apps first (backwards compatibility),
   * then component backends, then returns UNKNOWN.
   *
   * The detection is non-destructive - it only reads properties and
   * doesn't modify the entry point object.
   *
   * @example
   * ```typescript
   * const detector = new EntryPointDetector();
   * const result = detector.detect({ app: new App() });
   * // result.type === 'cdk-app'
   * ```
   */
  detect(moduleExports: any): DetectionResult {
    // Handle null/undefined exports
    if (!moduleExports || typeof moduleExports !== 'object') {
      return {
        type: EntryPointType.UNKNOWN,
        entryPoint: null,
      };
    }

    // Check for CDK app in exports.app
    if (this.isCdkApp(moduleExports.app)) {
      return {
        type: EntryPointType.CDK_APP,
        entryPoint: moduleExports.app,
        metadata: { hasSynthMethod: true },
      };
    }

    // Check for CDK app in exports.default
    if (this.isCdkApp(moduleExports.default)) {
      return {
        type: EntryPointType.CDK_APP,
        entryPoint: moduleExports.default,
        metadata: { hasSynthMethod: true },
      };
    }

    // Check for component backend in exports.backend
    if (this.isComponentBackend(moduleExports.backend)) {
      return {
        type: EntryPointType.COMPONENT_BACKEND,
        entryPoint: moduleExports.backend,
        metadata: this.analyzeBackend(moduleExports.backend),
      };
    }

    // Check for component backend in exports.default
    if (this.isComponentBackend(moduleExports.default)) {
      return {
        type: EntryPointType.COMPONENT_BACKEND,
        entryPoint: moduleExports.default,
        metadata: this.analyzeBackend(moduleExports.default),
      };
    }

    // Unknown type
    return {
      type: EntryPointType.UNKNOWN,
      entryPoint: null,
    };
  }

  /**
   * Type guard for CDK apps
   *
   * @param obj - Object to check
   * @returns True if object is a CDK app
   *
   * @remarks
   * A CDK app must:
   * - Be an object
   * - Have a synth() method
   *
   * This is the minimum contract for CDK-style synthesis.
   */
  private isCdkApp(obj: any): boolean {
    return obj && typeof obj === 'object' && typeof obj.synth === 'function';
  }

  /**
   * Type guard for component backends
   *
   * @param obj - Object to check
   * @returns True if object is a component backend
   *
   * @remarks
   * A component backend must:
   * - Be an object
   * - Have a schema property
   * - Have a settings object property
   *
   * This matches the contract from defineBackend().
   */
  private isComponentBackend(obj: any): boolean {
    return (
      obj &&
      typeof obj === 'object' &&
      obj.schema !== undefined &&
      obj.settings &&
      typeof obj.settings === 'object'
    );
  }

  /**
   * Analyze backend structure for metadata
   *
   * @param backend - Backend object to analyze
   * @returns Metadata about backend capabilities
   *
   * @remarks
   * This provides detailed information about the backend for
   * logging and debugging purposes.
   */
  private analyzeBackend(backend: any): BackendMetadata {
    return {
      hasBackendSchema: !!backend.schema,
      hasBackendSettings: !!backend.settings,
      hasBackendAuth: !!backend.authentication,
    };
  }

  /**
   * Get human-readable description of detection result
   *
   * @param result - Detection result
   * @returns User-friendly description
   *
   * @remarks
   * Provides clear messaging for CLI output.
   *
   * @example
   * ```typescript
   * const detector = new EntryPointDetector();
   * const result = detector.detect(moduleExports);
   * console.log(detector.getDescription(result));
   * // "Detected CDK app with synth() method"
   * ```
   */
  getDescription(result: DetectionResult): string {
    switch (result.type) {
      case EntryPointType.CDK_APP:
        return 'Detected CDK app with synth() method';

      case EntryPointType.COMPONENT_BACKEND:
        const meta = result.metadata as BackendMetadata;
        const features: string[] = [];
        if (meta.hasBackendSchema) features.push('schema');
        if (meta.hasBackendSettings) features.push('settings');
        if (meta.hasBackendAuth) features.push('authentication');
        return `Detected component backend with: ${features.join(', ')}`;

      case EntryPointType.UNKNOWN:
        return 'Unknown entry point type - must export app or backend';

      default:
        return 'Unknown entry point type';
    }
  }

  /**
   * Get error message for unknown entry points
   *
   * @param moduleExports - Module exports that failed detection
   * @returns Detailed error message with guidance
   *
   * @remarks
   * Provides actionable guidance to help users fix their entry points.
   *
   * @example
   * ```typescript
   * const detector = new EntryPointDetector();
   * const result = detector.detect(moduleExports);
   * if (result.type === EntryPointType.UNKNOWN) {
   *   throw new Error(detector.getErrorMessage(moduleExports));
   * }
   * ```
   */
  getErrorMessage(moduleExports: any): string {
    const exportedKeys = Object.keys(moduleExports || {});

    return (
      'Entry point must export either:\n' +
      '  - "app" or default export with synth() method (CDK-style)\n' +
      '  - "backend" or default export with schema/settings (Component-style)\n' +
      '\n' +
      `Current exports: ${exportedKeys.length > 0 ? exportedKeys.join(', ') : '(none)'}\n` +
      '\n' +
      'Examples:\n' +
      '  CDK-style:       export const app = new App();\n' +
      '  Component-style: export const backend = defineBackend({...});'
    );
  }
}
