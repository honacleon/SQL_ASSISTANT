/**
 * Database Service
 * Handles Supabase client initialization and schema introspection
 * Uses information_schema for maximum compatibility
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env.config';
import type { 
  TableSummary, 
  TableInfo, 
  ColumnInfo, 
  ForeignKeyInfo, 
  IndexInfo,
  FilterOperator,
  QueryFilter,
  QueryOptions,
  QueryResult,
  SearchOptions
} from '@ai-assistant/shared';

/**
 * Logger utility for consistent error logging
 */
const logger = {
  error: (message: string, context?: Record<string, unknown>) => {
    console.error(`[DatabaseService] ❌ ${message}`, context ? JSON.stringify(context, null, 2) : '');
  },
  info: (message: string, context?: Record<string, unknown>) => {
    console.log(`[DatabaseService] ℹ️ ${message}`, context ? JSON.stringify(context, null, 2) : '');
  },
  debug: (message: string, context?: Record<string, unknown>) => {
    if (config.server.nodeEnv === 'development') {
      console.log(`[DatabaseService] 🔍 ${message}`, context ? JSON.stringify(context, null, 2) : '');
    }
  },
};

/**
 * Raw query result type for information_schema.tables query
 */
interface RawTableRow {
  name: string;
  type: string;
  column_count: number;
}

/**
 * Raw query result type for information_schema.columns query
 */
interface RawColumnRow {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  udt_name: string;
}

/**
 * Raw query result type for primary key constraints
 */
interface RawPrimaryKeyRow {
  column_name: string;
}

/**
 * Raw query result type for foreign key constraints
 */
interface RawForeignKeyRow {
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
  constraint_name: string;
}

/**
 * Raw query result type for indexes
 */
interface RawIndexRow {
  index_name: string;
  column_name: string;
  is_unique: boolean;
}

/**
 * Database Service Class
 * Singleton pattern for managing Supabase client and schema introspection
 */
class DatabaseService {
  private supabase: SupabaseClient;
  private isInitialized: boolean = false;

  /**
   * Whitelist de operadores permitidos
   * Qualquer operador fora desta lista será rejeitado
   */
  private readonly ALLOWED_OPERATORS: FilterOperator[] = [
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 
    'like', 'ilike', 'in', 'is'
  ];

  /**
   * Operadores que requerem valores null
   */
  private readonly NULL_OPERATORS: FilterOperator[] = ['is'];

  /**
   * Operadores que requerem arrays
   */
  private readonly ARRAY_OPERATORS: FilterOperator[] = ['in'];

