import { useState } from 'react';
import { useLLM } from '../hooks/useLLM';
import { SimpleTokenizer } from '../utils/tokenizer';
import { TOKEN_LIMITS } from '../config/models';

export function SummarizerForm() {
  const { modelStatus, isProcessing, error, loadModel, summarize } = useLLM();
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [metrics, setMetrics] = useState<any>(null);

  const handleSummarize = async () => {
    if (!inputText.trim()) {
      alert('Please enter some text to summarize');
      return;
    }

    const tokens = SimpleTokenizer.estimateTokens(inputText);
    if (tokens > TOKEN_LIMITS.INPUT_MAX) {
      alert(`Input text is too long. Please limit to ${TOKEN_LIMITS.INPUT_MAX} tokens (approximately ${TOKEN_LIMITS.INPUT_MAX * 4} characters).`);
      return;
    }

    try {
      if (!modelStatus.loaded) {
        await loadModel();
      }

      const result = await summarize({
        text: inputText,
        maxLength: TOKEN_LIMITS.OUTPUT_MAX,
        minLength: TOKEN_LIMITS.OUTPUT_MIN,
      });

      setSummary(result.summary);
      setMetrics(result.metrics);
    } catch (err) {
      console.error('Summarization failed:', err);
    }
  };

  const handleLoadModel = async () => {
    try {
      await loadModel();
    } catch (err) {
      console.error('Model loading failed:', err);
    }
  };

  const currentTokens = SimpleTokenizer.estimateTokens(inputText);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>WebAssembly LLM Summarizer</h1>
      
      {/* Model Status */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>Model Status</h3>
        <p><strong>Status:</strong> {modelStatus.loading ? 'Loading...' : modelStatus.loaded ? 'Loaded' : 'Not Loaded'}</p>
        {modelStatus.loading && <p><strong>Progress:</strong> {modelStatus.progress}%</p>}
        {modelStatus.error && <p style={{ color: 'red' }}><strong>Error:</strong> {String(modelStatus.error)}</p>}
        {!modelStatus.loaded && !modelStatus.loading && (
          <button onClick={handleLoadModel} disabled={modelStatus.loading}>
            Load Model
          </button>
        )}
      </div>

      {/* Input Form */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Input Text</h3>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text to summarize (500-1000 tokens recommended)..."
          style={{
            width: '100%',
            height: '150px',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '14px',
            resize: 'vertical',
          }}
          disabled={isProcessing}
        />
        <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
          Tokens: {currentTokens} (Min: {TOKEN_LIMITS.INPUT_MIN}, Max: {TOKEN_LIMITS.INPUT_MAX})
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleSummarize}
        disabled={!inputText.trim() || isProcessing || (!modelStatus.loaded && !modelStatus.loading)}
        style={{
          padding: '10px 20px',
          backgroundColor: isProcessing ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          fontSize: '16px',
        }}
      >
        {isProcessing ? 'Processing...' : 'Summarize'}
      </button>

      {/* Error Display */}
      {error && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '5px' }}>
          <strong>Error:</strong> {String(error)}
        </div>
      )}

      {/* Summary Output */}
      {summary && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '5px' }}>
          <h3>Summary</h3>
          <p style={{ lineHeight: '1.6' }}>{summary}</p>
        </div>
      )}

      {/* Metrics Display */}
      {metrics && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e9ecef', border: '1px solid #ced4da', borderRadius: '5px' }}>
          <h3>Performance Metrics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <div><strong>Inference Time:</strong> {metrics.inferenceTime.toFixed(2)}ms</div>
            <div><strong>Memory Usage:</strong> {(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB</div>
            <div><strong>Tokens/Second:</strong> {metrics.tokensPerSecond.toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
