/**
 * Environment Detection Tests
 *
 * @module @atakora/component/backend/environment
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  detectEnvironment,
  getEnvironmentDefaults,
  isFeatureEnabled,
  getDefaultRegion,
  type Environment,
} from './environment';
import {
  mergeEnvironmentConfig,
  getEnvironmentFlags,
  validateEnvironmentConfig,
  getEnvironmentDisplayName,
  getEnvironmentColor,
  detectAndConfigure,
  isOperationAllowed,
  getEnvironmentTags,
  getRuntimeEnvironment,
  isRunningIn,
  getEnvironmentSummary,
} from './environment-utils';

describe('Environment Detection', () => {
  // Save original environment
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.NODE_ENV;
    delete process.env.ENVIRONMENT;
    delete process.env.APP_ENV;
    delete process.env.WEBSITE_SITE_NAME;
    delete process.env.WEBSITE_SLOT_NAME;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITHUB_REF;
    delete process.env.TF_BUILD;
    delete process.env.AZURE_PIPELINES;
    delete process.env.BUILD_SOURCEBRANCH;
    delete process.env.GITLAB_CI;
    delete process.env.CI_COMMIT_REF_NAME;
    delete process.env.JENKINS_HOME;
    delete process.env.BRANCH_NAME;
    delete process.env.GIT_BRANCH;
    delete process.env.CI;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('detectEnvironment()', () => {
    it('should default to development when no environment variables set', () => {
      const env = detectEnvironment();
      expect(env).toBe('development');
    });

    it('should detect Azure App Service production slot', () => {
      process.env.WEBSITE_SITE_NAME = 'my-app';
      process.env.WEBSITE_SLOT_NAME = 'production';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should detect Azure App Service without slot as production', () => {
      process.env.WEBSITE_SITE_NAME = 'my-app';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should detect Azure App Service staging slot', () => {
      process.env.WEBSITE_SITE_NAME = 'my-app';
      process.env.WEBSITE_SLOT_NAME = 'staging';
      const env = detectEnvironment();
      expect(env).toBe('staging');
    });

    it('should detect Azure App Service stage slot', () => {
      process.env.WEBSITE_SITE_NAME = 'my-app';
      process.env.WEBSITE_SLOT_NAME = 'stage';
      const env = detectEnvironment();
      expect(env).toBe('staging');
    });

    it('should detect Azure App Service dev slot as staging', () => {
      process.env.WEBSITE_SITE_NAME = 'my-app';
      process.env.WEBSITE_SLOT_NAME = 'dev';
      const env = detectEnvironment();
      expect(env).toBe('staging');
    });

    it('should detect GitHub Actions main branch as production', () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_REF = 'refs/heads/main';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should detect GitHub Actions master branch as production', () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_REF = 'refs/heads/master';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should detect GitHub Actions staging branch', () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_REF = 'refs/heads/staging';
      const env = detectEnvironment();
      expect(env).toBe('staging');
    });

    it('should detect GitHub Actions feature branch as development', () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_REF = 'refs/heads/feature/new-feature';
      const env = detectEnvironment();
      expect(env).toBe('development');
    });

    it('should detect Azure DevOps main branch as production', () => {
      process.env.TF_BUILD = 'True';
      process.env.BUILD_SOURCEBRANCH = 'refs/heads/main';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should detect Azure DevOps staging branch', () => {
      process.env.AZURE_PIPELINES = 'true';
      process.env.BUILD_SOURCEBRANCH = 'refs/heads/staging';
      const env = detectEnvironment();
      expect(env).toBe('staging');
    });

    it('should detect GitLab CI production branch', () => {
      process.env.GITLAB_CI = 'true';
      process.env.CI_COMMIT_REF_NAME = 'production';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should detect Jenkins main branch as production', () => {
      process.env.JENKINS_HOME = '/var/jenkins';
      process.env.BRANCH_NAME = 'main';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should detect Jenkins with GIT_BRANCH', () => {
      process.env.JENKINS_HOME = '/var/jenkins';
      process.env.GIT_BRANCH = 'staging';
      const env = detectEnvironment();
      expect(env).toBe('staging');
    });

    it('should detect generic CI as development', () => {
      process.env.CI = 'true';
      const env = detectEnvironment();
      expect(env).toBe('development');
    });

    it('should prioritize explicit override over Azure detection', () => {
      process.env.WEBSITE_SITE_NAME = 'my-app';
      process.env.WEBSITE_SLOT_NAME = 'production';
      const env = detectEnvironment({ environment: 'development' });
      expect(env).toBe('development');
    });

    it('should prioritize NODE_ENV over CI detection', () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_REF = 'refs/heads/main';
      process.env.NODE_ENV = 'development';
      const env = detectEnvironment();
      expect(env).toBe('development');
    });

    it('should detect production from NODE_ENV', () => {
      process.env.NODE_ENV = 'production';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should detect production from "prod" alias', () => {
      process.env.NODE_ENV = 'prod';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should detect staging from NODE_ENV', () => {
      process.env.NODE_ENV = 'staging';
      const env = detectEnvironment();
      expect(env).toBe('staging');
    });

    it('should detect staging from "stage" alias', () => {
      process.env.NODE_ENV = 'stage';
      const env = detectEnvironment();
      expect(env).toBe('staging');
    });

    it('should detect staging from "test" alias', () => {
      process.env.NODE_ENV = 'test';
      const env = detectEnvironment();
      expect(env).toBe('staging');
    });

    it('should detect development from NODE_ENV', () => {
      process.env.NODE_ENV = 'development';
      const env = detectEnvironment();
      expect(env).toBe('development');
    });

    it('should detect development from "dev" alias', () => {
      process.env.NODE_ENV = 'dev';
      const env = detectEnvironment();
      expect(env).toBe('development');
    });

    it('should detect development from "local" alias', () => {
      process.env.NODE_ENV = 'local';
      const env = detectEnvironment();
      expect(env).toBe('development');
    });

    it('should fall back to ENVIRONMENT variable if NODE_ENV not set', () => {
      process.env.ENVIRONMENT = 'production';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should prefer NODE_ENV over ENVIRONMENT', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENVIRONMENT = 'development';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should handle case-insensitive environment values', () => {
      process.env.NODE_ENV = 'PRODUCTION';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should handle whitespace in environment values', () => {
      process.env.NODE_ENV = '  production  ';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should allow explicit environment override', () => {
      process.env.NODE_ENV = 'development';
      const env = detectEnvironment({ environment: 'production' });
      expect(env).toBe('production');
    });

    it('should support custom environment variable name', () => {
      process.env.APP_ENV = 'production';
      const env = detectEnvironment({ envVarName: 'APP_ENV' });
      expect(env).toBe('production');
    });

    it('should map unknown values to development', () => {
      process.env.NODE_ENV = 'unknown';
      const env = detectEnvironment();
      expect(env).toBe('development');
    });
  });

  describe('getEnvironmentDefaults()', () => {
    it('should return development defaults', () => {
      const defaults = getEnvironmentDefaults('development');

      expect(defaults.environment).toBe('development');
      expect(defaults.defaultRegion).toBe('eastus');
      expect(defaults.defaults.storageSku).toBe('Standard_LRS');
      expect(defaults.defaults.cosmosMode).toBe('Serverless');
      expect(defaults.defaults.functionPlan).toBe('Consumption');
      expect(defaults.features.monitoring).toBe(false);
      expect(defaults.features.networking).toBe(false);
      expect(defaults.features.performance).toBe(false);
      expect(defaults.features.multiRegion).toBe(false);
      expect(defaults.features.backups).toBe(false);
    });

    it('should return staging defaults', () => {
      const defaults = getEnvironmentDefaults('staging');

      expect(defaults.environment).toBe('staging');
      expect(defaults.defaultRegion).toBe('eastus');
      expect(defaults.defaults.storageSku).toBe('Standard_ZRS');
      expect(defaults.defaults.cosmosMode).toBe('Autoscale');
      expect(defaults.defaults.cosmosThroughput).toEqual({ min: 1000, max: 10000 });
      expect(defaults.defaults.functionPlan).toBe('Premium');
      expect(defaults.defaults.functionSku).toBe('EP1');
      expect(defaults.defaults.functionScaling).toEqual({ minInstances: 1, maxInstances: 10 });
      expect(defaults.features.monitoring).toBe(true);
      expect(defaults.features.networking).toBe(true);
      expect(defaults.features.performance).toBe(false);
      expect(defaults.features.multiRegion).toBe(false);
      expect(defaults.features.backups).toBe(true);
    });

    it('should return production defaults', () => {
      const defaults = getEnvironmentDefaults('production');

      expect(defaults.environment).toBe('production');
      expect(defaults.defaultRegion).toBe('eastus');
      expect(defaults.defaults.storageSku).toBe('Standard_ZRS');
      expect(defaults.defaults.cosmosMode).toBe('Autoscale');
      expect(defaults.defaults.cosmosThroughput).toEqual({ min: 4000, max: 40000 });
      expect(defaults.defaults.functionPlan).toBe('Premium');
      expect(defaults.defaults.functionSku).toBe('EP2');
      expect(defaults.defaults.functionScaling).toEqual({ minInstances: 2, maxInstances: 20 });
      expect(defaults.features.monitoring).toBe(true);
      expect(defaults.features.networking).toBe(true);
      expect(defaults.features.performance).toBe(true);
      expect(defaults.features.multiRegion).toBe(true);
      expect(defaults.features.backups).toBe(true);
    });

    it('should include monitoring config for staging', () => {
      const defaults = getEnvironmentDefaults('staging');

      expect(defaults.monitoring).toBeDefined();
      expect(defaults.monitoring?.samplingPercentage).toBe(100);
      expect(defaults.monitoring?.retentionDays).toBe(30);
      expect(defaults.monitoring?.liveMetrics).toBe(true);
      expect(defaults.monitoring?.profiler).toBe(false);
    });

    it('should include monitoring config for production', () => {
      const defaults = getEnvironmentDefaults('production');

      expect(defaults.monitoring).toBeDefined();
      expect(defaults.monitoring?.samplingPercentage).toBe(100);
      expect(defaults.monitoring?.retentionDays).toBe(90);
      expect(defaults.monitoring?.liveMetrics).toBe(true);
      expect(defaults.monitoring?.profiler).toBe(true);
    });

    it('should include networking config for staging and production', () => {
      const stagingDefaults = getEnvironmentDefaults('staging');
      const prodDefaults = getEnvironmentDefaults('production');

      expect(stagingDefaults.networking).toBeDefined();
      expect(stagingDefaults.networking?.mode).toBe('isolated');
      expect(stagingDefaults.networking?.privateEndpoints).toBe(true);

      expect(prodDefaults.networking).toBeDefined();
      expect(prodDefaults.networking?.mode).toBe('isolated');
      expect(prodDefaults.networking?.privateEndpoints).toBe(true);
      expect(prodDefaults.networking?.waf).toBe(true);
      expect(prodDefaults.networking?.ddos).toBe(true);
    });

    it('should include performance config for production', () => {
      const defaults = getEnvironmentDefaults('production');

      expect(defaults.performance).toBeDefined();
      expect(defaults.performance?.cdn).toBe(true);
      expect(defaults.performance?.cache).toBe(true);
      expect(defaults.performance?.rateLimit).toBe(true);
    });
  });

  describe('isFeatureEnabled()', () => {
    it('should return false for monitoring in development', () => {
      expect(isFeatureEnabled('development', 'monitoring')).toBe(false);
    });

    it('should return true for monitoring in production', () => {
      expect(isFeatureEnabled('production', 'monitoring')).toBe(true);
    });

    it('should return false for networking in development', () => {
      expect(isFeatureEnabled('development', 'networking')).toBe(false);
    });

    it('should return true for networking in staging', () => {
      expect(isFeatureEnabled('staging', 'networking')).toBe(true);
    });

    it('should return false for performance in staging', () => {
      expect(isFeatureEnabled('staging', 'performance')).toBe(false);
    });

    it('should return true for performance in production', () => {
      expect(isFeatureEnabled('production', 'performance')).toBe(true);
    });
  });

  describe('getDefaultRegion()', () => {
    it('should return eastus for all environments', () => {
      expect(getDefaultRegion('development')).toBe('eastus');
      expect(getDefaultRegion('staging')).toBe('eastus');
      expect(getDefaultRegion('production')).toBe('eastus');
    });
  });
});

describe('Environment Utilities', () => {
  describe('mergeEnvironmentConfig()', () => {
    it('should merge overrides with defaults', () => {
      const config = mergeEnvironmentConfig('development', {
        region: 'westus2',
        storageSku: 'Standard_GRS',
      });

      expect(config.defaultRegion).toBe('westus2');
      expect(config.defaults.storageSku).toBe('Standard_GRS');
      expect(config.defaults.cosmosMode).toBe('Serverless'); // Unchanged
    });

    it('should merge feature overrides', () => {
      const config = mergeEnvironmentConfig('development', {
        features: {
          monitoring: true,
          networking: true,
        },
      });

      expect(config.features.monitoring).toBe(true);
      expect(config.features.networking).toBe(true);
      expect(config.features.performance).toBe(false); // Unchanged
    });

    it('should merge monitoring overrides', () => {
      const config = mergeEnvironmentConfig('production', {
        monitoring: {
          retentionDays: 120,
        },
      });

      expect(config.monitoring?.retentionDays).toBe(120);
      expect(config.monitoring?.samplingPercentage).toBe(100); // Unchanged
    });

    it('should return defaults when no overrides provided', () => {
      const config = mergeEnvironmentConfig('production');
      const defaults = getEnvironmentDefaults('production');

      expect(config).toEqual(defaults);
    });
  });

  describe('getEnvironmentFlags()', () => {
    it('should return correct flags for development', () => {
      const flags = getEnvironmentFlags('development');

      expect(flags.isDevelopment).toBe(true);
      expect(flags.isStaging).toBe(false);
      expect(flags.isProduction).toBe(false);
      expect(flags.isProductionLike).toBe(false);
      expect(flags.requiresHighAvailability).toBe(false);
      expect(flags.requiresSecurity).toBe(false);
    });

    it('should return correct flags for staging', () => {
      const flags = getEnvironmentFlags('staging');

      expect(flags.isDevelopment).toBe(false);
      expect(flags.isStaging).toBe(true);
      expect(flags.isProduction).toBe(false);
      expect(flags.isProductionLike).toBe(true);
      expect(flags.requiresHighAvailability).toBe(true);
      expect(flags.requiresSecurity).toBe(true);
    });

    it('should return correct flags for production', () => {
      const flags = getEnvironmentFlags('production');

      expect(flags.isDevelopment).toBe(false);
      expect(flags.isStaging).toBe(false);
      expect(flags.isProduction).toBe(true);
      expect(flags.isProductionLike).toBe(true);
      expect(flags.requiresHighAvailability).toBe(true);
      expect(flags.requiresSecurity).toBe(true);
    });
  });

  describe('validateEnvironmentConfig()', () => {
    it('should return no errors for valid production config', () => {
      const errors = validateEnvironmentConfig('production', {
        features: {
          backups: true,
          monitoring: true,
        },
        defaults: {
          cosmosMode: 'Autoscale',
          functionPlan: 'Premium',
          functionScaling: { minInstances: 2, maxInstances: 20 },
        },
      } as any);

      expect(errors).toEqual([]);
    });

    it('should error when backups disabled in production', () => {
      const errors = validateEnvironmentConfig('production', {
        features: {
          backups: false,
        },
      } as any);

      expect(errors).toContain('Backups must be enabled in production');
    });

    it('should error when monitoring disabled in production', () => {
      const errors = validateEnvironmentConfig('production', {
        features: {
          monitoring: false,
        },
      } as any);

      expect(errors).toContain('Monitoring must be enabled in production');
    });

    it('should error when serverless Cosmos in production', () => {
      const errors = validateEnvironmentConfig('production', {
        defaults: {
          cosmosMode: 'Serverless',
        },
      } as any);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('Serverless'))).toBe(true);
    });

    it('should error when consumption plan in production', () => {
      const errors = validateEnvironmentConfig('production', {
        defaults: {
          functionPlan: 'Consumption',
        },
      } as any);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('Consumption'))).toBe(true);
    });

    it('should error when less than 2 instances in production', () => {
      const errors = validateEnvironmentConfig('production', {
        defaults: {
          functionScaling: { minInstances: 1, maxInstances: 10 },
        },
      } as any);

      expect(errors).toContain('Production requires minimum 2 instances for high availability');
    });

    it('should warn when monitoring disabled in staging', () => {
      const errors = validateEnvironmentConfig('staging', {
        features: {
          monitoring: false,
        },
      } as any);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow any config in development', () => {
      const errors = validateEnvironmentConfig('development', {
        features: {
          backups: false,
          monitoring: false,
        },
        defaults: {
          cosmosMode: 'Serverless',
          functionPlan: 'Consumption',
        },
      } as any);

      expect(errors).toEqual([]);
    });
  });

  describe('getEnvironmentDisplayName()', () => {
    it('should return display names', () => {
      expect(getEnvironmentDisplayName('development')).toBe('Development');
      expect(getEnvironmentDisplayName('staging')).toBe('Staging');
      expect(getEnvironmentDisplayName('production')).toBe('Production');
    });
  });

  describe('getEnvironmentColor()', () => {
    it('should return colors', () => {
      expect(getEnvironmentColor('development')).toBe('green');
      expect(getEnvironmentColor('staging')).toBe('yellow');
      expect(getEnvironmentColor('production')).toBe('red');
    });
  });

  describe('detectAndConfigure()', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      delete process.env.NODE_ENV;
      delete process.env.ENVIRONMENT;
    });

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('should detect and configure in one call', () => {
      process.env.NODE_ENV = 'production';

      const result = detectAndConfigure();

      expect(result.environment).toBe('production');
      expect(result.config.environment).toBe('production');
      expect(result.config.features.monitoring).toBe(true);
    });

    it('should apply overrides', () => {
      const result = detectAndConfigure({
        environment: 'production',
        region: 'westus2',
      });

      expect(result.environment).toBe('production');
      expect(result.config.defaultRegion).toBe('westus2');
    });
  });

  describe('isOperationAllowed()', () => {
    it('should only allow destructive operations in development', () => {
      expect(isOperationAllowed('development', 'destructive')).toBe(true);
      expect(isOperationAllowed('staging', 'destructive')).toBe(false);
      expect(isOperationAllowed('production', 'destructive')).toBe(false);
    });

    it('should allow experimental in dev and staging', () => {
      expect(isOperationAllowed('development', 'experimental')).toBe(true);
      expect(isOperationAllowed('staging', 'experimental')).toBe(true);
      expect(isOperationAllowed('production', 'experimental')).toBe(false);
    });

    it('should allow debug in all environments', () => {
      expect(isOperationAllowed('development', 'debug')).toBe(true);
      expect(isOperationAllowed('staging', 'debug')).toBe(true);
      expect(isOperationAllowed('production', 'debug')).toBe(true);
    });
  });

  describe('getEnvironmentTags()', () => {
    it('should return basic environment tags', () => {
      const tags = getEnvironmentTags('production');

      expect(tags).toEqual({
        environment: 'production',
        managed_by: 'atakora',
      });
    });

    it('should merge additional tags', () => {
      const tags = getEnvironmentTags('production', {
        project: 'my-app',
        team: 'platform',
      });

      expect(tags).toEqual({
        environment: 'production',
        managed_by: 'atakora',
        project: 'my-app',
        team: 'platform',
      });
    });
  });
});

describe('Runtime Environment Detection', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.WEBSITE_SITE_NAME;
    delete process.env.WEBSITE_SLOT_NAME;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITHUB_REF;
    delete process.env.TF_BUILD;
    delete process.env.AZURE_PIPELINES;
    delete process.env.BUILD_SOURCEBRANCH;
    delete process.env.GITLAB_CI;
    delete process.env.CI_COMMIT_REF_NAME;
    delete process.env.JENKINS_HOME;
    delete process.env.BRANCH_NAME;
    delete process.env.GIT_BRANCH;
    delete process.env.CI;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('getRuntimeEnvironment()', () => {
    it('should detect local environment', () => {
      const runtime = getRuntimeEnvironment();

      expect(runtime.environment).toBe('development');
      expect(runtime.isAzureAppService).toBe(false);
      expect(runtime.isCI).toBe(false);
      expect(runtime.ciPlatform).toBeUndefined();
      expect(runtime.azureSlot).toBeUndefined();
    });

    it('should detect Azure App Service', () => {
      process.env.WEBSITE_SITE_NAME = 'my-app';
      process.env.WEBSITE_SLOT_NAME = 'production';

      const runtime = getRuntimeEnvironment();

      expect(runtime.isAzureAppService).toBe(true);
      expect(runtime.azureSlot).toBe('production');
      expect(runtime.environment).toBe('production');
    });

    it('should detect GitHub Actions', () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_REF = 'refs/heads/feature/test';

      const runtime = getRuntimeEnvironment();

      expect(runtime.isCI).toBe(true);
      expect(runtime.ciPlatform).toBe('github');
      expect(runtime.gitBranch).toBe('feature/test');
    });

    it('should detect Azure DevOps', () => {
      process.env.TF_BUILD = 'True';
      process.env.BUILD_SOURCEBRANCH = 'refs/heads/main';

      const runtime = getRuntimeEnvironment();

      expect(runtime.isCI).toBe(true);
      expect(runtime.ciPlatform).toBe('azure-devops');
      expect(runtime.gitBranch).toBe('main');
    });

    it('should detect GitLab CI', () => {
      process.env.GITLAB_CI = 'true';
      process.env.CI_COMMIT_REF_NAME = 'staging';

      const runtime = getRuntimeEnvironment();

      expect(runtime.isCI).toBe(true);
      expect(runtime.ciPlatform).toBe('gitlab');
      expect(runtime.gitBranch).toBe('staging');
    });

    it('should detect Jenkins', () => {
      process.env.JENKINS_HOME = '/var/jenkins';
      process.env.BRANCH_NAME = 'development';

      const runtime = getRuntimeEnvironment();

      expect(runtime.isCI).toBe(true);
      expect(runtime.ciPlatform).toBe('jenkins');
      expect(runtime.gitBranch).toBe('development');
    });

    it('should detect generic CI', () => {
      process.env.CI = 'true';

      const runtime = getRuntimeEnvironment();

      expect(runtime.isCI).toBe(true);
      expect(runtime.ciPlatform).toBe('other');
    });
  });

  describe('isRunningIn()', () => {
    it('should detect running in Azure', () => {
      process.env.WEBSITE_SITE_NAME = 'my-app';

      const isInAzure = isRunningIn('azure');
      expect(isInAzure).toBe(true);
    });

    it('should detect running in CI', () => {
      process.env.GITHUB_ACTIONS = 'true';

      const isInCI = isRunningIn('ci');
      expect(isInCI).toBe(true);
    });

    it('should detect running locally', () => {
      const isLocal = isRunningIn('local');
      expect(isLocal).toBe(true);
    });

    it('should not be local when in Azure', () => {
      process.env.WEBSITE_SITE_NAME = 'my-app';

      const isLocal = isRunningIn('local');
      expect(isLocal).toBe(false);
    });

    it('should not be local when in CI', () => {
      process.env.CI = 'true';

      const isLocal = isRunningIn('local');
      expect(isLocal).toBe(false);
    });
  });

  describe('getEnvironmentSummary()', () => {
    it('should return comprehensive environment summary', () => {
      process.env.NODE_ENV = 'production';

      const summary = getEnvironmentSummary();

      expect(summary.environment).toBe('production');
      expect(summary.displayName).toBe('Production');
      expect(summary.runtime.environment).toBe('production');
      expect(summary.config.region).toBe('eastus');
      expect(summary.config.cosmosMode).toBe('Autoscale');
      expect(summary.config.functionPlan).toBe('Premium');
      expect(summary.config.featuresEnabled).toContain('monitoring');
      expect(summary.config.featuresEnabled).toContain('networking');
      expect(summary.config.featuresEnabled).toContain('performance');
    });

    it('should apply overrides to summary', () => {
      const summary = getEnvironmentSummary({
        region: 'westus2',
        cosmosMode: 'Serverless',
      });

      expect(summary.config.region).toBe('westus2');
      expect(summary.config.cosmosMode).toBe('Serverless');
    });

    it('should include runtime context in summary', () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_REF = 'refs/heads/main';

      const summary = getEnvironmentSummary();

      expect(summary.runtime.isCI).toBe(true);
      expect(summary.runtime.ciPlatform).toBe('github');
      expect(summary.runtime.gitBranch).toBe('main');
    });
  });
});
