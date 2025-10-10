/**
 * Atakora CLI Package Entry Point
 *
 * @packageDocumentation
 *
 * @module @atakora/cli
 *
 * @remarks
 * This package provides the command-line interface for Atakora, an Azure
 * infrastructure-as-code framework that lets you define Azure resources
 * using TypeScript constructs and generate ARM templates for deployment.
 *
 * Key Features:
 * - Type-safe Azure resource definitions
 * - Multi-package workspace support
 * - Azure profile management
 * - Template synthesis and validation
 * - Deployment orchestration
 * - Change preview (diff)
 *
 * Installation:
 * ```bash
 * npm install -g @atakora/cli
 * ```
 *
 * Quick Start:
 * ```bash
 * # Initialize project
 * atakora init
 *
 * # Configure Azure
 * atakora config select
 *
 * # Generate templates
 * atakora synth
 *
 * # Deploy to Azure
 * atakora deploy
 * ```
 *
 * Package Structure:
 * - `cli.ts` - Main CLI entry point
 * - `commands/` - Command implementations
 * - `auth/` - Azure authentication
 * - `config/` - Profile management
 * - `manifest/` - Project configuration
 * - `generators/` - Package generation
 * - `validation/` - Template validation
 *
 * @see {@link https://github.com/digital-minion/atakora} for full documentation
 */

export * from './cli';
