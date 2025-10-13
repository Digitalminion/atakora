#!/usr/bin/env node
/**
 * Build script for CRUD function templates
 *
 * This script:
 * 1. Bundles TypeScript templates with ALL dependencies using esbuild
 * 2. Tree-shakes and minifies the code
 * 3. Creates self-contained JavaScript bundles
 * 4. Identifies ATAKORA_* replacement tokens
 * 5. Generates TypeScript files with exported template functions
 *
 * The result is production-ready, self-contained JavaScript code that requires
 * NO external dependencies at runtime - everything is bundled in.
 */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

// Template directories
const SCRIPTS_DIR = __dirname;
const TEMPLATES_DIR = [
  'crud-create',
  'crud-read',
  'crud-update',
  'crud-delete',
  'crud-list'
];

// Output directory for generated templates
const OUTPUT_DIR = path.join(SCRIPTS_DIR, '..', 'src', 'crud', 'functions');

/**
 * Bundles a TypeScript template with all dependencies
 */
async function bundleTemplate(templateDir) {
  console.log(`Bundling ${templateDir} with dependencies...`);

  const templatePath = path.join(SCRIPTS_DIR, templateDir);
  const indexTs = path.join(templatePath, 'index.ts');

  if (!fs.existsSync(indexTs)) {
    console.warn(`Warning: ${indexTs} does not exist, skipping...`);
    return null;
  }

  const outfile = path.join(templatePath, 'dist', 'bundle.js');

  try {
    // Bundle with esbuild - includes all dependencies, tree-shaken and minified
    await esbuild.build({
      entryPoints: [indexTs],
      bundle: true,           // Bundle all dependencies
      platform: 'node',       // Target Node.js runtime
      target: 'node18',       // Target Node 18+
      format: 'cjs',          // CommonJS format for Azure Functions
      outfile: outfile,
      minify: true,           // Minify code - strip whitespace, shorten variable names
      minifyWhitespace: true, // Remove all unnecessary whitespace
      minifyIdentifiers: true,// Shorten variable/function names (preserves ATAKORA_* tokens)
      minifySyntax: true,     // Simplify syntax (e.g., if statements, loops)
      treeShaking: true,      // Remove unused code
      // Mark Azure Functions runtime packages as external (provided by Azure Functions runtime)
      external: [
        '@azure/functions-core',  // Injected by Azure Functions runtime
      ],
      tsconfig: path.join(SCRIPTS_DIR, 'tsconfig.json'),
      logLevel: 'warning',
    });

    console.log(`  ✓ Bundled to ${outfile}`);

    // Read bundled JavaScript
    if (!fs.existsSync(outfile)) {
      console.error(`Bundle file not found: ${outfile}`);
      return null;
    }

    const code = fs.readFileSync(outfile, 'utf-8');
    return code;
  } catch (error) {
    console.error(`Failed to bundle ${templateDir}:`, error.message);
    return null;
  }
}

/**
 * Extracts replacement tokens from code
 */
function extractTokens(code) {
  const tokenRegex = /ATAKORA_[A-Z_]+/g;
  const tokens = new Set();
  let match;

  while ((match = tokenRegex.exec(code)) !== null) {
    tokens.add(match[0]);
  }

  return Array.from(tokens);
}

/**
 * Generates the index.ts file with all template functions
 */
function generateIndexFile(templateData) {
  const imports = templateData
    .map(({ name }) => {
      const varName = name.replace(/-/g, '_'); // Replace hyphens with underscores for valid variable names
      return `import * as ${varName}Code from './${name}.js';`;
    })
    .join('\n');

  const interfaces = templateData.map(({ name, tokens }) => {
    const functionName = name.replace('crud-', 'generate').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const configName = functionName.charAt(0).toUpperCase() + functionName.slice(1) + 'Config';
    const parameterNames = tokens.map(token => token.replace('ATAKORA_', '').toLowerCase());

    return `
/**
 * Configuration for ${name} function
 */
export interface ${configName} {
${parameterNames.map(name => `  readonly ${name}: string;`).join('\n')}
${tokens.includes('ATAKORA_SCHEMA_JSON') ? '  readonly schemaJson: string;' : ''}
}`;
  }).join('\n');

  const functions = templateData.map(({ name, tokens }) => {
    const varName = name.replace(/-/g, '_');
    const functionName = name.replace('crud-', 'generate').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const configName = functionName.charAt(0).toUpperCase() + functionName.slice(1) + 'Config';
    const replacements = tokens.map(token => {
      const paramName = token.replace('ATAKORA_', '').toLowerCase();
      return `  code = code.replace(/${token}/g, config.${paramName});`;
    }).join('\n');

    return `
/**
 * Generates the ${name} function code
 *
 * @param config - Configuration with entity-specific values
 * @returns Minified, self-contained JavaScript code ready for deployment
 */
export function ${functionName}(config: ${configName}): string {
  // Read the minified bundle as a string
  let code = ${varName}Code.default;

  // Replace all ATAKORA_* tokens with actual values
${replacements}

  return code;
}`;
  }).join('\n');

  return `/**
 * CRUD Function Code Generators
 *
 * @remarks
 * This file is auto-generated by scripts/build-templates.js
 * Each function reads a pre-compiled, minified JavaScript bundle and
 * replaces ATAKORA_* tokens with actual values.
 *
 * The bundles are self-contained with all dependencies included.
 * No npm packages need to be installed at runtime.
 *
 * @packageDocumentation
 */

${imports}
${interfaces}
${functions}
`;
}

/**
 * Main build process
 */
async function main() {
  console.log('Building CRUD function templates with bundled dependencies...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const templateData = [];

  // Process each template
  for (const templateDir of TEMPLATES_DIR) {
    console.log(`\n--- Processing ${templateDir} ---`);

    const code = await bundleTemplate(templateDir);
    if (!code) {
      continue;
    }

    const tokens = extractTokens(code);
    console.log(`Found tokens: ${tokens.join(', ')}`);
    console.log(`Bundle size: ${(code.length / 1024).toFixed(2)} KB`);

    // Save the minified bundle as a .js file
    const jsOutputFile = path.join(OUTPUT_DIR, `${templateDir}.js`);
    const jsContent = `// Auto-generated minified bundle for ${templateDir}\n// Do not edit - regenerate with: npm run templates\nexport default ${JSON.stringify(code)};\n`;
    fs.writeFileSync(jsOutputFile, jsContent);
    console.log(`Saved bundle: ${jsOutputFile}`);

    // Create .d.ts declaration file
    const dtsOutputFile = path.join(OUTPUT_DIR, `${templateDir}.d.ts`);
    const dtsContent = `// Auto-generated type declaration for ${templateDir}\ndeclare const code: string;\nexport default code;\n`;
    fs.writeFileSync(dtsOutputFile, dtsContent);
    console.log(`Saved types: ${dtsOutputFile}`);

    templateData.push({ name: templateDir, tokens });
  }

  // Generate single index.ts with all template functions
  const indexContent = generateIndexFile(templateData);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), indexContent);
  console.log(`\nGenerated: ${path.join(OUTPUT_DIR, 'index.ts')}`);

  console.log('\n✅ Template build complete! All dependencies bundled and minified.');
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
