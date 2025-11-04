import axios from 'axios';
import {
  ApiResponse,
  TableInfo,
  QueryResult,
  ChatMessage,
  FilterOption,
  SortOption,
  NLQueryRequest
} from '@ai-data-assistant/shared';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add API key if provided
if (import.meta.env.VITE_API_KEY) {
  api.defaults.headers['X-API-Key'] = import.meta.env.VITE_API_KEY;
}

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', error.response?.status, error.message);

    if (error.response?.status === 401) {
      console.warn('🔐 Authentication required');
    } else if (error.response?.status >= 500) {
      console.error('🔥 Server error detected');
    }

    return Promise.reject(error);
  }
);

// Data API
export const dataApi = {
  // Get all tables
  getTables: async (): Promise<TableInfo[]> => {
    const response = await api.get<ApiResponse<TableInfo[]>>('/data/tables');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch tables');
    }
    return response.data.data || [];
  },

  // Get table columns
  getTableColumns: async (tableName: string) => {
    const response = await api.get<ApiResponse>(`/data/tables/${tableName}/columns`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch columns');
    }
    return response.data.data || [];
  },

  // Get table sample data
  getTableSample: async (tableName: string, size = 5) => {
    const response = await api.get<ApiResponse>(`/data/tables/${tableName}/sample?size=${size}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch sample data');
    }
    return response.data.data || [];
  },

  // Execute query
  executeQuery: async (params: {
    tableName: string;
    filters?: FilterOption[];
    sorts?: SortOption[];
    page?: number;
    pageSize?: number;
    searchQuery?: string;
  }): Promise<QueryResult> => {
    const response = await api.post<ApiResponse<QueryResult>>('/data/query', params);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to execute query');
    }
    return response.data.data!;
  },

  // Execute raw SQL
  executeRawSQL: async (sqlQuery: string): Promise<QueryResult> => {
    const response = await api.post<ApiResponse<QueryResult>>('/data/raw-sql', { sqlQuery });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to execute SQL query');
    }
    return response.data.data!;
  }
};

// Chat API
export const chatApi = {
  // Send message
  sendMessage: async (params: {
    message: string;
    sessionId?: string;
    context?: NLQueryRequest['context'];
  }) => {
    const response = await api.post<ApiResponse>('/chat/message', params);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to send message');
    }
    return response.data.data;
  },

  // Get chat history
  getChatHistory: async (sessionId: string): Promise<ChatMessage[]> => {
    const response = await api.get<ApiResponse<ChatMessage[]>>(`/chat/history/${sessionId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get chat history');
    }
    return response.data.data || [];
  },

  // Clear chat history
  clearChatHistory: async (sessionId: string): Promise<void> => {
    const response = await api.delete<ApiResponse>(`/chat/history/${sessionId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to clear chat history');
    }
  },

  // Get suggestions
  getSuggestions: async (): Promise<string[]> => {
    const response = await api.get<ApiResponse<string[]>>('/chat/suggestions');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get suggestions');
    }
    return response.data.data || [];
  }
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await api.get<ApiResponse>('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

export default api;