/**
 * Intent Classifier Service
 * 
 * Classifica a intenção do usuário antes de gerar SQL.
 * Usa regex patterns para custo $0 (sem chamadas de API).
 */

import { logger } from '../config/logger';

// ==================== Types ====================

/**
 * Tipos de intenção de query
 */
export enum QueryIntent {
    /** "Mostre dados de X", "Listar registros" */
    DATA_RETRIEVAL = 'data_retrieval',

    /** "Quantos/Soma/Média de X" */
    AGGREGATION = 'aggregation',

    /** "Dados onde X > Y", "Filtrar por status" */
    FILTERING = 'filtering',

    /** "Evolução de X ao longo do tempo" */
    TREND = 'trend',

    /** "Compare X vs Y" */
    COMPARISON = 'comparison',

    /** "O que tem na tabela X?", "Explore o banco" */
    EXPLORATORY = 'exploratory'
}

/**
 * Resultado da classificação de intent
 */
export interface IntentResult {
    /** Intent classificado */
    intent: QueryIntent;
    /** Confiança da classificação (0-100) */
    confidence: number;
    /** Palavras-chave que ativaram a classificação */
    matchedKeywords: string[];
}

/**
 * Configuração de tipo de gráfico sugerido por intent
 */
export interface ChartSuggestion {
    type: 'table' | 'line' | 'bar' | 'pie' | 'area';
    reason: string;
}

// ==================== Constants ====================

/**
 * Patterns de regex para classificação de intent
 * Ordenados por especificidade (mais específico primeiro)
 */
const INTENT_PATTERNS: { intent: QueryIntent; pattern: RegExp; keywords: string[] }[] = [
    // AGGREGATION - Contagem, soma, média
    {
        intent: QueryIntent.AGGREGATION,
        pattern: /\b(quantos?|quanto|totai?s?|soma|média|contagem|count|somar|agregar|quantidade|total\s+de|número\s+de|percentual|porcentagem)\b/i,
        keywords: ['quantos', 'quanto', 'total', 'soma', 'média', 'contagem', 'count']
    },

    // TREND - Evolução temporal
    {
        intent: QueryIntent.TREND,
        pattern: /\b(evolução|histórico|ao\s+longo|crescimento|tendência|variação|por\s+mês|por\s+dia|por\s+semana|por\s+ano|mensal|diário|semanal|anual|timeline|período|últimos?\s+\d+\s+(dias?|meses?|semanas?|anos?))\b/i,
        keywords: ['evolução', 'histórico', 'tendência', 'por mês', 'por dia', 'crescimento']
    },

    // COMPARISON - Comparação entre entidades
    {
        intent: QueryIntent.COMPARISON,
        pattern: /\b(compare?|comparar|versus|vs\.?|diferença\s+entre|entre\s+.*\s+e\s+|ranking|rank|top\s+\d+|melhores?|piores?|maior\s+e\s+menor)\b/i,
        keywords: ['compare', 'versus', 'vs', 'diferença entre', 'ranking', 'top']
    },

    // FILTERING - Filtro com condições
    {
        intent: QueryIntent.FILTERING,
        pattern: /\b(onde|filtr|apenas|só|somente|maior\s+que|menor\s+que|acima\s+de|abaixo\s+de|entre\s+\d+|igual\s+a|diferente\s+de|com\s+status|que\s+tem|que\s+não|exceto|sem|com|status\s*=)\b/i,
        keywords: ['onde', 'filtrar', 'apenas', 'maior que', 'menor que', 'status']
    },

    // EXPLORATORY - Exploração de dados ou estrutura
    {
        intent: QueryIntent.EXPLORATORY,
        pattern: /\b(o\s+que|quais?\s+(são|existem|tem|há)|explore|analise|mostre?\s+tudo|estrutura|descreva?|explique|colunas?\s+de|campos?\s+de|esquema|overview|visão\s+geral)\b/i,
        keywords: ['o que', 'quais são', 'explore', 'estrutura', 'descreva']
    }
];

