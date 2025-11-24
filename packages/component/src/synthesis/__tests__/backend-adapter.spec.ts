/**
 * Backend Adapter Unit Tests
 *
 * Tests the BackendAdapter in isolation to verify synthesis integration.
 *
 * @module @atakora/component/synthesis/__tests__/backend-adapter
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BackendAdapter } from '../backend-adapter';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('BackendAdapter', () => {
  let adapter: BackendAdapter;
  let testOutputDir: string;

  beforeEach(() => {
    adapter = new BackendAdapter();
    testOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should create BackendAdapter instance', () => {
    expect(adapter).toBeDefined();
    expect(adapter).toBeInstanceOf(BackendAdapter);
  });

  it('should have synthesize method', () => {
    expect(typeof adapter.synthesize).toBe('function');
  });

  // Additional tests will be added after verifying component package builds
});
