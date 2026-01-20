import { useState, useEffect } from 'react';
import { useCommand } from '../hooks/useCommand';
import type { CommandRequest, SystemContext } from '../types/command';
import './SummarizerForm.css'; // Reuse existing styles
import './CommandForm.css';

export function CommandForm() {
  const { modelStatus, isProcessing, error, loadModel, generateCommands } = useCommand();
  const [commands, setCommands] = useState<string[]>([]);

  // Auto-detect system context
  const [systemContext, setSystemContext] = useState<SystemContext>({
    os: 'Unknown',
    arch: 'Unknown',
    shell: 'Unknown',
    currentDirectory: 'Unknown',
    installedTools: [],
  });
  const [goal, setGoal] = useState('');

  // Auto-detect system info on mount
  useEffect(() => {
    const detectSystemContext = () => {
      const context: SystemContext = {
        os: navigator.platform.includes('Linux') ? 'Linux' : 
            navigator.platform.includes('Mac') ? 'macOS' : 
            navigator.platform.includes('Win') ? 'Windows' : 'Unknown',
        arch: 'Unknown', // Would need backend detection
        shell: 'Unknown', // Would need backend detection
        currentDirectory: window.location.pathname, // Use current path
        installedTools: [], // Would need backend detection
      };
      setSystemContext(context);
    };

    detectSystemContext();
  }, []);

  // Auto-load model on component mount
  useEffect(() => {
    const autoLoadModel = async () => {
      try {
        await loadModel();
      } catch (err) {
        console.error('Auto-load failed:', err);
      }
    };
    
    if (!modelStatus.loaded && !modelStatus.loading) {
      autoLoadModel();
    }
  }, [loadModel, modelStatus.loaded, modelStatus.loading]);

  const handleGenerate = async () => {
    if (!goal.trim()) {
      alert('Please enter a goal');
      return;
    }

    try {
      const request: CommandRequest = {
        task: 'Task: Terminal command suggestion',
        system: systemContext,
        goal,
        outputFormat: 'Provide 1–3 terminal commands only.',
      };

      const result = await generateCommands(request);
      setCommands(result.commands);
    } catch (err) {
      console.error('Command generation failed:', err);
    }
  };

  const getStatusDot = () => {
    if (modelStatus.loading) {
      return (
        <div className="status-dot loading">
          <div className="dot"></div>
        </div>
      );
    }
    if (modelStatus.loaded) {
      return (
        <div className="status-dot success">
          <div className="dot"></div>
        </div>
      );
    }
    return (
      <div className="status-dot error">
        <div className="dot"></div>
      </div>
    );
  };

  return (
    <div className="summarizer-container">
      <div className="header">
        <h1>Terminal Command Generator</h1>
        <div className="status-indicator">
          {getStatusDot()}
          <span className="status-text">
            {modelStatus.loading ? 'Loading Model...' : modelStatus.loaded ? 'Model Ready' : 'Model Offline'}
          </span>
        </div>
      </div>

      {modelStatus.loading && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${modelStatus.progress}%` }}></div>
          <span className="progress-text">{modelStatus.progress}%</span>
        </div>
      )}

      <div className="main-content">
        
        <div className="input-section">
          <h3>What do you want to accomplish?</h3>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g., Install Claude CLI, restart nginx service, create new React app..."
            className="text-input"
            disabled={isProcessing || modelStatus.loading}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={!goal.trim() || isProcessing || !modelStatus.loaded || modelStatus.loading}
          className="summarize-btn"
        >
          {isProcessing ? (
            <>
              <div className="spinner"></div>
              Generating...
            </>
          ) : (
            'Generate Commands'
          )}
        </button>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {String(error)}
          </div>
        )}

        {commands.length > 0 && (
          <div className="result-section">
            <h3>Suggested Commands</h3>
            <div className="commands-list">
              {commands.map((command, index) => (
                <div key={index} className="command-item">
                  <code>{command}</code>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
