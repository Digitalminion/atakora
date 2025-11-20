/**
 * Example Analysis Functions
 *
 * These are stub functions used in the full-crud-customization example.
 * In a real app, these would be full function definitions.
 */

import { defineFunction } from '@atakora/component/functions';

export const analyzeDataQuality = defineFunction({
  name: 'analyze-data-quality',
  entry: './handlers/analyze-data-quality.ts',
  trigger: {
    type: 'http',
    methods: ['POST'],
    route: 'analysis/quality',
  },
  timeout: 300, // 5 minutes for analysis
  memory: 512,
});

export const generateInsights = defineFunction({
  name: 'generate-insights',
  entry: './handlers/generate-insights.ts',
  trigger: {
    type: 'http',
    methods: ['POST'],
    route: 'analysis/insights',
  },
  timeout: 600, // 10 minutes for AI processing
  memory: 1024,
});