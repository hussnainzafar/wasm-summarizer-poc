import { useState, useEffect, useCallback } from 'react';
import { LLMService } from '../services/llmService';
import type { ModelStatus, SummarizeRequest, SummarizeResponse } from '../types';
import { AVAILABLE_MODELS, DEFAULT_MODEL } from '../config/models';

export function useLLM() {
  const [llmService] = useState(() => LLMService.getInstance());
  const [modelStatus, setModelStatus] = useState<ModelStatus>(llmService.getStatus());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setModelStatus(llmService.getStatus());
    }, 100);

    return () => clearInterval(interval);
  }, [llmService]);

  const loadModel = useCallback(async (modelKey: string = DEFAULT_MODEL) => {
    try {
      setError(null);
      const config = AVAILABLE_MODELS[modelKey];
      if (!config) {
        throw new Error(`Model ${modelKey} not found`);
      }
      await llmService.loadModel(modelKey, config);
    } catch (err) {
      setError(String(err));
      throw err;
    }
  }, [llmService]);

  const summarize = useCallback(async (request: SummarizeRequest): Promise<SummarizeResponse> => {
    if (!modelStatus.loaded) {
      throw new Error('Model not loaded');
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await llmService.summarize(request);
      return result;
    } catch (err) {
      setError(String(err));
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [llmService, modelStatus.loaded]);

  const unloadModel = useCallback(async () => {
    try {
      await llmService.unloadModel();
    } catch (err) {
      setError(String(err));
      throw err;
    }
  }, [llmService]);

  return {
    modelStatus,
    isProcessing,
    error,
    loadModel,
    summarize,
    unloadModel,
    availableModels: Object.keys(AVAILABLE_MODELS),
  };
}
