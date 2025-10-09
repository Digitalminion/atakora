/**
 * Type definitions for App Service Plan (Server Farm) constructs.
 *
 * @packageDocumentation
 */

/**
 * Interface for App Service Plan reference.
 *
 * @remarks
 * Allows resources to reference an App Service Plan without depending on the construct class.
 */
export interface IServerFarm {
  /**
   * Name of the App Service Plan.
   */
  readonly planName: string;

  /**
   * Location of the App Service Plan.
   */
  readonly location: string;

  /**
   * Resource ID of the App Service Plan.
   */
  readonly planId: string;
}

// Full ServerFarms types will be migrated next
