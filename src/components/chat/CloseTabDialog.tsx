/**
 * CloseTabDialog Component
 * Dialog de confirmação ao fechar aba com conteúdo
 */

import React from 'react';
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

interface CloseTabDialogProps {
    open: boolean;
    tabTitle: string;
    messageCount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

export const CloseTabDialog: React.FC<CloseTabDialogProps> = ({
    open,
    tabTitle,
    messageCount,
    onConfirm,
    onCancel,
}) => {
    return (
        <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
            <AlertDialogContent className="bg-slate-900 border-slate-700">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">
                        Fechar "{tabTitle}"?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                        {messageCount > 0
                            ? `Esta conversa tem ${messageCount} mensagem${messageCount > 1 ? 's' : ''}. Tem certeza que deseja fechar?`
                            : 'Esta aba está carregando. Tem certeza que deseja fechar?'
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={onCancel}
                        className="bg-slate-800 hover:bg-slate-700 text-white border-slate-600"
                    >
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        Fechar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default CloseTabDialog;
