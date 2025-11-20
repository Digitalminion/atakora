/**
 * Example Auth Functions
 *
 * These are stub functions used in the full-crud-customization example.
 * In a real app, these would be full function definitions.
 */

import { defineFunction } from '@atakora/component/functions';

export const initPasswordReset = defineFunction({
  name: 'init-password-reset',
  entry: './handlers/init-password-reset.ts',
  trigger: {
    type: 'http',
    methods: ['POST'],
    route: 'auth/reset-password',
  },
});

export const confirmPasswordReset = defineFunction({
  name: 'confirm-password-reset',
  entry: './handlers/confirm-password-reset.ts',
  trigger: {
    type: 'http',
    methods: ['POST'],
    route: 'auth/confirm-reset',
  },
});