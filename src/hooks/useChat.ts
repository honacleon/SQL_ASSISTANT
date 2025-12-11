/**
 * useChat - Hook para histórico e envio de mensagens de chat
 */

import { useState, useCallback, useEffect } from 'react';
import { useApi } from './useApi';
import api from '@/services/api';
import type { 
  ChatMessage, 
  ChatMessageRequest, 
  ChatMessageResponse 
} from '@ai-assistant/shared';

interface UseChatOptions {
  autoFetchHistory?: boolean;
}

interface UseChatReturn {
  // Data
  messages: ChatMessage[];
  sessionId: string | null;
  
  // States
  loading: boolean;
  sending: boolean;
  error: Error | null;
  
  // Last response metadata
  lastResponse: ChatMessageResponse | null;
  needsClarification: boolean;
  clarificationQuestion: string | null;
  
  // Actions
  sendMessage: (message: string, context?: { currentTable?: string }) => Promise<ChatMessageResponse | null>;
  fetchHistory: () => Promise<ChatMessage[] | null>;
  clearHistory: () => Promise<void>;
  setSessionId: (id: string | null) => void;
  reset: () => void;
}

/**
 * Hook para gerenciar chat com o assistente de IA
 * 
 * @param initialSessionId - ID da sessão (opcional, será criado automaticamente)
 * @param options - Opções de configuração
 * @returns Mensagens, estados e funções de controle
 * 
 * @example
 * const { messages, sendMessage, loading } = useChat();
 * 
 * const handleSend = async () => {
 *   await sendMessage('Mostre todos os usuários ativos');
 * };
 */
export function useChat(
  initialSessionId: string | null = null,
  options: UseChatOptions = {}
): UseChatReturn {
  const { autoFetchHistory = false } = options;

  // Local state
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastResponse, setLastResponse] = useState<ChatMessageResponse | null>(null);

  // API hooks
  const sendApi = useApi(api.sendChatMessage);
  const historyApi = useApi(api.getChatHistory);
  const deleteApi = useApi(api.deleteChatHistory);

  // Fetch history for current session
  const fetchHistory = useCallback(async (): Promise<ChatMessage[] | null> => {
    if (!sessionId) return null;
    
    const history = await historyApi.execute(sessionId);
    if (history) {
      setMessages(history);
    }
    return history;
  }, [sessionId, historyApi]);

  // Send message
  const sendMessage = useCallback(
    async (
      message: string,
      context?: { currentTable?: string }
    ): Promise<ChatMessageResponse | null> => {
      const request: ChatMessageRequest = {
        message,
        sessionId: sessionId || undefined,
        context,
      };

      const response = await sendApi.execute(request);

      if (response) {
        // Update session ID if new
        if (!sessionId && response.sessionId) {
          setSessionId(response.sessionId);
        }

        // Add user message to local state
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: message,
          timestamp: new Date(),
        };

        // Add assistant response to local state
        setMessages((prev) => [...prev, userMessage, response.message]);
        setLastResponse(response);
      }

      return response;
    },
    [sessionId, sendApi]
  );

  // Clear history for current session
  const clearHistory = useCallback(async (): Promise<void> => {
    if (!sessionId) return;
    
    await deleteApi.execute(sessionId);
    setMessages([]);
    setLastResponse(null);
  }, [sessionId, deleteApi]);

  // Reset all state
  const reset = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setLastResponse(null);
    sendApi.reset();
    historyApi.reset();
  }, [sendApi, historyApi]);

  // Auto-fetch history on mount if sessionId provided
  useEffect(() => {
    if (autoFetchHistory && sessionId) {
      fetchHistory();
    }
  }, [autoFetchHistory, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Data
    messages,
    sessionId,
    
    // States
    loading: historyApi.loading || deleteApi.loading,
    sending: sendApi.loading,
    error: sendApi.error || historyApi.error || deleteApi.error,
    
    // Last response metadata
    lastResponse,
    needsClarification: lastResponse?.needsClarification || false,
    clarificationQuestion: lastResponse?.clarificationQuestion || null,
    
    // Actions
    sendMessage,
    fetchHistory,
    clearHistory,
    setSessionId,
    reset,
  };
}

export default useChat;
