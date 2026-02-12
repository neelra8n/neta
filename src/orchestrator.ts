import { ProjectAnalyzer } from './analyzer/index.js';
import { createLLMClient, LLMClient, LLMConfig } from './llm/client.js';
import { UnitTestGenerator } from './generators/unit.js';
import { IntegrationTestGenerator } from './generators/integration.js';
import { E2EGenerator } from './generators/e2e.js';
import chalk from 'chalk';

export interface OrchestratorOptions {
  mode: 'changed' | 'all' | 'file';
  file?: string;
  e2e: boolean;
  dryRun: boolean;
  llmConfig: LLMConfig;
}

export class Orchestrator {
  private analyzer: ProjectAnalyzer;
  private llmClient: LLMClient;
  private unitGenerator: UnitTestGenerator;
  private integrationGenerator: IntegrationTestGenerator;
  private e2eGenerator: E2EGenerator;

  constructor(private rootDir: string, private options: OrchestratorOptions) {
    this.analyzer = new ProjectAnalyzer(rootDir);
    this.llmClient = createLLMClient(options.llmConfig);
    this.unitGenerator = new UnitTestGenerator(this.llmClient);
    this.integrationGenerator = new IntegrationTestGenerator(this.llmClient);
    this.e2eGenerator = new E2EGenerator(this.llmClient);
  }

  async run() {
    console.log(chalk.bold('NETA Starting...'));
    
    // 1. Analyze Project
    console.log('Analyzing project structure...');
    const analysis = await this.analyzer.analyze();
    console.log(chalk.green(`Found ${analysis.components.length} components.`));

    // 2. Filter components based on mode
    let targetComponents = analysis.components;
    
    if (this.options.mode === 'file' && this.options.file) {
      targetComponents = targetComponents.filter(c => c.filePath.includes(this.options.file!));
    } else if (this.options.mode === 'changed') {
      // TODO: Implement git diff parsing
      console.log(chalk.yellow('Mode "changed" not yet fully implemented, processing all for now (demo stub).'));
    }

    if (targetComponents.length === 0) {
      console.log(chalk.yellow('No components found to test.'));
      return;
    }

    // 3. Generate Tests
    for (const component of targetComponents) {
      console.log(chalk.dim('-----------------------------------'));
      console.log(`Processing ${component.name} (${component.fileType})`);

      // Unit Tests
      await this.unitGenerator.generate(component, { dryRun: this.options.dryRun });

      // Integration Tests (if applicable)
      await this.integrationGenerator.generate(component, { dryRun: this.options.dryRun });

      // E2E Tests (if enabled and applicable)
      if (this.options.e2e) {
        await this.e2eGenerator.generate(component, { dryRun: this.options.dryRun });
      }
    }

    console.log(chalk.bold.green('\\nAll tasks completed.'));
  }
}
