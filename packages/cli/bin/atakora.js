#!/usr/bin/env node

// Wrapper to run the CLI with tsx (no compilation needed)
const path = require('path');
const { spawn } = require('child_process');

const tsxBin = require.resolve('tsx/cli');
const cliPath = path.join(__dirname, '../src/cli.ts');

// Forward all arguments to tsx running the TypeScript CLI
const child = spawn(process.execPath, [tsxBin, cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: false
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
