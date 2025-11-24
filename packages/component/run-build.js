const { execSync } = require('child_process');
const path = require('path');

const rootDir = '/Users/Austin.Leahy/Source/Github/DigitalMinion/atakora';
const componentDir = path.join(rootDir, 'packages/component');

console.log('=== Building @atakora/component ===\n');

try {
  const output = execSync('npx tsc --build tsconfig.json', {
    cwd: componentDir,
    encoding: 'utf-8',
    stdio: 'pipe',
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
  });

  console.log('Build output:', output);
  console.log('\n✓ Build succeeded!');

  // Check dist directory
  try {
    const distFiles = execSync('ls -la dist', {
      cwd: componentDir,
      encoding: 'utf-8',
    });
    console.log('\nDist directory contents:');
    console.log(distFiles);
  } catch (e) {
    console.log('\n⚠ dist directory not found');
  }
} catch (error) {
  console.error('Build failed!');
  console.error('Exit code:', error.status);
  console.error('\nStdout:', error.stdout);
  console.error('\nStderr:', error.stderr);
  process.exit(1);
}
