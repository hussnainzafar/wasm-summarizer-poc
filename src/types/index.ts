export interface ModelConfig {
  name: string;
  size: string;
  contextWindow: number;
  maxTokens: number;
  modelUrl: string;
}

export interface PerformanceMetrics {
  loadTime: number;
  inferenceTime: number;
  memoryUsage: number;
  tokensPerSecond: number;
}

export interface SummarizeRequest {
  text: string;
  maxLength?: number;
  minLength?: number;
}

export interface SummarizeResponse {
  summary: string;
  metrics: PerformanceMetrics;
  inputTokens: number;
  outputTokens: number;
}

export interface ModelStatus {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  progress: number;
}
