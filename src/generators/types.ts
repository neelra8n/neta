import { ComponentInfo } from '../analyzer/types.js';

export interface TestGeneratorOptions {
  dryRun: boolean;
  contextOptions?: {
    maxExampleTests?: number;
    maxExampleLength?: number;
    includeFormatting?: boolean;
    customConventions?: string[];
  };
  autoFormat?: boolean;
  autoLint?: boolean;
}

export interface TestGenerator {
  generate(component: ComponentInfo, options: TestGeneratorOptions): Promise<void>;
}
