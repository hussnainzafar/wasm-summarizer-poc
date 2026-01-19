export class SimpleTokenizer {
  private static readonly APPROX_CHARS_PER_TOKEN = 4;

  static estimateTokens(text: string): number {
    return Math.ceil(text.length / this.APPROX_CHARS_PER_TOKEN);
  }

  static truncateText(text: string, maxTokens: number): string {
    const maxChars = maxTokens * this.APPROX_CHARS_PER_TOKEN;
    return text.length > maxChars ? text.substring(0, maxChars) : text;
  }

  static validateTokenLimits(text: string, minTokens: number, maxTokens: number): boolean {
    const tokens = this.estimateTokens(text);
    return tokens >= minTokens && tokens <= maxTokens;
  }
}
