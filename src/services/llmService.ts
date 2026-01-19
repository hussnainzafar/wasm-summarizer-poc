import { pipeline, env } from '@huggingface/transformers';
import type { ModelConfig, PerformanceMetrics, SummarizeRequest, SummarizeResponse, ModelStatus } from '../types';
import { PerformanceMonitor } from '../utils/performance';
import { SimpleTokenizer } from '../utils/tokenizer';
import { INFERENCE_CONFIG, TOKEN_LIMITS } from '../config/models';

// Configure transformers.js
env.allowLocalModels = true;
env.allowRemoteModels = true;
// Set thread count for better performance
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

export class LLMService {
  private static instance: LLMService;
  private summarizer: any = null;
  private currentModel: string = '';
  private status: ModelStatus = {
    loaded: false,
    loading: false,
    error: null,
    progress: 0,
  };

  private constructor() {}

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  getStatus(): ModelStatus {
    return this.status;
  }

  async loadModel(modelKey: string, _config: ModelConfig): Promise<void> {
    if (this.summarizer && this.currentModel === modelKey) {
      return;
    }

    this.status = { loaded: false, loading: true, error: null, progress: 0 };
    
    try {
      PerformanceMonitor.startMeasurement();
      
      // Load the summarization pipeline using a model that works well with WebAssembly
      // Try models that are known to have proper ONNX support
      let summarizer = null;
      const modelsToTry = [
        'Xenova/distilgpt2',  // Small GPT-2 model (124MB) - fastest and lightweight
        'Xenova/gpt2',  // Standard GPT-2 model (548MB) 
        'Xenova/gpt2-medium',  // Medium GPT-2 model (1.4GB) - better quality
      ];
      
      for (const model of modelsToTry) {
        try {
          console.log(`Trying to load model: ${model}`);
          // Use text-generation pipeline for these models
          summarizer = await pipeline('text-generation', model, {
            progress_callback: (progress: any) => {
              this.status.progress = Math.round(progress.progress * 100);
            },
            local_files_only: false,
          });
          console.log(`Successfully loaded model: ${model}`);
          break;
        } catch (modelError) {
          console.warn(`Failed to load model ${model}:`, modelError);
          if (model === modelsToTry[modelsToTry.length - 1]) {
            throw modelError; // Re-throw the last error
          }
        }
      }
      
      if (!summarizer) {
        throw new Error('Failed to load any summarization model');
      }
      
      this.summarizer = summarizer;

      const loadMetrics = PerformanceMonitor.endMeasurement();
      loadMetrics.loadTime = loadMetrics.inferenceTime;

      this.currentModel = modelKey;
      this.status = { loaded: true, loading: false, error: null, progress: 100 };
      
      console.log('Model loaded successfully', { model: modelKey, metrics: loadMetrics });
    } catch (error) {
      this.status = { loaded: false, loading: false, error: String(error), progress: 0 };
      console.error('Failed to load model:', error);
      throw error;
    }
  }

  async summarize(request: SummarizeRequest): Promise<SummarizeResponse> {
    if (!this.summarizer) {
      throw new Error('No model loaded. Please load a model first.');
    }

    // Validate and truncate input
    const inputTokens = SimpleTokenizer.estimateTokens(request.text);
    if (inputTokens > TOKEN_LIMITS.INPUT_MAX) {
      request.text = SimpleTokenizer.truncateText(request.text, TOKEN_LIMITS.INPUT_MAX);
    }

    PerformanceMonitor.startMeasurement();

    try {
      // For text-generation models, we need to craft a prompt for summarization
      const prompt = `Text: ${request.text}\n\nSummary:`;
      
      const result = await this.summarizer(prompt, {
        max_new_tokens: request.maxLength || TOKEN_LIMITS.OUTPUT_MAX,
        temperature: 0.1, // Lower temperature for more coherent output
        do_sample: false, // Use greedy decoding for better consistency
        pad_token_id: 50256, // EOS token for most models
        repetition_penalty: 1.2, // Prevent repetition
      });

      const baseMetrics = PerformanceMonitor.endMeasurement();
      const generatedText = result[0].generated_text;
      const summary = generatedText.replace(prompt, '').trim(); // Remove the prompt from the output
      const outputTokens = SimpleTokenizer.estimateTokens(summary);
      
      const metrics: PerformanceMetrics = {
        ...baseMetrics,
        tokensPerSecond: PerformanceMonitor.calculateTokensPerSecond(
          outputTokens,
          baseMetrics.inferenceTime
        ),
      };

      return {
        summary,
        metrics,
        inputTokens: SimpleTokenizer.estimateTokens(request.text),
        outputTokens,
      };
    } catch (error) {
      console.error('Summarization failed:', error);
      throw error;
    }
  }

  async unloadModel(): Promise<void> {
    if (this.summarizer) {
      // Clean up the pipeline
      this.summarizer = null;
      this.currentModel = '';
      this.status = { loaded: false, loading: false, error: null, progress: 0 };
    }
  }
}
