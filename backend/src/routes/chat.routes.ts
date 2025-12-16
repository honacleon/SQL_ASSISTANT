/**
 * Chat Routes
 * Handles natural language to SQL conversion and chat history management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { aiService, databaseService } from '../services';
import { chatSessionService } from '../services/chat-session.service';
import { logger } from '../config/logger';
import { chatMessageSchema, validateSessionIdParam } from '../validators/chat.validator';
import type {
  ChatMessage,
  ChatMessageRequest,
  ChatMessageResponse,
  NLQueryResult,
  QueryResult
} from '@ai-assistant/shared';
import type { ColumnInfo } from '@ai-assistant/shared';

function stripSqlFromText(text?: string): string {
  if (!text) return '';
  let cleaned = text;

  // Remove fenced code blocks (```...```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');

  // Remove obvious SQL lines (SELECT/INSERT/UPDATE/DELETE)
  cleaned = cleaned
    .split('\n')
    .filter((line) => !/^\s*(select|insert|update|delete|with)\b/i.test(line))
    .join('\n');

  // Remove phrases iniciando com "Esta query..." etc.
  cleaned = cleaned.replace(/Esta query.*$/gi, '');

  // Collapse extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

const router = Router();

/**
 * POST /api/chat/message
 * 
 * Processa mensagem em linguagem natural e retorna SQL + resultado
 * 
 * Body:
 * {
 *   "message": "Mostre todos os usuários ativos",
 *   "sessionId": "uuid-opcional",
 *   "context": {
 *     "currentTable": "users"
 *   }
 * }
 */
