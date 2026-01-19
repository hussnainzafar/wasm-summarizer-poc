import { useState, useEffect, useCallback } from 'react';
import { CommandService } from '../services/commandService';
import type { CommandRequest, CommandResponse } from '../types/command';

export function useCommand() {
  const [commandService] = useState(() => CommandService.getInstance());
  const [modelStatus, setModelStatus] = useState(commandService.getStatus());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setModelStatus(commandService.getStatus());
    }, 100);

    return () => clearInterval(interval);
  }, [commandService]);

  const loadModel = useCallback(async () => {
    try {
      setError(null);
      await commandService.loadModel();
    } catch (err) {
      setError(String(err));
      throw err;
    }
  }, [commandService]);

  const generateCommands = useCallback(async (request: CommandRequest): Promise<CommandResponse> => {
    if (!modelStatus.loaded) {
      throw new Error('Model not loaded');
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Add minimum delay to show loading state immediately
      await new Promise(resolve => setTimeout(resolve, 300));
      const result = await commandService.generateCommands(request);
      return result;
    } catch (err) {
      setError(String(err));
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [commandService, modelStatus.loaded]);

  const unloadModel = useCallback(async () => {
    try {
      await commandService.unloadModel();
    } catch (err) {
      setError(String(err));
      throw err;
    }
  }, [commandService]);

  return {
    modelStatus,
    isProcessing,
    error,
    loadModel,
    generateCommands,
    unloadModel,
  };
}
