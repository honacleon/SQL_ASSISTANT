/**
 * useHealth - Hook for system health monitoring with auto-polling
 */

import { useEffect, useState, useCallback } from 'react';
import api from '@/services/api';
import type { HealthStatus } from '@ai-assistant/shared';

interface UseHealthState {
  data: HealthStatus | null;
  loading: boolean;
  error: string | null;
}

const POLL_INTERVAL_MS = 30_000; // 30 segundos

export function useHealth() {
  const [state, setState] = useState<UseHealthState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchHealth = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const health = await api.getHealth();

      setState({
        data: health,
        loading: false,
        error: null,
      });
    } catch (err: unknown) {
      // Se for ApiError, pode extrair message; caso contrário, genérico
      const message =
        err instanceof Error ? err.message : 'Falha ao carregar status do sistema';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
    }
  }, []);

  useEffect(() => {
    // Busca inicial
    fetchHealth();

    // Polling
    const intervalId = window.setInterval(fetchHealth, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [fetchHealth]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refresh: fetchHealth,
  };
}

export default useHealth;
