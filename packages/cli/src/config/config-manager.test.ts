import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigManager, ProfileConfig } from './config-manager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fs and os modules
vi.mock('fs');
vi.mock('os');

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const mockHomeDir = '/mock/home';
  const mockConfigDir = path.join(mockHomeDir, '.azure-arm');
  const mockConfigPath = path.join(mockConfigDir, 'config.json');

  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue(mockHomeDir);
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
    vi.mocked(fs.readFileSync).mockReturnValue('{"activeProfile":"default","profiles":{}}');

    configManager = new ConfigManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('loadUserConfig', () => {
    it('should return default config when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = configManager.loadUserConfig();

      expect(config.activeProfile).toBe('default');
      expect(config.profiles).toEqual({});
    });

    it('should load existing config from file', () => {
      const mockConfig = {
        activeProfile: 'test',
        profiles: {
          test: {
            name: 'test',
            tenantId: 'tenant-123',
            subscriptionId: 'sub-123',
          },
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const config = configManager.loadUserConfig();

      expect(config.activeProfile).toBe('test');
      expect(config.profiles.test).toBeDefined();
      expect(config.profiles.test.tenantId).toBe('tenant-123');
    });

    it('should throw error when config file is invalid JSON', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');

      expect(() => configManager.loadUserConfig()).toThrow('Failed to load config');
    });
  });

  describe('saveProfile', () => {
    it('should save a new profile', () => {
      const profile: ProfileConfig = {
        name: 'test',
        tenantId: 'tenant-123',
        subscriptionId: 'sub-123',
        cloud: 'AzureCloud',
        location: 'eastus',
      };

      configManager.saveProfile(profile);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenConfig = JSON.parse(writeCall[1] as string);

      expect(writtenConfig.profiles.test).toBeDefined();
      expect(writtenConfig.profiles.test.tenantId).toBe('tenant-123');
    });

    it('should set first profile as active', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const profile: ProfileConfig = {
        name: 'first',
        tenantId: 'tenant-123',
        subscriptionId: 'sub-123',
      };

      configManager.saveProfile(profile);

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenConfig = JSON.parse(writeCall[1] as string);

      expect(writtenConfig.activeProfile).toBe('first');
    });

    it('should create config directory if it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const profile: ProfileConfig = {
        name: 'test',
        tenantId: 'tenant-123',
        subscriptionId: 'sub-123',
      };

      configManager.saveProfile(profile);

      expect(fs.mkdirSync).toHaveBeenCalledWith(mockConfigDir, {
        recursive: true,
        mode: 0o700,
      });
    });

    it('should write config with correct permissions', () => {
      const profile: ProfileConfig = {
        name: 'test',
        tenantId: 'tenant-123',
        subscriptionId: 'sub-123',
      };

      configManager.saveProfile(profile);

      expect(fs.writeFileSync).toHaveBeenCalledWith(mockConfigPath, expect.any(String), {
        mode: 0o600,
      });
    });
  });

  describe('getProfile', () => {
    it('should return active profile when no name specified', () => {
      const mockConfig = {
        activeProfile: 'test',
        profiles: {
          test: {
            name: 'test',
            tenantId: 'tenant-123',
            subscriptionId: 'sub-123',
          },
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const profile = configManager.getProfile();

      expect(profile).toBeDefined();
      expect(profile?.name).toBe('test');
    });

    it('should return specific profile by name', () => {
      const mockConfig = {
        activeProfile: 'default',
        profiles: {
          test: {
            name: 'test',
            tenantId: 'tenant-123',
            subscriptionId: 'sub-123',
          },
          prod: {
            name: 'prod',
            tenantId: 'tenant-456',
            subscriptionId: 'sub-456',
          },
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const profile = configManager.getProfile('prod');

      expect(profile).toBeDefined();
      expect(profile?.name).toBe('prod');
      expect(profile?.tenantId).toBe('tenant-456');
    });

    it('should return null when profile does not exist', () => {
      const mockConfig = {
        activeProfile: 'default',
        profiles: {},
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const profile = configManager.getProfile('nonexistent');

      expect(profile).toBeNull();
    });
  });

  describe('listProfiles', () => {
    it('should return all profiles', () => {
      const mockConfig = {
        activeProfile: 'test',
        profiles: {
          test: {
            name: 'test',
            tenantId: 'tenant-123',
            subscriptionId: 'sub-123',
          },
          prod: {
            name: 'prod',
            tenantId: 'tenant-456',
            subscriptionId: 'sub-456',
          },
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const profiles = configManager.listProfiles();

      expect(profiles).toHaveLength(2);
      expect(profiles.find((p) => p.name === 'test')).toBeDefined();
      expect(profiles.find((p) => p.name === 'prod')).toBeDefined();
    });

    it('should return empty array when no profiles exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const profiles = configManager.listProfiles();

      expect(profiles).toHaveLength(0);
    });
  });

  describe('setActiveProfile', () => {
    it('should set active profile', () => {
      const mockConfig = {
        activeProfile: 'old',
        profiles: {
          old: {
            name: 'old',
            tenantId: 'tenant-123',
            subscriptionId: 'sub-123',
          },
          new: {
            name: 'new',
            tenantId: 'tenant-456',
            subscriptionId: 'sub-456',
          },
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      configManager.setActiveProfile('new');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenConfig = JSON.parse(writeCall[1] as string);

      expect(writtenConfig.activeProfile).toBe('new');
    });

    it('should throw error when profile does not exist', () => {
      const mockConfig = {
        activeProfile: 'test',
        profiles: {
          test: {
            name: 'test',
            tenantId: 'tenant-123',
            subscriptionId: 'sub-123',
          },
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      expect(() => configManager.setActiveProfile('nonexistent')).toThrow(
        "Profile 'nonexistent' does not exist"
      );
    });
  });

  describe('deleteProfile', () => {
    it('should delete a profile', () => {
      const mockConfig = {
        activeProfile: 'test',
        profiles: {
          test: {
            name: 'test',
            tenantId: 'tenant-123',
            subscriptionId: 'sub-123',
          },
          other: {
            name: 'other',
            tenantId: 'tenant-456',
            subscriptionId: 'sub-456',
          },
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      configManager.deleteProfile('other');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenConfig = JSON.parse(writeCall[1] as string);

      expect(writtenConfig.profiles.other).toBeUndefined();
      expect(writtenConfig.profiles.test).toBeDefined();
    });

    it('should set new active profile when deleting active profile', () => {
      const mockConfig = {
        activeProfile: 'test',
        profiles: {
          test: {
            name: 'test',
            tenantId: 'tenant-123',
            subscriptionId: 'sub-123',
          },
          other: {
            name: 'other',
            tenantId: 'tenant-456',
            subscriptionId: 'sub-456',
          },
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      configManager.deleteProfile('test');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenConfig = JSON.parse(writeCall[1] as string);

      expect(writtenConfig.activeProfile).toBe('other');
    });

    it('should throw error when profile does not exist', () => {
      const mockConfig = {
        activeProfile: 'test',
        profiles: {
          test: {
            name: 'test',
            tenantId: 'tenant-123',
            subscriptionId: 'sub-123',
          },
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      expect(() => configManager.deleteProfile('nonexistent')).toThrow(
        "Profile 'nonexistent' does not exist"
      );
    });
  });

  describe('getActiveProfileName', () => {
    it('should return active profile name', () => {
      const mockConfig = {
        activeProfile: 'test',
        profiles: {
          test: {
            name: 'test',
            tenantId: 'tenant-123',
            subscriptionId: 'sub-123',
          },
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const activeName = configManager.getActiveProfileName();

      expect(activeName).toBe('test');
    });
  });
});
