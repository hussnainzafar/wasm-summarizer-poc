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
      let loadedModelName = ''; // Track the actual model that loaded
      const modelsToTry = [
        'Xenova/t5-small',  // Seq2Seq model - trained for summarization
        'Xenova/distilgpt2',  // Small GPT-2 model (124MB) - fallback only
        'Xenova/gpt2',  // Standard GPT-2 model (548MB) - last resort
      ];
      
      for (const model of modelsToTry) {
        try {
          console.log(`Trying to load model: ${model}`);
          // Use appropriate pipeline for each model type
          const pipelineType = model.includes('t5') ? 'summarization' : 'text-generation';
          summarizer = await pipeline(pipelineType, model, {
            progress_callback: (progress: any) => {
              this.status.progress = Math.round(progress.progress * 100);
            },
            local_files_only: false,
          });
          console.log(`Successfully loaded model: ${model}`);
          loadedModelName = model; // Store the successful model name
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

      // Track the actual model that loaded, not the config key
      this.currentModel = loadedModelName;
      this.status = { loaded: true, loading: false, error: null, progress: 100 };
      
      console.log('Model loaded successfully', { model: loadedModelName, metrics: loadMetrics });
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

    // Preprocess input: reduce repetition and add task prefix for T5
    let processedText = request.text;
    if (this.currentModel.includes('t5')) {
      // Add task prefix for better T5 performance
      processedText = `Summarize the following text: ${request.text}`;
      
      // Remove excessive repetition (simple deduplication)
      const sentences = processedText.split('. ').filter(s => s.trim());
      const uniqueSentences = [...new Set(sentences)];
      processedText = uniqueSentences.join('. ');
    }

    PerformanceMonitor.startMeasurement();

    try {
      // Use native summarization for T5, or slot-filling for GPT models
      let result;
      let prompt = ''; // Define prompt outside the conditional blocks
      
      if (this.currentModel.includes('t5')) {
        // T5-small: Better parameters for comprehensive summaries
        const inputTokens = SimpleTokenizer.estimateTokens(request.text);
        const dynamicMaxLength = inputTokens > 200 ? 80 : 45; // Balanced length
        
        result = await this.summarizer(processedText, {
          max_length: Math.min(request.maxLength || TOKEN_LIMITS.OUTPUT_MAX, dynamicMaxLength),
          min_length: Math.max(request.minLength || TOKEN_LIMITS.OUTPUT_MIN, 25),
          do_sample: false,
          num_beams: 4,
          early_stopping: true,
          length_penalty: 1.2,  // Moderate penalty for balanced output
        });
      } else {
        // GPT models: Constrained paraphrasing to prevent hallucination
        prompt = `Summarize this text accurately. Use your own words but do not add any information that wasn't in the original:

Text: ${request.text}

Summary:`;
        
        result = await this.summarizer(prompt, {
          max_new_tokens: request.maxLength || TOKEN_LIMITS.OUTPUT_MAX,
          temperature: 0.3,  // Lower temperature to reduce hallucination
          do_sample: false,  // Use deterministic output
          repetition_penalty: 1.2,
          pad_token_id: 50256,
        });
      }

      const baseMetrics = PerformanceMonitor.endMeasurement();
      let summary;
      
      if (this.currentModel.includes('t5')) {
        // T5 returns summary directly
        summary = result[0].summary_text;
      } else {
        // GPT models need prompt removal
        const generatedText = result[0].generated_text;
        summary = generatedText.replace(prompt, '').trim(); // Remove the prompt from the output
      }
      
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
