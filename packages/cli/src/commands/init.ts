import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { ManifestManager } from '../manifest/manifest-manager';
import {
  validateOrganizationName,
  validateProjectName,
  validatePackageName,
} from '../manifest/validator';
import { PackageGenerator } from '../generators/package-generator';

/**
 * Creates the `atakora init` command
 *
 * Initializes a new Atakora project with:
 * - Interactive prompts for organization, project, and first package
 * - Manifest creation in .atakora/manifest.json
 * - Workspace structure (packages/, .atakora/arm.out/)
 * - Root package.json with workspace configuration
 * - Root tsconfig.json
 * - .gitignore
 * - README.md
 *
 * @returns Commander command instance
 */
export function createInitCommand(): Command {
  const init = new Command('init')
    .description('Initialize a new Atakora project')
    .option('--org <organization>', 'Organization name (e.g., "Digital Minion")')
    .option('--project <project>', 'Project name (e.g., "ProductionInfra")')
    .option('--package <package>', 'First package name (e.g., "backend")')
    .option('--non-interactive', 'Skip prompts and use defaults')
    .addHelpText(
      'after',
      `
${chalk.bold('Description:')}
  Creates a new Atakora project with the following structure:

  ${chalk.cyan('my-project/')}
  ├── ${chalk.cyan('.atakora/')}           ${chalk.dim('# Project configuration')}
  │   └── manifest.json    ${chalk.dim('# Package manifest')}
  ├── ${chalk.cyan('packages/')}           ${chalk.dim('# Infrastructure packages')}
  │   └── ${chalk.cyan('backend/')}
  │       ├── bin/app.ts   ${chalk.dim('# Entry point')}
  │       └── package.json
  ├── package.json         ${chalk.dim('# Root workspace config')}
  ├── tsconfig.json        ${chalk.dim('# TypeScript config')}
  └── README.md

${chalk.bold('Examples:')}
  ${chalk.dim('# Interactive mode (prompts for input)')}
  ${chalk.cyan('$')} atakora init

  ${chalk.dim('# Non-interactive with defaults')}
  ${chalk.cyan('$')} atakora init --non-interactive

  ${chalk.dim('# Specify options upfront')}
  ${chalk.cyan('$')} atakora init --org "Digital Minion" --project "MyApp" --package "backend"

${chalk.bold('What happens:')}
  ${chalk.green('✓')} Creates project manifest in .atakora/manifest.json
  ${chalk.green('✓')} Generates first infrastructure package
  ${chalk.green('✓')} Sets up npm workspace with package.json
  ${chalk.green('✓')} Configures TypeScript with tsconfig.json
  ${chalk.green('✓')} Creates .gitignore and README.md
`
    )
    .action(async (options) => {
      const spinner = ora();

      try {
        // Check if already initialized
        const manifestManager = new ManifestManager();
        if (manifestManager.exists()) {
          console.log(chalk.red('\nProject already initialized!'));
          console.log(chalk.cyan(`Manifest exists at: ${manifestManager.getManifestPath()}`));
          console.log(chalk.gray('\nTo add a new package, use: atakora add <package-name>'));
          process.exit(1);
        }

        // Get configuration via prompts or options
        let organization: string;
        let project: string;
        let firstPackageName: string;

        if (options.nonInteractive) {
          organization = options.org || 'Digital Minion';
          project = options.project || 'Atakora';
          firstPackageName = options.package || 'backend';
        } else {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'organization',
              message: 'Organization name:',
              default: options.org || 'Digital Minion',
              validate: (input: string) => {
                const result = validateOrganizationName(input);
                return result.valid || result.error || 'Invalid organization name';
              },
            },
            {
              type: 'input',
              name: 'project',
              message: 'Project name:',
              default: options.project || 'Atakora',
              validate: (input: string) => {
                const result = validateProjectName(input);
                return result.valid || result.error || 'Invalid project name';
              },
            },
            {
              type: 'input',
              name: 'firstPackageName',
              message: 'First package name:',
              default: options.package || 'backend',
              validate: (input: string) => {
                const result = validatePackageName(input);
                return result.valid || result.error || 'Invalid package name';
              },
            },
          ]);

          organization = answers.organization;
          project = answers.project;
          firstPackageName = answers.firstPackageName;
        }

        console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.bold.white('  Initializing Atakora Project'));
        console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

        // Create manifest
        spinner.start('Creating manifest...');
        manifestManager.create({
          organization,
          project,
          firstPackageName,
        });
        spinner.succeed(chalk.green(`Created ${ManifestManager.MANIFEST_PATH}`));

        // Create output directory
        spinner.start('Creating output directory...');
        const outputDir = path.join(process.cwd(), ManifestManager.DEFAULT_OUTPUT_DIR);
        fs.mkdirSync(outputDir, { recursive: true });
        spinner.succeed(chalk.green(`Created ${ManifestManager.DEFAULT_OUTPUT_DIR}/`));

        // Generate first package
        spinner.start(`Creating package: ${firstPackageName}...`);
        const packageGenerator = new PackageGenerator();
        packageGenerator.generate({
          packageName: firstPackageName,
          workspaceRoot: process.cwd(),
          organization,
        });
        spinner.succeed(chalk.green(`Created packages/${firstPackageName}/`));

        // Create root package.json
        spinner.start('Creating root package.json...');
        createRootPackageJson(project);
        spinner.succeed(chalk.green('Created package.json'));

        // Create root tsconfig.json
        spinner.start('Creating root tsconfig.json...');
        createRootTsConfig();
        spinner.succeed(chalk.green('Created tsconfig.json'));

        // Create .gitignore
        spinner.start('Creating .gitignore...');
        createGitIgnore();
        spinner.succeed(chalk.green('Created .gitignore'));

        // Create README
        spinner.start('Creating README.md...');
        createReadme(project, organization);
        spinner.succeed(chalk.green('Created README.md'));

        // Success message
        console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.green.bold('  ✓ Project initialized successfully!'));
        console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

        console.log(chalk.bold('🚀 Next Steps:\n'));
        console.log(`  ${chalk.cyan('1.')} Install dependencies`);
        console.log(`     ${chalk.dim('$')} ${chalk.bold('npm install')}\n`);
        console.log(`  ${chalk.cyan('2.')} Define your infrastructure`);
        console.log(
          `     ${chalk.dim('Edit:')} ${chalk.bold(`packages/${firstPackageName}/bin/app.ts`)}\n`
        );
        console.log(`  ${chalk.cyan('3.')} Generate ARM templates`);
        console.log(`     ${chalk.dim('$')} ${chalk.bold('npm run synth')}\n`);
        console.log(`  ${chalk.cyan('4.')} Deploy to Azure`);
        console.log(`     ${chalk.dim('$')} ${chalk.bold('atakora deploy')}\n`);
        console.log(
          chalk.dim(`💡 Tip: Run ${chalk.white('atakora --help')} to see all available commands\n`)
        );
      } catch (error) {
        spinner.fail(chalk.red('Initialization failed'));

        if (error instanceof Error) {
          console.error(chalk.red('\nError: ' + error.message));
        } else {
          console.error(chalk.red('\nUnknown error occurred'));
        }

        process.exit(1);
      }
    });

  return init;
}

