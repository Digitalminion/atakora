const fs = require('fs');
const path = require('path');

const templateDir = '.atakora/arm.out/backend';

// Application templates 7-16
for (let i = 7; i <= 16; i++) {
  const templatePath = path.join(templateDir, `Foundation-application-${i}.json`);

  if (!fs.existsSync(templatePath)) {
    console.log(`Template ${i} not found, skipping...`);
    continue;
  }

  console.log(`Processing Foundation-application-${i}.json...`);

  const content = fs.readFileSync(templatePath, 'utf8');
  const template = JSON.parse(content);

  // Remove dependsOn from resources
  if (template.resources && Array.isArray(template.resources)) {
    template.resources.forEach(resource => {
      if (resource.dependsOn) {
        console.log(`  Removing dependsOn from ${resource.name}`);
        delete resource.dependsOn;
      }
    });
  }

  // Write back the template
  fs.writeFileSync(templatePath, JSON.stringify(template, null, 2), 'utf8');
  console.log(`  ✓ Updated Foundation-application-${i}.json`);
}

console.log('\nDone!');
