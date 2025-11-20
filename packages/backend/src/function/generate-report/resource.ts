/**
 * Generate Report Function - Resource Definition
 *
 * Creates PDF/Excel reports from analyzed data.
 *
 * DEFAULTS:
 * - HTTP trigger for on-demand report generation
 * - 128MB memory (sufficient for most reports)
 * - 60s timeout
 * - JWT authentication
 * - Auto-scaling
 */

import { defineFunction } from '@atakora/component/functions';

export const generateReport = defineFunction({
  name: 'generate-report',
  entry: './handler.ts',

  trigger: {
    type: 'http',
    methods: ['POST'],
    route: 'reports/generate',
  },

  // Longer timeout for report generation
  timeout: 300, // 5 minutes
  memory: 256,  // More memory for PDF generation
});