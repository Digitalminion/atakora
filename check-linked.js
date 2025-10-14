const fs = require('fs');
const template = JSON.parse(fs.readFileSync('.atakora/arm.out/backend/Foundation-application-7.json', 'utf-8'));
const func = template.resources.find(r => r.type === 'Microsoft.Web/sites/functions');

console.log('Function name:', func.name);
console.log('Has inline code:', !!func.properties.files);
if (func.properties.files) {
  const codeSize = func.properties.files['index.js'].length;
  console.log('Code size:', codeSize, 'characters');
  console.log('First 100 chars of code:', func.properties.files['index.js'].substring(0, 100));
}
