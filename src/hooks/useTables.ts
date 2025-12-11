/**
 * useTables - Hook para lista de tabelas disponíveis
 */

import { useEffect } from 'react';
import { useApi } from './useApi';
import api from '@/services/api';
import type { TableInfo } from '@ai-assistant/shared';

interface UseTablesReturn {
  tables: TableInfo[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<TableInfo[] | null>;
}

/**
 * Hook para buscar lista de tabelas disponíveis
 * 
 * @param autoFetch - Se deve buscar automaticamente ao montar (default: true)
 * @returns Lista de tabelas e estados
 * 
 * @example
 * const { tables, loading, error, refetch } = useTables();
 */
export function useTables(autoFetch = true): UseTablesReturn {
  const { data, loading, error, execute } = useApi(api.getTables);

  useEffect(() => {
    if (autoFetch) {
      execute();
    }
  }, [autoFetch, execute]);

  return {
    tables: data || [],
    loading,
    error,
    refetch: execute,
  };
}

export default useTables;
