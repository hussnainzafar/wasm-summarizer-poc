import type { ModelConfig } from '../types';

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  't5-small': {
    name: 'T5-Small',
    size: '242MB',
    contextWindow: 512,
    maxTokens: 100,
    modelUrl: 'Xenova/t5-small',
  },
};

export const DEFAULT_MODEL = 't5-small';

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
