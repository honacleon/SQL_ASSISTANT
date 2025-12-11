/**
 * API Client Configuration
 * Axios instance with interceptors for API communication
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type {
  TableInfo,
  ColumnInfo,
  QueryOptions,
  QueryResult,
  ChatMessage,
  ChatMessageRequest,
  ChatMessageResponse,
  HealthStatus,
} from '@ai-assistant/shared';

/**
 * Interface para erros da API
 */
interface ApiErrorResponse {
  message: string;
  details?: any;
}

/**
 * Classe de erro customizada para erros da API
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Instância Axios configurada
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Interceptor de Request
 * Adiciona API Key se configurada
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const apiKey = import.meta.env.VITE_API_KEY;
    
    if (apiKey && config.headers) {
      config.headers['X-API-Key'] = apiKey;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor de Response
 * Transforma erros Axios em ApiError
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    // Timeout error
    if (error.code === 'ECONNABORTED') {
      throw new ApiError('Requisição expirou', 408);
    }

    // Network error (no response)
    if (!error.response) {
      throw new ApiError('Erro de conexão', 0);
    }

    const { status, data } = error.response;
    let message: string;

    switch (status) {
      case 401:
      case 403:
        message = 'Não autorizado';
        break;
      case 404:
        message = 'Recurso não encontrado';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        message = 'Erro no servidor';
        break;
      default:
        message = data?.message || 'Erro desconhecido';
    }

    throw new ApiError(message, status, data?.details);
  }
);

// HealthStatus is imported from @ai-assistant/shared

/**
 * API methods object
 */
const api = {
  // ==================== Data Endpoints ====================

  /**
   * GET /api/data/tables
   * Lista todas as tabelas disponíveis
   */
  async getTables(): Promise<TableInfo[]> {
    const { data } = await apiClient.get('/api/data/tables');
    // backend returns { success, data, count }
    return data.data || data.tables || data;
  },

  /**
   * GET /api/data/tables/:table/columns
   * Retorna colunas de uma tabela específica
   */
  async getColumns(tableName: string): Promise<ColumnInfo[]> {
    const { data } = await apiClient.get(`/api/data/tables/${tableName}/columns`);
    // backend returns { success, data, count }
    return data.data || data.columns || data;
  },

  /**
   * GET /api/data/tables/:table/sample?size=N
   * Retorna dados de amostra de uma tabela
   */
  async getSampleData(tableName: string, size = 10): Promise<Record<string, unknown>[]> {
    const { data } = await apiClient.get(`/api/data/tables/${tableName}/sample`, {
      params: { size }
    });
    // backend returns { success, data, count, requestedSize }
    return data.data || data;
  },

  /**
   * POST /api/data/query
   * Executa query segura com filtros, ordenação e paginação
   */
  async executeQuery(options: QueryOptions): Promise<QueryResult> {
    const { data } = await apiClient.post('/api/data/query', options);
    // backend returns { success, result }
    return data.result || data;
  },

  // ==================== Chat Endpoints ====================

  /**
   * POST /api/chat/message
   * Envia mensagem de chat em linguagem natural
   */
  async sendChatMessage(request: ChatMessageRequest): Promise<ChatMessageResponse> {
    const { data } = await apiClient.post('/api/chat/message', request);
    return data;
  },

  /**
   * GET /api/chat/history/:sessionId
   * Recupera histórico de chat de uma sessão
   */
  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const { data } = await apiClient.get(`/api/chat/history/${sessionId}`);
    return data.session?.messages || data.messages || [];
  },

  /**
   * DELETE /api/chat/history/:sessionId
   * Remove histórico de uma sessão específica
   */
  async deleteChatHistory(sessionId: string): Promise<void> {
    await apiClient.delete(`/api/chat/history/${sessionId}`);
  },

  // ==================== Health Endpoint ====================

  /**
   * GET /api/health
   * Verifica status de saúde do sistema
   */
  async getHealth(): Promise<HealthStatus> {
    const { data } = await apiClient.get<HealthStatus>('/api/health');
    return data;
  }
};

export { apiClient, api };
export default api;
