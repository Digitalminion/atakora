/**
 * Notification Service
 *
 * @remarks
 * Push notification abstraction for sending notifications to users
 * (Azure Notification Hubs, Firebase Cloud Messaging, etc.)
 *
 * @packageDocumentation
 */

/**
 * Notification
 *
 * @public
 */
export interface Notification {
  /**
   * Notification title
   */
  readonly title: string;

  /**
   * Notification body/message
   */
  readonly body: string;

  /**
   * Notification icon URL
   */
  readonly icon?: string;

  /**
   * Notification data/payload
   */
  readonly data?: Record<string, any>;

  /**
   * Notification badge number
   */
  readonly badge?: number;

  /**
   * Notification sound
   */
  readonly sound?: string;

  /**
   * Notification category/action
   */
  readonly category?: string;
}

/**
 * Notification send options
 *
 * @public
 */
export interface NotificationSendOptions {
  /**
   * Time-to-live in milliseconds
   */
  readonly ttl?: number;

  /**
   * Priority (normal, high)
   */
  readonly priority?: 'normal' | 'high';

  /**
   * Tags for targeted delivery
   */
  readonly tags?: readonly string[];
}

/**
 * Notification send result
 *
 * @public
 */
export interface NotificationSendResult {
  /**
   * Whether the notification was sent successfully
   */
  readonly success: boolean;

  /**
   * Notification ID from the provider
   */
  readonly notificationId?: string;

  /**
   * Number of devices targeted
   */
  readonly targetsCount?: number;

  /**
   * Error message if send failed
   */
  readonly error?: string;
}

/**
 * Notification service interface
 *
 * @remarks
 * Abstract interface for push notifications.
 * Implement this interface with your preferred notification backend.
 *
 * @example
 * ```typescript
 * // In backend configuration
 * services: {
 *   notifications: (context) => new AzureNotificationHubService({
 *     connectionString: context.env.NOTIFICATION_HUB_CONNECTION_STRING!,
 *   }),
 * }
 *
 * // In function handler
 * await context.services.notifications.sendToUser(userId, {
 *   title: 'New Message',
 *   body: 'You have a new message from Alice',
 * });
 * ```
 *
 * @public
 */
export interface NotificationService {
  /**
   * Send notification to a specific user
   *
   * @param userId - User ID
   * @param notification - Notification to send
   * @param options - Send options
   * @returns Send result
   */
  sendToUser(
    userId: string,
    notification: Notification,
    options?: NotificationSendOptions
  ): Promise<NotificationSendResult>;

  /**
   * Send notification to multiple users
   *
   * @param userIds - User IDs
   * @param notification - Notification to send
   * @param options - Send options
   * @returns Send result
   */
  sendToUsers(
    userIds: readonly string[],
    notification: Notification,
    options?: NotificationSendOptions
  ): Promise<NotificationSendResult>;

  /**
   * Send notification to users with specific tags
   *
   * @param tags - Tags for targeting
   * @param notification - Notification to send
   * @param options - Send options
   * @returns Send result
   */
  sendToTags(
    tags: readonly string[],
    notification: Notification,
    options?: NotificationSendOptions
  ): Promise<NotificationSendResult>;

  /**
   * Send broadcast notification to all users
   *
   * @param notification - Notification to send
   * @param options - Send options
   * @returns Send result
   */
  sendBroadcast(
    notification: Notification,
    options?: NotificationSendOptions
  ): Promise<NotificationSendResult>;

  /**
   * Register device for push notifications
   *
   * @param userId - User ID
   * @param deviceToken - Device push token
   * @param platform - Platform (ios, android, web)
   */
  registerDevice(
    userId: string,
    deviceToken: string,
    platform: 'ios' | 'android' | 'web'
  ): Promise<void>;

  /**
   * Unregister device from push notifications
   *
   * @param userId - User ID
   * @param deviceToken - Device push token
   */
  unregisterDevice(userId: string, deviceToken: string): Promise<void>;
}

