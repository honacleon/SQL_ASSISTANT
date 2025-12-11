/**
 * useShortcuts - Keyboard shortcuts hook
 */

import { useEffect } from 'react';

interface UseShortcutsOptions {
  onOpenSearch?: () => void;     // Ctrl+K
  onSendChat?: () => void;       // Ctrl+Enter
  onCloseModal?: () => void;     // Esc
}

export function useShortcuts(options: UseShortcutsOptions) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Ctrl+K → abrir busca de tabelas
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault();
        options.onOpenSearch?.();
      }

      // Ctrl+Enter → enviar mensagem (Chat)
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        options.onSendChat?.();
      }

      // Esc → fechar modal
      if (event.key === 'Escape') {
        options.onCloseModal?.();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [options]);
}

export default useShortcuts;
