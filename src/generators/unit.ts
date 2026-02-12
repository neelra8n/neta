import fs from 'fs';
import path from 'path';
import { TestGenerator, TestGeneratorOptions } from './types.js';
import { ComponentInfo } from '../analyzer/types.js';
import { LLMClient } from '../llm/client.js';
import chalk from 'chalk';

export class UnitTestGenerator implements TestGenerator {
  constructor(private llmClient: LLMClient) {}

  async generate(component: ComponentInfo, options: TestGeneratorOptions): Promise<void> {
    const testDir = path.join(process.cwd(), 'tests', 'unit');
    const testFileName = `${component.name}.test.tsx`; // Or .ts depending on component
    const testPath = path.join(testDir, testFileName);

    console.log(chalk.blue(`Generating unit test for ${component.name}...`));

    // skip if file exists (basic logic for now, later we update)
    if (fs.existsSync(testPath) && !options.dryRun) {
      console.log(chalk.yellow(`Test already exists for ${component.name}, skipping...`));
      return;
    }

    // Read component content
    const componentContent = fs.readFileSync(path.join(process.cwd(), component.filePath), 'utf-8');

    // Gather project context
    const projectContext = this.gatherProjectContext();

    // Construct prompt with enhanced context
    const prompt = `
      You are an expert testing engineer. Generate a comprehensive Vitest unit test for the following Next.js component/utility.
      
      File Path: ${component.filePath}
      File Type: ${component.fileType}
      Component Type: ${component.type}
      
      Code to Test:
      \`\`\`typescript
      ${componentContent}
      \`\`\`
      
      ${projectContext}
      
      Requirements:
      - Use Vitest and React Testing Library (@testing-library/react)
      - Import test utilities from 'vitest': describe, expect, it
      - Use path alias '@/' for imports (e.g., '@/components/ui/badge')
      - Follow the exact formatting style shown in the examples above
      - Use single quotes for strings and JSX attributes
      - Use 2-space indentation
      - Test all exported functions/components
      - Cover edge cases and error states
      - Mock dependencies if necessary
      - Return ONLY the test code, no markdown fences, no explanations
    `;

    // Generate
    if (!options.dryRun) {
      let generatedCode = await this.llmClient.generate(prompt);

      // Strip markdown code fences if present
      generatedCode = this.stripCodeFences(generatedCode);

      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      fs.writeFileSync(testPath, generatedCode);
      console.log(chalk.green(`Created ${testPath}`));
    } else {
      console.log(chalk.dim(`[Dry Run] Would generate content for ${testPath}`));
    }
  }

  private gatherProjectContext(): string {
    const contextParts: string[] = [];

    // 1. Load existing test examples
    const exampleTests = this.loadExampleTests();
    if (exampleTests.length > 0) {
      contextParts.push('Example Test Files from this Project:');
      exampleTests.forEach((example, idx) => {
        contextParts.push(
          `\nExample ${idx + 1} (${example.fileName}):\n\`\`\`typescript\n${example.content}\n\`\`\``,
        );
      });
    }

    // 2. Load prettier config for formatting rules
    const prettierConfig = this.loadPrettierConfig();
    if (prettierConfig) {
      contextParts.push(`\nProject Prettier Configuration:\n${prettierConfig}`);
    }

    // 3. Add project-specific conventions
    contextParts.push(`
Project Conventions:
- Import order: 1) React, 2) Next.js, 3) @/ aliases, 4) relative imports
- Use '@/' path alias for src imports
- Single quotes for strings and JSX attributes (jsxSingleQuote: true)
- 2-space indentation
- Arrow functions without parens for single params
- Semicolons required
- Trailing commas in ES5 style
    `);

    return contextParts.join('\n');
  }

  private loadExampleTests(): Array<{ fileName: string; content: string }> {
    const examples: Array<{ fileName: string; content: string }> = [];
    const testDir = path.join(process.cwd(), 'tests', 'unit');

    if (!fs.existsSync(testDir)) {
      return examples;
    }

    try {
      const files = fs.readdirSync(testDir);
      // Load up to 2 example test files to avoid overwhelming the context
      const testFiles = files
        .filter((f) => f.endsWith('.test.tsx') || f.endsWith('.test.ts'))
        .slice(0, 2);

      for (const file of testFiles) {
        const filePath = path.join(testDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        // Limit content length to avoid token overflow
        examples.push({
          fileName: file,
          content:
            content.length > 2000 ? content.substring(0, 2000) + '\n// ... truncated' : content,
        });
      }
    } catch (error) {
      // Silently fail if we can't read examples
      console.log(chalk.dim('Could not load example tests'));
    }

    return examples;
  }

  private loadPrettierConfig(): string | null {
    const prettierPaths = [
      path.join(process.cwd(), '.prettierrc'),
      path.join(process.cwd(), '.prettierrc.json'),
      path.join(process.cwd(), 'prettier.config.js'),
    ];

    for (const configPath of prettierPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf-8');
          // For JSON files, parse and extract key rules
          if (configPath.endsWith('.json') || configPath.endsWith('.prettierrc')) {
            const config = JSON.parse(content);
            return `Key formatting rules:
- singleQuote: ${config.singleQuote}
- jsxSingleQuote: ${config.jsxSingleQuote}
- semi: ${config.semi}
- tabWidth: ${config.tabWidth}
- trailingComma: ${config.trailingComma}
- arrowParens: ${config.arrowParens}`;
          }
          return content;
        } catch (error) {
          // Continue to next config path
        }
      }
    }

    return null;
  }

  private stripCodeFences(code: string): string {
    // Remove markdown code fences (```typescript, ```javascript, ```tsx, etc.)
    return code
      .replace(/^```[\w]*\n/gm, '') // Remove opening fence
      .replace(/\n```$/gm, '') // Remove closing fence
      .replace(/^```[\w]*$/gm, '') // Remove standalone fence markers
      .trim();
  }
}
