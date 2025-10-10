/**
 * Function create command
 *
 * Scaffolds a new Azure Function with handler.ts + resource.ts pattern
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Trigger types supported by Azure Functions
 */
type TriggerType = 'http' | 'timer' | 'queue' | 'blob' | 'cosmosdb' | 'servicebus' | 'eventhub';

/**
 * Function template language
 */
type FunctionLanguage = 'typescript' | 'javascript';

/**
 * Creates the `atakora function create` command
 *
 * Scaffolds a new Azure Function with:
 * - handler.ts (or handler.js) - Function runtime logic
 * - resource.ts (or resource.js) - Function configuration
 * - Appropriate trigger configuration based on type
 *
 * @returns Commander command instance
 */
export function createFunctionCreateCommand(): Command {
  const create = new Command('create')
    .description('Create a new Azure Function')
    .option('-n, --name <name>', 'Function name (e.g., "api", "processOrders")')
    .option('-t, --trigger <type>', 'Trigger type (http, timer, queue, blob, cosmosdb, servicebus, eventhub)')
    .option('-l, --language <language>', 'Language (typescript, javascript)', 'typescript')
    .option('--path <path>', 'Functions directory path', './functions')
    .option('--non-interactive', 'Skip prompts and use defaults')
    .addHelpText(
      'after',
      `
${chalk.bold('Examples:')}
  ${chalk.dim('# Create HTTP-triggered function')}
  ${chalk.cyan('$')} atakora function create --name api --trigger http

  ${chalk.dim('# Create timer-triggered function')}
  ${chalk.cyan('$')} atakora function create --name cleanup --trigger timer

  ${chalk.dim('# Create queue-triggered function')}
  ${chalk.cyan('$')} atakora function create --name processOrders --trigger queue

${chalk.bold('Function Structure:')}
  functions/
  └── ${chalk.cyan('<function-name>/')}
      ├── handler.ts       ${chalk.dim('# Runtime logic')}
      └── resource.ts      ${chalk.dim('# Configuration')}
    `
    )
    .action(async (options) => {
      const spinner = ora();

      try {
        // Get configuration via prompts or options
        let functionName: string;
        let triggerType: TriggerType;
        let language: FunctionLanguage;
        let functionsPath: string;

        if (options.nonInteractive) {
          functionName = options.name || 'myFunction';
          triggerType = (options.trigger as TriggerType) || 'http';
          language = (options.language as FunctionLanguage) || 'typescript';
          functionsPath = options.path || './functions';
        } else {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'functionName',
              message: 'Function name:',
              default: options.name || 'myFunction',
              validate: (input: string) => {
                if (!input || input.trim().length === 0) {
                  return 'Function name is required';
                }
                if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(input)) {
                  return 'Function name must start with a letter and contain only letters, numbers, hyphens, and underscores';
                }
                return true;
              },
            },
            {
              type: 'list',
              name: 'triggerType',
              message: 'Trigger type:',
              default: options.trigger || 'http',
              choices: [
                { name: 'HTTP - Triggered by HTTP requests', value: 'http' },
                { name: 'Timer - Triggered on a schedule', value: 'timer' },
                { name: 'Queue - Triggered by Azure Queue messages', value: 'queue' },
                { name: 'Blob - Triggered by Blob storage changes', value: 'blob' },
                { name: 'Cosmos DB - Triggered by Cosmos DB changes', value: 'cosmosdb' },
                { name: 'Service Bus - Triggered by Service Bus messages', value: 'servicebus' },
                { name: 'Event Hub - Triggered by Event Hub events', value: 'eventhub' },
              ],
            },
            {
              type: 'list',
              name: 'language',
              message: 'Language:',
              default: options.language || 'typescript',
              choices: [
                { name: 'TypeScript', value: 'typescript' },
                { name: 'JavaScript', value: 'javascript' },
              ],
            },
            {
              type: 'input',
              name: 'functionsPath',
              message: 'Functions directory:',
              default: options.path || './functions',
            },
          ]);

          functionName = answers.functionName;
          triggerType = answers.triggerType as TriggerType;
          language = answers.language as FunctionLanguage;
          functionsPath = answers.functionsPath;
        }

        console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.bold.white('  Creating Azure Function'));
        console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

        // Create function directory
        const functionDir = path.join(process.cwd(), functionsPath, functionName);

        if (fs.existsSync(functionDir)) {
          console.log(chalk.red(`\nFunction "${functionName}" already exists at ${functionDir}`));
          process.exit(1);
        }

        spinner.start('Creating function directory...');
        fs.mkdirSync(functionDir, { recursive: true });
        spinner.succeed(chalk.green(`Created ${path.relative(process.cwd(), functionDir)}/`));

        // Generate handler file
        const handlerExt = language === 'typescript' ? 'ts' : 'js';
        const handlerPath = path.join(functionDir, `handler.${handlerExt}`);

        spinner.start(`Creating handler.${handlerExt}...`);
        const handlerContent = generateHandlerContent(functionName, triggerType, language);
        fs.writeFileSync(handlerPath, handlerContent, 'utf-8');
        spinner.succeed(chalk.green(`Created handler.${handlerExt}`));

        // Generate resource file
        const resourceExt = language === 'typescript' ? 'ts' : 'js';
        const resourcePath = path.join(functionDir, `resource.${resourceExt}`);

        spinner.start(`Creating resource.${resourceExt}...`);
        const resourceContent = generateResourceContent(functionName, triggerType, language);
        fs.writeFileSync(resourcePath, resourceContent, 'utf-8');
        spinner.succeed(chalk.green(`Created resource.${resourceExt}`));

        // Success message
        console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.green.bold('  ✓ Function created successfully!'));
        console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

        console.log(chalk.bold('📁 Files created:\n'));
        console.log(`  ${chalk.cyan('•')} ${path.relative(process.cwd(), handlerPath)}`);
        console.log(`  ${chalk.cyan('•')} ${path.relative(process.cwd(), resourcePath)}\n`);

        console.log(chalk.bold('🚀 Next Steps:\n'));
        console.log(`  ${chalk.cyan('1.')} Edit the function handler`);
        console.log(`     ${chalk.dim('Edit:')} ${chalk.bold(path.relative(process.cwd(), handlerPath))}\n`);
        console.log(`  ${chalk.cyan('2.')} Configure function settings`);
        console.log(`     ${chalk.dim('Edit:')} ${chalk.bold(path.relative(process.cwd(), resourcePath))}\n`);
        console.log(`  ${chalk.cyan('3.')} Test the function locally`);
        console.log(`     ${chalk.dim('$')} ${chalk.bold(`atakora function invoke ${functionName}`)}\n`);
        console.log(`  ${chalk.cyan('4.')} Deploy to Azure`);
        console.log(`     ${chalk.dim('$')} ${chalk.bold('atakora function deploy')}\n`);
      } catch (error) {
        spinner.fail(chalk.red('Function creation failed'));

        if (error instanceof Error) {
          console.error(chalk.red('\nError: ' + error.message));
        } else {
          console.error(chalk.red('\nUnknown error occurred'));
        }

        process.exit(1);
      }
    });

  return create;
}

