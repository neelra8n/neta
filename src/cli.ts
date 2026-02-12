import { Command } from 'commander';
import chalk from 'chalk';
import packageJson from '../package.json' with { type: 'json' };
import { Orchestrator } from './orchestrator.js';

const program = new Command();

program.name('neta').description('Next.js Exhaustive Testing Agent').version(packageJson.version);

program
  .command('init')
  .description('Initialize NETA in the current project')
  .action(async () => {
    console.log(chalk.blue('Initializing NETA...'));
    const { InfraSetup } = await import('./infra/setup.js');
    const setup = new InfraSetup(process.cwd());
    await setup.run();
  });

program
  .command('generate')
  .description('Generate tests for the project')
  .option('-m, --mode <mode>', 'Generation mode: changed | all | file', 'changed')
  .option('-f, --file <path>', 'Specific file path (required if mode is file)')
  .option('--e2e', 'Enable E2E test generation', false)
  .option('--dry-run', 'Show planned changes without writing', false)
  .action(async (options) => {
    // Load config (or prompt if missing)
    const { ConfigManager } = await import('./config/index.js');
    const configManager = new ConfigManager();
    const config = await configManager.ensureConfig();

    console.log(chalk.blue(`Generating tests in ${options.mode} mode...`));

    const llmConfig = {
      provider: config.llmProvider,
      model: config.llmModel,
      apiKey: config.apiKey,
    };

    // If file is specified but mode is default (changed), switch to file mode
    if (options.file && options.mode === 'changed') {
      options.mode = 'file';
    }

    try {
      const orchestrator = new Orchestrator(process.cwd(), {
        mode: options.mode,
        file: options.file,
        e2e: options.e2e,
        dryRun: options.dryRun,
        llmConfig,
      });

      await orchestrator.run();
    } catch (error) {
      console.error(chalk.red('Error running NETA:'), error);
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Run tests and check coverage')
  .action(async () => {
    console.log(chalk.blue('Checking coverage...'));
    const { TestRunner } = await import('./runner/index.js');
    const runner = new TestRunner(process.cwd());
    await runner.runTests();
    await runner.checkCoverage(); // Default 85%
  });

program
  .command('config')
  .description('Configure NETA (LLM settings, API keys)')
  .action(async () => {
    const { ConfigManager } = await import('./config/index.js');
    const manager = new ConfigManager();
    await manager.configureInteractive();
  });

program.parse(process.argv);
