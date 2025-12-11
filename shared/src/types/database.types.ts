/**
 * Core database entity types for schema introspection and query building
 */

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue?: string | null;
  maxLength?: number | null;
  precision?: number | null;
  scale?: number | null;
}

export interface TableInfo {
  schema: string;
  name: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
  columnCount?: number;
}

/**
 * Lightweight table summary for listing (without full column details)
 */
export interface TableSummary {
  schema: string;
  name: string;
  type: 'table' | 'view';
  columnCount: number;
}

export interface ForeignKeyInfo {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
}

export type DataType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'date' 
  | 'datetime' 
  | 'json' 
  | 'uuid' 
  | 'array' 
  | 'unknown';

export interface TypeMapping {
  postgresType: string;
  dataType: DataType;
  tsType: string;
}

/**
 * Operadores permitidos para filtros
 * Whitelist rígida para prevenir SQL injection
 */
export type FilterOperator = 
  | 'eq'      // igual (=)
  | 'neq'     // diferente (!=)
  | 'gt'      // maior que (>)
  | 'gte'     // maior ou igual (>=)
  | 'lt'      // menor que (<)
  | 'lte'     // menor ou igual (<=)
  | 'like'    // pattern matching (case-sensitive)
  | 'ilike'   // pattern matching (case-insensitive)
  | 'in'      // valor está no array
  | 'is';     // é null/not null

/**
 * Filtro individual para query
 */
export interface QueryFilter {
  column: string;
  operator: FilterOperator;
  value: any; // string, number, boolean, null, array
}

/**
 * Opções de ordenação
 */
export interface SortOptions {
  column: string;
  order: 'asc' | 'desc';
  nullsFirst?: boolean; // opcional: null values primeiro ou último
}

/**
 * Opções de paginação
 */
export interface PaginationOptions {
  page: number;        // página atual (base 1)
  pageSize: number;    // registros por página (max 100)
}

/**
 * Opções de busca textual
 */
export interface SearchOptions {
  query: string;         // texto a buscar
  columns: string[];     // colunas onde aplicar busca
  caseSensitive?: boolean; // default: false
}

/**
 * Opções completas para executeSecureQuery
 */
export interface QueryOptions {
  table: string;
  filters?: QueryFilter[];
  sort?: SortOptions;
  pagination?: PaginationOptions;
  search?: SearchOptions;
  columns?: string[]; // colunas específicas a retornar (default: todas)
}

/**
 * Resultado de query com metadados
 */
export interface QueryResult<T = any> {
  data: T[];
  total: number;      // total de registros (sem paginação)
  page: number;
  pageSize: number;
  hasMore: boolean;   // tem próxima página?
}
