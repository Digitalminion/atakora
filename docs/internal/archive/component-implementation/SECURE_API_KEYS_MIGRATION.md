# API Key Security Migration Guide

## Overview

API keys are now stored securely using industry-standard hashing (scrypt) instead of plain text. This is a **BREAKING CHANGE** that significantly improves security.

## Security Improvements

### Before (Vulnerable)

- API keys stored in plain text in memory
- Secrets visible in logs and error messages
- No protection against timing attacks
- Keys exposed in memory dumps

### After (Secure)

- API keys hashed using scrypt with unique salts
- Plain text secrets cleared from memory immediately
- Constant-time comparison prevents timing attacks
- Error messages never expose secrets
- Support for key rotation with versioning

## What Changed

### Type Changes

```typescript
// OLD - Plain text storage (VULNERABLE)
interface ApiKey {
  id: string;
  secret: string; // Plain text!
  roles: string[];
}

// NEW - Secure hashed storage
interface SecureApiKey {
  id: string;
  secretHash: string; // Hashed secret
  salt: string; // Unique salt per key
  roles: string[];
  version?: number; // For rotation support
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}
```

### API Changes

The `ApiKeysBuilder.keys()` method now:

1. Hashes secrets immediately using scrypt
2. Generates unique salt for each key
3. Clears plain text from input array
4. Stores only the hash, never plain text

### New Validation Method

```typescript
// Secure validation with constant-time comparison
const isValid = await apiKeysBuilder.validateApiKey(keyId, secret);
```

## Migration Steps

### Step 1: Update Your Code

No changes needed to your auth definition code:

```typescript
// This code remains the same
export const auth = defineAuth({
  apiKeys: auth
    .apiKeys()
    .enable()
    .keys([
      {
        id: 'service-1',
        secret: process.env.API_KEY_1!, // Still pass plain text here
        roles: ['service'],
      },
    ]),
});
```

The hashing happens automatically inside the `keys()` method.

### Step 2: Update Validation Logic

If you have custom validation logic, update to use the new secure validation:

```typescript
// OLD (if you were doing manual validation)
const key = keys.find((k) => k.secret === providedSecret);

// NEW - Use the secure validation method
const isValid = await apiKeysBuilder.validateApiKey(keyId, providedSecret);
```

### Step 3: Handle Existing Keys

If you have stored API keys in a database or configuration:

1. **Keys are still provided as plain text** to the `keys()` method
2. They are hashed automatically during configuration
3. No need to pre-hash keys yourself

### Step 4: Update Tests

Tests that check the structure of built configuration need updating:

```typescript
// OLD TEST
expect(config.keys[0]).toEqual({
  id: 'test',
  secret: 'secret',
  roles: ['admin'],
});

// NEW TEST
expect(config.keys[0]).toMatchObject({
  id: 'test',
  secretHash: expect.any(String), // Now hashed
  salt: expect.any(String), // Has salt
  roles: ['admin'],
  version: 1, // Has version
  createdAt: expect.any(String), // Has timestamp
});
```

## Security Best Practices

### 1. Never Log Keys

```typescript
// BAD - Logs might expose secrets
console.log('Config:', JSON.stringify(config));

// GOOD - Secrets are now hashed, but still avoid logging
console.log('API Keys configured:', config.keys.length);
```

### 2. Use Environment Variables

```typescript
// Always load secrets from environment
keys([
  {
    id: 'service',
    secret: process.env.API_KEY!, // Never hardcode
    roles: ['service'],
  },
]);
```

### 3. Rotate Keys Regularly

```typescript
auth.apiKeys()
  .rotateEvery(days(90))  // Enforce rotation policy
  .keys([...])
```

### 4. Set Expiration for Temporary Keys

```typescript
keys([
  {
    id: 'temp-access',
    secret: process.env.TEMP_KEY!,
    roles: ['readonly'],
    expiresAt: '2025-12-31T23:59:59Z', // Auto-expire
  },
]);
```

## Technical Details

### Hashing Algorithm

- **Algorithm**: scrypt
- **Key Length**: 64 bytes
- **Salt Length**: 32 bytes
- **N (CPU/memory cost)**: 16384
- **r (block size)**: 8
- **p (parallelization)**: 1

These parameters provide strong security while maintaining reasonable performance.

### Constant-Time Comparison

Validation uses `crypto.timingSafeEqual` to prevent timing attacks:

- Same time for valid/invalid keys
- Dummy hash for non-existent keys
- No information leaked through timing

### Memory Security

- Plain text secrets cleared immediately after hashing
- Original input array modified to redact secrets
- Error messages never include actual secrets
- JSON serialization safe (only hashes exposed)

## Troubleshooting

### Issue: Keys Not Validating

**Symptom**: Previously working keys now fail validation

**Solution**: Ensure you're passing the plain text secret to `keys()`, not a pre-hashed value. The hashing is done automatically.

### Issue: Test Failures

**Symptom**: Tests checking key structure fail

**Solution**: Update tests to expect `secretHash` and `salt` instead of `secret`. See "Update Tests" section above.

### Issue: Performance Concerns

**Symptom**: Key validation seems slow

**Solution**: The scrypt hashing is intentionally slow (100-200ms) to prevent brute force attacks. This is a security feature, not a bug. For high-throughput scenarios, consider:

- Caching validation results with TTL
- Using session tokens after initial validation
- Implementing rate limiting

## Benefits

1. **No Plain Text Storage**: Keys never stored unencrypted
2. **Timing Attack Protection**: Constant-time comparison
3. **Unique Salts**: Same secret produces different hashes
4. **Memory Security**: Plain text cleared immediately
5. **Rotation Support**: Version tracking built-in
6. **Audit Trail**: Creation and usage timestamps
7. **Future-Proof**: Easy to upgrade algorithm if needed

## Questions?

If you encounter any issues during migration, please:

1. Check this guide for solutions
2. Review the security test suite for examples
3. Contact the security team for assistance

Remember: This breaking change is essential for production security. The minor migration effort is worth the significant security improvement.