router.post('/message', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Validar request body
    const { error, value } = chatMessageSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      logger.warn('Chat message validation failed:', {
        errors: error.details.map(d => d.message)
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const request: ChatMessageRequest = value;

    // Garantir que temos sessionId
    const sessionId = request.sessionId || chatSessionService.createOrGetSession();

    logger.info('Processing chat message:', {
      sessionId,
      messageLength: request.message.length,
      hasContext: !!request.context
    });

    // Buscar tabelas disponíveis para contexto
    const tables = await databaseService.getTables();

    // Converter linguagem natural para SQL
    const nlResult: NLQueryResult = await aiService.parseNaturalLanguage({
      query: request.message,
      context: {
        availableTables: tables,
        currentTable: request.context?.currentTable,
        recentQueries: [] // TODO: buscar do histórico da sessão
      }
    });

    // Criar mensagem do usuário
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: request.message,
      timestamp: new Date(),
      metadata: {}
    };

    // Adicionar mensagem do usuário ao histórico
    chatSessionService.addMessage(sessionId, userMessage);

    // Preparar resposta
    let queryResult: QueryResult | undefined;
    let assistantContent: string;
    let executedCount: number | undefined;
    let listedValues: string[] | undefined;

    // Se precisa clarificação, não executar query
    if (nlResult.requiresClarification) {
      assistantContent = nlResult.clarificationQuestion || nlResult.explanation;
    } else {
      // Heurística simples: se o usuário perguntou quantidade/total e temos tabela sugerida, contar registros
      const wantsCount = /quantos?|quantidade|total|n[úu]mero/i.test(request.message);
      const wantsNames = /nomes?|names?/i.test(request.message);
      const targetTable = nlResult.suggestedTable || request.context?.currentTable;

      if (wantsCount && targetTable) {
        try {
          executedCount = await databaseService.getTableRowCount(targetTable);
          assistantContent = `Encontrei ${executedCount} registro${executedCount === 1 ? '' : 's'} na tabela "${targetTable}".`;
          queryResult = {
            data: [{ count: executedCount }],
            total: executedCount,
            page: 1,
            pageSize: 1,
            hasMore: false
          };
        } catch (countError) {
          logger.error('Count execution failed:', {
            error: countError instanceof Error ? countError.message : String(countError),
            table: targetTable
          });
          assistantContent = nlResult.explanation || 'Não consegui obter a contagem agora.';
        }
      } else if (wantsNames && targetTable) {
        try {
          const columns: ColumnInfo[] = await databaseService.getTableColumns(targetTable);
          const targetColumn = columns.find((c) => c.name.toLowerCase() === 'name')?.name
            || columns.find((c) => c.name.toLowerCase().includes('nome'))?.name
            || columns.find((c) => c.name.toLowerCase().includes('name'))?.name;

          const data = await databaseService.getSampleData(targetTable, 20);
          if (targetColumn && data.length > 0 && targetColumn in data[0]) {
            listedValues = data
              .map((row) => row[targetColumn])
              .filter((v) => typeof v === 'string') as string[];

            const limited = listedValues.slice(0, 10);
            assistantContent = limited.length > 0
              ? `Aqui estão alguns nomes da tabela "${targetTable}": ${limited.join(', ')}${listedValues.length > 10 ? ' (mostrando os primeiros 10)' : ''}.`
              : nlResult.explanation || 'Não encontrei nomes para listar.';
          } else {
            assistantContent = nlResult.explanation || 'Não encontrei coluna de nomes para listar.';
          }
        } catch (listError) {
          logger.error('Listing names failed:', {
            error: listError instanceof Error ? listError.message : String(listError),
            table: targetTable
          });
          assistantContent = nlResult.explanation || 'Não consegui listar os nomes agora.';
        }
      } else if (targetTable) {
        // Detectar pedidos de colunas específicas (email, telefone, etc)
        const wantsEmail = /e-?mails?|correio/i.test(request.message);
        const wantsPhone = /telefone|phone|celular|contato/i.test(request.message);
        const wantsAll = /todos|todas|all|tudo|listar/i.test(request.message);

        try {
          const columns: ColumnInfo[] = await databaseService.getTableColumns(targetTable);
          const data = await databaseService.getSampleData(targetTable, 20);

          if (data.length > 0) {
            // Determinar qual coluna mostrar baseado no pedido
            let targetColumn: string | undefined;
            let columnLabel = 'dados';

            if (wantsEmail) {
              targetColumn = columns.find((c) => c.name.toLowerCase().includes('email'))?.name;
              columnLabel = 'emails';
            } else if (wantsPhone) {
              targetColumn = columns.find((c) =>
                c.name.toLowerCase().includes('phone') ||
                c.name.toLowerCase().includes('telefone') ||
                c.name.toLowerCase().includes('celular')
              )?.name;
              columnLabel = 'telefones';
            }

            if (targetColumn && targetColumn in data[0]) {
              // Retornar apenas a coluna específica
              const values = data
                .map((row) => row[targetColumn as string])
                .filter((v) => v !== null && v !== undefined);

              const limited = values.slice(0, 15);
              assistantContent = `Aqui estão os ${columnLabel} da tabela "${targetTable}":\n${limited.map((v, i) => `${i + 1}. ${v}`).join('\n')}${values.length > 15 ? `\n... e mais ${values.length - 15} registros.` : ''}`;

              queryResult = {
                data: data.map(row => ({ [targetColumn as string]: row[targetColumn as string] })),
                total: values.length,
                page: 1,
                pageSize: 20,
                hasMore: false
              };
            } else if (wantsAll) {
              // Retornar todos os dados
              const columnNames = columns.map(c => c.name).slice(0, 5); // máximo 5 colunas
              assistantContent = `Aqui estão os dados da tabela "${targetTable}" (${data.length} registros):\n` +
                data.slice(0, 10).map((row, i) =>
                  `${i + 1}. ${columnNames.map(c => `${c}: ${row[c] || 'N/A'}`).join(', ')}`
                ).join('\n') +
                (data.length > 10 ? `\n... e mais ${data.length - 10} registros.` : '');

              queryResult = {
                data: data,
                total: data.length,
                page: 1,
                pageSize: 20,
                hasMore: false
              };
            } else {
              // Fallback: usar explicação da IA mas tentar mostrar algum dado
              const cleaned = stripSqlFromText(nlResult.explanation);
              assistantContent = cleaned && cleaned.length > 20
                ? cleaned
                : `Encontrei ${data.length} registros na tabela "${targetTable}". O que você gostaria de saber sobre eles?`;
            }
          } else {
            assistantContent = `Não encontrei dados na tabela "${targetTable}".`;
          }
        } catch (queryError) {
          logger.error('Data query failed:', {
            error: queryError instanceof Error ? queryError.message : String(queryError),
            table: targetTable
          });
          const cleaned = stripSqlFromText(nlResult.explanation);
          assistantContent = cleaned || 'Aqui está o resultado em linguagem natural.';
        }
      } else {
        // Nenhuma tabela identificada
        const cleaned = stripSqlFromText(nlResult.explanation);
        assistantContent = cleaned || 'Não consegui identificar uma tabela para buscar os dados. Pode especificar qual tabela você quer consultar?';
      }
    }

    // Criar mensagem do assistente
    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date(),
      metadata: {
        queryExecuted: !!queryResult,
        sqlGenerated: nlResult.sql || undefined,
        tableUsed: nlResult.suggestedTable || undefined,
        confidence: nlResult.confidence,
        executionTime: Date.now() - startTime,
        count: executedCount,
        listedValues
      }
    };

    // Adicionar mensagem do assistente ao histórico
    chatSessionService.addMessage(sessionId, assistantMessage);

    const executionTime = Date.now() - startTime;

    // Construir response
    const response: ChatMessageResponse = {
      success: true,
      sessionId,
      message: assistantMessage,
      queryResult,
      nlParse: nlResult,
      executionTime,
      needsClarification: nlResult.requiresClarification,
      clarificationQuestion: nlResult.clarificationQuestion
    };

    logger.info('Chat message processed:', {
      sessionId,
      confidence: nlResult.confidence,
      needsClarification: nlResult.requiresClarification,
      executionTime: `${executionTime}ms`,
      totalMessages: chatSessionService.getSession(sessionId)?.messages.length
    });

    res.json(response);

  } catch (error) {
    const executionTime = Date.now() - startTime;

    logger.error('Chat message processing failed:', {
      error: error instanceof Error ? error.message : String(error),
      executionTime: `${executionTime}ms`
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/chat/history/:sessionId
 * 
 * Recupera histórico completo de uma sessão
 * 
 * Params:
 * - sessionId: UUID da sessão
 * 
 * Query params opcionais:
 * - limit: número máximo de mensagens (default: todas)
 * - offset: pular N mensagens (paginação)
 */
router.get('/history/:sessionId', validateSessionIdParam, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    // Buscar sessão
    const session = chatSessionService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Aplicar paginação
    let paginatedMessages = session.messages;

    if (offset > 0) {
      paginatedMessages = paginatedMessages.slice(offset);
    }

    if (limit !== undefined && limit > 0) {
      paginatedMessages = paginatedMessages.slice(0, limit);
    }

    logger.info('History retrieved:', {
      sessionId,
      totalMessages: session.messages.length,
      returnedMessages: paginatedMessages.length,
      offset,
      limit
    });

    res.json({
      success: true,
      session: {
        ...session,
        messages: paginatedMessages
      },
      pagination: {
        total: session.messages.length,
        offset,
        limit: limit || session.messages.length,
        returned: paginatedMessages.length
      }
    });

  } catch (error) {
    logger.error('Failed to retrieve history:', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chat history'
    });
  }
});

