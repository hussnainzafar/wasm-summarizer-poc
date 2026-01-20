import type { ModelConfig } from '../types';

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  'distilgpt2': {
    name: 'DistilGPT-2',
    size: '124MB',
    contextWindow: 1024,
    maxTokens: 100,
    modelUrl: 'Xenova/distilgpt2',
  },
};

export const DEFAULT_MODEL = 'distilgpt2';

export const TOKEN_LIMITS = {
  INPUT_MIN: 0,
  INPUT_MAX: 1000,
  OUTPUT_MIN: 25,
  OUTPUT_MAX: 80,
} as const;

export const INFERENCE_CONFIG = {
  temperature: 0.3,
  topP: 0.9,
  repeatPenalty: 1.1,
} as const;