/**
 * Generate handler file content based on trigger type
 */
function generateHandlerContent(
  functionName: string,
  triggerType: TriggerType,
  language: FunctionLanguage
): string {
  const isTypeScript = language === 'typescript';

  switch (triggerType) {
    case 'http':
      return isTypeScript
        ? generateHttpHandlerTS(functionName)
        : generateHttpHandlerJS(functionName);
    case 'timer':
      return isTypeScript
        ? generateTimerHandlerTS(functionName)
        : generateTimerHandlerJS(functionName);
    case 'queue':
      return isTypeScript
        ? generateQueueHandlerTS(functionName)
        : generateQueueHandlerJS(functionName);
    case 'blob':
      return isTypeScript
        ? generateBlobHandlerTS(functionName)
        : generateBlobHandlerJS(functionName);
    case 'cosmosdb':
      return isTypeScript
        ? generateCosmosHandlerTS(functionName)
        : generateCosmosHandlerJS(functionName);
    case 'servicebus':
      return isTypeScript
        ? generateServiceBusHandlerTS(functionName)
        : generateServiceBusHandlerJS(functionName);
    case 'eventhub':
      return isTypeScript
        ? generateEventHubHandlerTS(functionName)
        : generateEventHubHandlerJS(functionName);
    default:
      return '';
  }
}

