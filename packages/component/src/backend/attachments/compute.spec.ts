/**
 * Tests for Compute Attachments
 *
 * @group unit
 * @group backend
 * @group attachments
 */

import { describe, it, expect } from 'vitest';
import {
  functionApp,
  validateFunctionAppAttachment,
  mergeFunctionAppConfigs,
  createFunctionAppAttachmentPoint,
} from './compute';
import type { FunctionAppConfig } from '../defaults/types';

describe('Compute Attachments', () => {
  describe('FunctionAppAttachmentBuilder', () => {
    it('should build basic function app configuration', () => {
      const config = functionApp().plan('Consumption').runtime('node', '18').build();

      expect(config.plan.type).toBe('Consumption');
      expect(config.runtime.runtime).toBe('node');
      expect(config.runtime.version).toBe('18');
      expect(config.alwaysOn).toBe(false);
    });

    it('should build premium function app configuration', () => {
      const config = functionApp()
        .plan('Premium', 'EP2')
        .runtime('node', '20')
        .alwaysOn(true)
        .minInstances(3)
        .maxInstances(10)
        .build();

      expect(config.plan.type).toBe('Premium');
      expect(config.plan.sku).toBe('EP2');
      expect(config.alwaysOn).toBe(true);
      expect(config.minInstances).toBe(3);
      expect(config.maxInstances).toBe(10);
    });

    it('should set function app name', () => {
      const config = functionApp()
        .name('my-function-app')
        .plan('Premium', 'EP1')
        .runtime('dotnet', '8')
        .build();

      expect(config.name).toBe('my-function-app');
    });

    it('should configure health check', () => {
      const config = functionApp()
        .plan('Premium', 'EP1')
        .runtime('python', '3.11')
        .healthCheck('/api/health')
        .build();

      expect(config.healthCheck).toBe('/api/health');
    });

    it('should configure CORS', () => {
      const config = functionApp()
        .plan('Premium', 'EP1')
        .runtime('node', '18')
        .cors(['https://example.com', 'https://app.example.com'], true)
        .build();

      expect(config.cors).toBeDefined();
      expect(config.cors?.allowedOrigins).toContain('https://example.com');
      expect(config.cors?.allowedOrigins).toContain('https://app.example.com');
      expect(config.cors?.supportCredentials).toBe(true);
    });

    it('should support method chaining', () => {
      const config = functionApp()
        .name('test-app')
        .plan('Premium', 'EP3')
        .runtime('java', '17')
        .alwaysOn(true)
        .minInstances(5)
        .maxInstances(20)
        .healthCheck('/health')
        .cors(['*'], false)
        .build();

      expect(config.name).toBe('test-app');
      expect(config.plan.sku).toBe('EP3');
      expect(config.minInstances).toBe(5);
    });

    it('should throw error when plan is missing', () => {
      const builder = functionApp().runtime('node', '18');

      expect(() => builder.build()).toThrow('Function app plan is required');
    });

    it('should throw error when runtime is missing', () => {
      const builder = functionApp().plan('Premium', 'EP1');

      expect(() => builder.build()).toThrow('Function app runtime is required');
    });
  });

  describe('validateFunctionAppAttachment', () => {
    it('should validate correct consumption plan configuration', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Consumption' },
        runtime: { runtime: 'node', version: '18' },
        alwaysOn: false,
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate correct premium plan configuration', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'EP2' },
        runtime: { runtime: 'node', version: '20' },
        alwaysOn: true,
        minInstances: 2,
        maxInstances: 10,
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should error when premium plan missing SKU', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Premium' },
        runtime: { runtime: 'node', version: '18' },
        alwaysOn: true,
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Premium plan requires a SKU (EP1, EP2, or EP3)');
    });

    it('should error when dedicated plan missing SKU', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Dedicated' },
        runtime: { runtime: 'dotnet', version: '8' },
        alwaysOn: true,
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Dedicated plan requires a SKU (B1, S1, P1v2, etc.)');
    });

    it('should error on invalid premium SKU', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'B1' as any },
        runtime: { runtime: 'node', version: '18' },
        alwaysOn: true,
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid Premium SKU: B1. Must be EP1, EP2, or EP3');
    });

    it('should error on invalid runtime version', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'EP1' },
        runtime: { runtime: 'node', version: '12' },
        alwaysOn: true,
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Invalid node version'))).toBe(true);
    });

    it('should warn on deprecated runtime version', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'EP1' },
        runtime: { runtime: 'node', version: '14' },
        alwaysOn: true,
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.warnings.some((w) => w.includes('deprecated'))).toBe(true);
    });

    it('should error when consumption plan has min instances', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Consumption' },
        runtime: { runtime: 'node', version: '18' },
        alwaysOn: false,
        minInstances: 2,
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Consumption plan does not support minimum instance count'
      );
    });

    it('should error on negative min instances', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'EP1' },
        runtime: { runtime: 'node', version: '18' },
        alwaysOn: true,
        minInstances: -1,
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Minimum instances cannot be negative');
    });

    it('should warn on very high min instances', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'EP3' },
        runtime: { runtime: 'node', version: '18' },
        alwaysOn: true,
        minInstances: 25,
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.warnings).toContain(
        'Minimum instances set very high. This may incur significant costs'
      );
    });

    it('should error when min > max instances', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'EP1' },
        runtime: { runtime: 'node', version: '18' },
        alwaysOn: true,
        minInstances: 10,
        maxInstances: 5,
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Minimum instances cannot be greater than maximum instances'
      );
    });

    it('should warn when min equals max instances', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'EP1' },
        runtime: { runtime: 'node', version: '18' },
        alwaysOn: true,
        minInstances: 5,
        maxInstances: 5,
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.warnings).toContain(
        'Min and max instances are equal. This disables autoscaling'
      );
    });

    it('should error when always on with consumption plan', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Consumption' },
        runtime: { runtime: 'node', version: '18' },
        alwaysOn: true,
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Always on is not available for Consumption plan');
    });

    it('should warn when always on disabled for premium plan', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'EP1' },
        runtime: { runtime: 'node', version: '18' },
        alwaysOn: false,
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.warnings).toContain(
        'Always on is recommended for Premium and Dedicated plans to avoid cold starts'
      );
    });

    it('should error when health check path does not start with /', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'EP1' },
        runtime: { runtime: 'node', version: '18' },
        alwaysOn: true,
        healthCheck: 'api/health',
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Health check path must start with /');
    });

    it('should warn about consumption plan cold starts', () => {
      const config: FunctionAppConfig = {
        plan: { type: 'Consumption' },
        runtime: { runtime: 'node', version: '18' },
        alwaysOn: false,
      };

      const validation = validateFunctionAppAttachment(config);

      expect(validation.warnings).toContain(
        'Consumption plan has cold start latency. Consider Premium for production workloads'
      );
    });
  });

  describe('mergeFunctionAppConfigs', () => {
    it('should merge configurations with custom taking precedence', () => {
      const base: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'EP1' },
        runtime: { runtime: 'node', version: '18' },
        alwaysOn: true,
        minInstances: 2,
        maxInstances: 10,
      };

      const custom: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'EP3' },
        runtime: { runtime: 'node', version: '20' },
        alwaysOn: true,
        minInstances: 5,
        maxInstances: 20,
      };

      const merged = mergeFunctionAppConfigs(base, custom);

      expect(merged.plan.sku).toBe('EP3');
      expect(merged.runtime.version).toBe('20');
      expect(merged.minInstances).toBe(5);
      expect(merged.maxInstances).toBe(20);
    });

    it('should use base values when custom values are undefined', () => {
      const base: FunctionAppConfig = {
        name: 'base-app',
        plan: { type: 'Premium', sku: 'EP2' },
        runtime: { runtime: 'dotnet', version: '8' },
        alwaysOn: true,
        healthCheck: '/api/health',
      };

      const custom: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'EP3' },
        runtime: { runtime: 'dotnet', version: '8' },
        alwaysOn: true,
      };

      const merged = mergeFunctionAppConfigs(base, custom);

      expect(merged.name).toBe('base-app');
      expect(merged.healthCheck).toBe('/api/health');
      expect(merged.plan.sku).toBe('EP3');
    });
  });

  describe('FunctionAppAttachmentPoint', () => {
    const defaultConfig: FunctionAppConfig = {
      plan: { type: 'Premium', sku: 'EP1' },
      runtime: { runtime: 'node', version: '18' },
      alwaysOn: true,
      minInstances: 2,
      maxInstances: 10,
    };

    it('should return default config when nothing attached', () => {
      const point = createFunctionAppAttachmentPoint(defaultConfig);

      expect(point.isAttached()).toBe(false);
      expect(point.getConfig()).toEqual(defaultConfig);
    });

    it('should attach valid configuration', () => {
      const point = createFunctionAppAttachmentPoint(defaultConfig);

      const customConfig: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'EP3' },
        runtime: { runtime: 'node', version: '20' },
        alwaysOn: true,
        minInstances: 5,
        maxInstances: 20,
      };

      point.attach(customConfig);

      expect(point.isAttached()).toBe(true);
      const config = point.getConfig();
      expect(config.plan.sku).toBe('EP3');
      expect(config.runtime.version).toBe('20');
    });

    it('should throw error on invalid configuration', () => {
      const point = createFunctionAppAttachmentPoint(defaultConfig);

      const invalidConfig: FunctionAppConfig = {
        plan: { type: 'Consumption' },
        runtime: { runtime: 'node', version: '18' },
        alwaysOn: true, // Invalid for Consumption plan
      };

      expect(() => point.attach(invalidConfig)).toThrow(
        'Function app attachment validation failed'
      );
    });

    it('should reset to default configuration', () => {
      const point = createFunctionAppAttachmentPoint(defaultConfig);

      const customConfig: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'EP3' },
        runtime: { runtime: 'node', version: '20' },
        alwaysOn: true,
      };

      point.attach(customConfig);
      expect(point.isAttached()).toBe(true);

      point.reset();
      expect(point.isAttached()).toBe(false);
      expect(point.getConfig()).toEqual(defaultConfig);
    });

    it('should merge attached config with default config', () => {
      const point = createFunctionAppAttachmentPoint(defaultConfig);

      const customConfig: FunctionAppConfig = {
        plan: { type: 'Premium', sku: 'EP3' },
        runtime: { runtime: 'node', version: '18' },
        alwaysOn: true,
      };

      point.attach(customConfig);

      const config = point.getConfig();
      expect(config.plan.sku).toBe('EP3'); // From custom
      expect(config.minInstances).toBe(2); // From default
      expect(config.maxInstances).toBe(10); // From default
    });
  });
});
