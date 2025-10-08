import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../../config/config-manager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CLI Config Commands Integration', () => {
  let testConfigDir: string;
  let configManager: ConfigManager;

  beforeEach(() => {
    // Create temporary config directory
    testConfigDir = path.join(os.tmpdir(), `azure-arm-test-${Date.now()}`);
    configManager = new ConfigManager(testConfigDir);
  });

  afterEach(() => {
    // Cleanup test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('ConfigManager', () => {
    describe('saveProfile()', () => {
      it('should save a new profile', () => {
        const profile = {
          name: 'test-profile',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          subscriptionId: '87654321-4321-4321-4321-cba987654321',
          subscriptionName: 'Test Subscription',
          cloud: 'AzureCloud',
          location: 'eastus',
        };

        configManager.saveProfile(profile);

        const saved = configManager.getProfile('test-profile');
        expect(saved).toEqual(profile);
      });

      it('should make first profile active automatically', () => {
        const profile = {
          name: 'first-profile',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          subscriptionId: '87654321-4321-4321-4321-cba987654321',
        };

        configManager.saveProfile(profile);

        const activeName = configManager.getActiveProfileName();
        expect(activeName).toBe('first-profile');
      });

      it('should overwrite existing profile with same name', () => {
        const profile1 = {
          name: 'test-profile',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          subscriptionId: '87654321-4321-4321-4321-cba987654321',
          location: 'eastus',
        };

        const profile2 = {
          name: 'test-profile',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          subscriptionId: '87654321-4321-4321-4321-cba987654321',
          location: 'westus',
        };

        configManager.saveProfile(profile1);
        configManager.saveProfile(profile2);

        const saved = configManager.getProfile('test-profile');
        expect(saved?.location).toBe('westus');
      });

      it.skipIf(process.platform === 'win32')(
        'should create config file with proper permissions',
        () => {
          const profile = {
            name: 'test-profile',
            tenantId: '12345678-1234-1234-1234-123456789abc',
            subscriptionId: '87654321-4321-4321-4321-cba987654321',
          };

          configManager.saveProfile(profile);

          const configPath = path.join(testConfigDir, 'config.json');
          expect(fs.existsSync(configPath)).toBe(true);

          const stat = fs.statSync(configPath);
          const mode = (stat.mode & 0o777).toString(8);
          expect(mode).toBe('600'); // rw-------
        }
      );
    });

    describe('getProfile()', () => {
      it('should return null for non-existent profile', () => {
        const profile = configManager.getProfile('non-existent');
        expect(profile).toBeNull();
      });

      it('should return active profile when no name specified', () => {
        const profile1 = {
          name: 'profile1',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          subscriptionId: '87654321-4321-4321-4321-cba987654321',
        };

        const profile2 = {
          name: 'profile2',
          tenantId: '22345678-1234-1234-1234-123456789abc',
          subscriptionId: '97654321-4321-4321-4321-cba987654321',
        };

        configManager.saveProfile(profile1);
        configManager.saveProfile(profile2);
        configManager.setActiveProfile('profile2');

        const active = configManager.getProfile();
        expect(active?.name).toBe('profile2');
      });

      it('should retrieve profile by name', () => {
        const profile = {
          name: 'specific-profile',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          subscriptionId: '87654321-4321-4321-4321-cba987654321',
          subscriptionName: 'My Subscription',
        };

        configManager.saveProfile(profile);

        const retrieved = configManager.getProfile('specific-profile');
        expect(retrieved).toEqual(profile);
      });
    });

    describe('listProfiles()', () => {
      it('should return empty array when no profiles exist', () => {
        const profiles = configManager.listProfiles();
        expect(profiles).toEqual([]);
      });

      it('should list all saved profiles', () => {
        const profiles = [
          {
            name: 'profile1',
            tenantId: '12345678-1234-1234-1234-123456789abc',
            subscriptionId: '87654321-4321-4321-4321-cba987654321',
          },
          {
            name: 'profile2',
            tenantId: '22345678-1234-1234-1234-123456789abc',
            subscriptionId: '97654321-4321-4321-4321-cba987654321',
          },
          {
            name: 'profile3',
            tenantId: '32345678-1234-1234-1234-123456789abc',
            subscriptionId: '07654321-4321-4321-4321-cba987654321',
          },
        ];

        profiles.forEach((p) => configManager.saveProfile(p));

        const listed = configManager.listProfiles();
        expect(listed).toHaveLength(3);
        expect(listed.map((p) => p.name)).toContain('profile1');
        expect(listed.map((p) => p.name)).toContain('profile2');
        expect(listed.map((p) => p.name)).toContain('profile3');
      });
    });

    describe('setActiveProfile()', () => {
      it('should switch active profile', () => {
        const profile1 = {
          name: 'profile1',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          subscriptionId: '87654321-4321-4321-4321-cba987654321',
        };

        const profile2 = {
          name: 'profile2',
          tenantId: '22345678-1234-1234-1234-123456789abc',
          subscriptionId: '97654321-4321-4321-4321-cba987654321',
        };

        configManager.saveProfile(profile1);
        configManager.saveProfile(profile2);

        configManager.setActiveProfile('profile2');

        const activeName = configManager.getActiveProfileName();
        expect(activeName).toBe('profile2');
      });

      it('should throw error for non-existent profile', () => {
        expect(() => {
          configManager.setActiveProfile('non-existent');
        }).toThrow("Profile 'non-existent' does not exist");
      });

      it('should persist active profile across instances', () => {
        const profile = {
          name: 'persistent-profile',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          subscriptionId: '87654321-4321-4321-4321-cba987654321',
        };

        configManager.saveProfile(profile);
        configManager.setActiveProfile('persistent-profile');

        // Create new config manager instance with same test directory
        const newConfigManager = new ConfigManager(testConfigDir);
        const activeName = newConfigManager.getActiveProfileName();
        expect(activeName).toBe('persistent-profile');
      });
    });

    describe('deleteProfile()', () => {
      it('should delete a profile', () => {
        const profile = {
          name: 'to-delete',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          subscriptionId: '87654321-4321-4321-4321-cba987654321',
        };

        configManager.saveProfile(profile);
        expect(configManager.getProfile('to-delete')).not.toBeNull();

        configManager.deleteProfile('to-delete');
        expect(configManager.getProfile('to-delete')).toBeNull();
      });

      it('should throw error when deleting non-existent profile', () => {
        expect(() => {
          configManager.deleteProfile('non-existent');
        }).toThrow("Profile 'non-existent' does not exist");
      });

      it('should switch active profile when deleting active profile', () => {
        const profile1 = {
          name: 'profile1',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          subscriptionId: '87654321-4321-4321-4321-cba987654321',
        };

        const profile2 = {
          name: 'profile2',
          tenantId: '22345678-1234-1234-1234-123456789abc',
          subscriptionId: '97654321-4321-4321-4321-cba987654321',
        };

        configManager.saveProfile(profile1);
        configManager.saveProfile(profile2);
        configManager.setActiveProfile('profile1');

        configManager.deleteProfile('profile1');

        const activeName = configManager.getActiveProfileName();
        expect(activeName).toBe('profile2');
      });

      it('should set default profile when deleting last profile', () => {
        const profile = {
          name: 'only-profile',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          subscriptionId: '87654321-4321-4321-4321-cba987654321',
        };

        configManager.saveProfile(profile);
        configManager.deleteProfile('only-profile');

        const activeName = configManager.getActiveProfileName();
        expect(activeName).toBe('default');
      });
    });

    describe('error handling', () => {
      it('should handle corrupt config file gracefully', () => {
        const configPath = path.join(testConfigDir, 'config.json');
        fs.mkdirSync(testConfigDir, { recursive: true });
        fs.writeFileSync(configPath, 'invalid json {{{');

        expect(() => {
          configManager.loadUserConfig();
        }).toThrow(/Failed to load config/);
      });

      it.skipIf(process.platform === 'win32')(
        'should create config directory if it does not exist',
        () => {
          const profile = {
            name: 'test',
            tenantId: '12345678-1234-1234-1234-123456789abc',
            subscriptionId: '87654321-4321-4321-4321-cba987654321',
          };

          configManager.saveProfile(profile);

          expect(fs.existsSync(testConfigDir)).toBe(true);

          const stat = fs.statSync(testConfigDir);
          const mode = (stat.mode & 0o777).toString(8);
          expect(mode).toBe('700'); // rwx------
        }
      );
    });

    describe('workflow integration', () => {
      it('should support complete config workflow', () => {
        // 1. Save initial profile
        const profile1 = {
          name: 'dev',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          subscriptionId: '87654321-4321-4321-4321-cba987654321',
          subscriptionName: 'Dev Subscription',
          cloud: 'AzureCloud',
          location: 'eastus',
        };

        configManager.saveProfile(profile1);
        expect(configManager.getActiveProfileName()).toBe('dev');

        // 2. Add production profile
        const profile2 = {
          name: 'prod',
          tenantId: '22345678-1234-1234-1234-123456789abc',
          subscriptionId: '97654321-4321-4321-4321-cba987654321',
          subscriptionName: 'Prod Subscription',
          cloud: 'AzureCloud',
          location: 'westus',
        };

        configManager.saveProfile(profile2);

        // 3. List all profiles
        const profiles = configManager.listProfiles();
        expect(profiles).toHaveLength(2);

        // 4. Switch to prod profile
        configManager.setActiveProfile('prod');
        expect(configManager.getActiveProfileName()).toBe('prod');

        // 5. Show current profile
        const current = configManager.getProfile();
        expect(current?.name).toBe('prod');
        expect(current?.subscriptionName).toBe('Prod Subscription');

        // 6. Switch back to dev
        configManager.setActiveProfile('dev');
        const dev = configManager.getProfile();
        expect(dev?.location).toBe('eastus');

        // 7. Delete prod profile
        configManager.deleteProfile('prod');
        expect(configManager.listProfiles()).toHaveLength(1);
      });

      it('should handle profile switching with config persistence', () => {
        // Create profiles
        configManager.saveProfile({
          name: 'profile-a',
          tenantId: '11111111-1111-1111-1111-111111111111',
          subscriptionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        });

        configManager.saveProfile({
          name: 'profile-b',
          tenantId: '22222222-2222-2222-2222-222222222222',
          subscriptionId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        });

        // Switch profiles multiple times
        configManager.setActiveProfile('profile-b');
        configManager.setActiveProfile('profile-a');
        configManager.setActiveProfile('profile-b');

        // Verify persistence
        const newManager = new ConfigManager(testConfigDir);
        expect(newManager.getActiveProfileName()).toBe('profile-b');
        expect(newManager.listProfiles()).toHaveLength(2);
      });
    });
  });
});