/**
 * Generate resource file content based on trigger type
 */
function generateResourceContent(
  functionName: string,
  triggerType: TriggerType,
  language: FunctionLanguage
): string {
  const isTypeScript = language === 'typescript';

  switch (triggerType) {
    case 'http':
      return isTypeScript ? generateHttpResourceTS() : generateHttpResourceJS();
    case 'timer':
      return isTypeScript ? generateTimerResourceTS() : generateTimerResourceJS();
    case 'queue':
      return isTypeScript ? generateQueueResourceTS() : generateQueueResourceJS();
    case 'blob':
      return isTypeScript ? generateBlobResourceTS() : generateBlobResourceJS();
    case 'cosmosdb':
      return isTypeScript ? generateCosmosResourceTS() : generateCosmosResourceJS();
    case 'servicebus':
      return isTypeScript ? generateServiceBusResourceTS() : generateServiceBusResourceJS();
    case 'eventhub':
      return isTypeScript ? generateEventHubResourceTS() : generateEventHubResourceJS();
    default:
      return '';
  }
}

// TypeScript handler templates

function generateHttpHandlerTS(functionName: string): string {
  return `import { HttpHandler, AzureFunctionContext, HttpRequest, HttpResponse } from '@atakora/lib/testing';

/**
 * HTTP-triggered Azure Function: ${functionName}
 *
 * This function is triggered by HTTP requests to the configured route.
 */
export const handler: HttpHandler = async (
  context: AzureFunctionContext,
  req: HttpRequest
): Promise<HttpResponse> => {
  context.log.info('Processing HTTP request', { url: req.url, method: req.method });

  // Access environment variables from resource.ts
  const { EXAMPLE_ENV_VAR } = process.env;

  // Get request data
  const name = req.query.name || req.body?.name || 'World';

  // Return HTTP response
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      message: \`Hello, \${name}!\`,
      timestamp: new Date().toISOString(),
      environment: EXAMPLE_ENV_VAR,
    },
  };
};
`;
}

function generateTimerHandlerTS(functionName: string): string {
  return `import { TimerHandler, AzureFunctionContext, TimerInfo } from '@atakora/lib/testing';

/**
 * Timer-triggered Azure Function: ${functionName}
 *
 * This function runs on a schedule defined in resource.ts.
 */
export const handler: TimerHandler = async (
  context: AzureFunctionContext,
  timer: TimerInfo
): Promise<void> => {
  context.log.info('Timer function triggered', {
    isPastDue: timer.isPastDue,
    next: timer.scheduleStatus.next,
  });

  // Access environment variables from resource.ts
  const { EXAMPLE_ENV_VAR } = process.env;

  // Your scheduled task logic here
  context.log.info('Executing scheduled task', { environment: EXAMPLE_ENV_VAR });

  // Example: Cleanup, data processing, report generation, etc.
};
`;
}

function generateQueueHandlerTS(functionName: string): string {
  return `import { QueueHandler, AzureFunctionContext } from '@atakora/lib/testing';

interface QueueMessage {
  // Define your queue message structure
  id: string;
  data: unknown;
}

/**
 * Queue-triggered Azure Function: ${functionName}
 *
 * This function is triggered by messages in an Azure Storage Queue.
 */
export const handler: QueueHandler<QueueMessage> = async (
  context: AzureFunctionContext,
  message: QueueMessage
): Promise<void> => {
  context.log.info('Processing queue message', { messageId: message.id });

  // Access environment variables from resource.ts
  const { EXAMPLE_ENV_VAR } = process.env;

  // Process the queue message
  try {
    // Your message processing logic here
    context.log.info('Message processed successfully', { messageId: message.id });
  } catch (error) {
    context.log.error('Error processing message', { error, messageId: message.id });
    throw error; // Message will be retried or moved to poison queue
  }
};
`;
}

