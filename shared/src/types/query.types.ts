/**
 * Query building and filtering types
 */

export type FilterOperator = 
  | 'eq' 
  | 'neq' 
  | 'gt' 
  | 'gte' 
  | 'lt' 
  | 'lte' 
  | 'like' 
  | 'ilike' 
  | 'in' 
  | 'is' 
  | 'contains';

export interface QueryFilter {
  column: string;
  operator: FilterOperator;
  value: unknown;
}

export interface QuerySort {
  column: string;
  ascending: boolean;
}

export interface QueryPagination {
  limit: number;
  offset: number;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  sort?: QuerySort[];
  pagination?: QueryPagination;
  select?: string[];
}

export interface QueryResult<T = unknown> {
  data: T[];
  count: number | null;
  error: QueryError | null;
}

export interface QueryError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface NaturalLanguageQuery {
  text: string;
  context?: {
    tables?: string[];
    previousQueries?: string[];
  };
}

export interface ParsedQuery {
  sql: string;
  tables: string[];
  columns: string[];
  filters: QueryFilter[];
  aggregations?: string[];
  confidence: number;
}