  constructor() {
    // Use service role key for schema introspection (has elevated permissions)
    const supabaseKey = config.supabase.serviceRoleKey || config.supabase.anonKey;
    
    this.supabase = createClient(config.supabase.url, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    logger.info('Supabase client initialized', {
      url: config.supabase.url,
      hasServiceKey: !!config.supabase.serviceRoleKey,
    });
  }

  /**
   * Lists all tables in the 'public' schema
   * Uses information_schema for maximum compatibility
   * 
   * @returns Array of TableSummary objects with table name and column count
   */
  async getTables(): Promise<TableSummary[]> {
    try {
      logger.debug('Fetching tables from information_schema');

      // Query to get all tables with column counts
      // Uses a single query with JOIN to avoid N+1 problem
      const query = `
        SELECT 
          t.table_name as name,
          'table' as type,
          COUNT(c.column_name)::int as column_count
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c 
          ON t.table_name = c.table_name 
          AND t.table_schema = c.table_schema
        WHERE 
          t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND t.table_name NOT LIKE 'pg_%'
          AND t.table_name NOT LIKE '_prisma_%'
          AND t.table_name NOT LIKE 'supabase_%'
        GROUP BY t.table_name
        ORDER BY t.table_name;
      `;

      const result = await this.executeRawQuery<RawTableRow>(query);

      const tables: TableSummary[] = result.map((row) => ({
        schema: 'public',
        name: row.name,
        type: row.type as 'table' | 'view',
        columnCount: row.column_count,
      }));

      logger.info(`Found ${tables.length} tables in public schema`);
      logger.debug('Tables discovered', { tables: tables.map((t) => t.name) });

      return tables;
    } catch (error) {
      logger.error('Failed to fetch tables', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Gets detailed information about a specific table
   * Includes columns, primary keys, foreign keys, and indexes
   * 
   * @param tableName - Name of the table to introspect
   * @returns TableInfo object with full schema details, or null if not found
   */
  async getTableDetails(tableName: string): Promise<TableInfo | null> {
    try {
      logger.debug(`Fetching details for table: ${tableName}`);

      // Fetch all data in parallel for better performance
      const [columns, primaryKeys, foreignKeys, indexes] = await Promise.all([
        this.getColumns(tableName),
        this.getPrimaryKeys(tableName),
        this.getForeignKeys(tableName),
        this.getIndexes(tableName),
      ]);

      // Mark columns that are primary keys or foreign keys
      const pkSet = new Set(primaryKeys);
      const fkSet = new Set(foreignKeys.map((fk) => fk.columnName));

      const enrichedColumns: ColumnInfo[] = columns.map((col) => ({
        ...col,
        isPrimaryKey: pkSet.has(col.name),
        isForeignKey: fkSet.has(col.name),
      }));

      const tableInfo: TableInfo = {
        schema: 'public',
        name: tableName,
        columns: enrichedColumns,
        primaryKeys,
        foreignKeys,
        indexes,
        columnCount: columns.length,
      };

      logger.info(`Table details fetched for: ${tableName}`, {
        columnCount: columns.length,
        primaryKeyCount: primaryKeys.length,
        foreignKeyCount: foreignKeys.length,
        indexCount: indexes.length,
      });

      return tableInfo;
    } catch (error) {
      logger.error(`Failed to fetch table details for: ${tableName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Gets column information for a specific table
   * 
   * @param tableName - Name of the table
   * @returns Array of ColumnInfo objects
   */
  private async getColumns(tableName: string): Promise<ColumnInfo[]> {
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        udt_name
      FROM information_schema.columns
      WHERE 
        table_schema = 'public'
        AND table_name = '${this.escapeString(tableName)}'
      ORDER BY ordinal_position;
    `;

    const result = await this.executeRawQuery<RawColumnRow>(query);

    return result.map((row) => ({
      name: row.column_name,
      type: row.udt_name || row.data_type,
      nullable: row.is_nullable === 'YES',
      isPrimaryKey: false, // Will be enriched later
      isForeignKey: false, // Will be enriched later
      defaultValue: row.column_default,
      maxLength: row.character_maximum_length,
      precision: row.numeric_precision,
      scale: row.numeric_scale,
    }));
  }

  /**
   * Gets primary key columns for a specific table
   * 
   * @param tableName - Name of the table
   * @returns Array of column names that are primary keys
   */
  private async getPrimaryKeys(tableName: string): Promise<string[]> {
    const query = `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE 
        tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = '${this.escapeString(tableName)}';
    `;

    const result = await this.executeRawQuery<RawPrimaryKeyRow>(query);
    return result.map((row) => row.column_name);
  }

  /**
   * Gets foreign key relationships for a specific table
   * 
   * @param tableName - Name of the table
   * @returns Array of ForeignKeyInfo objects
   */
  private async getForeignKeys(tableName: string): Promise<ForeignKeyInfo[]> {
    const query = `
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE 
        tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = '${this.escapeString(tableName)}';
    `;

    const result = await this.executeRawQuery<RawForeignKeyRow>(query);

    return result.map((row) => ({
      columnName: row.column_name,
      referencedTable: row.foreign_table_name,
      referencedColumn: row.foreign_column_name,
      constraintName: row.constraint_name,
    }));
  }

  /**
   * Gets index information for a specific table
   * 
   * @param tableName - Name of the table
   * @returns Array of IndexInfo objects
   */
  private async getIndexes(tableName: string): Promise<IndexInfo[]> {
    // PostgreSQL-specific query for indexes
    const query = `
      SELECT
        i.relname AS index_name,
        a.attname AS column_name,
        ix.indisunique AS is_unique
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE 
        n.nspname = 'public'
        AND t.relname = '${this.escapeString(tableName)}'
        AND t.relkind = 'r'
      ORDER BY i.relname, a.attnum;
    `;

    const result = await this.executeRawQuery<RawIndexRow>(query);

    // Group columns by index name
    const indexMap = new Map<string, { columns: string[]; isUnique: boolean }>();

    for (const row of result) {
      const existing = indexMap.get(row.index_name);
      if (existing) {
        existing.columns.push(row.column_name);
      } else {
        indexMap.set(row.index_name, {
          columns: [row.column_name],
          isUnique: row.is_unique,
        });
      }
    }

    return Array.from(indexMap.entries()).map(([name, info]) => ({
      name,
      columns: info.columns,
      isUnique: info.isUnique,
    }));
  }

  /**
   * Executes a raw SQL query using Supabase RPC
   * Falls back to direct query if RPC is not available
   * 
   * @param query - SQL query string
   * @returns Array of result rows
   */
  private async executeRawQuery<T>(query: string): Promise<T[]> {
    try {
      const sanitizedQuery = this.sanitizeQuery(query);

      // Try using the sql_query RPC function if available
      const { data, error } = await this.supabase.rpc('sql_query', {
        query_text: sanitizedQuery,
      });

      if (error) {
        // If RPC function doesn't exist, try alternative approach
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          logger.debug('sql_query RPC not available, trying alternative method');
          return await this.executeQueryViaRest<T>(query);
        }
        throw error;
      }

      return (data as T[]) || [];
    } catch (error) {
      const formattedError = this.formatSupabaseError(error);
      logger.error('Raw query execution failed', {
        error: formattedError,
        query: sanitizedQuery.substring(0, 100) + '...',
      });
      
      // Try alternative method as fallback
      try {
        return await this.executeQueryViaRest<T>(query);
      } catch (fallbackError) {
        const formattedFallbackError = this.formatSupabaseError(fallbackError);
        logger.error('Fallback query also failed', {
          error: formattedFallbackError,
        });
        return [];
      }
    }
  }

  /**
   * Alternative method to execute queries via PostgREST
   * This is a fallback when RPC is not available
   * 
   * Note: This method has limitations and may not work for all queries
   * Consider creating an RPC function in Supabase for full SQL support
   * 
   * @param query - SQL query string
   * @returns Array of result rows
   */
  private async executeQueryViaRest<T>(query: string): Promise<T[]> {
    // For information_schema queries, we can use the Supabase REST API
    // by querying the information_schema tables directly
    
    // Parse the query to determine which information_schema table to query
    if (query.includes('information_schema.tables')) {
      return await this.queryInformationSchemaTables<T>();
    }
    
    if (query.includes('information_schema.columns') && !query.includes('information_schema.tables')) {
      // Extract table name from query
      const tableMatch = query.match(/table_name\s*=\s*'([^']+)'/);
      if (tableMatch) {
        return await this.queryInformationSchemaColumns<T>(tableMatch[1]);
      }
    }

    // For other queries, we need the RPC function
    logger.error('Query type not supported without RPC function', {
      queryPreview: query.substring(0, 200),
    });
    
    return [];
  }

  /**
   * Query information_schema.tables via REST API
   */
  private async queryInformationSchemaTables<T>(): Promise<T[]> {
    // This is a workaround - ideally use RPC function
    // For now, return empty and log instruction
    logger.info('To enable full schema introspection, create the following RPC function in Supabase:');
    logger.info(`
      CREATE OR REPLACE FUNCTION sql_query(query_text text)
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result json;
      BEGIN
        EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query_text || ') t'
        INTO result;
        RETURN COALESCE(result, '[]'::json);
      END;
      $$;
    `);
    
    return [];
  }

  /**
   * Query information_schema.columns via REST API
   */
  private async queryInformationSchemaColumns<T>(tableName: string): Promise<T[]> {
    logger.debug(`Querying columns for table: ${tableName}`);
    // This is a workaround - ideally use RPC function
    return [];
  }

  /**
   * Escapes a string for safe use in SQL queries
   * Prevents SQL injection attacks
   * 
   * @param str - String to escape
   * @returns Escaped string
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
  }

  /**
   * Tests the database connection
   * 
   * @returns true if connection is successful, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('_test_connection_').select('*').limit(1);
      
      // Even if table doesn't exist, connection is working if we get a proper error
      if (error && !error.message.includes('connection')) {
        logger.info('Database connection successful');
        return true;
      }
      
      if (!error) {
        logger.info('Database connection successful');
        return true;
      }

      logger.error('Database connection failed', { error: error.message });
      return false;
    } catch (error) {
      logger.error('Database connection test failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Gets the Supabase client instance
   * Use with caution - prefer using service methods
   * 
   * @returns SupabaseClient instance
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Returns the total row count for a table (exact)
   */
  async getTableRowCount(tableName: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        logger.error(`Failed to count rows for ${tableName}`, { message: error.message, code: error.code });
        throw new Error(error.message);
      }

      return count ?? 0;
    } catch (error) {
      logger.error(`Error counting rows for ${tableName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Gets sample data from a table
   * 
   * @param tableName - Name of the table
   * @param limit - Maximum number of rows to return (default: 10, max: 100)
   * @returns Array of row objects
   */
  async getSampleData(tableName: string, limit: number = 10): Promise<Record<string, unknown>[]> {
    try {
      // Validate and clamp limit
      const safeLimit = Math.min(Math.max(1, limit), 100);
      
      logger.debug(`Fetching sample data from ${tableName}`, { limit: safeLimit });

      // Use Supabase client to query the table directly
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .limit(safeLimit);

      if (error) {
        logger.error(`Failed to fetch sample data from ${tableName}`, {
          error: error.message,
        });
        return [];
      }

      logger.info(`Fetched ${data?.length || 0} rows from ${tableName}`);
      return (data as Record<string, unknown>[]) || [];
    } catch (error) {
      logger.error(`Error fetching sample data from ${tableName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Gets columns for a specific table (public method)
   * 
   * @param tableName - Name of the table
   * @returns Array of ColumnInfo objects
   */
  async getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    try {
      const columns = await this.getColumns(tableName);
      const primaryKeys = await this.getPrimaryKeys(tableName);
      const foreignKeys = await this.getForeignKeys(tableName);

      const pkSet = new Set(primaryKeys);
      const fkSet = new Set(foreignKeys.map((fk) => fk.columnName));

      return columns.map((col) => ({
        ...col,
        isPrimaryKey: pkSet.has(col.name),
        isForeignKey: fkSet.has(col.name),
      }));
    } catch (error) {
      logger.error(`Failed to fetch columns for ${tableName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Executa query segura com filtros, ordenação e paginação
   * 
   * SEGURANÇA:
   * - Usa apenas query builder do Supabase (não raw SQL)
   * - Valida operadores contra whitelist
   * - Previne SQL injection por design
   * 
   * @param options - Opções de query validadas
   * @returns Resultado com dados e metadados de paginação
   */
  async executeSecureQuery(options: QueryOptions): Promise<QueryResult> {
    const {
      table,
      filters = [],
      sort,
      pagination = { page: 1, pageSize: 20 },
      search,
      columns
    } = options;

    try {
      logger.debug(`Executing secure query on table: ${table}`, {
        filters: filters.length,
        hasSort: !!sort,
        hasPagination: !!pagination,
        hasSearch: !!search
      });

      // Validar operadores antes de executar
      this.validateFilters(filters);

      // Construir query base
      let query = this.supabase.from(table).select(
        columns ? columns.join(',') : '*',
        { count: 'exact' }
      );

      // Aplicar filtros
      query = this.applyFilters(query, filters);

      // Aplicar busca textual (se fornecida)
      if (search && search.query && search.columns.length > 0) {
        query = this.applySearch(query, search);
      }

      // Aplicar ordenação
      if (sort) {
        query = query.order(sort.column, {
          ascending: sort.order === 'asc',
          nullsFirst: sort.nullsFirst
        });
      }

      // Aplicar paginação
      const { page, pageSize } = pagination;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Executar query
      const { data, error, count } = await query;

      if (error) {
        logger.error('Query execution failed:', { message: error.message, code: error.code });
        throw new Error(`Query failed: ${error.message}`);
      }

      const total = count || 0;
      const hasMore = from + pageSize < total;

      logger.info(`Query executed successfully: ${data?.length || 0} rows returned`);

      return {
        data: data || [],
        total,
        page,
        pageSize,
        hasMore
      };

    } catch (error) {
      logger.error('Error in executeSecureQuery:', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Valida filtros contra whitelist de operadores
   */
  private validateFilters(filters: QueryFilter[]): void {
    for (const filter of filters) {
      // Validar operador
      if (!this.ALLOWED_OPERATORS.includes(filter.operator)) {
        throw new Error(
          `Invalid operator: ${filter.operator}. ` +
          `Allowed: ${this.ALLOWED_OPERATORS.join(', ')}`
        );
      }

      // Validar tipo de valor para operadores específicos
      if (this.NULL_OPERATORS.includes(filter.operator)) {
        if (filter.value !== null && filter.value !== 'null') {
          throw new Error(
            `Operator '${filter.operator}' requires null value`
          );
        }
      }

      if (this.ARRAY_OPERATORS.includes(filter.operator)) {
        if (!Array.isArray(filter.value)) {
          throw new Error(
            `Operator '${filter.operator}' requires array value`
          );
        }
      }

      // Validar nome de coluna (básico)
      if (!filter.column || filter.column.includes(';') || filter.column.includes('--')) {
        throw new Error('Invalid column name');
      }
    }
  }

  /**
   * Aplica filtros à query usando query builder
   */
  private applyFilters(
    query: any,
    filters: QueryFilter[]
  ): any {
    for (const filter of filters) {
      const { column, operator, value } = filter;

      switch (operator) {
        case 'eq':
          query = query.eq(column, value);
          break;
        case 'neq':
          query = query.neq(column, value);
          break;
        case 'gt':
          query = query.gt(column, value);
          break;
        case 'gte':
          query = query.gte(column, value);
          break;
        case 'lt':
          query = query.lt(column, value);
          break;
        case 'lte':
          query = query.lte(column, value);
          break;
        case 'like':
          query = query.like(column, value);
          break;
        case 'ilike':
          query = query.ilike(column, value);
          break;
        case 'in':
          query = query.in(column, value);
          break;
        case 'is':
          query = query.is(column, value);
          break;
      }
    }

    return query;
  }

  /**
   * Aplica busca textual usando OR entre colunas
   */
  private applySearch(
    query: any,
    search: SearchOptions
  ): any {
    const { query: searchQuery, columns, caseSensitive = false } = search;
    const operator = caseSensitive ? 'like' : 'ilike';
    const pattern = `%${searchQuery}%`;

    // Construir condição OR para múltiplas colunas
    const conditions = columns
      .map(col => `${col}.${operator}.${pattern}`)
      .join(',');

    return query.or(conditions);
  }

  /**
   * Formats Supabase error objects into readable strings for logging
   */
  private formatSupabaseError(error: unknown): string {
    if (error && typeof error === 'object') {
      const errObj = error as Record<string, unknown>;
      const message = typeof errObj.message === 'string' ? errObj.message : undefined;
      const details = typeof errObj.details === 'string' ? errObj.details : undefined;
      const hint = typeof errObj.hint === 'string' ? errObj.hint : undefined;
      const code = typeof errObj.code === 'string' ? errObj.code : undefined;
      const parts = [message, details, hint, code].filter(Boolean);
      if (parts.length > 0) return parts.join(' | ');
    }
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Remove trailing semicolons and trims whitespace to avoid syntax errors inside the RPC wrapper
   */
  private sanitizeQuery(query: string): string {
    return query.trim().replace(/;+$/g, '');
  }
}

/**
 * Singleton instance of DatabaseService
 * Use this exported instance throughout the application
 */
export const databaseService = new DatabaseService();