function generateBlobHandlerTS(functionName: string): string {
  return `import { TriggerHandler, AzureFunctionContext } from '@atakora/lib/testing';

/**
 * Blob-triggered Azure Function: ${functionName}
 *
 * This function is triggered when a blob is created or updated.
 */
export const handler: TriggerHandler<Buffer> = async (
  context: AzureFunctionContext,
  blob: Buffer
): Promise<void> => {
  context.log.info('Processing blob', {
    blobPath: context.bindingData.blobTrigger,
    size: blob.length,
  });

  // Access environment variables from resource.ts
  const { EXAMPLE_ENV_VAR } = process.env;

  // Process the blob
  const content = blob.toString('utf-8');
  context.log.info('Blob content length', { length: content.length });

  // Your blob processing logic here
};
`;
}

function generateCosmosHandlerTS(functionName: string): string {
  return `import { TriggerHandler, AzureFunctionContext } from '@atakora/lib/testing';

interface CosmosDocument {
  id: string;
  [key: string]: unknown;
}

/**
 * Cosmos DB-triggered Azure Function: ${functionName}
 *
 * This function is triggered by changes in a Cosmos DB collection.
 */
export const handler: TriggerHandler<CosmosDocument[]> = async (
  context: AzureFunctionContext,
  documents: CosmosDocument[]
): Promise<void> => {
  context.log.info('Processing Cosmos DB changes', { documentCount: documents.length });

  // Access environment variables from resource.ts
  const { EXAMPLE_ENV_VAR } = process.env;

  // Process each changed document
  for (const doc of documents) {
    context.log.info('Processing document', { documentId: doc.id });
    // Your document processing logic here
  }
};
`;
}

function generateServiceBusHandlerTS(functionName: string): string {
  return `import { TriggerHandler, AzureFunctionContext } from '@atakora/lib/testing';

interface ServiceBusMessage {
  // Define your Service Bus message structure
  body: unknown;
  messageId: string;
}

/**
 * Service Bus-triggered Azure Function: ${functionName}
 *
 * This function is triggered by messages in a Service Bus queue or topic.
 */
export const handler: TriggerHandler<ServiceBusMessage> = async (
  context: AzureFunctionContext,
  message: ServiceBusMessage
): Promise<void> => {
  context.log.info('Processing Service Bus message', { messageId: message.messageId });

  // Access environment variables from resource.ts
  const { EXAMPLE_ENV_VAR } = process.env;

  // Process the message
  try {
    // Your message processing logic here
    context.log.info('Message processed successfully', { messageId: message.messageId });
  } catch (error) {
    context.log.error('Error processing message', { error, messageId: message.messageId });
    throw error; // Message will be retried based on retry policy
  }
};
`;
}

function generateEventHubHandlerTS(functionName: string): string {
  return `import { TriggerHandler, AzureFunctionContext } from '@atakora/lib/testing';

interface EventHubEvent {
  // Define your Event Hub event structure
  body: unknown;
  partitionKey: string;
  sequenceNumber: number;
}

/**
 * Event Hub-triggered Azure Function: ${functionName}
 *
 * This function is triggered by events from an Event Hub.
 */
export const handler: TriggerHandler<EventHubEvent[]> = async (
  context: AzureFunctionContext,
  events: EventHubEvent[]
): Promise<void> => {
  context.log.info('Processing Event Hub events', { eventCount: events.length });

  // Access environment variables from resource.ts
  const { EXAMPLE_ENV_VAR } = process.env;

  // Process each event
  for (const event of events) {
    context.log.info('Processing event', {
      partitionKey: event.partitionKey,
      sequenceNumber: event.sequenceNumber,
    });
    // Your event processing logic here
  }
};
`;
}

