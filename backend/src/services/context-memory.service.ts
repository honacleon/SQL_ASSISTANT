/**
 * Context Memory Service
 * Gerencia memória contextual para sessões de chat
 * Permite que o assistente lembre do contexto da conversa
 */

import { logger } from '../config/logger';

interface TableContext {
    tableName: string;
    lastAccessedAt: Date;
    columns?: string[];
    lastQuery?: string;
}

interface QueryContext {
    query: string;
    tableName: string;
    timestamp: Date;
    resultCount?: number;
}

/**
 * Opções oferecidas pela IA em uma clarificação
 */
interface OfferedOption {
    key: string;         // "A", "B", "1", "2"
    description: string; // Texto completo da opção
    query?: string;      // Query sugerida (se houver)
    table?: string;      // Tabela relacionada
}

interface SessionContext {
    sessionId: string;
    currentTable: TableContext | null;
    recentTables: TableContext[];
    recentQueries: QueryContext[];
    offeredOptions: OfferedOption[]; // Opções oferecidas na última clarificação
    lastInteractionAt: Date;
    metadata: Record<string, unknown>;
}

// Cache de contextos por sessão (em memória)
const sessionContexts = new Map<string, SessionContext>();

// Configurações
const MAX_RECENT_TABLES = 5;
const MAX_RECENT_QUERIES = 10;
const CONTEXT_TTL_MS = 30 * 60 * 1000; // 30 minutos

/**
 * Padrões para detectar referências contextuais
 */
const CONTEXTUAL_PATTERNS = {
    // Referências pronominais
    pronouns: [
        /\b(ela|ele|essa|este|esta|isso|aquela|aquele)\b/i,
        /\b(nela|nele|dela|dele|dessa|desse|desta|deste)\b/i,
    ],
    // Referências à tabela atual
    currentTable: [
        /\b(essa tabela|esta tabela|a tabela|da tabela|na tabela)\b/i,
        /\b(mesma tabela|tabela atual)\b/i,
    ],
    // Referências a ações anteriores
    previousAction: [
        /\b(mostre mais|continue|mais detalhes|expanda)\b/i,
        /\b(refine|filtre isso|ordene isso)\b/i,
        /\b(últimos|anteriores|de novo)\b/i,
    ],
    // Referências implícitas
    implicit: [
        /^(quantos|quais|liste|mostre|conte)\s+/i, // Se começa com verbo sem tabela, usa contexto
    ],
};

export class ContextMemoryService {
    /**
     * Obtém ou cria contexto para uma sessão
     */
    getContext(sessionId: string): SessionContext {
        let context = sessionContexts.get(sessionId);

        if (!context) {
            context = {
                sessionId,
                currentTable: null,
                recentTables: [],
                recentQueries: [],
                offeredOptions: [],
                lastInteractionAt: new Date(),
                metadata: {},
            };
            sessionContexts.set(sessionId, context);
            logger.debug(`🧠 Novo contexto criado para sessão: ${sessionId}`);
        }

        return context;
    }

    /**
     * Atualiza a tabela atual no contexto
     */
    setCurrentTable(sessionId: string, tableName: string, columns?: string[]): void {
        const context = this.getContext(sessionId);
        const now = new Date();

        const tableContext: TableContext = {
            tableName,
            lastAccessedAt: now,
            columns,
        };

        context.currentTable = tableContext;

        // Adiciona às tabelas recentes (evita duplicatas)
        const existingIndex = context.recentTables.findIndex(t => t.tableName === tableName);
        if (existingIndex >= 0) {
            context.recentTables.splice(existingIndex, 1);
        }
        context.recentTables.unshift(tableContext);

        // Limita tamanho
        if (context.recentTables.length > MAX_RECENT_TABLES) {
            context.recentTables.pop();
        }

        context.lastInteractionAt = now;
        logger.debug(`🧠 Tabela atual definida: ${tableName} (sessão: ${sessionId})`);
    }

    /**
     * Adiciona uma query ao histórico
     */
    addQuery(sessionId: string, query: string, tableName: string, resultCount?: number): void {
        const context = this.getContext(sessionId);

        context.recentQueries.unshift({
            query,
            tableName,
            timestamp: new Date(),
            resultCount,
        });

        // Limita tamanho
        if (context.recentQueries.length > MAX_RECENT_QUERIES) {
            context.recentQueries.pop();
        }

        context.lastInteractionAt = new Date();
    }

