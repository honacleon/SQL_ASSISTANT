/**
 * ChatInterface - Reusable chat component for AI assistant
 * Renders message history, allows sending new messages, displays loading state
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '@ai-assistant/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Send, Trash2, Bot, User, Loader2, Database } from 'lucide-react';
import toast from 'react-hot-toast';

// ==================== Types ====================

export interface ChatInterfaceProps {
  /** Mensagens da sessão atual, em ordem cronológica */
  messages: ChatMessage[];

  /** Enviar nova mensagem de usuário */
  onSendMessage: (message: string) => Promise<void> | void;

  /** Limpar histórico da sessão atual (opcional) */
  onClearHistory?: () => Promise<void> | void;

  /** Estado de carregamento (enquanto a API responde) */
  loading?: boolean;

  /** Desabilitar input manualmente (ex: sem IA configurada) */
  disabled?: boolean;

  /** Tabela atual em foco, usada como contexto visual */
  currentTable?: string;

  /** Mensagem de erro opcional para exibir acima do input */
  errorMessage?: string;

  /** Placeholder customizado para o input */
  placeholder?: string;
}

// ==================== Sub-components ====================

interface ChatBubbleProps {
  message: ChatMessage;
  index?: number;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, index = 0 }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        'flex gap-2',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-gold-400/20 ring-1 ring-gold-400/30">
          <Bot className="h-4 w-4 text-gold-400" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-md transition-all duration-200',
          isUser
            ? 'bg-gradient-to-br from-gold-500 to-gold-600 text-white rounded-br-sm shadow-gold-500/20'
            : 'bg-secondary/80 text-foreground rounded-bl-sm border border-border/50'
        )}
      >
        {/* Conteúdo principal */}
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Metadados opcionais */}
        {message.metadata?.tableUsed && (
          <div className={cn(
            "mt-1 text-[10px]",
            isUser ? "text-white/70" : "text-muted-foreground"
          )}>
            Tabela: {message.metadata.tableUsed}
          </div>
        )}

        {message.metadata?.executionTime != null && (
          <div className={cn(
            "text-[10px]",
            isUser ? "text-white/70" : "text-muted-foreground"
          )}>
            Tempo: {message.metadata.executionTime}ms
          </div>
        )}
      </div>

      {isUser && (
        <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-500 text-white shadow-md shadow-gold-500/30">
          <User className="h-4 w-4" />
        </div>
      )}
    </motion.div>
  );
};

// ==================== Main Component ====================

export function ChatInterface({
  messages,
  onSendMessage,
  onClearHistory,
  loading = false,
  disabled = false,
  currentTable,
  errorMessage,
  placeholder = 'Pergunte algo sobre seus dados...'
}: ChatInterfaceProps) {
  // Estado local para o input de mensagem
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ref para autoscroll no final da lista
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  // Autoscroll sempre que messages mudar
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handler de envio de mensagem
  const handleSend = useCallback(async () => {
    if (disabled || loading || isSubmitting || input.trim().length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSendMessage(input.trim());
      setInput('');
    } catch (error) {
      // Error handling is done by parent component
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [disabled, loading, isSubmitting, input, onSendMessage]);

  // Handler de teclado (Enter para enviar, Shift+Enter para quebra de linha)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Handler de limpar histórico
  const handleClear = useCallback(async () => {
    if (!onClearHistory) return;

    const confirmed = window.confirm(
      'Tem certeza que deseja limpar o histórico desta sessão?'
    );

    if (confirmed) {
      try {
        await onClearHistory();
        toast.success('Histórico limpo!');
      } catch (error) {
        console.error('Error clearing history:', error);
        toast.error('Falha ao limpar histórico.');
      }
    }
  }, [onClearHistory]);

  return (
    <Card className="flex h-full flex-col border-gold-400/10 bg-card/95">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="h-5 w-5 text-gold-400" />
              Assistente de Dados
            </CardTitle>
            <CardDescription>
              Converse em linguagem natural sobre suas tabelas.
            </CardDescription>
          </div>
          {currentTable && (
            <Badge variant="outline" className="flex items-center gap-1 border-gold-400/30 text-gold-400">
              <Database className="h-3 w-3" />
              <span className="text-xs">{currentTable}</span>
            </Badge>
          )}
        </div>
        {onClearHistory && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={loading || isSubmitting}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold-400 hover:bg-gold-400/10 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Limpar histórico
            </Button>
          </div>
        )}
      </CardHeader>

      <Separator className="bg-border/50" />

      <CardContent className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="flex-1 pr-2">
          <div className="flex flex-col gap-4 py-2">
            {messages.length === 0 && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <Database className="h-12 w-12 text-gold-400/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma mensagem ainda.
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Faça uma pergunta sobre seus dados para começar.
                </p>
              </motion.div>
            )}

            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <ChatBubble key={message.id} message={message} index={index} />
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-xs text-gold-400"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                O assistente está pensando...
              </motion.div>
            )}

            <div ref={endOfMessagesRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <Separator />

      <CardFooter className="flex flex-col gap-2">
        {errorMessage && (
          <div className="w-full rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="flex w-full items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || loading || isSubmitting}
            rows={2}
            className="min-h-[48px] resize-none text-sm bg-secondary/50 border-border/50 focus:border-gold-400/50 focus:ring-gold-400/20 transition-colors"
            onKeyDown={handleKeyDown}
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={
              disabled ||
              loading ||
              isSubmitting ||
              input.trim().length === 0
            }
            className="flex h-9 items-center gap-1 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white shadow-md shadow-gold-500/20 transition-all hover:shadow-lg hover:shadow-gold-500/30 disabled:opacity-50 disabled:shadow-none"
          >
            {isSubmitting || loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="hidden sm:inline text-xs">Enviar</span>
          </Button>
        </div>

        <div className="flex w-full justify-between text-[10px] text-muted-foreground">
          <span>Enter para enviar • Shift+Enter para nova linha</span>
          {disabled && (
            <span>Assistente desabilitado (verifique configuração de IA)</span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

export default ChatInterface;
