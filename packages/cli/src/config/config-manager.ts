/**
 * Configuration management for Azure ARM CLI.
 *
 * This module provides centralized profile management for storing and retrieving
 * Azure connection settings. Profiles contain tenant, subscription, cloud, and
 * location information needed for Azure deployments.
 *
 * @module config/config-manager
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Configuration for a single Azure profile.
 *
 * @property name - Unique profile identifier (e.g., "production", "dev", "govcloud")
 * @property tenantId - Azure Active Directory tenant UUID
 * @property subscriptionId - Azure subscription UUID
 * @property subscriptionName - Human-readable subscription display name (optional)
 * @property cloud - Azure cloud environment (default: "AzureCloud")
 * @property location - Default Azure region for deployments (e.g., "eastus", "usgovvirginia")
 */
export interface ProfileConfig {
  name: string;
  tenantId: string;
  subscriptionId: string;
  subscriptionName?: string;
  cloud?: string;
  location?: string;
}

/**
 * Root configuration structure stored in ~/.azure-arm/config.json.
 *
 * @property activeProfile - Name of the currently active profile
 * @property profiles - Map of profile names to their configurations
 */
export interface UserConfig {
  activeProfile: string;
  profiles: Record<string, ProfileConfig>;
}

/**
 * Manages user configuration profiles for Azure ARM CLI.
 *
 * Handles loading, saving, and managing Azure connection profiles stored
 * in the user's home directory. Provides thread-safe file operations with
 * appropriate Unix permissions (0700 for directory, 0600 for config file).
 *
 * @example
 * ```typescript
 * const manager = new ConfigManager();
 *
 * // Save a new profile
 * manager.saveProfile({
 *   name: 'production',
 *   tenantId: '12345678-1234-1234-1234-123456789abc',
 *   subscriptionId: '87654321-4321-4321-4321-987654321abc',
 *   subscriptionName: 'Production Subscription',
 *   cloud: 'AzureCloud',
 *   location: 'eastus'
 * });
 *
 * // Set active profile
 * manager.setActiveProfile('production');
 *
 * // Get active profile config
 * const profile = manager.getProfile();
 * console.log(profile.subscriptionId);
 * ```
 *
 * @remarks
 * Configuration Location:
 * - Default: `~/.azure-arm/config.json`
 * - Can be overridden via constructor parameter
 * - Directory created automatically with mode 0700
 * - Config file written with mode 0600 for security
 *
 * Profile Management:
 * - Profiles stored as key-value pairs in profiles map
 * - Active profile tracked by name in activeProfile field
 * - First profile automatically set as active
 * - Deleting active profile selects first remaining profile
 *
 * Thread Safety:
 * - Reads and writes are synchronous file operations
 * - No built-in locking mechanism
 * - Concurrent access may cause race conditions
 * - Consider external locking for concurrent scenarios
 *
 * Error Handling:
 * - Throws on JSON parse errors
 * - Throws on profile not found (setActiveProfile, deleteProfile)
 * - Returns null for missing profiles (getProfile)
 * - Returns empty config if file doesn't exist
 */
export class ConfigManager {
  private configDir: string;
  private configPath: string;

  /**
   * Creates a new ConfigManager instance.
   *
   * @param configDir - Optional custom config directory path (default: ~/.azure-arm)
   */
  constructor(configDir?: string) {
    this.configDir = configDir || path.join(os.homedir(), '.azure-arm');
    this.configPath = path.join(this.configDir, 'config.json');
  }