/**
 * Sugestão de gráfico por intent
 */
const CHART_BY_INTENT: Record<QueryIntent, ChartSuggestion> = {
    [QueryIntent.AGGREGATION]: { type: 'pie', reason: 'Agregação melhor visualizada em gráfico de pizza ou barras' },
    [QueryIntent.TREND]: { type: 'line', reason: 'Tendências temporais são melhor visualizadas em gráficos de linha' },
    [QueryIntent.COMPARISON]: { type: 'bar', reason: 'Comparações são claras em gráficos de barras agrupadas' },
    [QueryIntent.FILTERING]: { type: 'table', reason: 'Dados filtrados geralmente precisam de visualização detalhada' },
    [QueryIntent.DATA_RETRIEVAL]: { type: 'table', reason: 'Recuperação de dados brutos é melhor em tabela' },
    [QueryIntent.EXPLORATORY]: { type: 'table', reason: 'Exploração inicial requer visualização completa dos dados' }
};

// ==================== Service ====================

/**
 * Classifica a intenção do usuário baseado na pergunta
 * @param question Pergunta em linguagem natural
 * @returns Resultado da classificação com intent, confiança e keywords
 */
export function classifyIntent(question: string): IntentResult {
    const q = question.toLowerCase().trim();

    // Verificar cada pattern
    for (const { intent, pattern, keywords } of INTENT_PATTERNS) {
        const match = pattern.exec(q);
        if (match) {
            const matchedKeywords = keywords.filter(kw => q.includes(kw.toLowerCase()));

            logger.debug(`🎯 Intent classificado: ${intent}`, {
                question: q.substring(0, 50),
                matchedKeywords
            });

            return {
                intent,
                confidence: 90, // Alta confiança quando há match de pattern
                matchedKeywords
            };
        }
    }

    // Default: DATA_RETRIEVAL
    logger.debug(`🎯 Intent default: DATA_RETRIEVAL (sem match)`, {
        question: q.substring(0, 50)
    });

    return {
        intent: QueryIntent.DATA_RETRIEVAL,
        confidence: 60, // Confiança menor para default
        matchedKeywords: []
    };
}

/**
 * Obtém sugestão de gráfico baseado no intent
 * @param intent Intent classificado
 * @returns Sugestão de tipo de gráfico
 */
export function getChartSuggestionByIntent(intent: QueryIntent): ChartSuggestion {
    return CHART_BY_INTENT[intent] || CHART_BY_INTENT[QueryIntent.DATA_RETRIEVAL];
}

/**
 * Classifica e retorna sugestão de gráfico em uma única chamada
 * @param question Pergunta do usuário
 * @returns Intent e sugestão de gráfico
 */
export function classifyAndSuggestChart(question: string): IntentResult & { chartSuggestion: ChartSuggestion } {
    const result = classifyIntent(question);
    const chartSuggestion = getChartSuggestionByIntent(result.intent);

    return {
        ...result,
        chartSuggestion
    };
}

// ==================== Helper Functions ====================

/**
 * Verifica se a pergunta parece ser sobre tendência temporal
 * Útil para refinamento adicional
 */
export function hasTendencyIndicators(question: string): boolean {
    return /\b(por\s+(mês|dia|semana|ano)|mensal|diário|últimos?\s+\d+|ao\s+longo|crescimento|variação)\b/i.test(question);
}

/**
 * Verifica se a pergunta parece ser sobre agregação
 */
export function hasAggregationIndicators(question: string): boolean {
    return /\b(quantos?|quanto|total|soma|média|count|contagem|número\s+de|quantidade)\b/i.test(question);
}

/**
 * Verifica se a pergunta parece ser comparativa
 */
export function hasComparisonIndicators(question: string): boolean {
    return /\b(compare|versus|vs|entre\s+.*\s+e\s+|ranking|top\s+\d+|melhores?|piores?)\b/i.test(question);
}
