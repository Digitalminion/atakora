/**
 * Azure Functions CLI commands
 *
 * Provides commands for creating, deploying, and testing Azure Functions
 *
 * @packageDocumentation
 */

import { Command } from 'commander';
import { createFunctionCreateCommand } from './create';
import { createFunctionDeployCommand } from './deploy';
import { createFunctionInvokeCommand } from './invoke';
import { createFunctionListCommand } from './list';
import { createFunctionLogsCommand } from './logs';

/**
 * Creates the `atakora function` command group
 *
 * Provides subcommands for managing Azure Functions:
 * - create: Scaffold a new function with handler.ts + resource.ts
 * - deploy: Deploy functions to Azure
 * - invoke: Test functions locally
 * - list: List discovered functions
 * - logs: Stream function logs
 *
 * @returns Commander command instance
 */
export function createFunctionCommand(): Command {
  const functionCmd = new Command('function')
    .description('Manage Azure Functions')
    .addHelpText(
      'after',
      `
Examples:
  $ atakora function create --name api --trigger http
  $ atakora function list
  $ atakora function invoke api --payload '{"test": true}'
  $ atakora function deploy
  $ atakora function logs api --follow
    `
    );

  // Add subcommands
  functionCmd.addCommand(createFunctionCreateCommand());
  functionCmd.addCommand(createFunctionDeployCommand());
  functionCmd.addCommand(createFunctionInvokeCommand());
  functionCmd.addCommand(createFunctionListCommand());
  functionCmd.addCommand(createFunctionLogsCommand());

  return functionCmd;
}
