/**
 * Azure Functions trigger builders and utilities.
 *
 * @packageDocumentation
 *
 * @remarks
 * This module provides fluent builder APIs for all 18 Azure Functions trigger types:
 *
 * ## Core Triggers (9)
 * - {@link HttpTrigger} - HTTP requests
 * - {@link TimerTrigger} - Scheduled execution
 * - {@link QueueTrigger} - Azure Storage Queues
 * - {@link BlobTrigger} - Azure Blob Storage
 * - {@link ServiceBusQueueTrigger} - Service Bus Queues
 * - {@link ServiceBusTopicTrigger} - Service Bus Topics
 * - {@link EventHubTrigger} - Event Hubs
 * - {@link CosmosDBTrigger} - Cosmos DB Change Feed
 * - {@link EventGridTrigger} - Event Grid
 *
 * ## IoT & Real-time (2)
 * - {@link IoTHubTrigger} - IoT Hub messages
 * - {@link SignalRTrigger} - SignalR events
 *
 * ## Third-Party (3)
 * - {@link KafkaTrigger} - Apache Kafka
 * - {@link RabbitMQTrigger} - RabbitMQ
 * - {@link RedisStreamTrigger} - Redis Streams
 *
 * ## Durable Functions (3)
 * - {@link DurableOrchestratorTrigger} - Durable Orchestrations
 * - {@link DurableActivityTrigger} - Durable Activities
 * - {@link DurableEntityTrigger} - Durable Entities
 */

// HTTP Trigger
export { HttpTrigger, httpTrigger, anonymousGet, anonymousPost, validateRoute, extractRouteParams } from './http-trigger';

// Timer Trigger
export {
  TimerTrigger,
  timerTrigger,
  CronSchedules,
  validateCronExpression,
  validateTimeSpan,
  timeSpanToCron,
  describeCronExpression,
} from './timer-trigger';

// Queue Trigger
export { QueueTrigger, queueTrigger } from './queue-trigger';

// Blob Trigger
export { BlobTrigger, blobTrigger } from './blob-trigger';

// Service Bus Queue Trigger
export { ServiceBusQueueTrigger, serviceBusQueueTrigger } from './service-bus-queue-trigger';

// Service Bus Topic Trigger
export { ServiceBusTopicTrigger, serviceBusTopicTrigger } from './service-bus-topic-trigger';

// Event Hub Trigger
export { EventHubTrigger, eventHubTrigger } from './event-hub-trigger';

// Cosmos DB Trigger
export { CosmosDBTrigger, cosmosDBTrigger } from './cosmos-db-trigger';

// Event Grid Trigger
export { EventGridTrigger, eventGridTrigger } from './event-grid-trigger';

// IoT Hub Trigger
export { IoTHubTrigger, iotHubTrigger } from './iot-hub-trigger';

// SignalR Trigger
export { SignalRTrigger, signalRTrigger } from './signalr-trigger';

// Kafka Trigger
export { KafkaTrigger, kafkaTrigger } from './kafka-trigger';

// RabbitMQ Trigger
export { RabbitMQTrigger, rabbitMQTrigger } from './rabbitmq-trigger';

// Redis Stream Trigger
export { RedisStreamTrigger, redisStreamTrigger } from './redis-stream-trigger';

// Durable Orchestrator Trigger
export { DurableOrchestratorTrigger, durableOrchestratorTrigger } from './durable-orchestrator-trigger';

// Durable Activity Trigger
export { DurableActivityTrigger, durableActivityTrigger } from './durable-activity-trigger';

// Durable Entity Trigger
export { DurableEntityTrigger, durableEntityTrigger } from './durable-entity-trigger';
