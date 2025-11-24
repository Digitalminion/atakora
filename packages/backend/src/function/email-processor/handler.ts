/**
 * Email Queue Processor - Handler Implementation
 *
 * Sends emails using SendGrid or similar service.
 */

import { Context } from '@azure/functions';

interface EmailMessage {
  to: string | string[];
  subject: string;
  template?: string;
  data?: any;
  html?: string;
  text?: string;
  priority?: 'high' | 'normal' | 'low';
}

export default async function handler(context: Context, messages: EmailMessage[]) {
  context.log(`Processing ${messages.length} email messages`);

  // Process emails in batches for efficiency
  const results = await Promise.allSettled(messages.map((message) => sendEmail(context, message)));

  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  context.log(`Emails sent: ${successful} successful, ${failed} failed`);
}

async function sendEmail(context: Context, message: EmailMessage) {
  try {
    const { to, subject, template, data, html, text } = message;

    // In production, would use SendGrid or similar
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const emailContent = template ? await renderTemplate(template, data) : { html, text };

    // Mock sending
    context.log(`Sending email to ${to}: ${subject}`);

    // await sgMail.send({
    //   to,
    //   from: 'noreply@colorai.com',
    //   subject,
    //   ...emailContent,
    // });

    return { success: true, to, subject };
  } catch (error) {
    context.log.error('Email sending failed:', error);
    throw error; // Re-throw for retry
  }
}

async function renderTemplate(template: string, data: any) {
  // Mock template rendering
  return {
    html: `<h1>${template}</h1><pre>${JSON.stringify(data, null, 2)}</pre>`,
    text: `${template}\n${JSON.stringify(data, null, 2)}`,
  };
}