/**
 * Creates root package.json with workspace configuration
 */
function createRootPackageJson(projectName: string): void {
  const packageJson = {
    name: projectName.toLowerCase().replace(/\s+/g, '-'),
    version: '0.1.0',
    private: true,
    workspaces: ['packages/*'],
    scripts: {
      build: 'tsc --build',
      'build:clean': 'tsc --build --clean',
      synth: 'atakora synth',
      deploy: 'atakora deploy',
      diff: 'atakora diff',
      clean: 'npm run clean --workspaces --if-present',
      test: 'npm run test --workspaces --if-present',
    },
    devDependencies: {
      '@types/node': '^24.6.2',
      typescript: '^5.9.3',
    },
  };

  const packageJsonPath = path.join(process.cwd(), 'package.json');

  // Check if package.json already exists
  if (fs.existsSync(packageJsonPath)) {
    // Merge with existing package.json
    const existing = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const merged = {
      ...existing,
      ...packageJson,
      scripts: {
        ...existing.scripts,
        ...packageJson.scripts,
      },
      devDependencies: {
        ...existing.devDependencies,
        ...packageJson.devDependencies,
      },
    };
    fs.writeFileSync(packageJsonPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  } else {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
  }
}

/**
 * Creates root tsconfig.json
 */
function createRootTsConfig(): void {
  const tsConfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'commonjs',
      lib: ['ES2022'],
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      composite: true,
      outDir: './dist',
      rootDir: '.',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      moduleResolution: 'node',
      resolveJsonModule: true,
      incremental: true,
    },
    exclude: ['node_modules', 'dist', '.atakora'],
  };

  const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');

  // Only create if doesn't exist
  if (!fs.existsSync(tsConfigPath)) {
    fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2) + '\n', 'utf-8');
  }
}

/**
 * Creates .gitignore file
 */
function createGitIgnore(): void {
  const gitignore = `# Dependencies
node_modules/

# Build output
dist/
*.tsbuildinfo

# ARM template output
.atakora/arm.out/

# Environment files
.env
.env.local
.env.*.local

# Editor directories
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*

# Testing
coverage/
.nyc_output/

# Temporary files
*.tmp
.temp/
`;

  const gitignorePath = path.join(process.cwd(), '.gitignore');

  // Only create if doesn't exist
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, gitignore, 'utf-8');
  } else {
    // Append Atakora-specific ignores if not already present
    const existing = fs.readFileSync(gitignorePath, 'utf-8');
    if (!existing.includes('.atakora/arm.out/')) {
      fs.appendFileSync(gitignorePath, '\n# Atakora\n.atakora/arm.out/\n', 'utf-8');
    }
  }
}

/**
 * Creates README.md file
 */
function createReadme(projectName: string, organization: string): void {
  const readme = `# ${projectName}

Azure infrastructure project for ${organization}.

## Overview

This project uses [Atakora](https://github.com/digital-minion/atakora) to define Azure infrastructure as TypeScript code.

## Getting Started

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Define infrastructure:**
   Edit \`packages/*/bin/app.ts\` to define your Azure resources using Atakora constructs.

3. **Synthesize ARM templates:**
   \`\`\`bash
   npm run synth
   \`\`\`

4. **Deploy to Azure:**
   \`\`\`bash
   npm run deploy
   \`\`\`

## Project Structure

- \`packages/\` - Infrastructure packages
- \`.atakora/\` - Atakora configuration and output
  - \`manifest.json\` - Project manifest
  - \`arm.out/\` - Synthesized ARM templates

## Available Commands

- \`npm run build\` - Compile TypeScript
- \`npm run synth\` - Synthesize ARM templates
- \`npm run deploy\` - Deploy infrastructure to Azure
- \`npm run diff\` - Show infrastructure changes
- \`npm run clean\` - Remove build artifacts

## Adding New Packages

To add a new infrastructure package:

\`\`\`bash
atakora add <package-name>
\`\`\`

## Documentation

For more information, see the [Atakora documentation](https://github.com/digital-minion/atakora).
`;

  const readmePath = path.join(process.cwd(), 'README.md');

  // Only create if doesn't exist
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, readme, 'utf-8');
  }
}
