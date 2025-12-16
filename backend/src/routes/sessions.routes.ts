/**
 * Session Routes - Persistent Chat Sessions (Supabase)
 * 
 * These routes handle persistent storage of chat sessions,
 * separate from the in-memory session management.
 */

import { Router, Request, Response } from 'express';
import { historyService } from '../services';
import { logger } from '../config/logger';
import { validateSessionIdParam } from '../validators/chat.validator';

const router = Router();

/**
 * GET /api/sessions
 * 
 * List all persistent sessions (non-archived)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

        const sessions = await historyService.listSessions(limit);

        // Transform to include title for frontend display
        const sessionsWithMeta = sessions.map(session => ({
            id: session.id,
            title: session.title,
            tableContext: session.table_context,
            createdAt: session.created_at,
            updatedAt: session.updated_at,
            isArchived: session.is_archived,
        }));

        logger.info('Listed persistent sessions:', { count: sessions.length });

        res.json({
            success: true,
            data: sessionsWithMeta,
        });
    } catch (error) {
        logger.error('Failed to list sessions:', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to list sessions',
        });
    }
});

/**
 * POST /api/sessions
 * 
 * Create a new persistent session
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { title, tableContext } = req.body;

        const session = await historyService.createSession(title, tableContext);

        logger.info('Created persistent session:', { sessionId: session.id });

        res.status(201).json({
            success: true,
            data: {
                id: session.id,
                title: session.title,
                tableContext: session.table_context,
                createdAt: session.created_at,
                updatedAt: session.updated_at,
            },
        });
    } catch (error) {
        logger.error('Failed to create session:', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to create session',
        });
    }
});

/**
 * GET /api/sessions/:id
 * 
 * Get a specific session with its messages
 */
router.get('/:id', validateSessionIdParam, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const session = await historyService.getSession(id);

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found',
            });
        }

        const messages = await historyService.getMessages(id);
        const chatMessages = historyService.dbMessagesToChatMessages(messages);

        res.json({
            success: true,
            data: {
                id: session.id,
                title: session.title,
                tableContext: session.table_context,
                createdAt: session.created_at,
                updatedAt: session.updated_at,
                messages: chatMessages,
            },
        });
    } catch (error) {
        logger.error('Failed to get session:', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to get session',
        });
    }
});

/**
 * PATCH /api/sessions/:id
 * 
 * Update session (title, tableContext)
 */
router.patch('/:id', validateSessionIdParam, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, tableContext } = req.body;

        const session = await historyService.getSession(id);

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found',
            });
        }

        if (title !== undefined) {
            await historyService.updateSessionTitle(id, title);
        }

        if (tableContext !== undefined) {
            await historyService.updateSessionTableContext(id, tableContext);
        }

        const updated = await historyService.getSession(id);

        res.json({
            success: true,
            data: {
                id: updated!.id,
                title: updated!.title,
                tableContext: updated!.table_context,
                updatedAt: updated!.updated_at,
            },
        });
    } catch (error) {
        logger.error('Failed to update session:', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to update session',
        });
    }
});

/**
 * DELETE /api/sessions/:id
 * 
 * Delete a session and all its messages
 */
router.delete('/:id', validateSessionIdParam, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const session = await historyService.getSession(id);

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found',
            });
        }

        await historyService.deleteSession(id);

        res.json({
            success: true,
            message: 'Session deleted successfully',
        });
    } catch (error) {
        logger.error('Failed to delete session:', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to delete session',
        });
    }
});

/**
 * GET /api/sessions/:id/messages
 * 
 * Get messages for a session
 */
router.get('/:id/messages', validateSessionIdParam, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const session = await historyService.getSession(id);

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found',
            });
        }

        const messages = await historyService.getMessages(id);
        const chatMessages = historyService.dbMessagesToChatMessages(messages);

        res.json({
            success: true,
            data: chatMessages,
        });
    } catch (error) {
        logger.error('Failed to get messages:', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to get messages',
        });
    }
});

/**
 * POST /api/sessions/:id/messages
 * 
 * Add a message to a session
 */
router.post('/:id/messages', validateSessionIdParam, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { role, content, metadata } = req.body;

        if (!role || !content) {
            return res.status(400).json({
                success: false,
                error: 'Role and content are required',
            });
        }

        if (role !== 'user' && role !== 'assistant') {
            return res.status(400).json({
                success: false,
                error: 'Role must be "user" or "assistant"',
            });
        }

        const session = await historyService.getSession(id);

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found',
            });
        }

        const message = await historyService.addMessage(id, role, content, metadata || {});

        res.status(201).json({
            success: true,
            data: {
                id: message.id,
                role: message.role,
                content: message.content,
                createdAt: message.created_at,
                metadata: message.metadata,
            },
        });
    } catch (error) {
        logger.error('Failed to add message:', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to add message',
        });
    }
});

/**
 * POST /api/sessions/:id/archive
 * 
 * Archive a session (soft delete)
 */
router.post('/:id/archive', validateSessionIdParam, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const session = await historyService.getSession(id);

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found',
            });
        }

        await historyService.archiveSession(id);

        res.json({
            success: true,
            message: 'Session archived successfully',
        });
    } catch (error) {
        logger.error('Failed to archive session:', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to archive session',
        });
    }
});

export default router;
