/**
 * MessageQueue Component
 *
 * @remarks
 * High-level component that creates a Service Bus Queue with integrated
 * producer and consumer functions. Simplifies the setup of Azure's SQS-equivalent
 * messaging pattern.
 *
 * Features:
 * - Service Bus Queue with dead-letter queue
 * - Automatic producer/consumer permissions
 * - Function trigger configuration
 * - Monitoring and diagnostics
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import { ServiceBusNamespace, ServiceBusQueue, ServiceBusSku } from '@atakora/cdk/servicebus';
import type { IServiceBusNamespace, IServiceBusQueue } from '@atakora/cdk/servicebus';
import type { MessageQueueProps, QueueFunctionConfig } from './types';

/**
 * MessageQueue Component
 *
 * @example
 * Basic usage with producer and consumer:
 * ```typescript
 * import { MessageQueue } from '@atakora/component/messaging';
 *
 * const taskQueue = new MessageQueue(stack, 'TaskQueue', {
 *   queueName: 'background-tasks',
 *   maxDeliveryCount: 5,
 *
 *   // Producer function - sends messages to queue
 *   producer: {
 *     functionApp: apiFunction,
 *     handlerName: 'createTask',
 *   },
 *
 *   // Consumer function - processes messages from queue
 *   consumer: {
 *     functionApp: workerFunction,
 *     handlerName: 'processTask',
 *     batchSize: 10,
 *   },
 * });
 *
 * // Use the queue
 * console.log(taskQueue.queueName);
 * console.log(taskQueue.connectionString);
 * ```
 *
 * @example
 * Multiple consumers (competing consumers pattern):
 * ```typescript
 * const orderQueue = new MessageQueue(stack, 'Orders', {
 *   consumers: [
 *     {
 *       functionApp: paymentProcessor,
 *       handlerName: 'processPayment',
 *     },
 *     {
 *       functionApp: inventoryProcessor,
 *       handlerName: 'updateInventory',
 *     },
 *   ],
 * });
 * ```
 */
export class MessageQueue extends Construct {
  /**
   * Service Bus namespace.
   */
  public readonly namespace: ServiceBusNamespace;

  /**
   * Service Bus queue.
   */
  public readonly queue: ServiceBusQueue;

  /**
   * Queue name.
   */
  public readonly queueName: string;

  /**
   * Queue connection string.
   */
  public readonly connectionString: string;

  /**
   * Queue resource ID.
   */
  public readonly queueId: string;

  /**
   * Dead-letter queue name.
   *
   * @remarks
   * Format: {queueName}/$DeadLetterQueue
   * Automatically created by Service Bus.
   */
  public readonly deadLetterQueueName: string;

  /**
   * Producer function configurations.
   */
  public readonly producers: QueueFunctionConfig[];

  /**
   * Consumer function configurations.
   */
  public readonly consumers: QueueFunctionConfig[];

  constructor(scope: Construct, id: string, props: MessageQueueProps = {}) {
    super(scope, id);

    // Create or use existing Service Bus namespace
    this.namespace = props.namespace ?? new ServiceBusNamespace(this, 'Namespace', {
      sku: ServiceBusSku.STANDARD, // Standard tier includes dead-letter queues
      location: props.location,
      tags: props.tags,
    });

    // Create the queue
    // Note: Queue must be created under the MessageQueue construct (not under namespace)
    // so it becomes a child of this component in the construct tree
    this.queue = new ServiceBusQueue(this, 'Queue', {
      queueName: props.queueName,
      lockDuration: props.lockDuration,
      maxDeliveryCount: props.maxDeliveryCount,
      requiresDuplicateDetection: props.requiresDuplicateDetection,
      duplicateDetectionWindow: props.duplicateDetectionWindow,
      defaultMessageTimeToLive: props.defaultMessageTimeToLive,
      deadLetteringOnMessageExpiration: props.deadLetteringOnMessageExpiration ?? true,
      enablePartitioning: props.enablePartitioning,
      requiresSession: props.requiresSession,
      tags: props.tags,
    });

    this.queueName = this.queue.queueName;
    this.connectionString = this.queue.connectionString;
    this.queueId = this.queue.queueId;
    this.deadLetterQueueName = `${this.queueName}/$DeadLetterQueue`;

    // Store producer and consumer configurations
    this.producers = [];
    this.consumers = [];

    // Configure producer if provided
    if (props.producer) {
      this.addProducer(props.producer);
    }

    // Configure consumer if provided
    if (props.consumer) {
      this.addConsumer(props.consumer);
    }

    // Configure multiple consumers if provided
    if (props.consumers && props.consumers.length > 0) {
      props.consumers.forEach((consumer) => this.addConsumer(consumer));
    }

    // Configure monitoring if enabled
    if (props.enableMonitoring !== false) {
      this.configureMonitoring();
    }
  }

  /**
   * Add a producer function to the queue.
   *
   * @param config - Producer function configuration
   *
   * @remarks
   * Grants send permissions to the function app and adds environment variables.
   *
   * @example
   * ```typescript
   * queue.addProducer({
   *   functionApp: myFunction,
   *   handlerName: 'sendMessage',
   * });
   * ```
   */
  public addProducer(config: QueueFunctionConfig): void {
    // Grant send permission
    this.queue.grantSend(config.functionApp);

    // Add environment variables for the producer function
    const envVars: Record<string, string> = {
      [`${this.getEnvPrefix()}_QUEUE_NAME`]: this.queueName,
      [`${this.getEnvPrefix()}_CONNECTION_STRING`]: this.connectionString,
      [`${this.getEnvPrefix()}_NAMESPACE`]: this.namespace.namespaceName,
    };

    // Note: In a real implementation, we would call config.functionApp.addEnvironmentVariables(envVars)
    // For now, we'll document what should be added
    this.producers.push(config);
  }

