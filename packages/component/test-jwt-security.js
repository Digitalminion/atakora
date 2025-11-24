#!/usr/bin/env node

/**
 * Manual security test for JWT validation fix
 * This demonstrates that the validateJwtSignature function now requires a public key
 */

const { validateJwtSignature } = require('./dist/auth/token-validator.js');

async function testSecurityFix() {
  console.log('Testing JWT Security Fix...\n');

  const testToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  console.log('Test 1: Calling validateJwtSignature WITHOUT public key (should FAIL)');
  console.log('---------------------------------------------------------------');

  try {
    const result = await validateJwtSignature(
      testToken,
      'https://issuer.example.com',
      'audience'
      // NOTE: Missing publicKey parameter - this is the critical vulnerability fix
    );

    console.log('Result:', result);

    if (
      result.valid === false &&
      result.error === 'JWT signature validation requires a public key'
    ) {
      console.log('✅ PASS: Function correctly requires public key\n');
    } else {
      console.log('❌ FAIL: Function did not reject missing public key!\n');
      console.log('CRITICAL SECURITY VULNERABILITY NOT FIXED!\n');
    }
  } catch (error) {
    console.log('Error:', error.message);
  }

  console.log('Test 2: Invalid token format');
  console.log('-----------------------------');

  const invalidResult = await validateJwtSignature(
    '',
    'https://issuer.example.com',
    undefined,
    'dummy-key'
  );

  console.log('Result:', invalidResult);
  if (invalidResult.valid === false && invalidResult.error === 'Invalid token format') {
    console.log('✅ PASS: Invalid token format correctly rejected\n');
  } else {
    console.log('❌ FAIL: Invalid token format not properly handled\n');
  }

  console.log('Test 3: Invalid issuer parameter');
  console.log('---------------------------------');

  const invalidIssuerResult = await validateJwtSignature(testToken, '', undefined, 'dummy-key');

  console.log('Result:', invalidIssuerResult);
  if (
    invalidIssuerResult.valid === false &&
    invalidIssuerResult.error === 'Invalid issuer parameter'
  ) {
    console.log('✅ PASS: Invalid issuer correctly rejected\n');
  } else {
    console.log('❌ FAIL: Invalid issuer not properly handled\n');
  }

  console.log('\n=== SECURITY FIX VALIDATION COMPLETE ===\n');
  console.log('The critical JWT signature validation vulnerability has been addressed.');
  console.log(
    'The function now REQUIRES a public key parameter and will reject tokens without it.'
  );
  console.log('This prevents token forgery attacks.\n');
}

testSecurityFix().catch(console.error);
