/**
 * Example Integration Test
 *
 * @remarks
 * Demonstrates how to use the test infrastructure for integration testing.
 * This test will be skipped if emulators are not available.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createIntegrationTestHelper } from '../helpers/integration-helper';
import { createSampleUser, createTestBlobContent } from '../fixtures/test-data-factory';

describe('Integration Test Example', () => {
  const helper = createIntegrationTestHelper({
    testName: 'example-integration',
    cosmos: {
      containers: [{ id: 'users', partitionKey: '/id' }],
    },
    storage: {
      containers: ['test-files'],
    },
    insights: true,
  });

  beforeAll(async () => {
    // Setup all test resources
    await helper.setup();
  }, 60000); // Increase timeout for setup

  afterAll(async () => {
    // Teardown all test resources
    await helper.teardown();
  }, 60000);

  beforeEach(async () => {
    // Clear data between tests
    await helper.clearAllData();
  });

  describe('Cosmos DB Integration', () => {
    it('should create and retrieve a user from Cosmos DB', async () => {
      const cosmos = helper.getCosmos();
      const container = cosmos.getContainer('users');

      // Create test user
      const user = createSampleUser({
        name: 'Integration Test User',
        email: 'integration@example.com',
      });

      // Create in Cosmos DB
      await container.items.create(user);

      // Retrieve from Cosmos DB
      const { resource } = await container.item(user.id, user.id).read();

      // Verify
      expect(resource).toBeDefined();
      expect(resource?.id).toBe(user.id);
      expect(resource?.name).toBe('Integration Test User');
      expect(resource?.email).toBe('integration@example.com');
    });

    it('should query users from Cosmos DB', async () => {
      const cosmos = helper.getCosmos();
      const container = cosmos.getContainer('users');

      // Seed test data
      const users = [
        createSampleUser({ name: 'User 1', status: 'active' }),
        createSampleUser({ name: 'User 2', status: 'active' }),
        createSampleUser({ name: 'User 3', status: 'inactive' }),
      ];

      for (const user of users) {
        await container.items.create(user);
      }

      // Query active users
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.status = @status',
          parameters: [{ name: '@status', value: 'active' }],
        })
        .fetchAll();

      // Verify
      expect(resources).toHaveLength(2);
      expect(resources.every((u) => u.status === 'active')).toBe(true);
    });
  });

  describe('Storage Integration', () => {
    it('should upload and download blob from Azurite', async () => {
      const storage = helper.getStorage();

      // Create test blob
      const blob = createTestBlobContent({
        name: 'test-file.txt',
        content: 'Integration test content',
      });

      // Upload blob
      await storage.uploadBlob('test-files', blob.name, blob.content);

      // Download blob
      const downloaded = await storage.downloadBlob('test-files', blob.name);

      // Verify
      expect(downloaded.toString()).toBe('Integration test content');
    });

    it('should check blob existence', async () => {
      const storage = helper.getStorage();

      // Upload blob
      await storage.uploadBlob('test-files', 'exists.txt', 'content');

      // Check existence
      const exists = await storage.blobExists('test-files', 'exists.txt');
      const notExists = await storage.blobExists('test-files', 'not-exists.txt');

      // Verify
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it('should delete blob', async () => {
      const storage = helper.getStorage();

      // Upload blob
      await storage.uploadBlob('test-files', 'to-delete.txt', 'content');

      // Verify exists
      let exists = await storage.blobExists('test-files', 'to-delete.txt');
      expect(exists).toBe(true);

      // Delete blob
      await storage.deleteBlob('test-files', 'to-delete.txt');

      // Verify deleted
      exists = await storage.blobExists('test-files', 'to-delete.txt');
      expect(exists).toBe(false);
    });
  });

  describe('Application Insights Integration', () => {
    it('should track telemetry events', async () => {
      const insights = helper.getInsights();

      // Track events
      insights.trackEvent('UserCreated', { userId: '123' });
      insights.trackEvent('UserLoggedIn', { userId: '123' });

      // Verify events were tracked
      const events = insights.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0].name).toBe('UserCreated');
      expect(events[1].name).toBe('UserLoggedIn');
    });

    it('should track traces with different severity levels', async () => {
      const insights = helper.getInsights();

      // Track traces
      insights.trackTrace('Info message', 1); // Info
      insights.trackTrace('Warning message', 2); // Warning
      insights.trackTrace('Error message', 3); // Error

      // Verify traces
      const traces = insights.getTraces();
      expect(traces).toHaveLength(3);
      expect(traces[0].severityLevel).toBe(1);
      expect(traces[1].severityLevel).toBe(2);
      expect(traces[2].severityLevel).toBe(3);
    });
  });

  describe('Combined Integration', () => {
    it('should work with Cosmos, Storage, and Insights together', async () => {
      const cosmos = helper.getCosmos();
      const storage = helper.getStorage();
      const insights = helper.getInsights();

      // 1. Create user in Cosmos DB
      const user = createSampleUser({ name: 'Combined Test User' });
      await cosmos.getContainer('users').items.create(user);
      insights.trackEvent('UserCreated', { userId: user.id });

      // 2. Upload user avatar to Storage
      const avatarContent = Buffer.from('avatar-data');
      await storage.uploadBlob('test-files', `avatar-${user.id}.jpg`, avatarContent);
      insights.trackEvent('AvatarUploaded', { userId: user.id });

      // 3. Verify everything worked
      const { resource: savedUser } = await cosmos
        .getContainer('users')
        .item(user.id, user.id)
        .read();
      expect(savedUser).toBeDefined();

      const avatarExists = await storage.blobExists('test-files', `avatar-${user.id}.jpg`);
      expect(avatarExists).toBe(true);

      const events = insights.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0].name).toBe('UserCreated');
      expect(events[1].name).toBe('AvatarUploaded');
    });
  });
});
