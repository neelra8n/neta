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
    const projectContext = this.gatherProjectContext(options);

    // Ensure component name is PascalCase for React components
    const pascalName = component.name.charAt(0).toUpperCase() + component.name.slice(1);

    // Calculate relative path for component import
    const relativeDir = path.relative(
      testDir,
      path.join(process.cwd(), path.dirname(component.filePath)),
    );
    const componentImportPath = path.join(relativeDir, component.name);

    // Construct prompt with enhanced context
    const prompt = `
      You are an expert testing engineer. Generate a comprehensive Vitest unit test for the following Next.js component/utility.
      
      File Path: ${component.filePath}
      File Type: ${component.fileType}
      Component Type: ${component.type}
      Component Name: ${pascalName}
      
      Code to Test:
      \`\`\`typescript
      ${componentContent}
      \`\`\`
      
      ${projectContext}
      
      CRITICAL IMPORT REQUIREMENTS - You MUST include these exact imports at the top of the file:
      1. import { render, screen } from '@testing-library/react';
      2. import { describe, expect, it } from 'vitest';
      3. import { ${pascalName} } from '${componentImportPath}';
      
      Additional Requirements:
      - Use the EXACT casing for the component name: '${pascalName}' (not lowercase).
      - DO NOT use 'await' with the 'render' function. Use 'render(...)' directly.
      - Any conversational text, description, or explanation MUST be properly commented with '//' at the beginning of each line. NO naked text outside comments.
      - Use path alias '@/' for other project-wide imports (e.g., utils, contexts).
      - Follow the exact formatting style shown in the examples above.
      - Use single quotes for strings and JSX attributes.
      - Use 2-space indentation.
      - Test all exported functions/components.
      - Cover edge cases and error states.
      - Mock dependencies if necessary.
      - Return ONLY the test code inside a single markdown code block.
    `;

    // Generate
    if (!options.dryRun) {
      let generatedCode = await this.llmClient.generate(prompt);

      generatedCode = this.stripCodeFences(generatedCode);

      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      fs.writeFileSync(testPath, generatedCode);

      // Post-generation formatting and linting
      if (options.autoFormat) {
        await this.formatWithPrettier(testPath);
      }
      if (options.autoLint) {
        await this.lintAndFix(testPath);
      }

      console.log(chalk.green(`Created ${testPath}`));
    } else {
      console.log(chalk.dim(`[Dry Run] Would generate content for ${testPath}`));
    }
  }

  private async formatWithPrettier(filePath: string): Promise<void> {
    if (!this.hasPrettierConfig()) {
      console.log(chalk.dim('No Prettier config found, skipping auto-format'));
      return;
    }
    try {
      const { execSync } = await import('child_process');
      console.log(chalk.dim(`Formatting ${path.basename(filePath)} with Prettier...`));
      execSync(`npx prettier --write ${filePath}`, { cwd: process.cwd() });
    } catch (error) {
      console.log(chalk.yellow('Could not format with Prettier, using raw output'));
    }
  }

  private async lintAndFix(filePath: string): Promise<void> {
    if (!this.hasEslintConfig()) {
      console.log(chalk.dim('No ESLint config found, skipping auto-lint'));
      return;
    }
    try {
      const { execSync } = await import('child_process');
      console.log(chalk.dim(`Applying ESLint fixes to ${path.basename(filePath)}...`));
      execSync(`npx eslint --fix ${filePath}`, { cwd: process.cwd() });
    } catch (error) {
      // ESLint errors are common and often non-fatal for generation
      console.log(chalk.dim('ESLint auto-fix completed with warnings or skipped'));
    }
  }

  private hasPrettierConfig(): boolean {
    const configFiles = [
      '.prettierrc',
      '.prettierrc.json',
      '.prettierrc.js',
      'prettier.config.js',
      '.prettierrc.yaml',
      '.prettierrc.yml',
    ];
    return configFiles.some((file) => fs.existsSync(path.join(process.cwd(), file)));
  }

  private hasEslintConfig(): boolean {
    const configFiles = [
      '.eslintrc',
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yaml',
      '.eslintrc.yml',
      'eslint.config.js',
      'eslint.config.mjs',
      'eslint.config.cjs',
    ];
    // Also check package.json for eslintConfig
    if (fs.existsSync(path.join(process.cwd(), 'package.json'))) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
        if (pkg.eslintConfig) return true;
      } catch (e) {}
    }
    return configFiles.some((file) => fs.existsSync(path.join(process.cwd(), file)));
  }

  private gatherProjectContext(options: TestGeneratorOptions): string {
    const contextParts: string[] = [];

    // 1. Load existing test examples
    const exampleTests = this.loadExampleTests(
      options.contextOptions?.maxExampleTests,
      options.contextOptions?.maxExampleLength,
    );
    if (exampleTests.length > 0) {
      contextParts.push('Example Test Files from this Project:');
      exampleTests.forEach((example, idx) => {
        contextParts.push(
          `\nExample ${idx + 1} (${example.fileName}):\n\`\`\`typescript\n${example.content}\n\`\`\``,
        );
      });
    }

    // 2. Load prettier config for formatting rules
    if (options.contextOptions?.includeFormatting !== false) {
      const prettierConfig = this.loadPrettierConfig();
      if (prettierConfig) {
        contextParts.push(`\nProject Prettier Configuration:\n${prettierConfig}`);
      }
    }

    // 3. Add project-specific conventions
    const customConventions =
      options.contextOptions?.customConventions?.map((c) => `- ${c}`).join('\n') || '';
    contextParts.push(`
Project Conventions:
- Import order: 1) React, 2) Next.js, 3) @/ aliases, 4) relative imports
- Use '@/' path alias for repository-wide imports
- Single quotes for strings and JSX attributes (jsxSingleQuote: true)
- 2-space indentation
- Arrow functions without parens for single params
- Semicolons required
- Trailing commas in ES5 style
${customConventions}
    `);

    return contextParts.join('\n');
  }

  private loadExampleTests(
    maxFiles: number = 2,
    maxLength: number = 2000,
  ): Array<{ fileName: string; content: string }> {
    const examples: Array<{ fileName: string; content: string }> = [];
    const testDir = path.join(process.cwd(), 'tests', 'unit');

    if (!fs.existsSync(testDir)) {
      return examples;
    }

    try {
      const files = fs.readdirSync(testDir);
      // Load up to maxFiles example test files to avoid overwhelming the context
      const testFiles = files
        .filter((f) => f.endsWith('.test.tsx') || f.endsWith('.test.ts'))
        .slice(0, maxFiles);

      for (const file of testFiles) {
        const filePath = path.join(testDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        // Limit content length to avoid token overflow
        examples.push({
          fileName: file,
          content:
            content.length > maxLength
              ? content.substring(0, maxLength) + '\n// ... truncated'
              : content,
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
    // 1. Try to extract code between ``` blocks (more flexible whitespace)
    const match = code.match(/```(?:[\w]*)\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      return match[1].trim();
    }

    // 2. Fallback: Look for import
    const firstImportIndex = code.indexOf('import');
    if (firstImportIndex !== -1) {
      let codeStart = code.substring(firstImportIndex);

      // Check if there is a closing fence after the import
      const closingFenceIndex = codeStart.indexOf('\n```');
      if (closingFenceIndex !== -1) {
        return codeStart.substring(0, closingFenceIndex).trim();
      }

      // If no closing fence, try to find the last likely code ending
      const lastCodeCharIndex = Math.max(
        codeStart.lastIndexOf('}'),
        codeStart.lastIndexOf(');'),
        codeStart.lastIndexOf(';'),
      );

      if (lastCodeCharIndex !== -1) {
        // Include the closing character(s)
        // If it was ');', lastIndexOf points to starts of it.
        // simplistic approach: just take length of string if close enough, or heuristic
        // safest: take string until last '}' + 1, or last ';' + 1
        // Let's rely on the fact that usually tests end with });
        const end = Math.max(
          codeStart.lastIndexOf('}') + 1,
          codeStart.lastIndexOf(';') + 1,
          codeStart.lastIndexOf(')') + 1,
        );
        return codeStart.substring(0, end).trim();
      }

      return codeStart.trim();
    }

    // 3. Last fallback: just remove fence markers
    return code
      .replace(/^```[\w]*\s*/gm, '')
      .replace(/\s*```$/gm, '')
      .trim();
  }
}
