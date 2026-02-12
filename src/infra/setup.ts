import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';

export class InfraSetup {
  constructor(private rootDir: string) {}

  async run() {
    console.log(chalk.bold('Checking Testing Infrastructure...'));

    await this.ensureDependencies();
    await this.ensureConfigs();
    await this.ensureScripts();

    console.log(chalk.green('Infrastructure setup complete.'));
  }

  private async ensureDependencies() {
    const requiredDevDeps = [
      'vitest',
      '@vitest/coverage-v8',
      '@testing-library/react',
      '@testing-library/user-event',
      '@testing-library/jest-dom',
      'jsdom',
      '@vitejs/plugin-react',
      'playwright',
    ];

    const packageJsonPath = path.join(this.rootDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const devDeps = packageJson.devDependencies || {};

    const missingDeps = requiredDevDeps.filter((dep) => !devDeps[dep]);

    if (missingDeps.length > 0) {
      console.log(chalk.yellow(`Missing dependencies: ${missingDeps.join(', ')}`));
      console.log(chalk.blue('Installing...'));
      try {
        // execute npm install
        // In a real environment, we'd check for yarn/pnpm too
        execSync(`npm install -D ${missingDeps.join(' ')}`, {
          stdio: 'inherit',
          cwd: this.rootDir,
        });
      } catch (error) {
        console.error(chalk.red('Failed to install dependencies. Please install manually.'));
      }
    } else {
      console.log(chalk.green('All dependencies present.'));
    }
  }

  private async ensureConfigs() {
    // Vitest Config
    const vitestConfigPath = path.join(this.rootDir, 'vitest.config.ts');
    if (!fs.existsSync(vitestConfigPath)) {
      console.log(chalk.blue('Creating vitest.config.ts...'));
      const content = `
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
`;
      fs.writeFileSync(vitestConfigPath, content);
    }

    // Setup file
    const setupFilePath = path.join(this.rootDir, 'tests', 'setup.ts');
    const testsDir = path.dirname(setupFilePath);
    if (!fs.existsSync(testsDir)) fs.mkdirSync(testsDir, { recursive: true });

    if (!fs.existsSync(setupFilePath)) {
      fs.writeFileSync(setupFilePath, "import '@testing-library/jest-dom';");
    }
  }

  private async ensureScripts() {
    // Add 'test' and 'test:e2e' scripts if missing
    // Simple implementation: just log instructions for now to avoid overwriting user formats too aggressively
    console.log(
      chalk.dim('Remember to add "test": "vitest" to your package.json scripts if not present.'),
    );
  }
}
