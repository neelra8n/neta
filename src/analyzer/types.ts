export type ComponentType = 'server' | 'client';
export type FileType =
  | 'page'
  | 'layout'
  | 'component'
  | 'hook'
  | 'utility'
  | 'server-action'
  | 'route-handler';

export interface ComponentInfo {
  filePath: string;
  name: string;
  type: ComponentType;
  fileType: FileType;
  dependencies: string[]; // Import paths
  exports: string[];
}

export interface AnalysisResult {
  nextJsRoot: string;
  isAppRouter: boolean;
  components: ComponentInfo[];
  routes: string[];
}
