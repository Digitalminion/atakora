/**
 * Test setup and utilities for CDK package tests
 *
 * This module provides common test fixtures and helpers for testing
 * Azure resource constructs in the CDK package.
 */

import { App } from '@atakora/lib';

/**
 * Creates a test App instance for use in tests
 *
 * @returns A new App instance configured for testing
 */
export function createTestApp(): App {
  return new App();
}

/**
 * Test fixture for common Azure resource properties
 */
export const testContext = {
  organization: 'TestOrg',
  project: 'TestProject',
  environment: 'dev',
  instance: '001',
  location: 'eastus',
  tags: {
    'test-tag': 'test-value',
  },
};

/**
 * Helper to verify ARM template structure
 *
 * @param template - ARM template to validate
 * @param resourceType - Expected resource type
 */
export function verifyArmTemplate(
  template: any,
  resourceType: string
): void {
  expect(template).toBeDefined();
  expect(template.type).toBe(resourceType);
  expect(template.apiVersion).toBeDefined();
  expect(template.name).toBeDefined();
  expect(template.location).toBeDefined();
}
