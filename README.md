# WebAssembly LLM Summarizer

A browser-only React.js application that performs text summarization using WebAssembly-based language models. This project demonstrates client-side AI inference with complete data privacy.

## Features

- **In-browser LLM inference** using WebAssembly
- **Data privacy** - No data leaves the browser
- **Token limiting** - 500-1000 input tokens, 50-100 output tokens
- **Performance metrics** - Latency, memory usage, tokens/second
- **Multiple model support** - Configurable model selection
- **Professional architecture** - Scalable and maintainable codebase

## Architecture

```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── services/           # Business logic and external services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── config/             # Configuration constants
└── assets/             # Static assets
```

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 4.5.3 (Node.js 18 compatible)
- **LLM Inference**: @huggingface/transformers (WebAssembly)
- **Model**: DistilBART-CNN-6-6 (lightweight summarization model)

## System Requirements

- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 3GB for models
- **Browser**: Chrome 89+, Firefox 115+, Safari 16.4+, Edge 89+

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open http://localhost:5173 in your browser

## Usage

1. Click "Load Model" to initialize the LLM
2. Enter text (500-1000 tokens recommended)
3. Click "Summarize" to generate summary
4. View performance metrics below the result

## Configuration

Models and inference parameters are configured in `src/config/models.ts`:

```typescript
export const TOKEN_LIMITS = {
  INPUT_MIN: 100,
  INPUT_MAX: 1000,
  OUTPUT_MIN: 50,
  OUTPUT_MAX: 100,
} as const;
```

## Model Support

Currently supports lightweight models optimized for browser:
- DistilBART-CNN-6-6 (default)
- Extensible for additional models

## Performance Metrics

The app tracks:
- **Inference Time**: Time to generate summary
- **Memory Usage**: JavaScript heap memory delta
- **Tokens/Second**: Processing speed metric

## Development

### Project Structure

- `src/components/SummarizerForm.tsx` - Main UI component
- `src/hooks/useLLM.ts` - LLM state management hook
- `src/services/llmService.ts` - Core LLM inference service
- `src/utils/performance.ts` - Performance monitoring utilities
- `src/utils/tokenizer.ts` - Token estimation and validation

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Data Privacy

This application processes all data locally in the browser:
- ✅ No network requests for inference
- ✅ No data sent to external servers
- ✅ Complete client-side processing
- ✅ Suitable for sensitive data scenarios

## Future Enhancements

- Additional model support (Phi-3 Mini, Qwen)
- Advanced prompting strategies
- Model comparison features
- Export/import functionality
- Enhanced UI/UX

## License

MIT License - feel free to use and modify for your projects.

---

**Note**: This is a proof-of-concept demonstrating WebAssembly LLM capabilities in the browser. Performance varies based on device specifications.