// JavaScript handler templates

function generateHttpHandlerJS(functionName: string): string {
  return `/**
 * HTTP-triggered Azure Function: ${functionName}
 *
 * This function is triggered by HTTP requests to the configured route.
 */
exports.handler = async function (context, req) {
  context.log.info('Processing HTTP request', { url: req.url, method: req.method });

  // Access environment variables from resource.js
  const { EXAMPLE_ENV_VAR } = process.env;

  // Get request data
  const name = req.query.name || req.body?.name || 'World';

  // Return HTTP response
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      message: \`Hello, \${name}!\`,
      timestamp: new Date().toISOString(),
      environment: EXAMPLE_ENV_VAR,
    },
  };
};
`;
}

function generateTimerHandlerJS(functionName: string): string {
  return `/**
 * Timer-triggered Azure Function: ${functionName}
 *
 * This function runs on a schedule defined in resource.js.
 */
exports.handler = async function (context, timer) {
  context.log.info('Timer function triggered', {
    isPastDue: timer.isPastDue,
    next: timer.scheduleStatus.next,
  });

  // Access environment variables from resource.js
  const { EXAMPLE_ENV_VAR } = process.env;

  // Your scheduled task logic here
  context.log.info('Executing scheduled task', { environment: EXAMPLE_ENV_VAR });
};
`;
}

function generateQueueHandlerJS(functionName: string): string {
  return `/**
 * Queue-triggered Azure Function: ${functionName}
 *
 * This function is triggered by messages in an Azure Storage Queue.
 */
exports.handler = async function (context, message) {
  context.log.info('Processing queue message', { messageId: message.id });

  // Access environment variables from resource.js
  const { EXAMPLE_ENV_VAR } = process.env;

  // Process the queue message
  try {
    // Your message processing logic here
    context.log.info('Message processed successfully', { messageId: message.id });
  } catch (error) {
    context.log.error('Error processing message', { error, messageId: message.id });
    throw error;
  }
};
`;
}

function generateBlobHandlerJS(functionName: string): string {
  return `/**
 * Blob-triggered Azure Function: ${functionName}
 *
 * This function is triggered when a blob is created or updated.
 */
exports.handler = async function (context, blob) {
  context.log.info('Processing blob', {
    blobPath: context.bindingData.blobTrigger,
    size: blob.length,
  });

  // Access environment variables from resource.js
  const { EXAMPLE_ENV_VAR } = process.env;

  // Process the blob
  const content = blob.toString('utf-8');
  context.log.info('Blob content length', { length: content.length });
};
`;
}

function generateCosmosHandlerJS(functionName: string): string {
  return `/**
 * Cosmos DB-triggered Azure Function: ${functionName}
 *
 * This function is triggered by changes in a Cosmos DB collection.
 */
exports.handler = async function (context, documents) {
  context.log.info('Processing Cosmos DB changes', { documentCount: documents.length });

  // Access environment variables from resource.js
  const { EXAMPLE_ENV_VAR } = process.env;

  // Process each changed document
  for (const doc of documents) {
    context.log.info('Processing document', { documentId: doc.id });
  }
};
`;
}

function generateServiceBusHandlerJS(functionName: string): string {
  return `/**
 * Service Bus-triggered Azure Function: ${functionName}
 *
 * This function is triggered by messages in a Service Bus queue or topic.
 */
exports.handler = async function (context, message) {
  context.log.info('Processing Service Bus message', { messageId: message.messageId });

  // Access environment variables from resource.js
  const { EXAMPLE_ENV_VAR } = process.env;

  // Process the message
  try {
    context.log.info('Message processed successfully', { messageId: message.messageId });
  } catch (error) {
    context.log.error('Error processing message', { error, messageId: message.messageId });
    throw error;
  }
};
`;
}

