/**
 * Azure monitoring and alerting constructs.
 *
 * @remarks
 * This module provides constructs for Activity Log Alerts and Diagnostic Settings
 * at subscription level.
 *
 * **Activity Log Alerts vs Metric Alerts**:
 * - **Activity Log**: Management plane operations (create/delete resources)
 * - **Metric Alerts**: Data plane metrics (CPU, memory, requests)
 *
 * **Activity Log Alerts vs Diagnostic Settings**:
 * - **Activity Log Alerts**: Real-time notifications on specific events
 * - **Diagnostic Settings**: Store ALL activity logs for later analysis
 *
 * **Common Use Cases**:
 * - Alert on resource deletion or creation (Activity Log Alerts)
 * - Monitor Azure service health (Activity Log Alerts)
 * - Store logs for compliance (Diagnostic Settings)
 * - Stream logs to SIEM (Diagnostic Settings)
 * - Query historical operations (Diagnostic Settings)
 *
 * @packageDocumentation
 */

// Activity Log Alerts
export * from './activity-log-alert-types';
export * from './activity-log-alert-arm';
export * from './activity-log-alert';

// Subscription Diagnostic Settings
export * from './diagnostic-setting-subscription-types';
export * from './diagnostic-setting-subscription-arm';
export * from './diagnostic-setting-subscription';
