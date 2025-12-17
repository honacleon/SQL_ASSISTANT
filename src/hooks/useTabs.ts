/**
 * useTabs Hook
 * Gerencia estado das abas de chat com persistência em localStorage
 */

import { useState, useCallback, useEffect } from 'react';
import type { ChatTab, TabState, UseTabsReturn } from '@/types/tabs';

const STORAGE_KEY = 'sql-assistant-tabs';
const MAX_TABS = 10;

/**
 * Gera ID único para tab
 */
const generateTabId = (): string => {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Cria uma nova tab com valores padrão
 */
const createNewTab = (title?: string, sessionId?: string | null): ChatTab => {
    const now = new Date();
    return {
        id: generateTabId(),
        sessionId: sessionId ?? null,
        title: title || 'Nova Conversa',
        tableContext: undefined,
        isActive: false,
        isPinned: false,
        unreadCount: 0,
        isLoading: false,
        hasError: false,
        createdAt: now,
        lastAccessedAt: now,
    };
};

/**
 * Carrega tabs do localStorage
 */
const loadTabsFromStorage = (): TabState => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Recriar objetos Date
            const tabs = parsed.tabs.map((tab: ChatTab) => ({
                ...tab,
                createdAt: new Date(tab.createdAt),
                lastAccessedAt: new Date(tab.lastAccessedAt),
            }));
            return { tabs, activeTabId: parsed.activeTabId };
        }
    } catch (error) {
        console.error('Failed to load tabs from storage:', error);
    }

    // Estado inicial: uma tab
    const initialTab = createNewTab();
    initialTab.isActive = true;
    return { tabs: [initialTab], activeTabId: initialTab.id };
};

/**
 * Salva tabs no localStorage
 */
const saveTabsToStorage = (state: TabState): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Failed to save tabs to storage:', error);
    }
};

/**
 * Hook para gerenciar abas do chat
 */
