/**
 * Send Notification Function - Resource Definition
 *
 * Sends email/SMS/push notifications to users.
 *
 * DEFAULTS:
 * - HTTP trigger for immediate notifications
 * - 128MB memory
 * - 30s timeout (quick notification dispatch)
 * - JWT authentication
 * - Auto-retry on failure
 */

import { defineFunctions, configureFunction } from '@atakora/component/functions';

export const sendNotification = defineFunctions({
  SendNotification: configureFunction('send-notification')
    .timeout(30000)
    .withHandler(async (context, req) => {
      // Handler implementation from ./handler.ts
      context.log('Sending notification');
      // TODO: Implement notification sending logic
      return {
        status: 200,
        body: { message: 'Notification sent successfully' },
      };
    }),
});
