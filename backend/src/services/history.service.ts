/**
 * History Service - Supabase Persistence for Chat History
 * 
 * This service handles persistent storage of chat sessions and messages
 * in Supabase PostgreSQL database.
 */

import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, ChatSession } from '@ai-assistant/shared';

// =============================================
// Types
// =============================================

interface DbSession {
    id: string;
    title: string;
    table_context: string | null;
    created_at: string;
    updated_at: string;
    is_archived: boolean;
    metadata: Record<string, unknown>;
}

interface DbMessage {
    id: string;
    session_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
    metadata: Record<string, unknown>;
}

// =============================================
// Service Class
// =============================================

class HistoryService {
    /**
     * Create a new chat session
     */
    async createSession(title?: string, tableContext?: string): Promise<DbSession> {
        try {
            const { data, error } = await supabase
                .from('chat_sessions')
                .insert({
                    title: title || 'Nova conversa',
                    table_context: tableContext || null,
                    metadata: {},
                })
                .select()
                .single();

            if (error) {
                logger.error('Failed to create session:', { error });
                throw error;
            }

            logger.info('Created new chat session:', { sessionId: data.id, title: data.title });
            return data;
        } catch (error) {
            logger.error('Error creating session:', { error });
            throw error;
        }
    }

    /**
     * Get a session by ID with its messages
     */
    async getSession(sessionId: string): Promise<DbSession | null> {
        try {
            const { data, error } = await supabase
                .from('chat_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows found
                    return null;
                }
                logger.error('Failed to get session:', { sessionId, error });
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('Error getting session:', { sessionId, error });
            throw error;
        }
    }

    /**
     * List all non-archived sessions, ordered by most recent
     */
    async listSessions(limit: number = 50): Promise<DbSession[]> {
        try {
            const { data, error } = await supabase
                .from('chat_sessions')
                .select('*')
                .eq('is_archived', false)
                .order('updated_at', { ascending: false })
                .limit(limit);

            if (error) {
                logger.error('Failed to list sessions:', { error });
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('Error listing sessions:', { error });
            throw error;
        }
    }

    /**
     * Delete a session and all its messages (CASCADE)
     */
    async deleteSession(sessionId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('chat_sessions')
                .delete()
                .eq('id', sessionId);

            if (error) {
                logger.error('Failed to delete session:', { sessionId, error });
                throw error;
            }

            logger.info('Deleted chat session:', { sessionId });
            return true;
        } catch (error) {
            logger.error('Error deleting session:', { sessionId, error });
            throw error;
        }
    }

    /**
     * Add a message to a session
     */
    async addMessage(
        sessionId: string,
        role: 'user' | 'assistant' | 'system',
        content: string,
        metadata: Record<string, unknown> = {}
    ): Promise<DbMessage> {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .insert({
                    session_id: sessionId,
                    role,
                    content,
                    metadata,
                })
                .select()
                .single();

            if (error) {
                logger.error('Failed to add message:', { sessionId, role, error });
                throw error;
            }

            logger.debug('Added message to session:', {
                sessionId,
                messageId: data.id,
                role
            });

            return data;
        } catch (error) {
            logger.error('Error adding message:', { sessionId, error });
            throw error;
        }
    }

    /**
     * Get all messages for a session
     */
    async getMessages(sessionId: string): Promise<DbMessage[]> {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });

            if (error) {
                logger.error('Failed to get messages:', { sessionId, error });
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('Error getting messages:', { sessionId, error });
            throw error;
        }
    }

    /**
     * Update session title
     */
    async updateSessionTitle(sessionId: string, title: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('chat_sessions')
                .update({ title })
                .eq('id', sessionId);

            if (error) {
                logger.error('Failed to update session title:', { sessionId, error });
                throw error;
            }

            logger.debug('Updated session title:', { sessionId, title });
        } catch (error) {
            logger.error('Error updating session title:', { sessionId, error });
            throw error;
        }
    }

    /**
     * Update session table context
     */
    async updateSessionTableContext(sessionId: string, tableContext: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('chat_sessions')
                .update({ table_context: tableContext })
                .eq('id', sessionId);

            if (error) {
                logger.error('Failed to update session table context:', { sessionId, error });
                throw error;
            }

            logger.debug('Updated session table context:', { sessionId, tableContext });
        } catch (error) {
            logger.error('Error updating session table context:', { sessionId, error });
            throw error;
        }
    }

    /**
     * Archive a session (soft delete)
     */
    async archiveSession(sessionId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('chat_sessions')
                .update({ is_archived: true })
                .eq('id', sessionId);

            if (error) {
                logger.error('Failed to archive session:', { sessionId, error });
                throw error;
            }

            logger.info('Archived chat session:', { sessionId });
        } catch (error) {
            logger.error('Error archiving session:', { sessionId, error });
            throw error;
        }
    }

    /**
     * Convert database messages to ChatMessage format for API
     * Note: Filters out 'system' messages as they're not in ChatMessage type
     */
    dbMessagesToChatMessages(dbMessages: DbMessage[]): ChatMessage[] {
        return dbMessages
            .filter(msg => msg.role === 'user' || msg.role === 'assistant')
            .map(msg => ({
                id: msg.id,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                timestamp: new Date(msg.created_at),
                metadata: msg.metadata as ChatMessage['metadata'],
            }));
    }

    /**
     * Convert database session to ChatSession format for API
     */
    async dbSessionToChatSession(dbSession: DbSession): Promise<ChatSession> {
        const messages = await this.getMessages(dbSession.id);

        return {
            sessionId: dbSession.id,
            messages: this.dbMessagesToChatMessages(messages),
            createdAt: new Date(dbSession.created_at),
            lastMessageAt: new Date(dbSession.updated_at),
            metadata: {
                queriesExecuted: 0, // Could be calculated from messages
                tablesAccessed: dbSession.table_context ? [dbSession.table_context] : [],
            },
        };
    }

    /**
     * Get session title (separate from ChatSession for API use)
     */
    getSessionTitle(dbSession: DbSession): string {
        return dbSession.title;
    }
}

// Export singleton instance
export const historyService = new HistoryService();
