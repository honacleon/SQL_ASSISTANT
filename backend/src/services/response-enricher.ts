/**
 * ResponseEnricher - Serviço para enriquecer respostas do chat
 * 
 * Adiciona contexto extra, breakdowns por dimensão e sugestões de próximas perguntas
 */

import { logger } from '../config/logger';

// ==================== Types ====================

export type ResponseType =
    | 'single_value'      // Contagem simples, média, etc
    | 'list'              // Listagem de registros
    | 'aggregation'       // Agregação com groupby
    | 'time_series'       // Dados temporais
    | 'comparison';       // Comparação entre valores

export interface BreakdownItem {
    label: string;
    value: number;
    percentage: number;
}

export interface ComparisonData {
    currentValue: number;
    previousValue: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
}

export interface EnrichedResponse {
    /** Resposta principal formatada */
    answer: string;
    /** Detalhamento se aplicável */
    breakdown?: BreakdownItem[];
    /** Comparação vs período anterior se possível */
    comparison?: ComparisonData;
    /** Próximas perguntas sugeridas (2-3) */
    suggestions: string[];
    /** Tipo detectado de resposta */
    responseType: ResponseType;
    /** Se precisa enriquecer com mais contexto */
    needsEnrichment: boolean;
}

// ==================== Serviço ====================

export class ResponseEnricher {

    /**
     * Enriquece uma resposta com contexto adicional e sugestões
     */
    enrichResponse(
        originalQuestion: string,
        queryResult: any,
        analysisContext: any
    ): EnrichedResponse {
        logger.info('🔍 Enriquecendo resposta...');

        const data = queryResult?.results?.[0]?.data;
        const responseType = this.detectResponseType(
            Array.isArray(data) ? data : [data],
            data ? Object.keys(Array.isArray(data) ? data[0] || {} : data) : []
        );

        const needsEnrichment = responseType !== 'list' || (Array.isArray(data) && data.length <= 10);

        // Gera sugestões baseadas na pergunta e tipo
        const suggestions = this.generateFollowUpSuggestions(
            originalQuestion,
            queryResult,
            analysisContext
        );

        // Detecta breakdown se for agregação
        let breakdown: BreakdownItem[] | undefined;
        if (responseType === 'aggregation' && Array.isArray(data)) {
            breakdown = this.extractBreakdown(data);
        }

        return {
            answer: '', // Será preenchido pelo Formatter
            breakdown,
            comparison: undefined, // Implementar em versão futura
            suggestions,
            responseType,
            needsEnrichment
        };
    }

    /**
     * Detecta o tipo de resposta baseado nos dados
     */
    detectResponseType(data: any[], columns: string[]): ResponseType {
        if (!data || data.length === 0) {
            return 'single_value';
        }

        // Single value: apenas um registro com um campo numérico (count, sum, etc)
        if (data.length === 1) {
            const row = data[0];
            const keys = Object.keys(row || {});

            if (keys.length === 1 && typeof row[keys[0]] === 'number') {
                return 'single_value';
            }

            if (keys.includes('count') || keys.includes('total') || keys.includes('sum')) {
                return 'single_value';
            }
        }

        // Time series: tem coluna temporal e valores numéricos
        const timeColumns = ['created_at', 'updated_at', 'date', 'timestamp', 'mes', 'dia', 'ano'];
        const hasTimeColumn = columns.some(c =>
            timeColumns.some(tc => c.toLowerCase().includes(tc))
        );

        if (hasTimeColumn && data.length > 1) {
            return 'time_series';
        }

        // Aggregation: poucos registros com label + valor
        if (data.length >= 2 && data.length <= 20) {
            const row = data[0];
            const keys = Object.keys(row || {});

            const hasLabelAndValue = keys.some(k =>
                ['name', 'label', 'categoria', 'tipo', 'status'].some(l =>
                    k.toLowerCase().includes(l)
                )
            ) && keys.some(k =>
                typeof row[k] === 'number' || k.includes('count') || k.includes('total')
            );

            if (hasLabelAndValue) {
                return 'aggregation';
            }
        }

        // Default: lista
        return 'list';
    }

    /**
     * Gera sugestões de próximas perguntas relacionadas
     */
    generateFollowUpSuggestions(
        question: string,
        result: any,
        context: any
    ): string[] {
        const suggestions: string[] = [];
        const questionLower = question.toLowerCase();
        const tableName = context?.tables_needed?.[0] || 'dados';

        // Baseado no tipo de pergunta original
        if (questionLower.includes('quant') || questionLower.includes('total')) {
            suggestions.push(`Quais são os últimos 10 registros de ${tableName}?`);
            suggestions.push(`Como esses dados se distribuem por categoria?`);
        }
        else if (questionLower.includes('lista') || questionLower.includes('mostr')) {
            suggestions.push(`Qual o total de registros nessa tabela?`);
            suggestions.push(`Existe algum padrão nos dados?`);
        }
        else if (questionLower.includes('filtr') || questionLower.includes('busc')) {
            suggestions.push(`Quantos registros correspondem a esse filtro?`);
            suggestions.push(`Existem registros similares em outra tabela?`);
        }
        else {
            // Sugestões genéricas
            suggestions.push(`Quantos registros tem em ${tableName}?`);
            suggestions.push(`Mostre os últimos 5 registros de ${tableName}`);
        }

        // Sempre adiciona uma sugestão de análise
        if (suggestions.length < 3) {
            suggestions.push(`Quais insights posso obter desses dados?`);
        }

        // Limita a 3 sugestões
        return suggestions.slice(0, 3);
    }

    /**
     * Extrai breakdown de dados agregados
     */
    private extractBreakdown(data: any[]): BreakdownItem[] {
        if (!data || data.length === 0) return [];

        const firstRow = data[0];
        const keys = Object.keys(firstRow);

        // Encontra coluna de label e valor
        const labelKey = keys.find(k =>
            ['name', 'label', 'categoria', 'tipo', 'status'].some(l =>
                k.toLowerCase().includes(l)
            )
        ) || keys[0];

        const valueKey = keys.find(k =>
            k !== labelKey && (typeof firstRow[k] === 'number' || k.includes('count'))
        ) || keys[1];

        if (!valueKey) return [];

        // Calcula total para percentuais
        const total = data.reduce((sum, row) => sum + (Number(row[valueKey]) || 0), 0);

        return data.map(row => ({
            label: String(row[labelKey] || 'Outros'),
            value: Number(row[valueKey]) || 0,
            percentage: total > 0 ? Math.round((Number(row[valueKey]) / total) * 100) : 0
        }));
    }
}

// Exporta instância singleton
export const responseEnricher = new ResponseEnricher();
