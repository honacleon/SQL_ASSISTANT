/**
 * useTabShortcuts Hook
 * Atalhos de teclado para navegação de abas
 */

import { useEffect, useCallback } from 'react';

interface TabShortcutsProps {
    onNewTab: () => void;
    onCloseTab: () => void;
    onNextTab: () => void;
    onPrevTab: () => void;
    onGoToTab: (index: number) => void;
    enabled?: boolean;
}

/**
 * Hook para gerenciar atalhos de teclado das abas
 * 
 * Atalhos:
 * - Ctrl+T: Nova aba
 * - Ctrl+W: Fechar aba atual
 * - Ctrl+Tab: Próxima aba
 * - Ctrl+Shift+Tab: Aba anterior
 * - Ctrl+1-9: Ir para aba específica
 */
export function useTabShortcuts({
    onNewTab,
    onCloseTab,
    onNextTab,
    onPrevTab,
    onGoToTab,
    enabled = true,
}: TabShortcutsProps): void {

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;

        // Ignorar se estiver digitando em input/textarea
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            // Permitir apenas Escape nestes elementos
            if (event.key !== 'Escape') return;
        }

        const isCtrl = event.ctrlKey || event.metaKey;

        // Ctrl+T: Nova aba
        if (isCtrl && event.key === 't') {
            event.preventDefault();
            onNewTab();
            return;
        }

        // Ctrl+W: Fechar aba
        if (isCtrl && event.key === 'w') {
            event.preventDefault();
            onCloseTab();
            return;
        }

        // Ctrl+Tab / Ctrl+Shift+Tab: Navegar entre abas
        if (isCtrl && event.key === 'Tab') {
            event.preventDefault();
            if (event.shiftKey) {
                onPrevTab();
            } else {
                onNextTab();
            }
            return;
        }

        // Ctrl+1-9: Ir para aba específica
        if (isCtrl && event.key >= '1' && event.key <= '9') {
            event.preventDefault();
            const index = parseInt(event.key) - 1;
            onGoToTab(index);
            return;
        }
    }, [enabled, onNewTab, onCloseTab, onNextTab, onPrevTab, onGoToTab]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

export default useTabShortcuts;
