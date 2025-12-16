/**
 * Local type definitions for backend
 * These replace deprecated or missing types from the shared package
 */

// API Response structure
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Natural Language Query Response (deprecated, replaced by NLQueryResult)
export interface NLQueryResponse {
    sqlQuery?: string;
    explanation: string;
    confidence: number;
    suggestedTables?: string[];
    suggestedTable?: string;  // Legacy singular form
    needsClarification?: boolean;
    clarificationQuestion?: string;
}

// Extended ChatMessage with legacy fields
export interface LegacyChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    queryGenerated?: string;  // Legacy field
    resultsCount?: number;    // Legacy field
    metadata?: {
        queryExecuted?: boolean;
        sqlGenerated?: string;
        tableUsed?: string;
        confidence?: number;
        executionTime?: number;
        count?: number;
    };
}

// Filter and Sort options (replaced by newer types)
export type FilterOperator = 'eq' | 'ne' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';

export interface FilterOption {
    column: string;
    operator: FilterOperator;
    value: any;
}

export interface SortOption {
    column: string;
    direction: 'asc' | 'desc';
}

// Utility function (moved from shared)
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
