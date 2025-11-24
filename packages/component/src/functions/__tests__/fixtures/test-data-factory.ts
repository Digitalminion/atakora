/**
 * Test Data Factory
 *
 * @remarks
 * Factory functions for generating test data for runtime client tests.
 * Provides consistent, type-safe test data creation.
 *
 * @packageDocumentation
 */

import type { ExecutionContext, UserContext } from '../../types';

/**
 * User context factory defaults
 */
const DEFAULT_USER_CONTEXT: UserContext = {
  id: 'test-user-123',
  email: 'test@example.com',
  roles: ['user'],
  name: 'Test User',
  claims: {},
};

/**
 * Create test user context
 */
export function createTestUserContext(overrides?: Partial<UserContext>): UserContext {
  return {
    ...DEFAULT_USER_CONTEXT,
    ...overrides,
  };
}

/**
 * Create admin user context
 */
export function createAdminUserContext(overrides?: Partial<UserContext>): UserContext {
  return createTestUserContext({
    id: 'admin-user-123',
    email: 'admin@example.com',
    roles: ['admin', 'user'],
    name: 'Admin User',
    ...overrides,
  });
}

/**
 * Create anonymous user context
 */
export function createAnonymousUserContext(): UserContext {
  return {
    id: 'anonymous',
    email: 'anonymous@example.com',
    roles: [],
  };
}

/**
 * Execution context factory defaults
 */
const DEFAULT_EXECUTION_CONTEXT: ExecutionContext = {
  executionId: 'exec-test-123',
  executionTime: Date.now(),
  invocationId: 'invocation-test-123',
};

/**
 * Create test execution context
 */
export function createTestExecutionContext(
  overrides?: Partial<ExecutionContext>
): ExecutionContext {
  return {
    ...DEFAULT_EXECUTION_CONTEXT,
    executionId: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    executionTime: Date.now(),
    invocationId: `invocation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...overrides,
  };
}

/**
 * Generic model factory
 */
export interface TestModel {
  id: string;
  createdAt: number;
  updatedAt: number;
  [key: string]: any;
}

/**
 * Create test model
 */
export function createTestModel<T extends TestModel>(
  defaults: Partial<T>,
  overrides?: Partial<T>
): T {
  const now = Date.now();
  return {
    id: `test-${now}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
    ...defaults,
    ...overrides,
  } as T;
}

/**
 * Create multiple test models
 */
export function createTestModels<T extends TestModel>(
  count: number,
  defaults: Partial<T>,
  overridesFn?: (index: number) => Partial<T>
): T[] {
  return Array.from({ length: count }, (_, index) =>
    createTestModel(defaults, overridesFn?.(index))
  );
}

/**
 * Sample model types for testing
 */

/**
 * Sample User model
 */
export interface SampleUser extends TestModel {
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

/**
 * Create sample user
 */
export function createSampleUser(overrides?: Partial<SampleUser>): SampleUser {
  return createTestModel<SampleUser>(
    {
      name: 'Sample User',
      email: 'sample@example.com',
      status: 'active',
    },
    overrides
  );
}

/**
 * Sample Product model
 */
export interface SampleProduct extends TestModel {
  name: string;
  description: string;
  price: number;
  inStock: boolean;
  category: string;
}

/**
 * Create sample product
 */
export function createSampleProduct(overrides?: Partial<SampleProduct>): SampleProduct {
  return createTestModel<SampleProduct>(
    {
      name: 'Sample Product',
      description: 'A sample product for testing',
      price: 99.99,
      inStock: true,
      category: 'electronics',
    },
    overrides
  );
}

/**
 * Sample Order model
 */
export interface SampleOrder extends TestModel {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
}

/**
 * Create sample order
 */
export function createSampleOrder(overrides?: Partial<SampleOrder>): SampleOrder {
  return createTestModel<SampleOrder>(
    {
      userId: 'user-123',
      items: [
        {
          productId: 'product-123',
          quantity: 2,
          price: 99.99,
        },
      ],
      totalAmount: 199.98,
      status: 'pending',
    },
    overrides
  );
}

/**
 * Blob content factory
 */
export interface BlobContent {
  name: string;
  content: Buffer | string;
  contentType: string;
  metadata?: Record<string, string>;
}

/**
 * Create test blob content
 */
export function createTestBlobContent(overrides?: Partial<BlobContent>): BlobContent {
  const timestamp = Date.now();
  return {
    name: `test-blob-${timestamp}.txt`,
    content: 'Test blob content',
    contentType: 'text/plain',
    ...overrides,
  };
}

/**
 * Create binary blob content
 */
export function createBinaryBlobContent(
  sizeInBytes: number,
  overrides?: Partial<BlobContent>
): BlobContent {
  return createTestBlobContent({
    name: `test-blob-${Date.now()}.bin`,
    content: Buffer.alloc(sizeInBytes, 'x'),
    contentType: 'application/octet-stream',
    ...overrides,
  });
}

/**
 * Create large blob content for performance testing
 */
export function createLargeBlobContent(megabytes: number): BlobContent {
  return createBinaryBlobContent(megabytes * 1024 * 1024, {
    name: `large-blob-${megabytes}mb-${Date.now()}.bin`,
  });
}

/**
 * Create JSON blob content
 */
export function createJsonBlobContent<T = any>(
  data: T,
  overrides?: Partial<BlobContent>
): BlobContent {
  return createTestBlobContent({
    name: `test-blob-${Date.now()}.json`,
    content: JSON.stringify(data, null, 2),
    contentType: 'application/json',
    ...overrides,
  });
}

/**
 * Random data generators
 */

/**
 * Generate random string
 */
export function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate random number
 */
export function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random email
 */
export function randomEmail(): string {
  return `${randomString(8)}@${randomString(5)}.com`;
}

/**
 * Generate random UUID-like ID
 */
export function randomId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}