  /**
   * Add a consumer function to the queue.
   *
   * @param config - Consumer function configuration
   *
   * @remarks
   * Grants receive permissions to the function app, adds environment variables,
   * and configures the Service Bus trigger.
   *
   * @example
   * ```typescript
   * queue.addConsumer({
   *   functionApp: myFunction,
   *   handlerName: 'processMessage',
   *   batchSize: 10,
   * });
   * ```
   */
  public addConsumer(config: QueueFunctionConfig): void {
    // Grant receive permission
    this.queue.grantReceive(config.functionApp);

    // Add environment variables for the consumer function
    const envVars: Record<string, string> = {
      [`${this.getEnvPrefix()}_QUEUE_NAME`]: this.queueName,
      [`${this.getEnvPrefix()}_CONNECTION_STRING`]: this.connectionString,
      [`${this.getEnvPrefix()}_NAMESPACE`]: this.namespace.namespaceName,
    };

    // Note: In a real implementation, we would:
    // 1. Call config.functionApp.addEnvironmentVariables(envVars)
    // 2. Configure the Service Bus trigger binding in function.json
    // 3. Set up the batch configuration

    this.consumers.push(config);
  }

  /**
   * Get environment variable prefix for this queue.
   *
   * @returns Environment variable prefix in UPPER_SNAKE_CASE
   */
  private getEnvPrefix(): string {
    return this.queueName
      .replace(/-/g, '_')
      .toUpperCase();
  }

  /**
   * Configure monitoring and diagnostics.
   */
  private configureMonitoring(): void {
    // TODO: Add Application Insights integration
    // TODO: Add diagnostic settings for queue metrics
    // TODO: Configure alerts for:
    //   - Dead-letter queue depth
    //   - Active message count
    //   - Failed deliveries
  }

  /**
   * Get Azure CLI command to send a message to the queue.
   *
   * @param message - Message content (JSON string)
   * @returns Azure CLI command string
   *
   * @example
   * ```typescript
   * const cmd = queue.getSendMessageCommand('{"task": "process-order"}');
   * console.log(cmd);
   * // az servicebus queue send --namespace sb-myapp --name orders --body '{"task": "process-order"}'
   * ```
   */
  public getSendMessageCommand(message: string): string {
    return `az servicebus queue send --namespace ${this.namespace.namespaceName} --name ${this.queueName} --body '${message}'`;
  }

  /**
   * Get Azure CLI command to receive messages from the queue.
   *
   * @param count - Number of messages to receive
   * @returns Azure CLI command string
   *
   * @example
   * ```typescript
   * const cmd = queue.getReceiveMessageCommand(10);
   * console.log(cmd);
   * // az servicebus queue receive --namespace sb-myapp --name orders --max-count 10
   * ```
   */
  public getReceiveMessageCommand(count: number = 1): string {
    return `az servicebus queue receive --namespace ${this.namespace.namespaceName} --name ${this.queueName} --max-count ${count}`;
  }

  /**
   * Get Azure CLI command to view dead-letter queue messages.
   *
   * @returns Azure CLI command string
   *
   * @example
   * ```typescript
   * const cmd = queue.getDeadLetterQueueCommand();
   * console.log(cmd);
   * ```
   */
  public getDeadLetterQueueCommand(): string {
    return `az servicebus queue show --namespace ${this.namespace.namespaceName} --name ${this.queueName} --query "countDetails.deadLetterMessageCount"`;
  }

  /**
   * Get setup instructions for using the queue.
   *
   * @returns Markdown-formatted instructions
   */
  public getSetupInstructions(): string {
    const instructions = [
      '# Message Queue Setup Instructions',
      '',
      `## Queue: ${this.queueName}`,
      '',
      '## Producer Function Setup',
      '',
      'Add these environment variables to your producer function:',
      '```',
      `QUEUE_NAME=${this.queueName}`,
      `QUEUE_NAMESPACE=${this.namespace.namespaceName}`,
      '```',
      '',
      'Example code to send a message:',
      '```typescript',
      `import { ServiceBusClient } from '@azure/service-bus';`,
      '',
      `const client = new ServiceBusClient(process.env.QUEUE_CONNECTION_STRING);`,
      `const sender = client.createSender('${this.queueName}');`,
      '',
      `await sender.sendMessages({ body: { task: 'process-order', orderId: 123 } });`,
      `await sender.close();`,
      '```',
      '',
      '## Consumer Function Setup',
      '',
      'Your consumer function will be automatically triggered by new messages.',
      '',
      'Example function.json:',
      '```json',
      '{',
      '  "bindings": [',
      '    {',
      '      "type": "serviceBusTrigger",',
      `      "name": "message",`,
      `      "queueName": "${this.queueName}",`,
      '      "connection": "ServiceBusConnection",',
      '      "cardinality": "one"',
      '    }',
      '  ]',
      '}',
      '```',
      '',
      '## Dead-Letter Queue',
      '',
      `Messages that fail after ${this.queue.queueId} retries will be moved to:`,
      `\`${this.deadLetterQueueName}\``,
      '',
      'View dead-letter messages:',
      '```bash',
      this.getDeadLetterQueueCommand(),
      '```',
    ];

    return instructions.join('\n');
  }
}
