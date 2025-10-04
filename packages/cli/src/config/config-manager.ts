import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ProfileConfig {
  name: string;
  tenantId: string;
  subscriptionId: string;
  subscriptionName?: string;
  cloud?: string;
  location?: string;
}

export interface UserConfig {
  activeProfile: string;
  profiles: Record<string, ProfileConfig>;
}

export class ConfigManager {
  private configDir: string;
  private configPath: string;

  constructor(configDir?: string) {
    this.configDir = configDir || path.join(os.homedir(), '.azure-arm');
    this.configPath = path.join(this.configDir, 'config.json');
  }

  /**
   * Load user configuration from disk
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
   * Save a profile to the configuration
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
   * Get a specific profile by name
   */
  getProfile(name?: string): ProfileConfig | null {
    const config = this.loadUserConfig();
    const profileName = name || config.activeProfile;

    return config.profiles[profileName] || null;
  }

  /**
   * List all profiles
   */
  listProfiles(): ProfileConfig[] {
    const config = this.loadUserConfig();
    return Object.values(config.profiles);
  }

  /**
   * Set the active profile
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
   * Delete a profile
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
   * Get the active profile name
   */
  getActiveProfileName(): string {
    const config = this.loadUserConfig();
    return config.activeProfile;
  }

  /**
   * Ensure the config directory exists with proper permissions
   */
  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Write configuration to disk with proper permissions
   */
  private writeConfig(config: UserConfig): void {
    this.ensureConfigDir();

    const content = JSON.stringify(config, null, 2);
    fs.writeFileSync(this.configPath, content, { mode: 0o600 });
  }
}
