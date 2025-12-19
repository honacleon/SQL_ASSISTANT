/**
 * Quick Responses Service
 * Responde instantaneamente a perguntas conversacionais comuns sem chamar a IA
 */

import { logger } from '../config/logger';

interface QuickResponse {
    content: string;
    suggestions: string[];
}

interface QuickResponsePattern {
    pattern: RegExp;
    response: QuickResponse;
}

/**
 * Serviço para respostas rápidas (Fast Path)
 * Detecta perguntas conversacionais e responde sem chamar a IA
 * 
 * IMPORTANTE: Esses padrões devem capturar APENAS perguntas conversacionais
 * simples, NÃO queries que mencionam tabelas específicas ou pedem dados.
 */
export class QuickResponsesService {
    private patterns: QuickResponsePattern[];

    constructor() {
        this.patterns = this.buildPatterns();
    }

    /**
     * Constrói padrões de perguntas conversacionais
     * REGRA: Só usar ^ e $ para garantir match exato, evitando falsos positivos
     */
    private buildPatterns(): QuickResponsePattern[] {
        return [
            // Saudações (match exato)
            {
                pattern: /^(oi|olá|ola|hello|hi|hey|e\s*aí|eai|boa\s*(tarde|noite|dia))[\s!?.]*$/i,
                response: {
                    content: '👋 **Olá!** Sou seu assistente de dados SQL.\n\nPosso ajudar você a:\n- 📊 Consultar dados das tabelas\n- 🔍 Filtrar e buscar informações\n- 📈 Contar e agregar registros\n\n💡 **Como posso ajudar você hoje?**',
                    suggestions: [
                        'Quais tabelas existem?',
                        'Quantos registros tem no banco?',
                        'O que você pode fazer?'
                    ]
                }
            },

            // Capacidades do sistema
            {
                pattern: /^(o\s*que\s*(você|vc)\s*(pode|consegue|sabe)|quais?\s*(são\s*)?suas?\s*(capacidades|funcionalidades)|como\s*(você|vc)\s*funciona)[\s!?.]*$/i,
                response: {
                    content: '🤖 **Minhas capacidades:**\n\n✅ **Consultar dados** (SELECT)\n✅ **Filtrar e buscar** registros\n✅ **Agrupar e agregar** (COUNT, SUM, AVG)\n✅ **Fazer JOINs** entre tabelas\n✅ **Ordenar resultados**\n✅ **Limitar** quantidade de registros\n\n⛔ **Não posso** modificar ou deletar dados (segurança)\n\n💡 **Experimente perguntar:**\n- "Quantos clientes temos?"\n- "Quais são os últimos 5 pedidos?"',
                    suggestions: [
                        'Quais tabelas existem?',
                        'Quantos registros tem na maior tabela?',
                        'Mostre os últimos 10 registros'
                    ]
                }
            },

            // Listar tabelas - MUITO RESTRITIVO
            // Só captura perguntas EXATAMENTE sobre quais tabelas existem
            // NÃO captura: "mostre dados da tabela X", "últimos 10 da tabela orders"
            {
                pattern: /^(quais?|liste?)\s*(são\s*)?(as\s*)?(tabelas?|tables?)(\s*(existem|disponíve[il]s?|tem))?[\s?!.]*$/i,
                response: {
                    content: '📋 **Para ver as tabelas disponíveis:**\n\nAs tabelas estão listadas na barra lateral esquerda.\n\n💡 **Você pode:**\n- Clicar numa tabela para selecioná-la\n- Perguntar "Quantos registros tem em [tabela]?"\n- Perguntar sobre colunas específicas',
                    suggestions: [
                        'Quantas tabelas existem?',
                        'Quantos registros tem no total?',
                        'Descreva a estrutura do banco'
                    ]
                }
            },

            // Agradecer (match exato)
            {
                pattern: /^(obrigad[oa]|valeu|thanks?|thank\s*you|vlw|tmj)[\s!?.]*$/i,
                response: {
                    content: '😊 **De nada!** Fico feliz em ajudar.\n\n💡 Se precisar de mais alguma coisa, é só perguntar!',
                    suggestions: [
                        'Mostre mais dados',
                        'Faça outra consulta',
                        'Quais tabelas existem?'
                    ]
                }
            },

            // Despedida (match exato)
            {
                pattern: /^(tchau|adeus|bye|até\s*(mais|logo)?|flw|falou)[\s!?.]*$/i,
                response: {
                    content: '👋 **Até mais!** Foi um prazer ajudar.\n\nVolte sempre que precisar consultar seus dados! 📊',
                    suggestions: []
                }
            },

            // Ajuda (match exato)
            {
                pattern: /^(ajuda|help|socorro|como\s*uso)[\s!?.]*$/i,
                response: {
                    content: '❓ **Precisa de ajuda?**\n\n**Como usar:**\n1. 📝 Digite sua pergunta em português\n2. 🔄 Eu converto para SQL automaticamente\n3. 📊 Os resultados aparecem abaixo\n\n**Exemplos de perguntas:**\n- "Quantos clientes cadastrados temos?"\n- "Quais são os 10 últimos pedidos?"\n- "Mostre os produtos mais vendidos"\n\n💡 **Dica:** Seja específico sobre o que quer ver!',
                    suggestions: [
                        'Quais tabelas existem?',
                        'O que você pode fazer?',
                        'Mostre os últimos registros'
                    ]
                }
            }
        ];
    }

    /**
     * Tenta responder rapidamente sem chamar a IA
     * @returns QuickResponse se for pergunta conhecida, null caso contrário
     */
    tryQuickResponse(message: string): QuickResponse | null {
        const text = message.trim();

        // Mensagens muito longas NÃO são conversacionais
        if (text.length > 60) {
            return null;
        }

        // Se menciona uma tabela específica, deixar a IA processar
        // Detecta padrões como "tabela orders", "da orders", "em customers"
        if (/\b(tabela|table|da|de|em|na|do)\s+\w{2,}s?\b/i.test(text)) {
            // Exceção: "quais tabelas" é conversacional
            if (/^quais?\s*(são\s*)?(as\s*)?tabelas?/i.test(text)) {
                // Continua para verificar padrões
            } else {
                logger.debug(`🧠 Mensagem menciona tabela específica, delegando para IA: "${text}"`);
                return null;
            }
        }

        for (const { pattern, response } of this.patterns) {
            if (pattern.test(text)) {
                logger.info(`⚡ Fast Path: Resposta rápida para "${text.substring(0, 30)}..."`);
                return response;
            }
        }

        return null;
    }

    /**
     * Formata resposta rápida para o formato de resposta do chat
     */
    formatForChat(response: QuickResponse): {
        content: string;
        requiresClarification: false;
        confidence: 100;
        suggestions: string[];
    } {
        return {
            content: response.content,
            requiresClarification: false,
            confidence: 100,
            suggestions: response.suggestions
        };
    }
}

// Singleton instance
export const quickResponsesService = new QuickResponsesService();
