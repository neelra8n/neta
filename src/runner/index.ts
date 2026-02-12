import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export interface CoverageSummary {
  total: {
    lines: { pct: number };
    statements: { pct: number };
    functions: { pct: number };
    branches: { pct: number };
  };
}

export class TestRunner {
  constructor(private rootDir: string) {}

  async runTests(): Promise<boolean> {
    console.log(chalk.bold('Running tests...'));
    try {
      // Run vitest with coverage enabled
      execSync('npx vitest run --coverage', { stdio: 'inherit', cwd: this.rootDir });
      return true;
    } catch (error) {
      console.log(chalk.red('Tests failed.'));
      return false;
    }
  }

  async checkCoverage(threshold: number = 85): Promise<boolean> {
    const coveragePath = path.join(this.rootDir, 'coverage', 'coverage-summary.json');

    if (!fs.existsSync(coveragePath)) {
      console.log(chalk.yellow('No coverage report found.'));
      return false;
    }

    const summary: CoverageSummary = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
    const { lines, statements, functions, branches } = summary.total;

    console.log(chalk.bold('\\nCoverage Summary:'));
    console.log(`Lines:      ${this.colorPct(lines.pct)}%`);
    console.log(`Statements: ${this.colorPct(statements.pct)}%`);
    console.log(`Functions:  ${this.colorPct(functions.pct)}%`);
    console.log(`Branches:   ${this.colorPct(branches.pct)}%`);

    const passed = lines.pct >= threshold && branches.pct >= threshold; // Simplified check

    if (!passed) {
      console.log(chalk.red(`\\nCoverage is below the threshold of ${threshold}%.`));
      // TODO: Trigger Critic Agent loop here
      return false;
    }

    console.log(chalk.green(`\\nCoverage check passed!`));
    return true;
  }

  private colorPct(pct: number): string {
    if (pct >= 90) return chalk.green(pct);
    if (pct >= 80) return chalk.yellow(pct);
    return chalk.red(pct);
  }
}
