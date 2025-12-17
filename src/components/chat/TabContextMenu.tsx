/**
 * TabContextMenu Component
 * Menu de contexto (right-click) para abas
 */

import React, { useState } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import {
    X,
    XCircle,
    ChevronRight,
    Pin,
    PinOff,
    Copy,
    Pencil,
    Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatTab } from '@/types/tabs';

interface TabContextMenuProps {
    tab: ChatTab;
    children: React.ReactNode;
    onClose: () => void;
    onCloseOthers: () => void;
    onCloseToRight: () => void;
    onPin: () => void;
    onUnpin: () => void;
    onDuplicate: () => void;
    onRename: (newTitle: string) => void;
}

const menuItemStyles = cn(
    'relative flex items-center gap-2 px-3 py-2 rounded-md text-sm',
    'cursor-pointer outline-none select-none',
    'text-slate-300',
    'data-[highlighted]:bg-slate-700/80 data-[highlighted]:text-white',
    'transition-colors duration-150'
);

const separatorStyles = cn(
    'h-px my-1 bg-slate-700'
);

export const TabContextMenu: React.FC<TabContextMenuProps> = ({
    tab,
    children,
    onClose,
    onCloseOthers,
    onCloseToRight,
    onPin,
    onUnpin,
    onDuplicate,
    onRename,
}) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(tab.title);

    const handleRenameSubmit = () => {
        if (renameValue.trim() && renameValue !== tab.title) {
            onRename(renameValue.trim());
        }
        setIsRenaming(false);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRenameSubmit();
        } else if (e.key === 'Escape') {
            setRenameValue(tab.title);
            setIsRenaming(false);
        }
    };

    // Se estiver renomeando, mostrar input inline
    if (isRenaming) {
        return (
            <div className="relative">
                <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={handleRenameKeyDown}
                    className={cn(
                        'absolute top-0 left-0 right-0 z-50',
                        'px-2 py-1 text-sm rounded-md',
                        'bg-slate-800 border border-gold-500/50',
                        'text-white outline-none',
                        'focus:border-gold-400'
                    )}
                    autoFocus
                />
                {children}
            </div>
        );
    }

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
                {children}
            </ContextMenu.Trigger>

            <ContextMenu.Portal>
                <ContextMenu.Content
                    className={cn(
                        'min-w-[180px] p-1 rounded-lg',
                        'bg-slate-800/95 backdrop-blur-md',
                        'border border-slate-600/50',
                        'shadow-xl shadow-black/30',
                        'z-50'
                    )}
                >
                    {/* Renomear */}
                    <ContextMenu.Item
                        className={menuItemStyles}
                        onClick={() => setIsRenaming(true)}
                    >
                        <Pencil className="w-4 h-4 text-slate-400" />
                        <span>Renomear</span>
                    </ContextMenu.Item>

                    {/* Pin/Unpin */}
                    {tab.isPinned ? (
                        <ContextMenu.Item className={menuItemStyles} onClick={onUnpin}>
                            <PinOff className="w-4 h-4 text-slate-400" />
                            <span>Desafixar</span>
                        </ContextMenu.Item>
                    ) : (
                        <ContextMenu.Item className={menuItemStyles} onClick={onPin}>
                            <Pin className="w-4 h-4 text-slate-400" />
                            <span>Fixar</span>
                        </ContextMenu.Item>
                    )}

                    {/* Duplicar */}
                    <ContextMenu.Item className={menuItemStyles} onClick={onDuplicate}>
                        <Copy className="w-4 h-4 text-slate-400" />
                        <span>Duplicar</span>
                    </ContextMenu.Item>

                    <ContextMenu.Separator className={separatorStyles} />

                    {/* Fechar */}
                    <ContextMenu.Item
                        className={cn(menuItemStyles, !tab.isPinned && 'data-[highlighted]:text-red-300')}
                        onClick={onClose}
                        disabled={tab.isPinned}
                    >
                        <X className="w-4 h-4 text-slate-400" />
                        <span>Fechar</span>
                    </ContextMenu.Item>

                    {/* Fechar outras */}
                    <ContextMenu.Item className={menuItemStyles} onClick={onCloseOthers}>
                        <XCircle className="w-4 h-4 text-slate-400" />
                        <span>Fechar outras</span>
                    </ContextMenu.Item>

                    {/* Fechar à direita */}
                    <ContextMenu.Item className={menuItemStyles} onClick={onCloseToRight}>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                        <span>Fechar abas à direita</span>
                    </ContextMenu.Item>
                </ContextMenu.Content>
            </ContextMenu.Portal>
        </ContextMenu.Root>
    );
};

export default TabContextMenu;
