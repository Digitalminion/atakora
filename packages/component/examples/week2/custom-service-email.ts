/**
 * Example: Custom Email Service with SendGrid
 *
 * Demonstrates:
 * - Defining a custom service interface
 * - Implementing the service with SendGrid
 * - Creating a service factory
 * - Registering with backend
 * - Using in function handlers
 */

import sgMail from '@sendgrid/mail';
import type { ServiceFactory } from '@atakora/component/functions';
import { defineBackend } from '@atakora/component/backend';
import { defineAuth, auth } from '@atakora/component/auth';
import { defineSchema, a, c } from '@atakora/component/schema';
import type { FunctionHandler } from '@atakora/component/functions';

// ============================================================================
// Service Interface
// ============================================================================

export interface EmailService {
  /**
   * Send a single email
   */
  send(options: EmailOptions): Promise<EmailResult>;

  /**
   * Send multiple emails in batch
   */
  sendBatch(emails: EmailOptions[]): Promise<BatchEmailResult>;

  /**
   * Send a templated email
   */
  sendTemplate(templateId: string, to: string, data: Record<string, any>): Promise<EmailResult>;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  type?: string;
}

export interface EmailResult {
  messageId: string;
  sent: boolean;
  timestamp: string;
}

export interface BatchEmailResult {
  sent: number;
  failed: number;
  results: Array<{
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class SendGridEmailService implements EmailService {
  private readonly fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    sgMail.setApiKey(apiKey);
    this.fromEmail = fromEmail;
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    const message = {
      to: options.to,
      from: options.from || this.fromEmail,
      subject: options.subject,
      text: options.body,
      html: options.html || options.body,
      replyTo: options.replyTo,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        type: att.type || 'application/octet-stream',
      })),
    };

    const [response] = await sgMail.send(message);

    return {
      messageId: response.headers['x-message-id'],
      sent: response.statusCode >= 200 && response.statusCode < 300,
      timestamp: new Date().toISOString(),
    };
  }

  async sendBatch(emails: EmailOptions[]): Promise<BatchEmailResult> {
    const results: BatchEmailResult['results'] = [];
    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        const result = await this.send(email);
        results.push({
          to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
          success: true,
          messageId: result.messageId,
        });
        sent++;
      } catch (error) {
        results.push({
          to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    return { sent, failed, results };
  }

  async sendTemplate(
    templateId: string,
    to: string,
    data: Record<string, any>
  ): Promise<EmailResult> {
    const message = {
      to,
      from: this.fromEmail,
      templateId,
      dynamicTemplateData: data,
    };

    const [response] = await sgMail.send(message);

    return {
      messageId: response.headers['x-message-id'],
      sent: response.statusCode >= 200 && response.statusCode < 300,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// Service Factory
// ============================================================================

export const emailServiceFactory: ServiceFactory<EmailService> = (context) => {
  const apiKey = context.env.SENDGRID_API_KEY;
  const fromEmail = context.env.FROM_EMAIL || 'noreply@example.com';

  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY environment variable is required');
  }

  context.logger.info('Initializing email service', {
    fromEmail,
    environment: context.environment,
  });

  return new SendGridEmailService(apiKey, fromEmail);
};

// ============================================================================
// Schema Definition
// ============================================================================

const schema = defineSchema({
  schema: a.schema({
    EmailLog: c
      .model({
        id: a.id(),
        to: a.string().required(),
        subject: a.string().required(),
        body: a.string().required(),
        sentAt: a.datetime().required(),
        messageId: a.string(),
        status: a.enum(['sent', 'failed']).required(),
      })
      .authorization((allow) => [allow.authenticated().all()]),

    NewsletterSubscriber: c
      .model({
        id: a.id(),
        email: a.string().required().email(),
        name: a.string(),
        subscribedAt: a.datetime().required(),
        active: a.boolean().default(true),
      })
      .authorization((allow) => [allow.owner('email'), allow.groups(['admin']).all()]),
  }),
});

// ============================================================================
// Authentication
// ============================================================================

const authentication = defineAuth({
  Primary: auth.entra().tenantId('tenant-id').clientId('client-id').audience('api://my-app'),
});

// ============================================================================
// Backend Configuration
// ============================================================================

export const backend = defineBackend({
  schema,
  authentication,
  services: {
    // Register email service
    emailService: emailServiceFactory,
  },
  settings: {
    name: 'email-example',
    region: 'eastus',
  },
});

// ============================================================================
// Function Handlers
// ============================================================================

/**
 * Send a welcome email to new users
 */
interface SendWelcomeEmailInput {
  userEmail: string;
  userName: string;
}

interface SendWelcomeEmailOutput {
  sent: boolean;
  messageId: string;
}

export const sendWelcomeEmail: FunctionHandler<
  SendWelcomeEmailInput,
  SendWelcomeEmailOutput
> = async (context, input) => {
  context.log.info('Sending welcome email', {
    email: input.userEmail,
    name: input.userName,
  });

  // Send email using service
  const result = await context.services.emailService.send({
    to: input.userEmail,
    subject: 'Welcome to Our Platform!',
    body: `Hi ${input.userName},\n\nWelcome to our platform! We're excited to have you.`,
    html: `
      <html>
        <body>
          <h1>Welcome!</h1>
          <p>Hi ${input.userName},</p>
          <p>Welcome to our platform! We're excited to have you.</p>
        </body>
      </html>
    `,
  });

  // Log email
  await context.database.emailLogs.create({
    to: input.userEmail,
    subject: 'Welcome to Our Platform!',
    body: `Welcome email sent to ${input.userName}`,
    sentAt: new Date().toISOString(),
    messageId: result.messageId,
    status: result.sent ? 'sent' : 'failed',
  });

  return {
    sent: result.sent,
    messageId: result.messageId,
  };
};

/**
 * Send newsletter to all active subscribers
 */
interface SendNewsletterInput {
  subject: string;
  content: string;
  htmlContent?: string;
}

interface SendNewsletterOutput {
  sent: number;
  failed: number;
  totalSubscribers: number;
}

export const sendNewsletter: FunctionHandler<SendNewsletterInput, SendNewsletterOutput> = async (
  context,
  input
) => {
  // Check authorization - only admins can send newsletters
  if (!context.user.roles.includes('admin')) {
    throw new Error('Only admins can send newsletters');
  }

  context.log.info('Sending newsletter', {
    subject: input.subject,
    userId: context.user.id,
  });

  // Get all active subscribers
  const subscribers = await context.database.newsletterSubscribers.list({
    active: true,
  });

  // Prepare emails
  const emails = subscribers.map(subscriber => ({
    to: subscriber.email,
    subject: input.subject,
    body: input.content,
    html: input.htmlContent || input.content,
  }));

  // Send in batch
  const result = await context.services.emailService.sendBatch(emails);

  context.log.info('Newsletter sent', {
    sent: result.sent,
    failed: result.failed,
    total: subscribers.length,
  });

  return {
    sent: result.sent,
    failed: result.failed,
    totalSubscribers: subscribers.length,
  };
};

/**
 * Send password reset email using template
 */
interface SendPasswordResetInput {
  userEmail: string;
  resetToken: string;
  resetUrl: string;
}

interface SendPasswordResetOutput {
  sent: boolean;
  expiresAt: string;
}

export const sendPasswordReset: FunctionHandler<
  SendPasswordResetInput,
  SendPasswordResetOutput
> = async (context, input) => {
  context.log.info('Sending password reset email', {
    email: input.userEmail,
  });

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Send using template (assuming template is configured in SendGrid)
  const result = await context.services.emailService.sendTemplate(
    'd-password-reset-template-id',
    input.userEmail,
    {
      reset_url: input.resetUrl,
      reset_token: input.resetToken,
      expires_at: expiresAt.toISOString(),
      user_email: input.userEmail,
    }
  );

  // Log email
  await context.database.emailLogs.create({
    to: input.userEmail,
    subject: 'Password Reset Request',
    body: `Password reset sent to ${input.userEmail}`,
    sentAt: new Date().toISOString(),
    messageId: result.messageId,
    status: result.sent ? 'sent' : 'failed',
  });

  return {
    sent: result.sent,
    expiresAt: expiresAt.toISOString(),
  };
};

// ============================================================================
// Testing the Service
// ============================================================================

/**
 * Example: Testing with a mock email service
 */
export class MockEmailService implements EmailService {
  public sentEmails: EmailOptions[] = [];

  async send(options: EmailOptions): Promise<EmailResult> {
    this.sentEmails.push(options);

    return {
      messageId: `mock-${Date.now()}`,
      sent: true,
      timestamp: new Date().toISOString(),
    };
  }

  async sendBatch(emails: EmailOptions[]): Promise<BatchEmailResult> {
    this.sentEmails.push(...emails);

    return {
      sent: emails.length,
      failed: 0,
      results: emails.map(email => ({
        to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
        success: true,
        messageId: `mock-${Date.now()}`,
      })),
    };
  }

  async sendTemplate(
    templateId: string,
    to: string,
    data: Record<string, any>
  ): Promise<EmailResult> {
    this.sentEmails.push({
      to,
      subject: `Template: ${templateId}`,
      body: JSON.stringify(data),
    });

    return {
      messageId: `mock-template-${Date.now()}`,
      sent: true,
      timestamp: new Date().toISOString(),
    };
  }

  // Helper for tests
  reset() {
    this.sentEmails = [];
  }
}

// Test example
if (import.meta.vitest) {
  const { describe, it, expect, beforeEach } = import.meta.vitest;
  const { createFunctionContext } = await import('@atakora/component/functions');

  describe('Email Service', () => {
    let mockEmailService: MockEmailService;
    let context: any;

    beforeEach(() => {
      mockEmailService = new MockEmailService();
      context = createFunctionContext({
        services: {
          emailService: mockEmailService,
        },
        user: {
          id: 'user-123',
          email: 'admin@example.com',
          roles: ['admin'],
        },
      });
    });

    it('should send welcome email', async () => {
      const input = {
        userEmail: 'newuser@example.com',
        userName: 'New User',
      };

      const result = await sendWelcomeEmail(context, input);

      expect(result.sent).toBe(true);
      expect(mockEmailService.sentEmails).toHaveLength(1);
      expect(mockEmailService.sentEmails[0].to).toBe('newuser@example.com');
      expect(mockEmailService.sentEmails[0].subject).toContain('Welcome');
    });
  });
}
