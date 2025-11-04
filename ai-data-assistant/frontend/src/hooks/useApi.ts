import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  showToast?: boolean;
}

export function useApi<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
) {
  const {
    immediate = false,
    onSuccess,
    onError,
    showToast = true
  } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: immediate,
    error: null
  });

  const execute = useCallback(
    async (...args: any[]) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const result = await apiFunction(...args);

        setState(prev => ({
          ...prev,
          data: result,
          loading: false,
          error: null
        }));

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (error: any) {
        const errorMessage = error.message || 'Erro desconhecido';

        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }));

        if (showToast) {
          toast.error(errorMessage);
        }

        if (onError) {
          onError(errorMessage);
        }

        throw error;
      }
    },
    [apiFunction, onSuccess, onError, showToast]
  );

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null
    });
  }, []);

  return {
    ...state,
    execute,
    reset
  };
}

// Specialized hooks
export function useApiState<T>(initialData: T | null = null) {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeAsync = useCallback(
    async <R>(
      apiCall: () => Promise<R>,
      options: {
        onSuccess?: (data: R) => void;
        onError?: (error: string) => void;
        showToast?: boolean;
      } = {}
    ) => {
      const { onSuccess, onError, showToast = true } = options;

      try {
        setLoading(true);
        setError(null);

        const result = await apiCall();

        // Update the data state with the result
        setData(result as unknown as T);

        if (onSuccess) {
          onSuccess(result);
        }

        setLoading(false);
        return result;
      } catch (err: any) {
        const errorMessage = err.message || 'Erro desconhecido';
        setError(errorMessage);
        setLoading(false);

        if (showToast) {
          toast.error(errorMessage);
        }

        if (onError) {
          onError(errorMessage);
        }

        throw err;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setError(null);
  }, [initialData]);

  return {
    data,
    setData,
    loading,
    error,
    executeAsync,
    reset
  };
}