import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import ts from 'typescript';
import { AnalysisResult, ComponentInfo, FileType, ComponentType } from './types.js';

export class ProjectAnalyzer {
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async analyze(): Promise<AnalysisResult> {
    const appDir = path.join(this.rootDir, 'app');
    const isAppRouter = fs.existsSync(appDir);

    if (!isAppRouter) {
      throw new Error('Only Next.js App Router projects are supported.');
    }

    const components = await this.scanComponents();
    const routes = await this.scanRoutes();

    return {
      nextJsRoot: this.rootDir,
      isAppRouter,
      components,
      routes,
    };
  }

  private async scanComponents(): Promise<ComponentInfo[]> {
    // Scan app directory
    const appFiles = await glob('app/**/*.{ts,tsx}', {
      cwd: this.rootDir,
      ignore: '**/node_modules/**',
    });
    const componentFiles = await glob('components/**/*.{ts,tsx}', {
      cwd: this.rootDir,
      ignore: '**/node_modules/**',
    });
    const libFiles = await glob('lib/**/*.{ts,tsx}', {
      cwd: this.rootDir,
      ignore: '**/node_modules/**',
    });

    const allFiles = [...appFiles, ...componentFiles, ...libFiles];
    const results: ComponentInfo[] = [];

    for (const file of allFiles) {
      const fullPath = path.join(this.rootDir, file);
      const content = fs.readFileSync(fullPath, 'utf-8');

      const { dependencies, exports } = this.parseFile(fullPath, content);

      results.push({
        filePath: file,
        name: path.basename(file, path.extname(file)),
        type: this.determineComponentType(content),
        fileType: this.determineFileType(file),
        dependencies,
        exports,
      });
    }

    return results;
  }

  private parseFile(
    filePath: string,
    content: string,
  ): { dependencies: string[]; exports: string[] } {
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    const dependencies: string[] = [];
    const exports: string[] = [];

    const visit = (node: ts.Node) => {
      // Import declaration: import ... from '...'
      if (ts.isImportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          dependencies.push(node.moduleSpecifier.text);
        }
      }
      // Export declaration: export ...
      else if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          dependencies.push(node.moduleSpecifier.text); // Exporting from another module is also a dependency kind of
        }
      }
      // Export assignment: export default ...
      else if (ts.isExportAssignment(node)) {
        exports.push('default');
      }
      // Function/Class/Variable export
      else if (
        (ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isVariableStatement(node)) &&
        node.modifiers?.some((m: ts.ModifierLike) => m.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        if (ts.isVariableStatement(node)) {
          node.declarationList.declarations.forEach((d: ts.VariableDeclaration) => {
            if (ts.isIdentifier(d.name)) exports.push(d.name.text);
          });
        } else if (node.name && ts.isIdentifier(node.name)) {
          exports.push(node.name.text);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return { dependencies, exports };
  }

  private async scanRoutes(): Promise<string[]> {
    const files = await glob('app/**/page.{ts,tsx}', { cwd: this.rootDir });
    return files.map((f: string) => {
      const dir = path.dirname(f);
      return dir.replace('app', '') || '/';
    });
  }

  private determineComponentType(content: string): ComponentType {
    if (content.includes('"use client"') || content.includes("'use client'")) {
      return 'client';
    }
    return 'server';
  }

  private determineFileType(filePath: string): FileType {
    const fileName = path.basename(filePath);

    if (fileName.startsWith('page.')) return 'page';
    if (fileName.startsWith('layout.')) return 'layout';
    if (fileName.startsWith('route.')) return 'route-handler';
    if (filePath.includes('components/')) return 'component';
    if (filePath.includes('hooks/') || fileName.startsWith('use')) return 'hook';
    if (filePath.includes('lib/') || filePath.includes('utils/')) return 'utility';
    if (fileName.includes('actions') || filePath.includes('actions/')) return 'server-action';

    return 'component'; // Default fallback
  }
}
