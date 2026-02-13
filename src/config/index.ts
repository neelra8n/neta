import fs from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import inquirer from 'inquirer';
import chalk from 'chalk';

export interface NetaConfig {
  llmProvider: 'local' | 'openai' | 'anthropic' | 'gemini';
  llmModel: string;
  apiKey?: string;
  coverageThreshold?: number;
  contextOptions?: {
    maxExampleTests?: number;
    maxExampleLength?: number;
    includeFormatting?: boolean;
    customConventions?: string[];
  };
  autoFormat?: boolean;
  autoLint?: boolean;
}

export class ConfigManager {
  private configPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), '.neta.config.json');
  }

  loadConfig(): NetaConfig {
    const defaults: NetaConfig = {
      llmProvider: 'local',
      llmModel: 'llama3',
      coverageThreshold: 85,
      autoFormat: true,
      autoLint: true,
      contextOptions: {
        maxExampleTests: 2,
        maxExampleLength: 2000,
        includeFormatting: true,
      },
    };

    if (fs.existsSync(this.configPath)) {
      try {
        const loaded = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        return { ...defaults, ...loaded };
      } catch (error) {
        console.error(chalk.red('Failed to parse config file. Using defaults.'));
      }
    }

    return defaults;
  }

  async ensureConfig(): Promise<NetaConfig> {
    if (!fs.existsSync(this.configPath)) {
      console.log(chalk.yellow('No configuration found. Launching interactive setup...'));
      await this.configureInteractive();
    }
    return this.loadConfig();
  }

  async configureInteractive() {
    console.log(chalk.bold.blue('NETA Configuration Setup'));

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'llmProvider',
        message: 'Select LLM Provider:',
        choices: ['local', 'openai', 'anthropic', 'gemini'],
        default: 'local',
      },
      {
        type: 'input',
        name: 'llmModel',
        message: 'Enter Model Name (e.g., gpt-4, claude-3-opus, llama3, gemini-1.5-pro):',
        default: (answers: any) => {
          if (answers.llmProvider === 'openai') return 'gpt-4-turbo';
          if (answers.llmProvider === 'anthropic') return 'claude-3-opus';
          if (answers.llmProvider === 'gemini') return 'gemini-1.5-pro';
          return 'llama3';
        },
      },
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter API Key (optional for local):',
        when: (answers: any) => answers.llmProvider !== 'local',
      },
      {
        type: 'number',
        name: 'coverageThreshold',
        message: 'Set Coverage Threshold (%):',
        default: 85,
      },
    ]);

    this.saveConfig(answers as NetaConfig);
    console.log(chalk.green('Configuration saved to .neta.config.json'));

    // Also warn about .gitignore
    console.log(
      chalk.yellow(
        'NOTE: Ensure .neta.config.json is added to your .gitignore if it contains API keys.',
      ),
    );
  }

  private saveConfig(config: NetaConfig) {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }
}
