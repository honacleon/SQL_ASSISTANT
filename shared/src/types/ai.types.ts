/**
 * AI provider and response types
 */

import type { TableInfo, TableSummary } from './database.types';

export type AIProvider = 'openai' | 'anthropic';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AICompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

export interface AIError {
  provider: AIProvider;
  message: string;
  code?: string;
  statusCode?: number;
}

/**
 * Resultado do parsing de linguagem natural
 */
export interface NLQueryResult {
  sql: string;              // SQL gerado (apenas SELECT)
  explanation: string;      // Explicação em português do que a query faz
  confidence: number;       // 0-100 (confiança do modelo)
  suggestedTable: string;   // Tabela principal identificada
  requiresClarification: boolean; // true se confiança < 70%
  clarificationQuestion?: string; // Pergunta para usuário se precisar
  metadata?: {
    columnsUsed: string[];   // Colunas mencionadas/usadas
    filtersApplied: string[]; // Filtros identificados
    aggregationUsed?: string; // SUM, COUNT, AVG, etc
  };
}

/**
 * Request para o serviço de IA
 */
export interface NLQueryRequest {
  query: string;              // Pergunta do usuário em linguagem natural
  context: {
    availableTables: TableSummary[]; // Tabelas disponíveis no schema
    recentQueries?: string[];     // Últimas queries executadas (contexto)
    currentTable?: string;        // Tabela em foco no dashboard
  };
}

/**
 * Configuração de provider de IA
 */
export interface AIProviderConfig {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number; // 0-1 (determinístico = 0)
}
