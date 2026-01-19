export interface SystemContext {
  os: string;
  kernel?: string;
  arch: string;
  shell: string;
  currentDirectory: string;
  installedTools: string[];
}

export interface CommandRequest {
  task: string;
  system: SystemContext;
  goal: string;
  outputFormat: string;
}

export interface CommandResponse {
  commands: string[];
  metrics: PerformanceMetrics;
  inputTokens: number;
  outputTokens: number;
}

export interface PerformanceMetrics {
  loadTime: number;
  inferenceTime: number;
  memoryUsage: number;
  tokensPerSecond: number;
}
