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
    if (this.generator && this.currentModel === 'onnx-community/Qwen2.5-Coder-0.5B-Instruct') {
      return;
    }

    this.status = { loaded: false, loading: true, error: null, progress: 0 };
    
    try {
      PerformanceMonitor.startMeasurement();
      
      // Try Qwen2.5-Coder first for code generation
      let generator = null;
      let loadedModelName = '';
      const modelsToTry = [
        'onnx-community/Qwen2.5-Coder-0.5B-Instruct',  // Only this model
      ];
      
      for (const model of modelsToTry) {
        try {
          console.log(`Trying to load command model: ${model}`);
          // Use text-generation for all models
          generator = await pipeline('text-generation', model, {
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

  private formatCommandRequest(request: CommandRequest): any[] {
    const { system, goal } = request;
    
    // Qwen2.5-Coder expects chat format with system and user messages
    const messages = [
      {
        role: "system",
        content: "You are a terminal command assistant. Generate 1-3 executable shell commands for the given task. Output ONLY commands, one per line, with no explanations or markdown formatting."
      },
      {
        role: "user", 
        content: `Task: ${goal}\n\nSystem: ${system.os} ${system.arch}\nShell: ${system.shell}\nAvailable tools: ${system.installedTools.join(', ')}\n\nGenerate 1-3 executable shell commands for this task. Output ONLY the commands, one per line.\n\nYour response:`
      }
    ];
    
    return messages;
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
      let result;
      
      if (this.currentModel.includes('Qwen')) {
        // Qwen2.5-Coder: text-generation with code-optimized parameters
        result = await this.generator(formattedInput, {
          max_new_tokens: 60,
          temperature: 0.1,   // Low temperature for code
          do_sample: false,    // Deterministic for commands
          top_p: 0.9,
          repetition_penalty: 1.1,
        });
      }

      const baseMetrics = PerformanceMonitor.endMeasurement();
      let rawOutput;

      if (this.currentModel.includes('t5')) {
        // T5 returns generated text directly
        rawOutput = result[0].generated_text;
      } else {
        // Qwen models need chat template output extraction
        const generatedText = result[0].generated_text;
        const lastMessage = generatedText.at(-1);
        rawOutput = lastMessage ? lastMessage.content : generatedText.replace(JSON.stringify(formattedInput), '').trim();
      }

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
