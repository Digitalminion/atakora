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

import { defineFunction } from '@atakora/component/functions';

export const sendNotification = defineFunction({
  name: 'send-notification',
  entry: './handler.ts',

  trigger: {
    type: 'http',
    methods: ['POST'],
    route: 'notifications/send',
  },

  // Quick timeout for notification dispatch
  timeout: 30,
});