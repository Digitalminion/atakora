/**
 * Send Notification Function - Handler Implementation
 */

import { AzureFunction, Context, HttpRequest } from '@azure/functions';

const handler: AzureFunction = async (context: Context, req: HttpRequest) => {
  const { to, subject, message, type = 'email' } = req.body;

  try {
    context.log(`Sending ${type} notification to: ${to}`);

    // Mock notification sending
    const notificationId = `notif-${Date.now()}`;

    // In real implementation, would use SendGrid/Twilio/etc.
    await sendEmail(to, subject, message);

    return {
      status: 200,
      body: {
        success: true,
        notificationId,
        type,
        sentAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    context.log.error('Notification failed:', error);
    return {
      status: 500,
      body: { error: 'Notification failed', message: error.message },
    };
  }
};

async function sendEmail(to: string, subject: string, message: string): Promise<void> {
  // Mock email sending
  console.log(`Email sent to ${to}: ${subject}`);
}

export default handler;
