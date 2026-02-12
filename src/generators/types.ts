import { ComponentInfo } from '../analyzer/types.js';

export interface TestGeneratorOptions {
  dryRun: boolean;
}

export interface TestGenerator {
  generate(component: ComponentInfo, options: TestGeneratorOptions): Promise<void>;
}