/**
 * Mock notification service for development/testing
 *
 * @remarks
 * Logs notifications instead of sending them.
 * Useful for development and testing environments.
 *
 * @public
 */
export class MockNotificationService implements NotificationService {
  private readonly logNotifications: boolean;
  private readonly devices = new Map<string, Set<string>>();

  /**
   * Create a mock notification service
   *
   * @param options - Service options
   */
  constructor(
    options: {
      logNotifications?: boolean;
    } = {}
  ) {
    this.logNotifications = options.logNotifications ?? true;
  }

  /**
   * Send notification to a specific user
   */
  async sendToUser(
    userId: string,
    notification: Notification,
    options?: NotificationSendOptions
  ): Promise<NotificationSendResult> {
    if (this.logNotifications) {
      console.log('[MockNotificationService] Would send notification to user:', {
        userId,
        title: notification.title,
        body: notification.body,
        options,
      });
    }

    const devices = this.devices.get(userId);
    const targetsCount = devices?.size ?? 0;

    return {
      success: true,
      notificationId: `mock-notif-${Date.now()}`,
      targetsCount,
    };
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(
    userIds: readonly string[],
    notification: Notification,
    options?: NotificationSendOptions
  ): Promise<NotificationSendResult> {
    if (this.logNotifications) {
      console.log('[MockNotificationService] Would send notification to users:', {
        userCount: userIds.length,
        title: notification.title,
        body: notification.body,
      });
    }

    let targetsCount = 0;
    for (const userId of userIds) {
      const devices = this.devices.get(userId);
      targetsCount += devices?.size ?? 0;
    }

    return {
      success: true,
      notificationId: `mock-notif-batch-${Date.now()}`,
      targetsCount,
    };
  }

  /**
   * Send notification to users with specific tags
   */
  async sendToTags(
    tags: readonly string[],
    notification: Notification,
    options?: NotificationSendOptions
  ): Promise<NotificationSendResult> {
    if (this.logNotifications) {
      console.log('[MockNotificationService] Would send notification to tags:', {
        tags,
        title: notification.title,
        body: notification.body,
      });
    }

    return {
      success: true,
      notificationId: `mock-notif-tags-${Date.now()}`,
      targetsCount: 0, // Would be calculated based on tag subscriptions
    };
  }

  /**
   * Send broadcast notification
   */
  async sendBroadcast(
    notification: Notification,
    options?: NotificationSendOptions
  ): Promise<NotificationSendResult> {
    if (this.logNotifications) {
      console.log('[MockNotificationService] Would send broadcast notification:', {
        title: notification.title,
        body: notification.body,
      });
    }

    let targetsCount = 0;
    for (const devices of this.devices.values()) {
      targetsCount += devices.size;
    }

    return {
      success: true,
      notificationId: `mock-notif-broadcast-${Date.now()}`,
      targetsCount,
    };
  }

  /**
   * Register device
   */
  async registerDevice(
    userId: string,
    deviceToken: string,
    platform: 'ios' | 'android' | 'web'
  ): Promise<void> {
    if (!this.devices.has(userId)) {
      this.devices.set(userId, new Set());
    }
    this.devices.get(userId)!.add(deviceToken);

    if (this.logNotifications) {
      console.log('[MockNotificationService] Device registered:', {
        userId,
        platform,
        deviceCount: this.devices.get(userId)!.size,
      });
    }
  }

  /**
   * Unregister device
   */
  async unregisterDevice(userId: string, deviceToken: string): Promise<void> {
    const devices = this.devices.get(userId);
    if (devices) {
      devices.delete(deviceToken);
      if (devices.size === 0) {
        this.devices.delete(userId);
      }
    }

    if (this.logNotifications) {
      console.log('[MockNotificationService] Device unregistered:', {
        userId,
        remainingDevices: devices?.size ?? 0,
      });
    }
  }
}