  /**
   * Loads user configuration from disk.
   *
   * Reads and parses config.json from the config directory. If the file
   * doesn't exist, returns a default empty configuration.
   *
   * @returns UserConfig object with active profile and profiles map
   * @throws Error if config file exists but cannot be parsed
   *
   * @example
   * ```typescript
   * const config = manager.loadUserConfig();
   * console.log(`Active: ${config.activeProfile}`);
   * console.log(`Profiles: ${Object.keys(config.profiles).join(', ')}`);
   * ```
   */
  loadUserConfig(): UserConfig {
    this.ensureConfigDir();

    if (!fs.existsSync(this.configPath)) {
      return {
        activeProfile: 'default',
        profiles: {},
      };
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Failed to load config from ${this.configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Saves or updates a profile in the configuration.
   *
   * Creates a new profile or updates an existing one with the same name.
   * If this is the first profile being saved, it's automatically set as active.
   *
   * @param profile - Complete profile configuration to save
   *
   * @example
   * ```typescript
   * manager.saveProfile({
   *   name: 'production',
   *   tenantId: '12345678-1234-1234-1234-123456789abc',
   *   subscriptionId: '87654321-4321-4321-4321-987654321abc',
   *   subscriptionName: 'Prod Sub',
   *   cloud: 'AzureCloud',
   *   location: 'eastus'
   * });
   * ```
   *
   * @remarks
   * - Overwrites existing profile with same name
   * - First profile automatically becomes active
   * - Changes written to disk immediately
   * - Config file secured with 0600 permissions
   */
  saveProfile(profile: ProfileConfig): void {
    const config = this.loadUserConfig();
    config.profiles[profile.name] = profile;

    // If this is the first profile, make it active
    if (Object.keys(config.profiles).length === 1) {
      config.activeProfile = profile.name;
    }

    this.writeConfig(config);
  }

  /**
   * Retrieves a specific profile by name or the active profile.
   *
   * @param name - Optional profile name. If omitted, returns active profile.
   * @returns ProfileConfig if found, null if profile doesn't exist
   *
   * @example
   * ```typescript
   * // Get active profile
   * const active = manager.getProfile();
   *
   * // Get specific profile
   * const prod = manager.getProfile('production');
   * if (prod) {
   *   console.log(`Deploying to ${prod.subscriptionName}`);
   * }
   * ```
   */
  getProfile(name?: string): ProfileConfig | null {
    const config = this.loadUserConfig();
    const profileName = name || config.activeProfile;

    return config.profiles[profileName] || null;
  }

  /**
   * Lists all saved profiles.
   *
   * @returns Array of all ProfileConfig objects
   *
   * @example
   * ```typescript
   * const profiles = manager.listProfiles();
   * profiles.forEach(p => {
   *   console.log(`${p.name}: ${p.subscriptionName || p.subscriptionId}`);
   * });
   * ```
   */
  listProfiles(): ProfileConfig[] {
    const config = this.loadUserConfig();
    return Object.values(config.profiles);
  }

  /**
   * Sets the active profile.
   *
   * The active profile is used by default for all CLI commands when no
   * specific profile is provided.
   *
   * @param name - Name of the profile to activate
   * @throws Error if profile doesn't exist
   *
   * @example
   * ```typescript
   * manager.setActiveProfile('production');
   * ```
   */
  setActiveProfile(name: string): void {
    const config = this.loadUserConfig();

    if (!config.profiles[name]) {
      throw new Error(`Profile '${name}' does not exist`);
    }

    config.activeProfile = name;
    this.writeConfig(config);
  }

  /**
   * Deletes a profile from the configuration.
   *
   * If the deleted profile was active, automatically selects the first
   * remaining profile (or 'default' if none remain).
   *
   * @param name - Name of the profile to delete
   * @throws Error if profile doesn't exist
   *
   * @example
   * ```typescript
   * manager.deleteProfile('old-staging');
   * ```
   *
   * @remarks
   * - Cannot create orphaned state (always has an active profile)
   * - Deletion is permanent and immediate
   * - Automatically switches active profile if needed
   */
  deleteProfile(name: string): void {
    const config = this.loadUserConfig();

    if (!config.profiles[name]) {
      throw new Error(`Profile '${name}' does not exist`);
    }

    delete config.profiles[name];

    // If we deleted the active profile, set a new one
    if (config.activeProfile === name) {
      const remainingProfiles = Object.keys(config.profiles);
      config.activeProfile = remainingProfiles.length > 0 ? remainingProfiles[0] : 'default';
    }

    this.writeConfig(config);
  }

  /**
   * Gets the name of the currently active profile.
   *
   * @returns Name of the active profile
   *
   * @example
   * ```typescript
   * const activeName = manager.getActiveProfileName();
   * console.log(`Currently using: ${activeName}`);
   * ```
   */
  getActiveProfileName(): string {
    const config = this.loadUserConfig();
    return config.activeProfile;
  }

  /**
   * Ensures the config directory exists with proper permissions.
   *
   * Creates the directory with mode 0700 (owner read/write/execute only)
   * if it doesn't exist. This provides security for stored credentials.
   *
   * @private
   */
  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Writes configuration to disk with proper permissions.
   *
   * Serializes config to JSON and writes to config.json with mode 0600
   * (owner read/write only) for security.
   *
   * @param config - UserConfig object to write
   * @private
   */
  private writeConfig(config: UserConfig): void {
    this.ensureConfigDir();

    const content = JSON.stringify(config, null, 2);
    fs.writeFileSync(this.configPath, content, { mode: 0o600 });
  }
}
