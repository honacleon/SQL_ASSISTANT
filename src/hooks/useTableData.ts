/**
 * useTableData - Hook para dados de tabela com filtros/paginação
 */

import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import api from '@/services/api';
import type { 
  ColumnInfo, 
  QueryOptions, 
  QueryResult,
  QueryFilter,
  SortOptions,
  PaginationOptions 
} from '@ai-assistant/shared';

interface UseTableDataOptions {
  autoFetch?: boolean;
  initialFilters?: QueryFilter[];
  initialSort?: SortOptions;
  initialPagination?: PaginationOptions;
}

interface UseTableDataReturn {
  // Data
  columns: ColumnInfo[];
  data: Record<string, unknown>[];
  totalCount: number;
  
  // States
  loading: boolean;
  error: Error | null;
  
  // Filters & Pagination
  filters: QueryFilter[];
  sort: SortOptions | undefined;
  pagination: PaginationOptions;
  
  // Actions
  setFilters: (filters: QueryFilter[]) => void;
  setSort: (sort: SortOptions | undefined) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refetch: () => Promise<void>;
  fetchColumns: () => Promise<ColumnInfo[] | null>;
}

/**
 * Hook para buscar dados de uma tabela com filtros, ordenação e paginação
 * 
 * @param tableName - Nome da tabela
 * @param options - Opções de configuração
 * @returns Dados, estados e funções de controle
 * 
 * @example
 * const { data, columns, loading, setFilters, setPage } = useTableData('users');
 */
export function useTableData(
  tableName: string,
  options: UseTableDataOptions = {}
): UseTableDataReturn {
  const {
    autoFetch = true,
    initialFilters = [],
    initialSort,
    initialPagination = { page: 1, pageSize: 10 },
  } = options;

  // Local state for query options
  const [filters, setFilters] = useState<QueryFilter[]>(initialFilters);
  const [sort, setSort] = useState<SortOptions | undefined>(initialSort);
  const [pagination, setPagination] = useState<PaginationOptions>(initialPagination);

  // API hooks
  const columnsApi = useApi(api.getColumns);
  const queryApi = useApi(api.executeQuery);

  // Fetch columns
  const fetchColumns = useCallback(async () => {
    if (!tableName) return null;
    return columnsApi.execute(tableName);
  }, [tableName, columnsApi]);

  // Fetch data with current options
  const fetchData = useCallback(async () => {
    if (!tableName) return;

    const queryOptions: QueryOptions = {
      table: tableName,
      filters: filters.length > 0 ? filters : undefined,
      sort,
      pagination,
    };

    await queryApi.execute(queryOptions);
  }, [tableName, filters, sort, pagination, queryApi]);

  // Refetch both columns and data
  const refetch = useCallback(async () => {
    await Promise.all([fetchColumns(), fetchData()]);
  }, [fetchColumns, fetchData]);

  // Auto-fetch on mount and when tableName changes
  useEffect(() => {
    if (autoFetch && tableName) {
      fetchColumns();
      fetchData();
    }
  }, [autoFetch, tableName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch data when filters, sort, or pagination change
  useEffect(() => {
    if (tableName) {
      fetchData();
    }
  }, [filters, sort, pagination]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pagination helpers
  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  // Extract data from query result
  const queryResult = queryApi.data as QueryResult | null;

  return {
    // Data
    columns: columnsApi.data || [],
    data: queryResult?.data || [],
    totalCount: queryResult?.total || 0,
    
    // States
    loading: columnsApi.loading || queryApi.loading,
    error: columnsApi.error || queryApi.error,
    
    // Filters & Pagination
    filters,
    sort,
    pagination,
    
    // Actions
    setFilters,
    setSort,
    setPage,
    setPageSize,
    refetch,
    fetchColumns,
  };
}

export default useTableData;
