/**
 * TabBar Component
 * Barra de abas premium para múltiplas conversas
 */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    X,
    Pin,
    MessageSquare,
    Loader2,
    AlertCircle,
    Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatTab } from '@/types/tabs';

interface TabBarProps {
    tabs: ChatTab[];
    activeTabId: string | null;
    onSelect: (id: string) => void;
    onCreate: () => void;
    onClose: (id: string) => void;
    onPin: (id: string) => void;
    onRename?: (id: string, title: string) => void;
    onContextMenu?: (id: string, event: React.MouseEvent) => void;
    className?: string;
}

/**
 * Tab Item Component
 */
const TabItem: React.FC<{
    tab: ChatTab;
    isActive: boolean;
    onSelect: () => void;
    onClose: () => void;
    onPin: () => void;
    onContextMenu?: (event: React.MouseEvent) => void;
}> = ({ tab, isActive, onSelect, onClose, onPin, onContextMenu }) => {
    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose();
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -20 }}
            transition={{ duration: 0.2 }}
            className={cn(
                'group relative flex items-center gap-2 px-3 py-2 rounded-t-lg cursor-pointer',
                'min-w-[120px] max-w-[200px]',
                'transition-all duration-200',
                'border-t border-x',
                isActive
                    ? 'bg-slate-800/90 border-gold-500/30 text-gold-100 z-10'
                    : 'bg-slate-900/50 border-slate-700/30 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
                tab.hasError && 'border-red-500/50',
            )}
            onClick={onSelect}
            onContextMenu={onContextMenu}
        >
            {/* Icon */}
            <div className="flex-shrink-0 w-4 h-4">
                {tab.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                ) : tab.hasError ? (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                ) : tab.tableContext ? (
                    <Database className="w-4 h-4 text-gold-500/70" />
                ) : (
                    <MessageSquare className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
                )}
            </div>

            {/* Title */}
            <span className="truncate text-sm font-medium flex-1">
                {tab.title}
            </span>

            {/* Badges */}
            <div className="flex items-center gap-1 flex-shrink-0">
                {/* Unread badge */}
                {tab.unreadCount > 0 && !isActive && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-gold-500 text-xs font-bold text-slate-900"
                    >
                        {tab.unreadCount > 9 ? '9+' : tab.unreadCount}
                    </motion.span>
                )}

                {/* Pin indicator */}
                {tab.isPinned && (
                    <Pin
                        className="w-3 h-3 text-gold-400 fill-current cursor-pointer hover:text-gold-300"
                        onClick={(e) => {
                            e.stopPropagation();
                            onPin();
                        }}
                    />
                )}

                {/* Close button */}
                {!tab.isPinned && (
                    <button
                        onClick={handleClose}
                        className={cn(
                            'p-0.5 rounded opacity-0 transition-all duration-200',
                            'group-hover:opacity-100',
                            'hover:bg-slate-600 hover:text-red-400',
                            isActive && 'opacity-100'
                        )}
                        title="Fechar aba"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Active indicator */}
            {isActive && (
                <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400"
                    transition={{ duration: 0.2 }}
                />
            )}

            {/* Table context badge */}
            {tab.tableContext && (
                <div
                    className="absolute -top-1 -right-1 px-1 py-0.5 rounded text-[10px] bg-gold-500/20 text-gold-300 border border-gold-500/30"
                    title={`Tabela: ${tab.tableContext}`}
                >
                    {tab.tableContext.substring(0, 8)}
                </div>
            )}
        </motion.div>
    );
};

/**
 * TabBar Component
 */
export const TabBar: React.FC<TabBarProps> = ({
    tabs,
    activeTabId,
    onSelect,
    onCreate,
    onClose,
    onPin,
    onContextMenu,
    className,
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Scroll active tab into view
    useEffect(() => {
        if (activeTabId && scrollContainerRef.current) {
            const activeTab = scrollContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
            if (activeTab) {
                activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeTabId]);

    // Separar tabs pinadas das normais
    const pinnedTabs = tabs.filter(t => t.isPinned);
    const normalTabs = tabs.filter(t => !t.isPinned);
    const sortedTabs = [...pinnedTabs, ...normalTabs];

    return (
        <div
            className={cn(
                'flex items-end gap-1 px-2 pt-2',
                'bg-gradient-to-b from-slate-900/80 to-slate-900/50',
                'backdrop-blur-sm',
                'border-b border-slate-700/50',
                className
            )}
        >
            {/* New Tab Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCreate}
                className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg mb-1',
                    'bg-slate-800/50 hover:bg-slate-700/50',
                    'border border-slate-600/30 hover:border-gold-500/30',
                    'text-slate-400 hover:text-gold-400',
                    'transition-all duration-200'
                )}
                title="Nova aba (Ctrl+T)"
            >
                <Plus className="w-4 h-4" />
            </motion.button>

            {/* Tabs Container */}
            <div
                ref={scrollContainerRef}
                className="flex-1 flex items-end gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                style={{ scrollbarWidth: 'thin' }}
            >
                <AnimatePresence mode="popLayout">
                    {sortedTabs.map((tab) => (
                        <div key={tab.id} data-tab-id={tab.id}>
                            <TabItem
                                tab={tab}
                                isActive={tab.id === activeTabId}
                                onSelect={() => onSelect(tab.id)}
                                onClose={() => onClose(tab.id)}
                                onPin={() => onPin(tab.id)}
                                onContextMenu={onContextMenu ? (e) => onContextMenu(tab.id, e) : undefined}
                            />
                        </div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default TabBar;