/**
 * DELETE /api/chat/history/:sessionId
 * 
 * Remove histórico de uma sessão específica
 * 
 * Params:
 * - sessionId: UUID da sessão
 */
router.delete('/history/:sessionId', validateSessionIdParam, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const deleted = chatSessionService.deleteSession(sessionId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    logger.info('Session deleted:', { sessionId });

    res.json({
      success: true,
      message: 'Session history deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete history:', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete chat history'
    });
  }
});

/**
 * GET /api/chat/sessions
 * 
 * Lista todas as sessões ativas (admin/debug)
 */
router.get('/sessions', async (_req: Request, res: Response) => {
  try {
    const activeSessions = chatSessionService.listActiveSessions();
    const stats = chatSessionService.getStats();

    res.json({
      success: true,
      sessions: activeSessions,
      stats
    });

  } catch (error) {
    logger.error('Failed to list sessions:', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to list sessions'
    });
  }
});

/**
 * DELETE /api/chat/sessions
 * 
 * Remove todas as sessões (admin/debug)
 */
router.delete('/sessions', async (_req: Request, res: Response) => {
  try {
    const stats = chatSessionService.getStats();
    chatSessionService.clearAllSessions();

    logger.warn('All chat sessions cleared', {
      clearedSessions: stats.activeSessions,
      clearedMessages: stats.totalMessages
    });

    res.json({
      success: true,
      message: 'All sessions cleared successfully',
      cleared: {
        sessions: stats.activeSessions,
        messages: stats.totalMessages
      }
    });

  } catch (error) {
    logger.error('Failed to clear sessions:', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to clear sessions'
    });
  }
});

export default router;
