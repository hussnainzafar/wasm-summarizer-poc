# WebAssembly Terminal Command Generator

A React app that generates terminal commands using WebAssembly language models directly in your browser. Built by Hussnain Zafar.

## What It Does

- Runs AI models locally in your browser (no server needed)
- Keeps your commands private - nothing leaves your device
- Shows performance stats (speed, memory usage)
- Uses FLAN-T5-small model for deterministic command generation

## Tech Stack

- React 19 + TypeScript
- Hugging Face Transformers.js (WebAssembly)
- Vite for development
- Qwen2.5-Coder-0.5B model for command generation (3GB)

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 and click "Load Model" to start.

## How It Works

1. Downloads a 100MB AI model to your browser
2. Enter your system context (OS, shell, tools, etc.)
3. Describe what you want to accomplish
4. Click "Generate Commands" - get 1-3 terminal commands
5. See performance metrics below

**Features:**
- ✅ **Deterministic output** - FLAN-T5-small gives consistent commands
- ✅ **Instruction-tuned** - trained to follow structured tasks
- ✅ **Context-aware** - considers your OS, shell, and installed tools
- ✅ **Privacy-first** - all processing happens in your browser
- ✅ **No data sent to external servers**  
- ✅ **Works offline after first download**  

## Example

**Input:**
- System: Ubuntu 22.04, bash, node 18 installed
- Goal: Install Claude CLI

**Output:**
```bash
npm install -g @anthropic-ai/claude-cli
claude auth login
```  

---

Built with ❤️ by Hussnain Zafar