export function useTabs(): UseTabsReturn {
    const [state, setState] = useState<TabState>(loadTabsFromStorage);

    // Persistir mudanças
    useEffect(() => {
        saveTabsToStorage(state);
    }, [state]);

    // Criar nova tab
    const createTab = useCallback((title?: string, sessionId?: string | null): ChatTab => {
        const newTab = createNewTab(title, sessionId);

        setState(prev => {
            // Verificar limite
            if (prev.tabs.length >= MAX_TABS) {
                console.warn(`Maximum tabs (${MAX_TABS}) reached`);
                return prev;
            }

            // Desativar tabs anteriores
            const updatedTabs = prev.tabs.map(t => ({ ...t, isActive: false }));
            newTab.isActive = true;

            return {
                tabs: [...updatedTabs, newTab],
                activeTabId: newTab.id,
            };
        });

        return newTab;
    }, []);

    // Fechar tab
    const closeTab = useCallback((id: string): void => {
        setState(prev => {
            const tabIndex = prev.tabs.findIndex(t => t.id === id);
            if (tabIndex === -1) return prev;

            // Não fechar tab pinada
            const tab = prev.tabs[tabIndex];
            if (tab.isPinned) return prev;

            const newTabs = prev.tabs.filter(t => t.id !== id);

            // Se fechou última tab, criar nova
            if (newTabs.length === 0) {
                const newTab = createNewTab();
                newTab.isActive = true;
                return { tabs: [newTab], activeTabId: newTab.id };
            }

            // Se fechou tab ativa, ativar outra
            let newActiveId = prev.activeTabId;
            if (prev.activeTabId === id) {
                // Ativar tab à esquerda ou à direita
                const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
                newActiveId = newTabs[newActiveIndex].id;
                newTabs[newActiveIndex] = { ...newTabs[newActiveIndex], isActive: true };
            }

            return { tabs: newTabs, activeTabId: newActiveId };
        });
    }, []);

    // Fechar todas as tabs
    const closeAllTabs = useCallback((): void => {
        const newTab = createNewTab();
        newTab.isActive = true;
        setState({ tabs: [newTab], activeTabId: newTab.id });
    }, []);

    // Fechar outras tabs
    const closeOtherTabs = useCallback((exceptId: string): void => {
        setState(prev => {
            const keepTab = prev.tabs.find(t => t.id === exceptId);
            if (!keepTab) return prev;

            const pinnedTabs = prev.tabs.filter(t => t.isPinned && t.id !== exceptId);
            const activeTab = { ...keepTab, isActive: true };

            return {
                tabs: [...pinnedTabs, activeTab],
                activeTabId: exceptId,
            };
        });
    }, []);

    // Fechar tabs à direita
    const closeTabsToRight = useCallback((fromId: string): void => {
        setState(prev => {
            const fromIndex = prev.tabs.findIndex(t => t.id === fromId);
            if (fromIndex === -1) return prev;

            const newTabs = prev.tabs.slice(0, fromIndex + 1);
            const activeStillExists = newTabs.some(t => t.id === prev.activeTabId);

            return {
                tabs: newTabs,
                activeTabId: activeStillExists ? prev.activeTabId : fromId,
            };
        });
    }, []);

    // Ativar tab
    const activateTab = useCallback((id: string): void => {
        setState(prev => {
            const tabs = prev.tabs.map(t => ({
                ...t,
                isActive: t.id === id,
                lastAccessedAt: t.id === id ? new Date() : t.lastAccessedAt,
                unreadCount: t.id === id ? 0 : t.unreadCount, // Limpar unread ao ativar
            }));

            return { tabs, activeTabId: id };
        });
    }, []);

    // Renomear tab
    const renameTab = useCallback((id: string, title: string): void => {
        setState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t => t.id === id ? { ...t, title } : t),
        }));
    }, []);

    // Pin/unpin
    const pinTab = useCallback((id: string): void => {
        setState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t => t.id === id ? { ...t, isPinned: true } : t),
        }));
    }, []);

    const unpinTab = useCallback((id: string): void => {
        setState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t => t.id === id ? { ...t, isPinned: false } : t),
        }));
    }, []);

    const togglePin = useCallback((id: string): void => {
        setState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t),
        }));
    }, []);

    // Unread count
    const updateUnread = useCallback((id: string, count: number): void => {
        setState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t => t.id === id ? { ...t, unreadCount: count } : t),
        }));
    }, []);

    const incrementUnread = useCallback((id: string): void => {
        setState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t =>
                t.id === id && !t.isActive
                    ? { ...t, unreadCount: t.unreadCount + 1 }
                    : t
            ),
        }));
    }, []);

    const clearUnread = useCallback((id: string): void => {
        setState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t => t.id === id ? { ...t, unreadCount: 0 } : t),
        }));
    }, []);

    // Loading/Error states
    const setLoading = useCallback((id: string, loading: boolean): void => {
        setState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t => t.id === id ? { ...t, isLoading: loading } : t),
        }));
    }, []);

    const setError = useCallback((id: string, hasError: boolean): void => {
        setState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t => t.id === id ? { ...t, hasError } : t),
        }));
    }, []);

    // Table context
    const setTableContext = useCallback((id: string, tableName: string | undefined): void => {
        setState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t => t.id === id ? { ...t, tableContext: tableName } : t),
        }));
    }, []);

    // Session ID
    const setSessionId = useCallback((id: string, sessionId: string | null): void => {
        setState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t => t.id === id ? { ...t, sessionId } : t),
        }));
    }, []);

    // Reordenar tabs
    const reorderTabs = useCallback((fromIndex: number, toIndex: number): void => {
        setState(prev => {
            const newTabs = [...prev.tabs];
            const [removed] = newTabs.splice(fromIndex, 1);
            newTabs.splice(toIndex, 0, removed);
            return { ...prev, tabs: newTabs };
        });
    }, []);

    // Duplicar tab
    const duplicateTab = useCallback((id: string): ChatTab | null => {
        const tab = state.tabs.find(t => t.id === id);
        if (!tab || state.tabs.length >= MAX_TABS) return null;

        const newTab = createNewTab(`${tab.title} (cópia)`, tab.sessionId);
        newTab.tableContext = tab.tableContext;

        setState(prev => {
            const updatedTabs = prev.tabs.map(t => ({ ...t, isActive: false }));
            newTab.isActive = true;
            return {
                tabs: [...updatedTabs, newTab],
                activeTabId: newTab.id,
            };
        });

        return newTab;
    }, [state.tabs]);

    // Getters
    const getActiveTab = useCallback((): ChatTab | null => {
        return state.tabs.find(t => t.isActive) || null;
    }, [state.tabs]);

    const getTabById = useCallback((id: string): ChatTab | null => {
        return state.tabs.find(t => t.id === id) || null;
    }, [state.tabs]);

    return {
        // State
        tabs: state.tabs,
        activeTabId: state.activeTabId,

        // Actions
        createTab,
        closeTab,
        closeAllTabs,
        closeOtherTabs,
        closeTabsToRight,
        activateTab,
        renameTab,
        pinTab,
        unpinTab,
        togglePin,
        updateUnread,
        incrementUnread,
        clearUnread,
        setLoading,
        setError,
        setTableContext,
        setSessionId,
        reorderTabs,
        duplicateTab,
        getActiveTab,
        getTabById,
    };
}

export default useTabs;