    /**
     * Define opções oferecidas em uma clarificação
     * Extrai automaticamente opções de mensagens com padrão (A) ... (B) ...
     */
    setOfferedOptions(sessionId: string, assistantMessage: string): void {
        const context = this.getContext(sessionId);
        const options: Array<{ key: string; description: string; query?: string; table?: string }> = [];

        // Padrão: (A) texto... (B) texto...
        const letterPattern = /\(([A-Z])\)\s*([^(]+?)(?=\([A-Z]\)|$)/gi;
        let match;
        while ((match = letterPattern.exec(assistantMessage)) !== null) {
            const key = match[1].toUpperCase();
            const description = match[2].trim();

            // Extrair nome de tabela se mencionado
            const tableMatch = description.match(/tabela\s+['"]?(\w+)['"]?/i);
            const table = tableMatch ? tableMatch[1] : undefined;

            options.push({ key, description, table });
        }

        // Padrão: 1. texto... 2. texto... ou 1) texto...
        const numberPattern = /(\d+)[.)]\s*([^0-9]+?)(?=\d+[.)]|\n\n|$)/gi;
        while ((match = numberPattern.exec(assistantMessage)) !== null) {
            const key = match[1];
            const description = match[2].trim();

            const tableMatch = description.match(/tabela\s+['"]?(\w+)['"]?/i);
            const table = tableMatch ? tableMatch[1] : undefined;

            if (!options.some(o => o.key === key)) {
                options.push({ key, description, table });
            }
        }

        context.offeredOptions = options;
        context.lastInteractionAt = new Date();

        if (options.length > 0) {
            logger.debug(`🧠 ${options.length} opções armazenadas: ${options.map(o => o.key).join(', ')}`);
        }
    }

    /**
     * Verifica se a mensagem é uma escolha de opção (A, B, 1, 2, opção A, etc)
     * e retorna a opção completa se encontrada
     */
    resolveOptionChoice(sessionId: string, message: string): {
        isOptionChoice: boolean;
        resolvedMessage: string;
        chosenOption: { key: string; description: string; table?: string } | null;
    } {
        const context = this.getContext(sessionId);
        const trimmedMessage = message.trim().toUpperCase();

        if (context.offeredOptions.length === 0) {
            return { isOptionChoice: false, resolvedMessage: message, chosenOption: null };
        }

        // Padrões para detectar escolha de opção
        // "A", "B", "1", "2", "opção A", "option B", "escolho 1", "quero a primeira"
        const patterns = [
            /^([A-Z])$/i,                           // Apenas letra: "A", "B"
            /^(\d+)$/,                              // Apenas número: "1", "2"
            /^op[çc][ãa]o\s*([A-Z\d])/i,            // "opção A", "opcao 1"
            /^option\s*([A-Z\d])/i,                 // "option A"
            /^escolho?\s*([A-Z\d])/i,              // "escolho A", "escolha 1"
            /^quero\s*(?:a\s+)?([A-Z\d])/i,        // "quero A", "quero a A"
            /^primeira/i,                           // "primeira" -> opção 0
            /^segunda/i,                            // "segunda" -> opção 1
            /^terceira/i,                           // "terceira" -> opção 2
        ];

        let chosenKey: string | null = null;

        for (const pattern of patterns) {
            const match = trimmedMessage.match(pattern);
            if (match) {
                if (pattern.source.includes('primeira')) {
                    chosenKey = context.offeredOptions[0]?.key || 'A';
                } else if (pattern.source.includes('segunda')) {
                    chosenKey = context.offeredOptions[1]?.key || 'B';
                } else if (pattern.source.includes('terceira')) {
                    chosenKey = context.offeredOptions[2]?.key || 'C';
                } else {
                    chosenKey = match[1]?.toUpperCase();
                }
                break;
            }
        }

        if (chosenKey) {
            const option = context.offeredOptions.find(o => o.key.toUpperCase() === chosenKey);
            if (option) {
                // Limpa opções após escolha
                context.offeredOptions = [];

                logger.info(`🧠 Opção escolhida: ${option.key} - "${option.description.substring(0, 50)}..."`);

                return {
                    isOptionChoice: true,
                    resolvedMessage: option.description,
                    chosenOption: option,
                };
            }
        }

        return { isOptionChoice: false, resolvedMessage: message, chosenOption: null };
    }

    /**
     * Detecta se a mensagem contém referências contextuais
     */
    detectContextualReferences(message: string): {
        hasPronouns: boolean;
        hasTableReference: boolean;
        hasPreviousActionReference: boolean;
        hasImplicitReference: boolean;
        needsContext: boolean;
    } {
        const text = message.toLowerCase().trim();

        const hasPronouns = CONTEXTUAL_PATTERNS.pronouns.some(p => p.test(text));
        const hasTableReference = CONTEXTUAL_PATTERNS.currentTable.some(p => p.test(text));
        const hasPreviousActionReference = CONTEXTUAL_PATTERNS.previousAction.some(p => p.test(text));
        const hasImplicitReference = CONTEXTUAL_PATTERNS.implicit.some(p => p.test(text));

        // Verifica se não menciona tabela explicitamente
        const mentionsExplicitTable = /\b(tabela|table)\s+\w+\b/i.test(text) ||
            /\b(customers|orders|order_items|users|products)\b/i.test(text);

        const needsContext = (hasPronouns || hasTableReference || hasPreviousActionReference ||
            (hasImplicitReference && !mentionsExplicitTable));

        return {
            hasPronouns,
            hasTableReference,
            hasPreviousActionReference,
            hasImplicitReference,
            needsContext,
        };
    }

    /**
     * Resolve referências contextuais na mensagem
     * Retorna a mensagem enriquecida com contexto
     */
    resolveContextualMessage(sessionId: string, message: string): {
        originalMessage: string;
        resolvedMessage: string;
        contextUsed: boolean;
        inferredTable: string | null;
        contextInfo: string;
    } {
        const context = this.getContext(sessionId);
        const refs = this.detectContextualReferences(message);

        if (!refs.needsContext || !context.currentTable) {
            return {
                originalMessage: message,
                resolvedMessage: message,
                contextUsed: false,
                inferredTable: null,
                contextInfo: '',
            };
        }

        const tableName = context.currentTable.tableName;
        let resolvedMessage = message;
        let contextInfo = '';

        // Substitui referências pronominais
        if (refs.hasPronouns || refs.hasTableReference) {
            // Adiciona contexto de tabela na mensagem para o AI processar
            resolvedMessage = `${message} (contexto: tabela "${tableName}")`;
            contextInfo = `Usando contexto da tabela "${tableName}"`;
        }

        // Se é uma ação sobre resultado anterior
        if (refs.hasPreviousActionReference && context.recentQueries.length > 0) {
            const lastQuery = context.recentQueries[0];
            contextInfo = `Continuando da última consulta em "${lastQuery.tableName}"`;
        }

        // Se é referência implícita (começa com verbo sem tabela)
        if (refs.hasImplicitReference && !message.toLowerCase().includes(tableName.toLowerCase())) {
            resolvedMessage = `${message} da tabela ${tableName}`;
            contextInfo = `Inferido: tabela "${tableName}"`;
        }

        logger.info(`🧠 Contexto aplicado: "${message}" → "${resolvedMessage}"`);

        return {
            originalMessage: message,
            resolvedMessage,
            contextUsed: true,
            inferredTable: tableName,
            contextInfo,
        };
    }

    /**
     * Obtém informações de contexto para debugging
     */
    getContextInfo(sessionId: string): string {
        const context = this.getContext(sessionId);

        if (!context.currentTable && context.recentQueries.length === 0) {
            return 'Nenhum contexto estabelecido';
        }

        const parts: string[] = [];

        if (context.currentTable) {
            parts.push(`Tabela atual: ${context.currentTable.tableName}`);
        }

        if (context.recentQueries.length > 0) {
            parts.push(`Queries recentes: ${context.recentQueries.length}`);
        }

        return parts.join(' | ');
    }

    /**
     * Limpa contexto de uma sessão
     */
    clearContext(sessionId: string): void {
        sessionContexts.delete(sessionId);
        logger.debug(`🧠 Contexto limpo para sessão: ${sessionId}`);
    }

    /**
     * Limpa contextos expirados
     */
    cleanupExpiredContexts(): number {
        const now = Date.now();
        let cleaned = 0;

        for (const [sessionId, context] of sessionContexts.entries()) {
            if (now - context.lastInteractionAt.getTime() > CONTEXT_TTL_MS) {
                sessionContexts.delete(sessionId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.info(`🧹 ${cleaned} contexto(s) expirado(s) removido(s)`);
        }

        return cleaned;
    }
}

// Singleton
export const contextMemoryService = new ContextMemoryService();

// Cleanup periódico (a cada 5 minutos)
setInterval(() => {
    contextMemoryService.cleanupExpiredContexts();
}, 5 * 60 * 1000);

export default contextMemoryService;