function generateEventHubHandlerJS(functionName: string): string {
  return `/**
 * Event Hub-triggered Azure Function: ${functionName}
 *
 * This function is triggered by events from an Event Hub.
 */
exports.handler = async function (context, events) {
  context.log.info('Processing Event Hub events', { eventCount: events.length });

  // Access environment variables from resource.js
  const { EXAMPLE_ENV_VAR } = process.env;

  // Process each event
  for (const event of events) {
    context.log.info('Processing event', {
      partitionKey: event.partitionKey,
      sequenceNumber: event.sequenceNumber,
    });
  }
};
`;
}

// TypeScript resource templates

function generateHttpResourceTS(): string {
  return `import { defineFunction } from '@atakora/cdk/functions';

export interface FunctionEnv {
  readonly EXAMPLE_ENV_VAR: string;
}

export default defineFunction<FunctionEnv>({
  trigger: {
    type: 'http',
    route: 'api/example',
    methods: ['GET', 'POST'],
    authLevel: 'anonymous', // Options: 'anonymous', 'function', 'admin'
  },

  environment: {
    EXAMPLE_ENV_VAR: '\${EXAMPLE_VALUE}', // Placeholder filled from app.ts
  },

  timeout: 60, // Timeout in seconds
  memorySize: 512, // Memory in MB
});
`;
}

function generateTimerResourceTS(): string {
  return `import { defineFunction } from '@atakora/cdk/functions';

export interface FunctionEnv {
  readonly EXAMPLE_ENV_VAR: string;
}

export default defineFunction<FunctionEnv>({
  trigger: {
    type: 'timer',
    schedule: '0 */5 * * * *', // Every 5 minutes (CRON expression)
    runOnStartup: false,
  },

  environment: {
    EXAMPLE_ENV_VAR: '\${EXAMPLE_VALUE}',
  },

  timeout: 300, // 5 minutes
});
`;
}

function generateQueueResourceTS(): string {
  return `import { defineFunction } from '@atakora/cdk/functions';

export interface FunctionEnv {
  readonly STORAGE_CONNECTION: string;
}

export default defineFunction<FunctionEnv>({
  trigger: {
    type: 'queue',
    queueName: 'myqueue',
    connection: '\${STORAGE_CONNECTION}',
    batchSize: 16,
  },

  environment: {
    STORAGE_CONNECTION: '\${STORAGE_CONNECTION_STRING}',
  },
});
`;
}

function generateBlobResourceTS(): string {
  return `import { defineFunction } from '@atakora/cdk/functions';

export interface FunctionEnv {
  readonly STORAGE_CONNECTION: string;
}

export default defineFunction<FunctionEnv>({
  trigger: {
    type: 'blob',
    path: 'mycontainer/{name}',
    connection: '\${STORAGE_CONNECTION}',
  },

  environment: {
    STORAGE_CONNECTION: '\${STORAGE_CONNECTION_STRING}',
  },
});
`;
}

function generateCosmosResourceTS(): string {
  return `import { defineFunction } from '@atakora/cdk/functions';

export interface FunctionEnv {
  readonly COSMOS_CONNECTION: string;
}

export default defineFunction<FunctionEnv>({
  trigger: {
    type: 'cosmosDB',
    databaseName: 'MyDatabase',
    collectionName: 'MyCollection',
    connectionStringSetting: '\${COSMOS_CONNECTION}',
    createLeaseCollectionIfNotExists: true,
  },

  environment: {
    COSMOS_CONNECTION: '\${COSMOS_CONNECTION_STRING}',
  },
});
`;
}

function generateServiceBusResourceTS(): string {
  return `import { defineFunction } from '@atakora/cdk/functions';

export interface FunctionEnv {
  readonly SERVICE_BUS_CONNECTION: string;
}

export default defineFunction<FunctionEnv>({
  trigger: {
    type: 'serviceBus',
    queueName: 'myqueue',
    connection: '\${SERVICE_BUS_CONNECTION}',
  },

  environment: {
    SERVICE_BUS_CONNECTION: '\${SERVICE_BUS_CONNECTION_STRING}',
  },
});
`;
}

