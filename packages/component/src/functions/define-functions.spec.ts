/**
 * Tests for Function Customization Container
 */

import { describe, it, expect } from 'vitest';
import { defineFunctions } from './define-functions';
import { configureFunction } from './configure-function';
import { minutes } from '../common/duration';

describe('defineFunctions', () => {
  describe('Basic Functionality', () => {
    it('should build configurations from builders', () => {
      const func = defineFunctions({
        TestFunction: configureFunction('TestFunction').memory(512).timeout(60000),
      });

      expect(func.TestFunction).toBeDefined();
      expect(func.TestFunction.name).toBe('TestFunction');
      expect(func.TestFunction.memory).toBe(512);
      expect(func.TestFunction.timeout).toBe(60000);
    });

    it('should handle multiple functions', () => {
      const func = defineFunctions({
        Function1: configureFunction('Function1').memory(256),
        Function2: configureFunction('Function2').memory(512),
        Function3: configureFunction('Function3').memory(1024),
      });

      expect(Object.keys(func)).toHaveLength(3);
      expect(func.Function1.memory).toBe(256);
      expect(func.Function2.memory).toBe(512);
      expect(func.Function3.memory).toBe(1024);
    });

    it('should preserve all configuration properties', () => {
      const handler = async (context: any, input: any) => ({ result: 'ok' });

      const func = defineFunctions({
        ComplexFunction: configureFunction('ComplexFunction')
          .memory(1024)
          .timeout(minutes(5))
          .withHandler(handler)
          .bindings({
            storage: { type: 'blob', container: 'data', path: '{id}' },
          })
          .env({
            API_KEY: 'required',
          })
          .withMetrics()
          .withTracing(),
      });

      const config = func.ComplexFunction;
      expect(config.memory).toBe(1024);
      expect(config.timeout).toBe(300000);
      expect(config.handler).toBe(handler);
      expect(config.bindings?.storage).toBeDefined();
      expect(config.environment?.API_KEY).toBe('required');
      expect(config.monitoring?.metrics).toBe(true);
      expect(config.monitoring?.tracing).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should throw error for invalid builder', () => {
      expect(() => {
        defineFunctions({
          InvalidFunction: {} as any,
        });
      }).toThrow(/Invalid function configuration/);
    });

    it('should throw error for name mismatch', () => {
      expect(() => {
        defineFunctions({
          WrongName: configureFunction('CorrectName'),
        });
      }).toThrow(/name mismatch/);
    });

    it('should validate all functions in record', () => {
      expect(() => {
        defineFunctions({
          ValidFunction: configureFunction('ValidFunction'),
          InvalidFunction: configureFunction('WrongName'),
        });
      }).toThrow(/name mismatch/);
    });
  });

  describe('Empty Configuration', () => {
    it('should handle empty function record', () => {
      const func = defineFunctions({});

      expect(Object.keys(func)).toHaveLength(0);
    });
  });

  describe('Type Safety', () => {
    it('should return correct function config types', () => {
      const func = defineFunctions({
        TestFunction: configureFunction('TestFunction'),
      });

      // Type check - this should compile
      const config = func.TestFunction;
      expect(config.name).toBe('TestFunction');
      expect(config.memory).toBe(256); // Default
      expect(config.timeout).toBe(30000); // Default
    });
  });
});

describe('Real-world Examples', () => {
  it('should support GenerateReport example from reference', () => {
    const handler = async (context: any, input: any) => {
      const dataset = await context.database.datasets.get(input.datasetId);
      return {
        reportId: 'rpt_123',
        reportUrl: 'https://example.com/report.pdf',
        status: 'completed',
      };
    };

    const func = defineFunctions({
      GenerateReport: configureFunction('GenerateReport')
        .memory(1024)
        .timeout(minutes(10))
        .withHandler(handler)
        .bindings({
          storage: {
            type: 'blob',
            container: 'reports',
            path: '{reportId}.pdf',
          },
        }),
    });

    expect(func.GenerateReport.name).toBe('GenerateReport');
    expect(func.GenerateReport.memory).toBe(1024);
    expect(func.GenerateReport.timeout).toBe(600000);
    expect(func.GenerateReport.handler).toBe(handler);
  });

  it('should support ValidateData example from reference', () => {
    const handler = async (context: any, input: any) => {
      return {
        isValid: true,
        errors: [],
        summary: { totalRows: 100, validRows: 100, invalidRows: 0 },
      };
    };

    const func = defineFunctions({
      ValidateData: configureFunction('ValidateData')
        .memory(512)
        .timeout(minutes(2))
        .withHandler(handler),
    });

    expect(func.ValidateData.memory).toBe(512);
    expect(func.ValidateData.timeout).toBe(120000);
  });

  it('should support mixed configurations', () => {
    const reportHandler = async (context: any, input: any) => ({
      reportUrl: 'https://example.com/report.pdf',
    });

    const validateHandler = async (context: any, input: any) => ({
      isValid: true,
    });

    const func = defineFunctions({
      // Heavy function with full configuration
      GenerateReport: configureFunction('GenerateReport')
        .memory(2048)
        .timeout(minutes(15))
        .withHandler(reportHandler)
        .bindings({
          storage: { type: 'blob', container: 'reports', path: '{id}' },
        })
        .withMetrics()
        .withTracing(),

      // Lightweight function with minimal configuration
      ValidateData: configureFunction('ValidateData')
        .memory(512)
        .timeout(minutes(2))
        .withHandler(validateHandler),

      // Function with only defaults (no customization beyond name)
      ProcessUpload: configureFunction('ProcessUpload'),
    });

    expect(Object.keys(func)).toHaveLength(3);
    expect(func.GenerateReport.memory).toBe(2048);
    expect(func.ValidateData.memory).toBe(512);
    expect(func.ProcessUpload.memory).toBe(256); // Default
  });
});
