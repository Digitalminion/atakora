/**
 * Entry Point Detector for CLI Synthesis
 *
 * Automatically detects whether a module exports a CDK-style app or a component-style backend.
 * This enables the CLI `atakora synth` command to work with both CDK apps and component backends
 * without breaking existing functionality.
 *
 * @module @atakora/cli/commands/synth/entry-point-detector
 */

import type { App } from '@atakora/cdk';
import type { BackendObject } from '@atakora/component';

/**
 * Entry point types that can be detected
 */
export type EntryPointType = 'cdk-app' | 'component-backend' | 'unknown';

/**
 * Result of entry point detection
 */
export interface DetectionResult {
  /** Type of entry point detected */
  type: EntryPointType;
  /** The detected entry point (app or backend object) */
  entryPoint: App | BackendObject | null;
  /** Confidence level of detection */
  confidence: 'high' | 'medium' | 'low';
  /** Human-readable reason for detection result */
  reason: string;
}

/**
 * Entry Point Detector
 *
 * Detects whether a module exports a CDK app or component backend by inspecting
 * the module's exports and checking for type-specific properties.
 *
 * Detection Priority:
 * 1. CDK App (for backwards compatibility)
 * 2. Component Backend
 *
 * @remarks
 * This class uses runtime property inspection rather than TypeScript type checking
 * to determine entry point types, enabling it to work with dynamically loaded modules.
 *
 * @example
 * ```typescript
 * const detector = new EntryPointDetector();
 * const module = await import('./my-app');
 * const result = detector.detect(module);
 *
 * if (result.type === 'cdk-app') {
 *   const app = result.entryPoint as App;
 *   await app.synth();
 * } else if (result.type === 'component-backend') {
 *   const backend = result.entryPoint as BackendObject;
 *   // Use BackendAdapter to synthesize
 * }
 * ```
 */
export class EntryPointDetector {
  /**
   * Detect the type of entry point exported by a module
   *
   * Checks both named exports (app, backend) and default export
   * for CDK App or component backend patterns.
   *
   * @param module - The imported module to inspect
   * @returns Detection result with type, entry point, confidence, and reason
   *
   * @remarks
   * Detection is performed in priority order:
   * 1. module.app (CDK App)
   * 2. module.default (CDK App)
   * 3. module.backend (Component Backend)
   * 4. module.default (Component Backend)
   *
   * This priority ensures backwards compatibility with existing CDK apps.
   */
  detect(module: any): DetectionResult {
    // Handle null/undefined module
    if (!module || typeof module !== 'object') {
      return {
        type: 'unknown',
        entryPoint: null,
        confidence: 'low',
        reason: 'Module is null, undefined, or not an object',
      };
    }

    // Priority 1: Check for CDK App (backwards compatibility)
    if (this.isCdkApp(module.app)) {
      return {
        type: 'cdk-app',
        entryPoint: module.app,
        confidence: 'high',
        reason: 'Module exports app with synth() method',
      };
    }

    if (this.isCdkApp(module.default)) {
      return {
        type: 'cdk-app',
        entryPoint: module.default,
        confidence: 'high',
        reason: 'Module default export is app with synth() method',
      };
    }

    // Priority 2: Check for component backend
    if (this.isComponentBackend(module.backend)) {
      return {
        type: 'component-backend',
        entryPoint: module.backend,
        confidence: 'high',
        reason: 'Module exports backend with schema and settings',
      };
    }

    if (this.isComponentBackend(module.default)) {
      return {
        type: 'component-backend',
        entryPoint: module.default,
        confidence: 'high',
        reason: 'Module default export is backend with schema and settings',
      };
    }

    // Not recognized
    return {
      type: 'unknown',
      entryPoint: null,
      confidence: 'low',
      reason: 'Module does not export recognizable CDK app or component backend',
    };
  }

  /**
   * Check if value is a CDK App
   *
   * CDK Apps are identified by:
   * - synth() method (required)
   * - node property (required)
   * - stacks property (optional)
   *
   * @param value - Value to check
   * @returns True if value is a CDK App
   *
   * @example
   * ```typescript
   * const detector = new EntryPointDetector();
   * const app = new App();
   * detector.isCdkApp(app); // true
   * detector.isCdkApp({}); // false
   * ```
   */
  private isCdkApp(value: any): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }

    // CDK App has:
    // - synth() method (required)
    // - node property (required)
    // - Optional: stacks property
    return (
      typeof value.synth === 'function' &&
      value.node !== undefined
    );
  }

  /**
   * Check if value is a component backend
   *
   * Component backends are identified by:
   * - schema property (object, required)
   * - settings property (object with name, required)
   * - Optional: authentication, storage, compute, etc.
   *
   * @param value - Value to check
   * @returns True if value is a component backend
   *
   * @example
   * ```typescript
   * const detector = new EntryPointDetector();
   * const backend = defineBackend({
   *   schema,
   *   settings: { name: 'my-app' }
   * });
   * detector.isComponentBackend(backend); // true
   * detector.isComponentBackend({}); // false
   * ```
   */
  private isComponentBackend(value: any): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }

    // Component backend has:
    // - schema property (object, required)
    // - settings property (object with name string, required)
    // - Optional: authentication, storage, compute, etc.
    return (
      value.schema !== undefined &&
      typeof value.schema === 'object' &&
      value.settings !== undefined &&
      typeof value.settings === 'object' &&
      typeof value.settings.name === 'string'
    );
  }

  /**
   * Get user-friendly description of detection result
   *
   * Provides helpful messages for successful detection and guidance
   * for unknown entry points.
   *
   * @param result - Detection result from detect()
   * @returns User-friendly message describing the result
   *
   * @example
   * ```typescript
   * const detector = new EntryPointDetector();
   * const result = detector.detect(module);
   * const description = detector.getDescription(result);
   * console.log(description);
   * // "Detected CDK-style app with constructs"
   * ```
   */
  getDescription(result: DetectionResult): string {
    switch (result.type) {
      case 'cdk-app':
        return 'Detected CDK-style app with constructs';
      case 'component-backend':
        return 'Detected component-style backend with schema';
      case 'unknown':
        return 'Unable to detect valid entry point. Please ensure your module exports either:\n' +
               '  - CDK App: exports.app = new App()\n' +
               '  - Component Backend: exports.backend = defineBackend(...)';
      default:
        return 'Unknown entry point type';
    }
  }
}

/**
 * Factory function to create entry point detector
 *
 * Provides a convenient way to create detector instances without
 * using the new keyword.
 *
 * @returns New EntryPointDetector instance
 *
 * @example
 * ```typescript
 * const detector = createEntryPointDetector();
 * const result = detector.detect(module);
 * ```
 */
export function createEntryPointDetector(): EntryPointDetector {
  return new EntryPointDetector();
}
