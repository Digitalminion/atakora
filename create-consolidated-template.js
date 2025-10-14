/**
 * Create Consolidated ARM Template
 *
 * This script merges ColorAI.json (subscription-scoped) and Foundation.json (resource group-scoped)
 * into a single consolidated ARM template with nested deployments.
 */

const fs = require('fs');
const path = require('path');

// Read the templates
const colorAIPath = path.join(__dirname, '.atakora/arm.out/backend/ColorAI.json');
const foundationPath = path.join(__dirname, '.atakora/arm.out/backend/Foundation.json');

console.log('Reading templates...');
const colorAI = JSON.parse(fs.readFileSync(colorAIPath, 'utf-8'));
const foundation = JSON.parse(fs.readFileSync(foundationPath, 'utf-8'));

console.log('  ✓ ColorAI.json - Subscription-scoped template');
console.log('  ✓ Foundation.json - Resource group-scoped template');
console.log('');

// Extract resource group name from ColorAI template
const resourceGroup = colorAI.resources.find(r => r.type === 'Microsoft.Resources/resourceGroups');
if (!resourceGroup) {
  throw new Error('Resource group not found in ColorAI.json');
}

const resourceGroupName = resourceGroup.name;
console.log(`Resource Group: ${resourceGroupName}`);
console.log('');

// Create the consolidated template with subscription deployment schema
const consolidated = {
  "$schema": "https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "metadata": {
    "description": "Consolidated ColorAI deployment template - combines subscription and resource group deployments",
    "generatedBy": "Atakora CDK",
    "timestamp": new Date().toISOString()
  },
  "resources": [
    // First, create the resource group
    {
      ...resourceGroup
    },
    // Then, create a nested deployment for the Foundation resources
    {
      "type": "Microsoft.Resources/deployments",
      "apiVersion": "2021-04-01",
      "name": "Foundation-Deployment",
      "resourceGroup": resourceGroupName,
      "dependsOn": [
        `[resourceId('Microsoft.Resources/resourceGroups', '${resourceGroupName}')]`
      ],
      "properties": {
        "mode": "Incremental",
        "template": foundation,
        "debugSetting": {
          "detailLevel": "RequestContent, ResponseContent"
        }
      }
    }
  ],
  "parameters": {},
  "outputs": {
    "resourceGroupName": {
      "type": "string",
      "value": resourceGroupName
    },
    "resourceGroupId": {
      "type": "string",
      "value": `[resourceId('Microsoft.Resources/resourceGroups', '${resourceGroupName}')]`
    },
    "deploymentName": {
      "type": "string",
      "value": "[deployment().name]"
    }
  }
};

// Write the consolidated template
const outputPath = path.join(__dirname, '.atakora/arm.out/backend/consolidated-template.json');
fs.writeFileSync(outputPath, JSON.stringify(consolidated, null, 2));

console.log('✓ Consolidated template created successfully!');
console.log('');
console.log(`Output: ${outputPath}`);
console.log('');
console.log('Template Structure:');
console.log('  1. Resource Group Creation (subscription-scoped)');
console.log(`     └─ ${resourceGroupName}`);
console.log('');
console.log('  2. Nested Deployment (resource group-scoped)');
console.log(`     └─ Foundation resources (${foundation.resources.length} resources)`);
console.log('');

// Display resource counts
const rgTemplate = foundation;
const resourceTypes = {};
rgTemplate.resources.forEach(r => {
  resourceTypes[r.type] = (resourceTypes[r.type] || 0) + 1;
});

console.log('Resources in Foundation:');
Object.entries(resourceTypes)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`  • ${type} (${count})`);
  });
console.log('');

// Calculate sizes
const colorAISize = fs.statSync(colorAIPath).size;
const foundationSize = fs.statSync(foundationPath).size;
const consolidatedSize = fs.statSync(outputPath).size;

console.log('Template Sizes:');
console.log(`  ColorAI.json:            ${(colorAISize / 1024).toFixed(2)} KB`);
console.log(`  Foundation.json:         ${(foundationSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`  consolidated-template:   ${(consolidatedSize / 1024 / 1024).toFixed(2)} MB`);
console.log('');

console.log('Deployment Commands:');
console.log('');
console.log('  # Deploy to Azure (subscription-scoped):');
console.log(`  az deployment sub create \\`);
console.log(`    --location eastus2 \\`);
console.log(`    --template-file ${outputPath} \\`);
console.log(`    --name colorai-deployment`);
console.log('');

console.log('✓ Done!');
