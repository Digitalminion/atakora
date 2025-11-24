/**
 * Example Auth Functions
 *
 * These are stub functions used in the full-crud-customization example.
 * In a real app, these would be full function definitions.
 */

import { defineFunctions, configureFunction } from '@atakora/component/functions';

export const authFunctions = defineFunctions({
  InitPasswordReset: configureFunction('init-password-reset').withHandler(async (context, req) => {
    // Handler from ./handlers/init-password-reset.ts
    context.log('Initiating password reset');
    return {
      status: 200,
      body: { message: 'Password reset initiated' },
    };
  }),

  ConfirmPasswordReset: configureFunction('confirm-password-reset').withHandler(
    async (context, req) => {
      // Handler from ./handlers/confirm-password-reset.ts
      context.log('Confirming password reset');
      return {
        status: 200,
        body: { message: 'Password reset confirmed' },
      };
    }
  ),
});
