import fs from 'fs';
import path from 'path';
import { TestGenerator, TestGeneratorOptions } from './types.js';
import { ComponentInfo } from '../analyzer/types.js';
import { LLMClient } from '../llm/client.js';
import chalk from 'chalk';

export class IntegrationTestGenerator implements TestGenerator {
  constructor(private llmClient: LLMClient) {}

  async generate(component: ComponentInfo, options: TestGeneratorOptions): Promise<void> {
    // Only generate integration tests for pages and layouts for now
    if (component.fileType !== 'page' && component.fileType !== 'layout') {
      return;
    }

    const testDir = path.join(process.cwd(), 'tests', 'integration');
    const testFileName = `${component.name}.integration.test.tsx`;
    const testPath = path.join(testDir, testFileName);

    console.log(chalk.magenta(`Generating integration test for ${component.name}...`));

    // Read component content
    const componentContent = fs.readFileSync(path.join(process.cwd(), component.filePath), 'utf-8');

    // Construct prompt for integration test
    const prompt = `
      You are an expert testing engineer. Generate an integration test using Vitest and React Testing Library.
      This is a Next.js ${component.fileType} (App Router).
      
      File Path: ${component.filePath}
      
      Code:
      \`\`\`typescript
      ${componentContent}
      \`\`\`
      
      Requirements:
      - Test the correct rendering of the page/layout.
      - Mock any server actions or compiled data fetching.
      - Ensure child components are integrated correctly (shallow render if too complex, but prefer deep).
      - Return ONLY the code.
    `;

    if (!options.dryRun) {
      const generatedCode = await this.llmClient.generate(prompt);

      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      fs.writeFileSync(testPath, generatedCode);
      console.log(chalk.green(`Created ${testPath}`));
    } else {
      console.log(chalk.dim(`[Dry Run] Would generate content for ${testPath}`));
    }
  }
}
