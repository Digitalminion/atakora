/**
 * Entry Point Detector Tests
 *
 * Tests for the entry point detection system that determines whether
 * a module exports a CDK-style app or component-style backend.
 */

import { describe, it, expect } from 'vitest';
import { EntryPointDetector, EntryPointType } from './entry-point-detector';

describe('EntryPointDetector', () => {
  const detector = new EntryPointDetector();

  describe('CDK App Detection', () => {
    it('should detect CDK app from exports.app', () => {
      const moduleExports = {
        app: {
          synth: () => {},
        },
      };

      const result = detector.detect(moduleExports);

      expect(result.type).toBe(EntryPointType.CDK_APP);
      expect(result.entryPoint).toBe(moduleExports.app);
      expect(result.metadata).toEqual({ hasSynthMethod: true });
    });

    it('should detect CDK app from exports.default', () => {
      const defaultApp = {
        synth: () => {},
      };

      const moduleExports = {
        default: defaultApp,
      };

      const result = detector.detect(moduleExports);

      expect(result.type).toBe(EntryPointType.CDK_APP);
      expect(result.entryPoint).toBe(defaultApp);
      expect(result.metadata).toEqual({ hasSynthMethod: true });
    });

    it('should prioritize exports.app over exports.default', () => {
      const app = { synth: () => {} };
      const defaultApp = { synth: () => {} };

      const moduleExports = {
        app,
        default: defaultApp,
      };

      const result = detector.detect(moduleExports);

      expect(result.entryPoint).toBe(app);
    });

    it('should not detect CDK app if synth is not a function', () => {
      const moduleExports = {
        app: {
          synth: 'not a function',
        },
      };

      const result = detector.detect(moduleExports);

      expect(result.type).not.toBe(EntryPointType.CDK_APP);
    });
  });

  describe('Component Backend Detection', () => {
    it('should detect component backend from exports.backend', () => {
      const backend = {
        schema: { models: {} },
        settings: { name: 'test-app' },
      };

      const moduleExports = {
        backend,
      };

      const result = detector.detect(moduleExports);

      expect(result.type).toBe(EntryPointType.COMPONENT_BACKEND);
      expect(result.entryPoint).toBe(backend);
      expect(result.metadata).toEqual({
        hasBackendSchema: true,
        hasBackendSettings: true,
        hasBackendAuth: false,
      });
    });

    it('should detect component backend from exports.default', () => {
      const backend = {
        schema: { models: {} },
        settings: { name: 'test-app' },
        authentication: { providers: [] },
      };

      const moduleExports = {
        default: backend,
      };

      const result = detector.detect(moduleExports);

      expect(result.type).toBe(EntryPointType.COMPONENT_BACKEND);
      expect(result.entryPoint).toBe(backend);
      expect(result.metadata).toEqual({
        hasBackendSchema: true,
        hasBackendSettings: true,
        hasBackendAuth: true,
      });
    });

    it('should not detect backend if schema is missing', () => {
      const moduleExports = {
        backend: {
          settings: { name: 'test-app' },
        },
      };

      const result = detector.detect(moduleExports);

      expect(result.type).not.toBe(EntryPointType.COMPONENT_BACKEND);
    });

    it('should not detect backend if settings is missing', () => {
      const moduleExports = {
        backend: {
          schema: { models: {} },
        },
      };

      const result = detector.detect(moduleExports);

      expect(result.type).not.toBe(EntryPointType.COMPONENT_BACKEND);
    });
  });

  describe('Priority and Fallback', () => {
    it('should prioritize CDK app over component backend', () => {
      const moduleExports = {
        app: { synth: () => {} },
        backend: {
          schema: { models: {} },
          settings: { name: 'test-app' },
        },
      };

      const result = detector.detect(moduleExports);

      expect(result.type).toBe(EntryPointType.CDK_APP);
    });

    it('should return UNKNOWN for empty exports', () => {
      const result = detector.detect({});

      expect(result.type).toBe(EntryPointType.UNKNOWN);
      expect(result.entryPoint).toBeNull();
    });

    it('should return UNKNOWN for null exports', () => {
      const result = detector.detect(null);

      expect(result.type).toBe(EntryPointType.UNKNOWN);
      expect(result.entryPoint).toBeNull();
    });

    it('should return UNKNOWN for undefined exports', () => {
      const result = detector.detect(undefined);

      expect(result.type).toBe(EntryPointType.UNKNOWN);
      expect(result.entryPoint).toBeNull();
    });
  });

  describe('Description Messages', () => {
    it('should provide clear description for CDK app', () => {
      const result = {
        type: EntryPointType.CDK_APP,
        entryPoint: {},
        metadata: { hasSynthMethod: true },
      };

      const description = detector.getDescription(result);

      expect(description).toContain('CDK app');
      expect(description).toContain('synth()');
    });

    it('should provide clear description for component backend', () => {
      const result = {
        type: EntryPointType.COMPONENT_BACKEND,
        entryPoint: {},
        metadata: {
          hasBackendSchema: true,
          hasBackendSettings: true,
          hasBackendAuth: true,
        },
      };

      const description = detector.getDescription(result);

      expect(description).toContain('component backend');
      expect(description).toContain('schema');
      expect(description).toContain('settings');
      expect(description).toContain('authentication');
    });

    it('should provide clear description for unknown type', () => {
      const result = {
        type: EntryPointType.UNKNOWN,
        entryPoint: null,
      };

      const description = detector.getDescription(result);

      expect(description).toContain('Unknown');
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error message for unknown exports', () => {
      const moduleExports = {
        foo: 'bar',
        baz: 'qux',
      };

      const errorMessage = detector.getErrorMessage(moduleExports);

      expect(errorMessage).toContain('app');
      expect(errorMessage).toContain('backend');
      expect(errorMessage).toContain('synth()');
      expect(errorMessage).toContain('schema');
      expect(errorMessage).toContain('foo, baz');
    });

    it('should handle empty exports in error message', () => {
      const errorMessage = detector.getErrorMessage({});

      expect(errorMessage).toContain('(none)');
    });

    it('should include examples in error message', () => {
      const errorMessage = detector.getErrorMessage({});

      expect(errorMessage).toContain('export const app');
      expect(errorMessage).toContain('export const backend');
    });
  });
});
