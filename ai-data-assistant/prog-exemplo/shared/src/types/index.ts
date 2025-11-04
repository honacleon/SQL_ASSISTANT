export interface DatabaseConfig {
  url: string;
  key: string;
  schema?: string;
}

export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  primaryKey?: string[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  queryGenerated?: string;
  resultsCount?: number;
}

export interface QueryResult {
  data: Record<string, any>[];
  count: number;
  query: string;
  executionTime: number;
}

export interface NLQueryRequest {
  message: string;
  context?: {
    currentTable?: string;
    availableTables?: string[];
    previousQueries?: string[];
  };
}

export interface NLQueryResponse {
  sqlQuery: string;
  explanation: string;
  confidence: number;
  suggestedTable?: string;
}

export interface FilterOption {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';
  value: any;
}

export interface SortOption {
  column: string;
  direction: 'asc' | 'desc';
}

export interface TableState {
  data: Record<string, any>[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  filters: FilterOption[];
  sorts: SortOption[];
  searchQuery?: string;
  selectedTable: string;
  loading: boolean;
  error?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  filename?: string;
  includeHeaders: boolean;
  selectedColumns?: string[];
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area';
  xAxis: string;
  yAxis: string;
  title?: string;
  color?: string;
}