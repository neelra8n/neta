import fs from 'fs';
import path from 'path';
import { TestGenerator, TestGeneratorOptions } from './types.js';
import { ComponentInfo } from '../analyzer/types.js';
import { LLMClient } from '../llm/client.js';
import chalk from 'chalk';

export class E2EGenerator implements TestGenerator {
  constructor(private llmClient: LLMClient) {}

  async generate(component: ComponentInfo, options: TestGeneratorOptions): Promise<void> {
    // Only generate E2E tests for pages
    if (component.fileType !== 'page') {
      return;
    }

    const testDir = path.join(process.cwd(), 'tests', 'e2e');
    const testFileName = `${component.name}.spec.ts`;
    const testPath = path.join(testDir, testFileName);

    console.log(chalk.yellow(`Generating E2E test for ${component.name}...`));

    // Read component content
    const componentContent = fs.readFileSync(path.join(process.cwd(), component.filePath), 'utf-8');

    // Construct prompt
    const prompt = `
      You are an expert testing engineer. Generate a Playwright E2E test for this Next.js page.
      
      File Path: ${component.filePath}
      
      Code:
      \`\`\`typescript
      ${componentContent}
      \`\`\`
      
      Requirements:
      - Use Playwright.
      - specific Test the main user journey for this page.
      - Check for critical elements (headings, buttons).
      - If there are forms, simulate submission.
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
