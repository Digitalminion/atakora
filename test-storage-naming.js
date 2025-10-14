/**
 * Test script to verify storage account naming convention
 */

const crypto = require('crypto');

function generateStorageAccountName(resourceGroupName, subscriptionId, organization) {
  // Extract organization name from config or resource group name
  let orgName = organization;

  if (!orgName) {
    // Try to extract from resource group name pattern: rg-pl-{org}-...
    const rgMatch = resourceGroupName.match(/rg-(?:pl-)?([a-zA-Z0-9]+)/);
    orgName = rgMatch ? rgMatch[1] : 'atakora';
  }

  // Normalize organization name: lowercase, remove special chars
  const normalizedOrg = orgName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Build prefix: {org}cdk
  const prefix = `${normalizedOrg}cdk`;

  // Calculate remaining space for hash (max 24 chars total)
  const maxHashLength = 24 - prefix.length;

  // Ensure we have at least 6 characters for hash to maintain uniqueness
  if (maxHashLength < 6) {
    // If org name is too long, truncate it
    const maxOrgLength = 24 - 3 - 6; // 24 total - 'cdk' - 6 hash chars
    const truncatedOrg = normalizedOrg.substring(0, maxOrgLength);
    const truncatedPrefix = `${truncatedOrg}cdk`;
    const hash = crypto
      .createHash('md5')
      .update(`${subscriptionId}-${resourceGroupName}`)
      .digest('hex')
      .substring(0, 6);

    return `${truncatedPrefix}${hash}`;
  }

  // Generate hash based on subscription + resource group for deterministic naming
  const hash = crypto
    .createHash('md5')
    .update(`${subscriptionId}-${resourceGroupName}`)
    .digest('hex')
    .substring(0, maxHashLength);

  return `${prefix}${hash}`;
}

// Test with your actual resource group name
const testCases = [
  {
    resourceGroup: 'rg-pl-digitalproducts-colorai-nonprod-eus2-06',
    subscription: '12345678-1234-1234-1234-123456789abc',
    organization: undefined, // Auto-extract
  },
  {
    resourceGroup: 'rg-pl-digitalproducts-colorai-nonprod-eus2-06',
    subscription: '12345678-1234-1234-1234-123456789abc',
    organization: 'digitalproducts', // Explicit
  },
  {
    resourceGroup: 'rg-myorg-app-prod',
    subscription: '12345678-1234-1234-1234-123456789abc',
    organization: undefined, // Auto-extract
  },
  {
    resourceGroup: 'rg-contoso',
    subscription: '12345678-1234-1234-1234-123456789abc',
    organization: 'contoso', // Explicit
  },
];

console.log('Storage Account Naming Convention Tests\n');
console.log('=' .repeat(70));

testCases.forEach((test, index) => {
  const accountName = generateStorageAccountName(
    test.resourceGroup,
    test.subscription,
    test.organization
  );

  console.log(`\nTest Case ${index + 1}:`);
  console.log(`  Resource Group: ${test.resourceGroup}`);
  console.log(`  Organization:   ${test.organization || '(auto-extracted)'}`);
  console.log(`  Account Name:   ${accountName}`);
  console.log(`  Length:         ${accountName.length} chars`);
  console.log(`  Valid:          ${accountName.length >= 3 && accountName.length <= 24 && /^[a-z0-9]+$/.test(accountName) ? '✓' : '✗'}`);
});

console.log('\n' + '='.repeat(70));
console.log('\nNaming Pattern: {organization}cdk{hash}');
console.log('Example: digitalproductscdk7f3e92');
console.log('\nFeatures:');
console.log('  • Deterministic: Same sub + RG = same name');
console.log('  • Organization-based: Easy to identify');
console.log('  • Auto-extracts from RG name pattern');
console.log('  • Handles long org names via truncation');
console.log('  • Always 3-24 chars, lowercase alphanumeric');
