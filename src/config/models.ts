import type { ModelConfig } from '../types';

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  'phi-3-mini': {
    name: 'Phi-3 Mini',
    size: '2.3GB',
    contextWindow: 4096,
    maxTokens: 128,
    modelUrl: '/models/phi-3-mini-4k-instruct-q4f16_1.gguf',
  },
  'phi-2': {
    name: 'Phi-2',
    size: '1.8GB',
    contextWindow: 2048,
    maxTokens: 128,
    modelUrl: '/models/phi-2-q4f16_1.gguf',
  },
  'qwen1.5-0.5b': {
    name: 'Qwen1.5-0.5B',
    size: '0.4GB',
    contextWindow: 2048,
    maxTokens: 128,
    modelUrl: '/models/qwen1.5-0.5b-chat-q4f16_1.gguf',
  },
};

export const DEFAULT_MODEL = 'phi-3-mini';

export const TOKEN_LIMITS = {
  INPUT_MIN: 100,
  INPUT_MAX: 1000,
  OUTPUT_MIN: 50,
  OUTPUT_MAX: 100,
} as const;

export const INFERENCE_CONFIG = {
  temperature: 0.3,
  topP: 0.9,
  repeatPenalty: 1.1,
} as const;
