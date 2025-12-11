/**
 * Chat Session Service
 * Manages in-memory chat session storage with TTL-based cleanup
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';
import type { ChatMessage, ChatSession, ChatSessionStats } from '@ai-assistant/shared';

/**
 * Serviço de gerenciamento de sessões de chat
 * 
 * STORAGE:
 * - In-memory Map (fase MVP)
 * - Futuramente: Redis ou PostgreSQL
 * 
 * TTL:
 * - Sessões inativas por 24h são removidas automaticamente
 * - Cleanup executado a cada 1 hora
 */
class ChatSessionService {
  private sessions: Map<string, ChatSession>;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private readonly SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hora
  private readonly MAX_MESSAGES_PER_SESSION = 1000; // Limite de mensagens

  constructor() {
    this.sessions = new Map();
    this.startCleanupTask();
    
    logger.info('ChatSessionService initialized', {
      ttlHours: this.SESSION_TTL_MS / (60 * 60 * 1000),
      cleanupIntervalMinutes: this.CLEANUP_INTERVAL_MS / (60 * 1000),
      maxMessagesPerSession: this.MAX_MESSAGES_PER_SESSION
    });
  }

  /**
   * Cria nova sessão ou retorna existente
   * 
   * @param sessionId - UUID da sessão (opcional, gera se não fornecido)
   * @returns sessionId da sessão criada/existente
   */
  createOrGetSession(sessionId?: string): string {
    const id = sessionId || uuidv4();
    
    // Se sessão já existe, retornar sessionId
    if (this.sessions.has(id)) {
      logger.debug('Returning existing session:', { sessionId: id });
      return id;
    }
    
    // Criar nova sessão
    const newSession: ChatSession = {
      sessionId: id,
      messages: [],
      createdAt: new Date(),
      lastMessageAt: new Date(),
      metadata: {
        queriesExecuted: 0,
        tablesAccessed: []
      }
    };
    
    this.sessions.set(id, newSession);
    
    logger.info('New chat session created:', { 
      sessionId: id,
      totalActiveSessions: this.sessions.size 
    });
    
    return id;
  }

  /**
   * Adiciona mensagem ao histórico da sessão
   * 
   * @param sessionId - UUID da sessão
   * @param message - Mensagem (user ou assistant)
   */
  addMessage(sessionId: string, message: ChatMessage): void {
    // Buscar ou criar sessão
    if (!this.sessions.has(sessionId)) {
      this.createOrGetSession(sessionId);
    }
    
    const session = this.sessions.get(sessionId)!;
    
    // Verificar limite de mensagens
    if (session.messages.length >= this.MAX_MESSAGES_PER_SESSION) {
      // Remover mensagens mais antigas (manter últimas 80%)
      const keepCount = Math.floor(this.MAX_MESSAGES_PER_SESSION * 0.8);
      session.messages = session.messages.slice(-keepCount);
      logger.warn('Session message limit reached, trimmed old messages:', {
        sessionId,
        removedCount: this.MAX_MESSAGES_PER_SESSION - keepCount
      });
    }
    
    // Adicionar mensagem
    session.messages.push(message);
    session.lastMessageAt = new Date();
    
    // Atualizar metadata se mensagem tem queryExecuted
    if (message.metadata?.queryExecuted) {
      session.metadata.queriesExecuted++;
    }
    
    // Adicionar tabela usada (sem duplicatas)
    if (message.metadata?.tableUsed) {
      const table = message.metadata.tableUsed;
      if (!session.metadata.tablesAccessed.includes(table)) {
        session.metadata.tablesAccessed.push(table);
      }
    }
    
    // Atualizar sessão no Map
    this.sessions.set(sessionId, session);
    
    logger.debug('Message added to session:', {
      sessionId,
      role: message.role,
      totalMessages: session.messages.length
    });
  }

  /**
   * Recupera histórico completo de uma sessão
   * 
   * @param sessionId - UUID da sessão
   * @returns ChatSession ou null se não encontrada
   */
  getSession(sessionId: string): ChatSession | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      logger.debug('Session not found:', { sessionId });
      return null;
    }
    
    logger.debug('Session retrieved:', {
      sessionId,
      messageCount: session.messages.length
    });
    
    // Retornar cópia da sessão
    return {
      ...session,
      messages: [...session.messages],
      metadata: { ...session.metadata, tablesAccessed: [...session.metadata.tablesAccessed] }
    };
  }

  /**
   * Lista todas as sessões ativas
   * (útil para debug/admin)
   * 
   * @returns Array de sessionIds ativos
   */
  listActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Remove sessão específica
   * 
   * @param sessionId - UUID da sessão
   * @returns true se removida, false se não existia
   */
  deleteSession(sessionId: string): boolean {
    if (!this.sessions.has(sessionId)) {
      logger.debug('Session not found for deletion:', { sessionId });
      return false;
    }
    
    this.sessions.delete(sessionId);
    
    logger.info('Session deleted:', {
      sessionId,
      remainingSessions: this.sessions.size
    });
    
    return true;
  }

  /**
   * Remove todas as sessões
   * (útil para testes ou reset manual)
   */
  clearAllSessions(): void {
    const count = this.sessions.size;
    this.sessions.clear();
    
    logger.warn('All chat sessions cleared:', { removedCount: count });
  }

  /**
   * Inicia tarefa de limpeza automática
   * Remove sessões inativas (lastMessageAt > 24h atrás)
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, this.CLEANUP_INTERVAL_MS);
    
    logger.debug('Cleanup task started', {
      intervalMs: this.CLEANUP_INTERVAL_MS
    });
  }

  /**
   * Remove sessões inativas baseado em TTL
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const lastMessageTime = new Date(session.lastMessageAt).getTime();
      const inactiveTime = now - lastMessageTime;

      if (inactiveTime > this.SESSION_TTL_MS) {
        this.sessions.delete(sessionId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info(`Cleaned up ${removedCount} inactive session(s)`, {
        remainingSessions: this.sessions.size
      });
    }
  }

  /**
   * Para o serviço e cleanup task
   * (chamado no shutdown da aplicação)
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    const sessionCount = this.sessions.size;
    this.sessions.clear();
    
    logger.info('ChatSessionService shutdown complete', {
      sessionsCleared: sessionCount
    });
  }

  /**
   * Retorna estatísticas do serviço
   * (útil para monitoring/health check)
   */
  getStats(): ChatSessionStats {
    let totalMessages = 0;
    let oldestCreatedAt: Date | null = null;
    
    for (const session of this.sessions.values()) {
      totalMessages += session.messages.length;
      
      if (!oldestCreatedAt || session.createdAt < oldestCreatedAt) {
        oldestCreatedAt = session.createdAt;
      }
    }
    
    const oldestSessionAge = oldestCreatedAt 
      ? Date.now() - new Date(oldestCreatedAt).getTime()
      : null;
    
    return {
      activeSessions: this.sessions.size,
      totalMessages,
      oldestSessionAge
    };
  }
}

export const chatSessionService = new ChatSessionService();
