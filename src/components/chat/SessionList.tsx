/**
 * SessionList - Component for displaying and managing chat sessions
 * 
 * Shows a list of persistent chat sessions with actions to create, select, and delete
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Trash2, Database, Clock, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { fadeInUp, staggerContainer } from '@/styles/animations';
import type { SessionSummary } from '@/hooks/useSessionHistory';

// =============================================
// Types
// =============================================

interface SessionListProps {
    sessions: SessionSummary[];
    activeSessionId: string | null;
    loading: boolean;
    onSelectSession: (id: string) => void;
    onCreateSession: () => void;
    onDeleteSession: (id: string) => void;
}

// =============================================
// Helper
// =============================================

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// =============================================
// Component
// =============================================

export function SessionList({
    sessions,
    activeSessionId,
    loading,
    onSelectSession,
    onCreateSession,
    onDeleteSession,
}: SessionListProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

    const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        setSessionToDelete(sessionId);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (sessionToDelete) {
            onDeleteSession(sessionToDelete);
        }
        setDeleteDialogOpen(false);
        setSessionToDelete(null);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gold-400" />
                    <span className="text-sm font-medium">Conversas</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-gold-400/10 hover:text-gold-400 transition-colors"
                    onClick={onCreateSession}
                    disabled={loading}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {/* Session List */}
            <ScrollArea className="flex-1">
                <div className="px-2 pb-2">
                    {/* Loading State */}
                    {loading && sessions.length === 0 && (
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-full bg-secondary/50" />
                            <Skeleton className="h-12 w-full bg-secondary/50" />
                            <Skeleton className="h-12 w-full bg-secondary/50" />
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && sessions.length === 0 && (
                        <div className="flex flex-col items-center gap-2 p-4 text-center">
                            <MessageSquare className="h-8 w-8 text-gold-400/30" />
                            <p className="text-xs text-muted-foreground">
                                Nenhuma conversa ainda
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-gold-400/20 hover:bg-gold-400/10 hover:text-gold-400"
                                onClick={onCreateSession}
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                Nova conversa
                            </Button>
                        </div>
                    )}

                    {/* Sessions */}
                    <motion.div
                        initial="initial"
                        animate="animate"
                        variants={staggerContainer}
                        className="space-y-1"
                    >
                        <AnimatePresence mode="popLayout">
                            {sessions.map((session) => (
                                <motion.div
                                    key={session.id}
                                    variants={fadeInUp}
                                    exit={{ opacity: 0, x: -20 }}
                                    layout
                                >
                                    <button
                                        type="button"
                                        onClick={() => onSelectSession(session.id)}
                                        className={cn(
                                            'w-full px-2 py-2 rounded-lg text-left transition-all duration-200 group',
                                            activeSessionId === session.id
                                                ? 'bg-gold-400/15 border border-gold-400/20'
                                                : 'hover:bg-gold-400/5 border border-transparent'
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className={cn(
                                                    'text-sm truncate font-medium',
                                                    activeSessionId === session.id ? 'text-gold-400' : ''
                                                )}>
                                                    {session.title}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {session.tableContext && (
                                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                            <Database className="h-2.5 w-2.5" />
                                                            {session.tableContext}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                        <Clock className="h-2.5 w-2.5" />
                                                        {formatRelativeTime(session.updatedAt)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions Menu */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn(
                                                            'h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity',
                                                            'hover:bg-gold-400/10 hover:text-gold-400'
                                                        )}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MoreHorizontal className="h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-32">
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={(e) => handleDeleteClick(e as unknown as React.MouseEvent, session.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3 mr-2" />
                                                        Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </ScrollArea>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A conversa e todas as mensagens serão excluídas permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default SessionList;
