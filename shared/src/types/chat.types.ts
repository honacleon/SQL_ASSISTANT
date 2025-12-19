/**
 * Chat-related type definitions
 */

import type { QueryResult } from './database.types';
import type { NLQueryResult } from './ai.types';

/**
 * Mensagem individual de chat
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    queryExecuted?: boolean;
    sqlGenerated?: string;
    tableUsed?: string;
    confidence?: number;
    executionTime?: number;
    count?: number;
    /** Dados estruturados da resposta para visualização em gráficos */
    data?: Record<string, unknown>[];
    /** Sugestões de follow-up geradas por IA */
    followUpSuggestions?: string[];
    /** Narrativa conversacional gerada por IA */
    narrative?: string;
    /** Insights acionáveis gerados por IA */
    insights?: Array<{
      title: string;
      description: string;
      type: 'positive' | 'warning' | 'neutral';
      icon: string;
    }>;
  };
}

/**
 * Sessão de chat completa
 */
export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastMessageAt: Date;
  metadata: {
    queriesExecuted: number;
    tablesAccessed: string[];
  };
}

/**
 * Request para enviar mensagem de chat
 */
export interface ChatMessageRequest {
  message: string;
  sessionId?: string;
  context?: {
    currentTable?: string;
  };
}

/**
 * Response de mensagem de chat
 */
export interface ChatMessageResponse {
  success: boolean;
  sessionId: string;
  message: ChatMessage;
  queryResult?: QueryResult;
  nlParse: NLQueryResult;
  executionTime: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
}

/**
 * Estatísticas do serviço de sessões
 */
export interface ChatSessionStats {
  activeSessions: number;
  totalMessages: number;
  oldestSessionAge: number | null;
}
