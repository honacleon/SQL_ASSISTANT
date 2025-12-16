/**
 * useSessionHistory - Hook for managing persistent chat sessions
 * 
 * Provides CRUD operations for chat sessions stored in Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '@/services/api';

// =============================================
// Types
// =============================================

export interface SessionSummary {
    id: string;
    title: string;
    tableContext: string | null;
    createdAt: string;
    updatedAt: string;
    isArchived: boolean;
}

export interface SessionMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: {
        queryExecuted?: boolean;
        sqlGenerated?: string;
        tableUsed?: string;
        confidence?: number;
        executionTime?: number;
    };
}

export interface SessionWithMessages extends SessionSummary {
    messages: SessionMessage[];
}

interface UseSessionHistoryReturn {
    // State
    sessions: SessionSummary[];
    activeSessionId: string | null;
    activeSession: SessionWithMessages | null;
    loading: boolean;
    error: Error | null;

    // Actions
    fetchSessions: () => Promise<void>;
    createSession: (title?: string, tableContext?: string) => Promise<SessionSummary | null>;
    deleteSession: (id: string) => Promise<boolean>;
    switchSession: (id: string) => Promise<void>;
    updateSessionTitle: (id: string, title: string) => Promise<void>;
    clearActiveSession: () => void;
    addMessage: (role: 'user' | 'assistant', content: string, metadata?: Record<string, unknown>) => Promise<void>;
    refreshActiveSession: () => Promise<void>;
}

// ===========================================
// Hook
// =============================================

export function useSessionHistory(): UseSessionHistoryReturn {
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [activeSession, setActiveSession] = useState<SessionWithMessages | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Fetch all sessions
    const fetchSessions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await api.listSessions();
            setSessions(data.map(s => ({ ...s, isArchived: false })));
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch sessions'));
        } finally {
            setLoading(false);
        }
    }, []);

    // Create a new session
    const createSession = useCallback(async (
        title?: string,
        tableContext?: string
    ): Promise<SessionSummary | null> => {
        setLoading(true);
        setError(null);

        try {
            const data = await api.createSession(title, tableContext);
            const newSession: SessionSummary = {
                id: data.id,
                title: data.title,
                tableContext: data.tableContext,
                createdAt: data.createdAt,
                updatedAt: data.createdAt,
                isArchived: false,
            };
            setSessions(prev => [newSession, ...prev]);
            toast.success('Nova sessão criada');
            return newSession;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to create session');
            setError(error);
            toast.error('Erro ao criar sessão');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Delete a session
    const deleteSession = useCallback(async (id: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            await api.deleteSession(id);
            setSessions(prev => prev.filter(s => s.id !== id));

            if (activeSessionId === id) {
                setActiveSessionId(null);
                setActiveSession(null);
            }

            toast.success('Sessão excluída');
            return true;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to delete session');
            setError(error);
            toast.error('Erro ao excluir sessão');
            return false;
        } finally {
            setLoading(false);
        }
    }, [activeSessionId]);

    // Switch to a session (loads messages)
    const switchSession = useCallback(async (id: string) => {
        if (activeSessionId === id) return;

        setLoading(true);
        setError(null);

        try {
            const data = await api.getSession(id);
            setActiveSessionId(id);
            setActiveSession({
                id: data.id,
                title: data.title,
                tableContext: data.tableContext,
                createdAt: '',
                updatedAt: '',
                isArchived: false,
                messages: data.messages,
            });
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to load session');
            setError(error);
            toast.error('Erro ao carregar sessão');
        } finally {
            setLoading(false);
        }
    }, [activeSessionId]);

    // Update session title
    const updateSessionTitle = useCallback(async (id: string, title: string) => {
        try {
            await api.updateSession(id, { title });
            setSessions(prev => prev.map(s =>
                s.id === id ? { ...s, title } : s
            ));

            if (activeSession && activeSession.id === id) {
                setActiveSession(prev => prev ? { ...prev, title } : null);
            }
        } catch {
            toast.error('Erro ao atualizar título');
        }
    }, [activeSession]);

    // Add message to active session
    const addMessage = useCallback(async (
        role: 'user' | 'assistant',
        content: string,
        metadata?: Record<string, unknown>
    ) => {
        if (!activeSessionId) return;

        try {
            const saved = await api.addSessionMessage(activeSessionId, role, content, metadata);
            const newMessage: SessionMessage = {
                id: saved.id,
                role: role,
                content: content,
                timestamp: new Date(saved.createdAt),
                metadata: metadata as SessionMessage['metadata'],
            };
            setActiveSession(prev => prev ? {
                ...prev,
                messages: [...prev.messages, newMessage],
            } : null);
        } catch (err) {
            console.error('Failed to save message:', err);
        }
    }, [activeSessionId]);

    // Refresh active session messages
    const refreshActiveSession = useCallback(async () => {
        if (!activeSessionId) return;
        await switchSession(activeSessionId);
    }, [activeSessionId, switchSession]);

    // Clear active session
    const clearActiveSession = useCallback(() => {
        setActiveSessionId(null);
        setActiveSession(null);
    }, []);

    // Load sessions on mount
    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    return {
        sessions,
        activeSessionId,
        activeSession,
        loading,
        error,
        fetchSessions,
        createSession,
        deleteSession,
        switchSession,
        updateSessionTitle,
        clearActiveSession,
        addMessage,
        refreshActiveSession,
    };
}

export default useSessionHistory;