function generateEventHubResourceTS(): string {
  return `import { defineFunction } from '@atakora/cdk/functions';

export interface FunctionEnv {
  readonly EVENT_HUB_CONNECTION: string;
}

export default defineFunction<FunctionEnv>({
  trigger: {
    type: 'eventHub',
    eventHubName: 'myeventhub',
    connection: '\${EVENT_HUB_CONNECTION}',
    consumerGroup: '$Default',
  },

  environment: {
    EVENT_HUB_CONNECTION: '\${EVENT_HUB_CONNECTION_STRING}',
  },
});
`;
}

// JavaScript resource templates (similar structure without TypeScript types)

function generateHttpResourceJS(): string {
  return `const { defineFunction } = require('@atakora/cdk/functions');

module.exports = defineFunction({
  trigger: {
    type: 'http',
    route: 'api/example',
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
  },

  environment: {
    EXAMPLE_ENV_VAR: '\${EXAMPLE_VALUE}',
  },

  timeout: 60,
  memorySize: 512,
});
`;
}

function generateTimerResourceJS(): string {
  return `const { defineFunction } = require('@atakora/cdk/functions');

module.exports = defineFunction({
  trigger: {
    type: 'timer',
    schedule: '0 */5 * * * *',
    runOnStartup: false,
  },

  environment: {
    EXAMPLE_ENV_VAR: '\${EXAMPLE_VALUE}',
  },

  timeout: 300,
});
`;
}

function generateQueueResourceJS(): string {
  return `const { defineFunction } = require('@atakora/cdk/functions');

module.exports = defineFunction({
  trigger: {
    type: 'queue',
    queueName: 'myqueue',
    connection: '\${STORAGE_CONNECTION}',
    batchSize: 16,
  },

  environment: {
    STORAGE_CONNECTION: '\${STORAGE_CONNECTION_STRING}',
  },
});
`;
}

function generateBlobResourceJS(): string {
  return `const { defineFunction } = require('@atakora/cdk/functions');

module.exports = defineFunction({
  trigger: {
    type: 'blob',
    path: 'mycontainer/{name}',
    connection: '\${STORAGE_CONNECTION}',
  },

  environment: {
    STORAGE_CONNECTION: '\${STORAGE_CONNECTION_STRING}',
  },
});
`;
}

function generateCosmosResourceJS(): string {
  return `const { defineFunction } = require('@atakora/cdk/functions');

module.exports = defineFunction({
  trigger: {
    type: 'cosmosDB',
    databaseName: 'MyDatabase',
    collectionName: 'MyCollection',
    connectionStringSetting: '\${COSMOS_CONNECTION}',
    createLeaseCollectionIfNotExists: true,
  },

  environment: {
    COSMOS_CONNECTION: '\${COSMOS_CONNECTION_STRING}',
  },
});
`;
}

function generateServiceBusResourceJS(): string {
  return `const { defineFunction } = require('@atakora/cdk/functions');

module.exports = defineFunction({
  trigger: {
    type: 'serviceBus',
    queueName: 'myqueue',
    connection: '\${SERVICE_BUS_CONNECTION}',
  },

  environment: {
    SERVICE_BUS_CONNECTION: '\${SERVICE_BUS_CONNECTION_STRING}',
  },
});
`;
}

function generateEventHubResourceJS(): string {
  return `const { defineFunction } = require('@atakora/cdk/functions');

module.exports = defineFunction({
  trigger: {
    type: 'eventHub',
    eventHubName: 'myeventhub',
    connection: '\${EVENT_HUB_CONNECTION}',
    consumerGroup: '$Default',
  },

  environment: {
    EVENT_HUB_CONNECTION: '\${EVENT_HUB_CONNECTION_STRING}',
  },
});
`;
}
