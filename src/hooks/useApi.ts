/**
 * useApi - Generic hook for API requests with loading/error/data states
 */

import { useState, useCallback } from 'react';
import { ApiError } from '@/services/api';
import toast from 'react-hot-toast';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

interface UseApiReturn<T, P extends unknown[]> extends UseApiState<T> {
  execute: (...params: P) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook genérico para requests com loading/error/data
 * 
 * @param apiFunction - Função da API a ser executada
 * @returns Estado e funções de controle
 * 
 * @example
 * const { data, loading, error, execute } = useApi(api.getTables);
 * 
 * useEffect(() => {
 *   execute();
 * }, []);
 */
export function useApi<T, P extends unknown[] = []>(
  apiFunction: (...params: P) => Promise<T>
): UseApiReturn<T, P> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...params: P): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await apiFunction(...params);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        const apiError = err instanceof ApiError 
          ? err 
          : new ApiError(
              err instanceof Error ? err.message : 'Erro desconhecido',
              0
            );
        setState({ data: null, loading: false, error: apiError });
        toast.error(apiError.message || 'Erro ao carregar dados');
        return null;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

export default useApi;
