/**
 * Email Service
 *
 * @remarks
 * Email sending abstraction that can be implemented with different providers
 * (SendGrid, Azure Communication Services, etc.)
 *
 * @packageDocumentation
 */

/**
 * Email message
 *
 * @public
 */
export interface EmailMessage {
  /**
   * Recipient email address
   */
  readonly to: string;

  /**
   * Sender email address
   */
  readonly from: string;

  /**
   * Email subject
   */
  readonly subject: string;

  /**
   * Email body (plain text)
   */
  readonly text?: string;

  /**
   * Email body (HTML)
   */
  readonly html?: string;

  /**
   * CC recipients
   */
  readonly cc?: readonly string[];

  /**
   * BCC recipients
   */
  readonly bcc?: readonly string[];

  /**
   * Attachments
   */
  readonly attachments?: readonly EmailAttachment[];
}

/**
 * Email attachment
 *
 * @public
 */
export interface EmailAttachment {
  /**
   * Filename
   */
  readonly filename: string;

  /**
   * Content (Buffer or base64 string)
   */
  readonly content: Buffer | string;

  /**
   * Content type (MIME type)
   */
  readonly contentType?: string;
}

/**
 * Email send result
 *
 * @public
 */
export interface EmailSendResult {
  /**
   * Whether the email was sent successfully
   */
  readonly success: boolean;

  /**
   * Message ID from the email provider
   */
  readonly messageId?: string;

  /**
   * Error message if send failed
   */
  readonly error?: string;
}

/**
 * Email service interface
 *
 * @remarks
 * Abstract interface for email sending.
 * Implement this interface with your preferred email provider.
 *
 * @example
 * ```typescript
 * // In backend configuration
 * services: {
 *   email: (context) => new SendGridEmailService({
 *     apiKey: context.env.SENDGRID_API_KEY!,
 *   }),
 * }
 *
 * // In function handler
 * await context.services.email.send({
 *   to: 'user@example.com',
 *   from: 'noreply@myapp.com',
 *   subject: 'Welcome',
 *   html: '<h1>Welcome to our app!</h1>',
 * });
 * ```
 *
 * @public
 */
export interface EmailService {
  /**
   * Send an email
   *
   * @param message - Email message to send
   * @returns Send result
   */
  send(message: EmailMessage): Promise<EmailSendResult>;

  /**
   * Send a templated email
   *
   * @param to - Recipient email address
   * @param templateId - Template identifier
   * @param templateData - Template data
   * @returns Send result
   */
  sendTemplate?(
    to: string,
    templateId: string,
    templateData: Record<string, any>
  ): Promise<EmailSendResult>;
}

/**
 * Mock email service for development/testing
 *
 * @remarks
 * Logs email messages instead of sending them.
 * Useful for development and testing environments.
 *
 * @public
 */
export class MockEmailService implements EmailService {
  /**
   * Whether to log email messages
   */
  private readonly logMessages: boolean;

  /**
   * Create a mock email service
   *
   * @param options - Service options
   */
  constructor(options: { logMessages?: boolean } = {}) {
    this.logMessages = options.logMessages ?? true;
  }

  /**
   * Send an email (mock - logs instead)
   */
  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (this.logMessages) {
      console.log('[MockEmailService] Would send email:', {
        to: message.to,
        from: message.from,
        subject: message.subject,
        hasText: !!message.text,
        hasHtml: !!message.html,
        attachments: message.attachments?.length ?? 0,
      });
    }

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
  }

  /**
   * Send a templated email (mock - logs instead)
   */
  async sendTemplate(
    to: string,
    templateId: string,
    templateData: Record<string, any>
  ): Promise<EmailSendResult> {
    if (this.logMessages) {
      console.log('[MockEmailService] Would send templated email:', {
        to,
        templateId,
        dataKeys: Object.keys(templateData),
      });
    }

    return {
      success: true,
      messageId: `mock-template-${Date.now()}`,
    };
  }
}
