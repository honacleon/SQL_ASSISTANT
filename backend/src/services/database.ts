import { supabase } from '../config/supabase';
import { TableInfo, ColumnInfo, QueryResult, FilterOption, SortOption } from '@ai-data-assistant/shared';
import logger from '../config/logger';

export class DatabaseService {
  async getTables(): Promise<TableInfo[]> {
    try {
      logger.info('🔍 Descobrindo tabelas disponíveis no Supabase...');

      // Método 1: Tentar usar available_tables view se existir
      try {
        const { data: availableTables, error: viewError } = await supabase
          .from('available_tables')
          .select('*');

        if (!viewError && availableTables && availableTables.length > 0) {
          logger.info(`✅ Encontradas ${availableTables.length} tabelas via available_tables view`);
          
          const tableNames = availableTables
            .map((t: any) => t.table_name)
            .filter((name: string) => name && !name.startsWith('pg_'));
          
          return await this.enrichTablesWithColumns(tableNames);
        }
      } catch (viewErr) {
        logger.info('ℹ️ View available_tables não disponível, usando descoberta automática...');
      }

      // Método 2: Descoberta dinâmica testando padrões comuns
      logger.info('🔍 Descobrindo tabelas dinamicamente...');
      
      // Busca tabelas testando a view available_tables primeiro
      // Se não existir, não há como descobrir sem hardcode ou RPC
      logger.warn('⚠️ View "available_tables" não encontrada');
      logger.warn('💡 Solução: Execute este SQL no Supabase para criar a view:');
      logger.warn(`
CREATE OR REPLACE VIEW available_tables AS
SELECT 
    table_name,
    'table' as table_type,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;
      `);
      
      return [];

    } catch (error) {
      logger.error('Error fetching tables:', error);
      throw new Error('Failed to fetch tables from database');
    }
  }

  // Mapeia tipos PostgreSQL para tipos simplificados
  private mapPostgresType(pgType: string): string {
    const typeMap: Record<string, string> = {
      'integer': 'integer',
      'bigint': 'integer',
      'smallint': 'integer',
      'numeric': 'numeric',
      'decimal': 'numeric',
      'real': 'numeric',
      'double precision': 'numeric',
      'text': 'text',
      'varchar': 'text',
      'character varying': 'text',
      'char': 'text',
      'boolean': 'boolean',
      'timestamp': 'timestamp',
      'timestamp with time zone': 'timestamp',
      'timestamp without time zone': 'timestamp',
      'date': 'date',
      'time': 'time',
      'uuid': 'uuid',
      'json': 'json',
      'jsonb': 'json'
    };

    return typeMap[pgType.toLowerCase()] || 'text';
  }

  private async enrichTablesWithColumns(tables: string[]): Promise<TableInfo[]> {
    const enrichedTables: TableInfo[] = [];

    for (const tableName of tables) {
      try {
        // Busca amostra de dados para inferir colunas
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (sampleError) {
          logger.warn(`Erro ao buscar amostra de ${tableName}:`, sampleError);
          continue;
        }

        // Infere colunas da amostra
        const columns: ColumnInfo[] = [];
        if (sampleData && sampleData.length > 0) {
          const firstRow = sampleData[0];
          for (const [columnName, value] of Object.entries(firstRow)) {
            let columnType = 'text';
            
            if (typeof value === 'string') {
              columnType = 'text';
            } else if (typeof value === 'number') {
              columnType = Number.isInteger(value) ? 'integer' : 'numeric';
            } else if (typeof value === 'boolean') {
              columnType = 'boolean';
            } else if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
              columnType = 'timestamp';
            }

            columns.push({
              name: columnName,
              type: columnType,
              nullable: value === null,
              isPrimaryKey: columnName === 'id'
            });
          }
        }

        // Conta registros
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        enrichedTables.push({
          name: tableName,
          schema: 'public',
          columns: columns,
          primaryKey: columns.filter(c => c.isPrimaryKey).map(c => c.name),
          rowCount: count || 0
        });

        logger.info(`  ✅ ${tableName}: ${columns.length} colunas, ${count || 0} registros`);

      } catch (error) {
        logger.warn(`Erro ao enriquecer tabela ${tableName}:`, error);
      }
    }

