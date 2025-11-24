/**
 * Audit Logger Event Handler - Handler Implementation
 *
 * Logs all system events for compliance and auditing.
 */

import { Context } from '@azure/functions';

interface EventGridEvent {
  id: string;
  topic: string;
  subject: string;
  eventType: string;
  eventTime: string;
  data: any;
  dataVersion: string;
}

export default async function handler(context: Context, events: EventGridEvent[]) {
  context.log(`Logging ${events.length} audit events`);

  // Process all events (no filtering for audit)
  for (const event of events) {
    await logAuditEvent(context, event);
  }

  context.log('Audit logging complete');
}

async function logAuditEvent(context: Context, event: EventGridEvent) {
  try {
    // Create audit record
    const auditRecord = {
      id: event.id,
      timestamp: event.eventTime,
      eventType: event.eventType,
      subject: event.subject,
      actor: extractActor(event),
      action: extractAction(event),
      resource: extractResource(event),
      result: extractResult(event),
      metadata: event.data,
      source: event.topic,
    };

    // Log to different destinations based on event type
    if (isSecurityEvent(event.eventType)) {
      await logToSecurityCenter(auditRecord);
    }

    if (isComplianceEvent(event.eventType)) {
      await logToComplianceStore(auditRecord);
    }

    // Always log to general audit store
    await logToAuditStore(auditRecord);

    // Log structured data for queries
    context.log({
      name: 'AuditEvent',
      eventType: event.eventType,
      actor: auditRecord.actor,
      action: auditRecord.action,
      resource: auditRecord.resource,
      timestamp: auditRecord.timestamp,
    });
  } catch (error) {
    // Audit logging must never fail - log error but continue
    context.log.error('Failed to log audit event:', {
      eventId: event.id,
      error: error.message,
    });
  }
}

function extractActor(event: EventGridEvent): string {
  // Extract user/service that triggered the event
  return event.data?.userId || event.data?.principalId || event.data?.actor || 'system';
}

function extractAction(event: EventGridEvent): string {
  // Extract the action performed
  const eventParts = event.eventType.split('.');
  return eventParts[eventParts.length - 1] || 'unknown';
}

function extractResource(event: EventGridEvent): string {
  // Extract the resource affected
  return event.subject || event.data?.resourceId || 'unknown';
}

function extractResult(event: EventGridEvent): string {
  // Extract operation result
  return event.data?.status || event.data?.result || 'success';
}

function isSecurityEvent(eventType: string): boolean {
  const securityEvents = ['Authentication.', 'Authorization.', 'Security.', 'Access.'];

  return securityEvents.some((prefix) => eventType.startsWith(prefix));
}

function isComplianceEvent(eventType: string): boolean {
  const complianceEvents = ['DataAccess.', 'DataModification.', 'DataDeletion.', 'PersonalData.'];

  return complianceEvents.some((prefix) => eventType.startsWith(prefix));
}

async function logToSecurityCenter(record: any): Promise<void> {
  // Log to security-specific store
  console.log('Security event:', record);
}

async function logToComplianceStore(record: any): Promise<void> {
  // Log to compliance-specific store with retention
  console.log('Compliance event:', record);
}

async function logToAuditStore(record: any): Promise<void> {
  // Log to general audit store
  console.log('Audit event:', record);
}
