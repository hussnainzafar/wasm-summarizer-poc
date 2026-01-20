import { pipeline, env } from '@huggingface/transformers';
import type { CommandRequest, CommandResponse, PerformanceMetrics } from '../types/command';
import { PerformanceMonitor } from '../utils/performance';
import { SimpleTokenizer } from '../utils/tokenizer';

// Configure transformers.js for command generation
env.allowLocalModels = true;
env.allowRemoteModels = true;
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

export class CommandService {
  private static instance: CommandService;
  private generator: any = null;
  private currentModel: string = '';
  private status = {
    loaded: false,
    loading: false,
    error: null as string | null,
    progress: 0,
  };

  private constructor() {}

  static getInstance(): CommandService {
    if (!CommandService.instance) {
      CommandService.instance = new CommandService();
    }
    return CommandService.instance;
  }

  getStatus() {
    return this.status;
  }

  async loadModel(): Promise<void> {
    if (this.generator && this.currentModel === 'Xenova/t5-small') {
      return;
    }

    this.status = { loaded: false, loading: true, error: null, progress: 0 };
    
    try {
      PerformanceMonitor.startMeasurement();
      
      // Try T5-Small for command generation
      let generator = null;
      let loadedModelName = '';
      const modelsToTry = [
        'Xenova/t5-small',  // T5-Small model
      ];
      
      for (const model of modelsToTry) {
        try {
          console.log(`Trying to load command model: ${model}`);
          // Use text2text-generation for T5-Small
          generator = await pipeline('text2text-generation', model, {
            progress_callback: (progress: any) => {
              this.status.progress = Math.round(progress.progress * 100);
            },
            local_files_only: false,
          });
          console.log(`Successfully loaded command model: ${model}`);
          loadedModelName = model;
          break;
        } catch (modelError) {
          console.warn(`Failed to load model ${model}:`, modelError);
          if (model === modelsToTry[modelsToTry.length - 1]) {
            throw modelError;
          }
        }
      }
      
      if (!generator) {
        throw new Error('Failed to load any command generation model');
      }
      
      this.generator = generator;
      this.currentModel = loadedModelName;
      
      const loadMetrics = PerformanceMonitor.endMeasurement();
      loadMetrics.loadTime = loadMetrics.inferenceTime;
      
      this.status = { loaded: true, loading: false, error: null, progress: 100 };
      console.log('Command model loaded successfully', { model: loadedModelName, metrics: loadMetrics });
    } catch (error) {
      this.status = { loaded: false, loading: false, error: String(error), progress: 0 };
      console.error('Failed to load command model:', error);
      throw error;
    }
  }

  private formatCommandRequest(request: CommandRequest): string {
    const { system, goal } = request;
    
    // T5-Small expects simple text prompt for text2text-generation
    const prompt = `Task: ${goal}

System: ${system.os} ${system.arch}
Shell: ${system.shell}
Available tools: ${system.installedTools.join(', ')}

Generate 1-3 executable shell commands for this task. Output ONLY the commands, one per line.

Commands:`;
    
    return prompt;
  }

  private applyOutputGuardrails(output: string): string[] {
    // Split into lines and clean up
    let lines = output.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Remove explanations (lines with "because", "to", etc.)
    lines = lines.filter(line => 
      !line.toLowerCase().includes('because') &&
      !line.toLowerCase().includes('to ') &&
      !line.toLowerCase().includes('this will') &&
      !line.toLowerCase().includes('you can') &&
      !line.includes('#') && // Remove markdown
      !line.startsWith('```') // Remove code blocks
    );

    // Keep only first 3 lines
    lines = lines.slice(0, 3);

    // If no valid commands found, return fallback
    if (lines.length === 0) {
      return ['# Check available tools and system documentation'];
    }

    return lines;
  }

  async generateCommands(request: CommandRequest): Promise<CommandResponse> {
    if (!this.generator) {
      throw new Error('No model loaded. Please load a model first.');
    }

    const formattedInput = this.formatCommandRequest(request);
    const inputTokens = SimpleTokenizer.estimateTokens(JSON.stringify(formattedInput));

    PerformanceMonitor.startMeasurement();

    try {
      // T5-Small: text2text-generation with simple parameters
      const result = await this.generator(formattedInput, {
        max_new_tokens: 60,
        temperature: 0.3,    // Low temperature for consistency
        do_sample: true,     // Enable sampling
        top_p: 0.9,
        repetition_penalty: 1.1,
      });

      const baseMetrics = PerformanceMonitor.endMeasurement();
      
      // T5-Small returns generated text directly
      const rawOutput = result[0].generated_text.trim();

      // Apply output guardrails
      const commands = this.applyOutputGuardrails(rawOutput);
      const outputTokens = SimpleTokenizer.estimateTokens(commands.join('\n'));

      const metrics: PerformanceMetrics = {
        ...baseMetrics,
        tokensPerSecond: PerformanceMonitor.calculateTokensPerSecond(
          outputTokens,
          baseMetrics.inferenceTime
        ),
      };

      return {
        commands,
        metrics,
        inputTokens,
        outputTokens,
      };
    } catch (error: unknown) {
      console.error('Command generation failed:', error);
      throw error;
    }
  }

  async unloadModel(): Promise<void> {
    if (this.generator) {
      this.generator = null;
      this.currentModel = '';
      this.status = { loaded: false, loading: false, error: null, progress: 0 };
    }
  }
}
