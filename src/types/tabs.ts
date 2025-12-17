/**
 * Tab Types
 * Tipos para o sistema de abas do chat
 */

export interface ChatTab {
    id: string;
    sessionId: string | null;
    title: string;
    tableContext?: string;
    isActive: boolean;
    isPinned: boolean;
    unreadCount: number;
    isLoading: boolean;
    hasError: boolean;
    createdAt: Date;
    lastAccessedAt: Date;
}

export interface TabState {
    tabs: ChatTab[];
    activeTabId: string | null;
}

export interface TabActions {
    createTab: (title?: string, sessionId?: string | null) => ChatTab;
    closeTab: (id: string) => void;
    closeAllTabs: () => void;
    closeOtherTabs: (exceptId: string) => void;
    closeTabsToRight: (fromId: string) => void;
    activateTab: (id: string) => void;
    renameTab: (id: string, title: string) => void;
    pinTab: (id: string) => void;
    unpinTab: (id: string) => void;
    togglePin: (id: string) => void;
    updateUnread: (id: string, count: number) => void;
    incrementUnread: (id: string) => void;
    clearUnread: (id: string) => void;
    setLoading: (id: string, loading: boolean) => void;
    setError: (id: string, hasError: boolean) => void;
    setTableContext: (id: string, tableName: string | undefined) => void;
    setSessionId: (id: string, sessionId: string | null) => void;
    reorderTabs: (fromIndex: number, toIndex: number) => void;
    duplicateTab: (id: string) => ChatTab | null;
    getActiveTab: () => ChatTab | null;
    getTabById: (id: string) => ChatTab | null;
}

export type UseTabsReturn = TabState & TabActions;
