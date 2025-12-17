/**
 * Chat Routes
 * Handles natural language to SQL conversion and chat history management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { aiService, databaseService } from '../services';
import { chatSessionService } from '../services/chat-session.service';
import { contextMemoryService } from '../services/context-memory.service';
import { quickResponsesService } from '../services/quick-responses.service';
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

    // 🎯 RESOLUÇÃO DE OPÇÃO: Verificar se é uma escolha de opção (A, B, 1, 2)
    const optionChoice = contextMemoryService.resolveOptionChoice(sessionId, request.message);
    let messageForContext = request.message;

    if (optionChoice.isOptionChoice && optionChoice.chosenOption) {
      logger.info(`🧠 Escolha de opção detectada: ${optionChoice.chosenOption.key}`);
      messageForContext = optionChoice.resolvedMessage;

      // Se a opção menciona uma tabela, definir como contexto
      if (optionChoice.chosenOption.table) {
        contextMemoryService.setCurrentTable(sessionId, optionChoice.chosenOption.table);
      }
    }

    // 🧠 MEMÓRIA CONTEXTUAL: Resolver referências contextuais
    const contextResolution = contextMemoryService.resolveContextualMessage(
      sessionId,
      messageForContext
    );

    if (contextResolution.contextUsed) {
      logger.info(`🧠 Contexto aplicado: ${contextResolution.contextInfo}`);
    }

    // Usar mensagem resolvida (com contexto injetado)
    const messageToProcess = contextResolution.resolvedMessage;

    // ⚡ FAST PATH: Tentar resposta rápida sem IA
    const quickResponse = quickResponsesService.tryQuickResponse(messageToProcess);
    let nlResult: NLQueryResult;

    if (quickResponse) {
      logger.info('⚡ Usando resposta rápida (Fast Path)');
      nlResult = {
        sql: '',
        explanation: quickResponse.content,
        confidence: 100,
        requiresClarification: false,
        suggestedTable: '',
        metadata: undefined
      };
    } else {
      // Buscar tabelas disponíveis para contexto
      const tables = await databaseService.getTables();

      // Converter linguagem natural para SQL usando IA
      nlResult = await aiService.parseNaturalLanguage({
        query: messageToProcess,
        context: {
          availableTables: tables,
          currentTable: request.context?.currentTable,
          recentQueries: [] // TODO: buscar do histórico da sessão
        }
      });
    }

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

      // 🧠 ARMAZENAR OPÇÕES: Se a clarificação contém opções (A), (B), armazenar para resolução futura
      contextMemoryService.setOfferedOptions(sessionId, assistantContent);
    } else if (nlResult.sql && nlResult.confidence >= 70) {
      // 🎯 PRIORIDADE: EXECUTAR SQL GERADO PELA IA quando confiança alta

      // Helper para sugestões contextuais
      const generateSuggestions = (table: string, queryType: string): string => {
        const suggestions: Record<string, string[]> = {
          count: [`Quais são os últimos 10 registros de ${table}?`, `Me mostre os dados da tabela ${table}`, `Quais colunas tem a tabela ${table}?`],
          list: [`Quantos registros tem em ${table}?`, `Quais colunas tem a tabela ${table}?`, `Filtre os dados de ${table} por um critério`],
          specific: [`Mostre outros campos de ${table}`, `Quantos registros tem em ${table}?`, `Quais colunas tem a tabela ${table}?`],
          default: [`Quantos registros tem em ${table}?`, `Me mostre os últimos 10 registros de ${table}`, `Quais colunas tem a tabela ${table}?`]
        };
        const items = suggestions[queryType] || suggestions.default;
        return `\n\n💡 **Quer explorar mais?**\n- ${items[0]}\n- ${items[1]}\n- ${items[2]}`;
      };

      try {
        logger.info('Executando SQL gerado pela IA:', {
          sql: nlResult.sql,
          confidence: nlResult.confidence,
          suggestedTable: nlResult.suggestedTable
        });

        const data = await databaseService.executeRawQuery<Record<string, unknown>>(nlResult.sql);
        const targetTable = nlResult.suggestedTable || '';

        if (Array.isArray(data) && data.length > 0) {
          // Formatar resultado baseado no tipo de query
          const columns = Object.keys(data[0]);

          if (columns.length === 1) {
            // Coluna única - listar valores
            const columnName = columns[0];
            const values = data.map(row => row[columnName]).filter(v => v !== null);

            if (columnName === 'count' || columnName === 'total') {
              // Resultado de COUNT
              executedCount = Number(values[0]);
              assistantContent = `📊 **${executedCount} registro${executedCount === 1 ? '' : 's'}** encontrado${executedCount === 1 ? '' : 's'}${targetTable ? ` na tabela **${targetTable}**` : ''}.${targetTable ? generateSuggestions(targetTable, 'count') : ''}`;
            } else {
              // Lista de valores de uma coluna
              const formattedList = values.map((v, i) => `${i + 1}. ${v}`).join('\n');
              assistantContent = `📋 **${columnName} dos ${values.length} registro${values.length === 1 ? '' : 's'}${targetTable ? ` de ${targetTable}` : ''}:**\n\n${formattedList}${targetTable ? generateSuggestions(targetTable, 'specific') : ''}`;
              listedValues = values.map(String);
            }
          } else {
            // Múltiplas colunas - formatar como tabela
            const displayColumns = columns.slice(0, 5);
            const formattedRows = data.map((row, i) => {
              const values = displayColumns.map(col => `**${col}**: ${row[col] ?? 'N/A'}`).join(' | ');
              return `${i + 1}. ${values}`;
            });

            assistantContent = `📋 **${data.length} registro${data.length === 1 ? '' : 's'}${targetTable ? ` de ${targetTable}` : ''}:**\n\n${formattedRows.join('\n')}${targetTable ? generateSuggestions(targetTable, 'list') : ''}`;
          }

          queryResult = {
            data: data,
            total: data.length,
            page: 1,
            pageSize: data.length,
            hasMore: false
          };
        } else if (Array.isArray(data) && data.length === 0) {
          assistantContent = `❌ Não encontrei resultados para sua consulta${targetTable ? ` na tabela "${targetTable}"` : ''}.`;
        } else {
          assistantContent = nlResult.explanation || 'Query executada com sucesso.';
        }
      } catch (sqlError) {
        logger.error('Erro ao executar SQL da IA:', {
          error: sqlError instanceof Error ? sqlError.message : String(sqlError),
          sql: nlResult.sql
        });
        // Fallback para heurísticas se SQL falhar
        assistantContent = nlResult.explanation || 'Não consegui executar a consulta.';
      }
    } else {
      // Heurísticas para diferentes tipos de perguntas (fallback)
      const wantsCount = /quantos?|quantidade|total|n[úu]mero/i.test(messageToProcess);
      const wantsNames = /nomes?|names?/i.test(messageToProcess);
      const wantsLastRecords = /[úu]ltimos?(\s+\d+)?(\s+registros?|\s+dados?)?/i.test(messageToProcess);
      const wantsShowData = /mostre|mostra|listar?|exibir?|ver\s+(os\s+)?dados?/i.test(messageToProcess);
      const wantsColumns = /colunas?|campos?|estrutura/i.test(messageToProcess);

      // 🎯 DETECTAR COLUNA ESPECÍFICA PEDIDA
      const wantsEmail = /e-?mails?|correios?/i.test(messageToProcess);
      const wantsPhone = /telefones?|phones?|celulares?|contatos?/i.test(messageToProcess);
      const wantsSpecificColumn = wantsEmail || wantsPhone || wantsNames;

      // Mapear para nome de coluna provável
      let requestedColumn: string | undefined;
      let columnLabel = 'dados';
      if (wantsEmail) {
        requestedColumn = 'email';
        columnLabel = 'emails';
      } else if (wantsPhone) {
        requestedColumn = 'phone';
        columnLabel = 'telefones';
      } else if (wantsNames) {
        requestedColumn = 'name';
        columnLabel = 'nomes';
      }

      // 🔢 EXTRAIR NÚMERO ESPECÍFICO DE REGISTROS
      // Padrões: "5 últimos", "últimos 5", "10 registros", "3 emails"
      const numberPatterns = [
        /(\d+)\s*[úu]ltimos?/i,           // "5 últimos"
        /[úu]ltimos?\s*(\d+)/i,           // "últimos 5"
        /(\d+)\s*(registros?|dados?)/i,   // "10 registros"
        /(\d+)\s*(e-?mails?|nomes?|telefones?)/i, // "5 emails"
        /primeiros?\s*(\d+)/i,            // "primeiros 5"
        /(\d+)\s*primeiros?/i,            // "5 primeiros"
      ];

      let recordLimit = 10; // default
      for (const pattern of numberPatterns) {
        const match = messageToProcess.match(pattern);
        if (match) {
          recordLimit = parseInt(match[1], 10);
          break;
        }
      }

      // Determinar tabela alvo (usar contexto inferido se disponível)
      const targetTable = nlResult.suggestedTable || contextResolution.inferredTable || request.context?.currentTable;

      // Helper para gerar sugestões contextuais
      const generateSuggestions = (table: string, queryType: string): string => {
        const suggestions: Record<string, string[]> = {
          count: [
            `Quais são os últimos 10 registros de ${table}?`,
            `Me mostre os dados da tabela ${table}`,
            `Quais colunas tem a tabela ${table}?`
          ],
          list: [
            `Quantos registros tem em ${table}?`,
            `Quais colunas tem a tabela ${table}?`,
            `Filtre os dados de ${table} por um critério`
          ],
          specific: [
            `Mostre outros campos de ${table}`,
            `Quantos registros tem em ${table}?`,
            `Quais colunas tem a tabela ${table}?`
          ],
          default: [
            `Quantos registros tem em ${table}?`,
            `Me mostre os últimos 10 registros de ${table}`,
            `Quais colunas tem a tabela ${table}?`
          ]
        };
        const items = suggestions[queryType] || suggestions.default;
        return `\n\n💡 **Quer explorar mais?**\n- ${items[0]}\n- ${items[1]}\n- ${items[2]}`;
      };

      if (wantsCount && targetTable) {
        try {
          executedCount = await databaseService.getTableRowCount(targetTable);
          assistantContent = `📊 **${executedCount} registro${executedCount === 1 ? '' : 's'}** encontrado${executedCount === 1 ? '' : 's'} na tabela **${targetTable}**.${generateSuggestions(targetTable, 'count')}`;
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
              ? `📋 **Nomes encontrados na tabela "${targetTable}":**\n${limited.map((n, i) => `${i + 1}. ${n}`).join('\n')}${listedValues.length > 10 ? `\n... e mais ${listedValues.length - 10} registros` : ''}${generateSuggestions(targetTable, 'list')}`
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
      } else if ((wantsLastRecords || wantsShowData || wantsSpecificColumn) && targetTable) {
        // 📋 ÚLTIMOS REGISTROS, MOSTRAR DADOS ou COLUNA ESPECÍFICA
        try {
          const columns: ColumnInfo[] = await databaseService.getTableColumns(targetTable);
          const data = await databaseService.getSampleData(targetTable, recordLimit);

          if (data.length > 0) {
            // 🎯 SE PEDIU COLUNA ESPECÍFICA, ENCONTRAR A COLUNA REAL
            let targetColumn: string | undefined;
            if (requestedColumn) {
              // Procurar coluna que corresponda ao pedido
              targetColumn = columns.find(c =>
                c.name.toLowerCase().includes(requestedColumn.toLowerCase())
              )?.name;
            }

            if (wantsSpecificColumn && targetColumn) {
              // MOSTRAR APENAS A COLUNA ESPECÍFICA
              const values = data.slice(0, recordLimit)
                .map(row => row[targetColumn!])
                .filter(v => v !== null && v !== undefined);

              const formattedList = values.map((v, i) => `${i + 1}. ${v}`).join('\n');
              assistantContent = `📧 **${columnLabel.charAt(0).toUpperCase() + columnLabel.slice(1)} dos ${values.length} ${wantsLastRecords ? 'últimos' : ''} registros de ${targetTable}:**\n\n${formattedList}${generateSuggestions(targetTable, 'specific')}`;

              listedValues = values.map(String);
            } else {
              // MOSTRAR MÚLTIPLAS COLUNAS (comportamento original)
              const displayColumns = columns.slice(0, 5).map(c => c.name);

              const formattedRows = data.slice(0, recordLimit).map((row, i) => {
                const values = displayColumns.map(col => `**${col}**: ${row[col] ?? 'N/A'}`).join(' | ');
                return `${i + 1}. ${values}`;
              });

              assistantContent = `📋 **${wantsLastRecords ? 'Últimos ' : ''}${data.length} registro${data.length === 1 ? '' : 's'} de ${targetTable}:**\n\n${formattedRows.join('\n')}${generateSuggestions(targetTable, 'list')}`;
            }

            queryResult = {
              data: data.slice(0, recordLimit),
              total: data.length,
              page: 1,
              pageSize: recordLimit,
              hasMore: data.length >= recordLimit
            };
          } else {
            assistantContent = `❌ Não encontrei registros na tabela "${targetTable}".`;
          }
        } catch (dataError) {
          logger.error('Data fetch failed:', {
            error: dataError instanceof Error ? dataError.message : String(dataError),
            table: targetTable
          });
          assistantContent = `❌ Erro ao buscar dados da tabela "${targetTable}".`;
        }
      } else if (wantsColumns && targetTable) {
        // 📊 COLUNAS/ESTRUTURA DA TABELA
        try {
          const columns: ColumnInfo[] = await databaseService.getTableColumns(targetTable);

          if (columns.length > 0) {
            const columnList = columns.map(c => `• **${c.name}** (${c.type})${c.isPrimaryKey ? ' 🔑' : ''}`).join('\n');
            assistantContent = `📊 **Estrutura da tabela ${targetTable}:**\n\n${columnList}\n\n_Total: ${columns.length} colunas_${generateSuggestions(targetTable, 'list')}`;
          } else {
            assistantContent = `❌ Não encontrei informações sobre a estrutura de "${targetTable}".`;
          }
        } catch (colError) {
          logger.error('Column fetch failed:', {
            error: colError instanceof Error ? colError.message : String(colError),
            table: targetTable
          });
          assistantContent = `❌ Erro ao buscar estrutura da tabela "${targetTable}".`;
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
              assistantContent = `📧 **${columnLabel.charAt(0).toUpperCase() + columnLabel.slice(1)} da tabela "${targetTable}":**\n${limited.map((v, i) => `${i + 1}. ${v}`).join('\n')}${values.length > 15 ? `\n... e mais ${values.length - 15} registros` : ''}${generateSuggestions(targetTable, 'specific')}`;

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
              assistantContent = `📋 **Dados da tabela "${targetTable}"** (${data.length} registros):\n` +
                data.slice(0, 10).map((row, i) =>
                  `${i + 1}. ${columnNames.map(c => `**${c}**: ${row[c] || 'N/A'}`).join(', ')}`
                ).join('\n') +
                (data.length > 10 ? `\n... e mais ${data.length - 10} registros` : '') +
                generateSuggestions(targetTable, 'list');

              queryResult = {
                data: data,
                total: data.length,
                page: 1,
                pageSize: 20,
                hasMore: false
              };
            } else {
              // Fallback: mostrar resumo do que foi encontrado com contexto
              const cleaned = stripSqlFromText(nlResult.explanation);
              assistantContent = `📊 **${data.length} registro${data.length === 1 ? '' : 's'}** encontrado${data.length === 1 ? '' : 's'} na tabela **${targetTable}**.${generateSuggestions(targetTable, 'default')}`;
            }
          } else {
            assistantContent = `❌ Não encontrei dados na tabela "${targetTable}".`;
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
        assistantContent = cleaned || `🤔 Não consegui identificar uma tabela para buscar os dados.\n\n💡 **Quer explorar mais?**\n- Quais tabelas estão disponíveis?\n- Me mostre os dados de uma tabela específica`;
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

    // 🧠 MEMÓRIA CONTEXTUAL: Atualizar contexto se usou uma tabela
    const usedTable = nlResult.suggestedTable || contextResolution.inferredTable;
    if (usedTable) {
      contextMemoryService.setCurrentTable(sessionId, usedTable);
      contextMemoryService.addQuery(sessionId, request.message, usedTable, executedCount);
    }

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
