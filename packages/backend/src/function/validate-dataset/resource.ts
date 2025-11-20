/**
 * Validate Dataset Function - Resource Definition
 *
 * Validates uploaded datasets for quality and format.
 *
 * DEFAULTS:
 * - HTTP trigger with POST method
 * - 128MB memory (can process moderate datasets)
 * - 60s timeout (quick validation)
 * - Auto-scaling based on load
 * - JWT authentication required
 */

import { defineFunction } from '@atakora/component/functions';

export const validateDataset = defineFunction({
  name: 'validate-dataset',
  entry: './handler.ts',

  trigger: {
    type: 'http',
    methods: ['POST'],
    route: 'datasets/{id}/validate',
  },

  // Slightly longer timeout for validation
  timeout: 120, // 2 minutes

  // Defaults are perfect for everything else!
});