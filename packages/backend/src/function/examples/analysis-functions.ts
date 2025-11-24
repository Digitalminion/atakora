/**
 * Example Analysis Functions
 *
 * These are stub functions used in the full-crud-customization example.
 * In a real app, these would be full function definitions.
 */

import { defineFunctions, configureFunction } from '@atakora/component/functions';

export const analysisFunctions = defineFunctions({
  AnalyzeDataQuality: configureFunction('analyze-data-quality')
    .memory(512)
    .timeout(300000)
    .withHandler(async (context, req) => {
      // Handler from ./handlers/analyze-data-quality.ts
      context.log('Analyzing data quality');
      return {
        status: 200,
        body: { message: 'Data quality analysis complete' },
      };
    }),

  GenerateInsights: configureFunction('generate-insights')
    .memory(1024)
    .timeout(600000)
    .withHandler(async (context, req) => {
      // Handler from ./handlers/generate-insights.ts
      context.log('Generating insights');
      return {
        status: 200,
        body: { message: 'Insights generated successfully' },
      };
    }),
});