    return enrichedTables;
  }

  async getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    try {
      // For Supabase, we can't directly query information_schema
      // Instead, we'll get sample data and infer column types
      const { data: sampleData, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) throw error;

      if (!sampleData || sampleData.length === 0) {
        // If no data, return empty columns
        return [];
      }

      // Infer columns from the first row of data
      const firstRow = sampleData[0];
      const columns: ColumnInfo[] = [];

      for (const [columnName, value] of Object.entries(firstRow)) {
        let columnType = 'unknown';
        
        if (typeof value === 'string') {
          columnType = 'text';
        } else if (typeof value === 'number') {
          columnType = Number.isInteger(value) ? 'integer' : 'numeric';
        } else if (typeof value === 'boolean') {
          columnType = 'boolean';
        } else if (value instanceof Date) {
          columnType = 'timestamp';
        } else if (value === null) {
          columnType = 'unknown';
        }

        columns.push({
          name: columnName,
          type: columnType,
          nullable: value === null,
          isPrimaryKey: columnName === 'id' // Simple heuristic for primary key
        });
      }

      return columns;
    } catch (error) {
      logger.error(`Error fetching columns for table ${tableName}:`, error);
      throw new Error(`Failed to fetch columns for table ${tableName}`);
    }
  }

  async executeQuery(
    tableName: string,
    filters: FilterOption[] = [],
    sorts: SortOption[] = [],
    page = 1,
    pageSize = 50,
    searchQuery?: string
  ): Promise<QueryResult> {
    try {
      const startTime = Date.now();
      let query = supabase.from(tableName).select('*', { count: 'exact' });

      // Apply filters
      filters.forEach(filter => {
        switch (filter.operator) {
          case 'eq':
            query = query.eq(filter.column, filter.value);
            break;
          case 'neq':
            query = query.neq(filter.column, filter.value);
            break;
          case 'gt':
            query = query.gt(filter.column, filter.value);
            break;
          case 'gte':
            query = query.gte(filter.column, filter.value);
            break;
          case 'lt':
            query = query.lt(filter.column, filter.value);
            break;
          case 'lte':
            query = query.lte(filter.column, filter.value);
            break;
          case 'like':
            query = query.ilike(filter.column, `%${filter.value}%`);
            break;
          case 'in':
            query = query.in(filter.column, filter.value);
            break;
        }
      });

      // Apply search across all text columns
      if (searchQuery) {
        const columns = await this.getTableColumns(tableName);
        const textColumns = columns.filter(col =>
          col.type.includes('text') || col.type.includes('varchar')
        );

        if (textColumns.length > 0) {
          const orConditions = textColumns.map(col =>
            `${col.name}.ilike.%${searchQuery}%`
          ).join(',');
          query = query.or(orConditions);
        }
      }

      // Apply sorting
      sorts.forEach(sort => {
        query = query.order(sort.column, { ascending: sort.direction === 'asc' });
      });

      // Apply pagination
      const start = (page - 1) * pageSize;
      query = query.range(start, start + pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const executionTime = Date.now() - startTime;

      return {
        data: data || [],
        count: count || 0,
        query: 'SELECT query not available', // We'd need to build this
        executionTime
      };
    } catch (error) {
      logger.error('Error executing query:', error);
      throw new Error('Failed to execute query');
    }
  }

  async executeRawSQL(sqlQuery: string): Promise<QueryResult> {
    try {
      const startTime = Date.now();

      // Note: Supabase doesn't directly support raw SQL execution in the client
      // This would need to be implemented using RPC functions or edge functions
      // For now, we'll return a placeholder

      const executionTime = Date.now() - startTime;

      logger.warn('Raw SQL execution not implemented yet:', sqlQuery);

      return {
        data: [],
        count: 0,
        query: sqlQuery,
        executionTime
      };
    } catch (error) {
      logger.error('Error executing raw SQL:', error);
      throw new Error('Failed to execute raw SQL');
    }
  }

  async getTableSample(tableName: string, sampleSize = 5): Promise<Record<string, any>[]> {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(sampleSize);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Error fetching sample data for table ${tableName}:`, error);
      throw new Error(`Failed to fetch sample data for table ${tableName}`);
    }
  }
}