import type { PerformanceMetrics } from '../types';

export class PerformanceMonitor {
  private static startTime: number = 0;
  private static memoryBefore: number = 0;

  static startMeasurement(): void {
    this.startTime = performance.now();
    this.memoryBefore = this.getMemoryUsage();
  }

  static endMeasurement(): Omit<PerformanceMetrics, 'tokensPerSecond'> {
    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    
    return {
      loadTime: 0, // Will be set separately for model loading
      inferenceTime: endTime - this.startTime,
      memoryUsage: memoryAfter - this.memoryBefore,
    };
  }

  static calculateTokensPerSecond(tokens: number, timeMs: number): number {
    return timeMs > 0 ? (tokens / (timeMs / 1000)) : 0;
  }

  private static getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  static getSystemRequirements(): {
    minRAM: string;
    recommendedRAM: string;
    minStorage: string;
    browserSupport: string[];
  } {
    return {
      minRAM: '4GB',
      recommendedRAM: '8GB',
      minStorage: '3GB',
      browserSupport: ['Chrome 89+', 'Firefox 115+', 'Safari 16.4+', 'Edge 89+'],
    };
  }
}
