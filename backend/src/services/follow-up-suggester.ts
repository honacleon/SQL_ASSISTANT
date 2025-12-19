/**
 * Follow-up Suggester Service
 * 
 * Gera sugestões de perguntas de follow-up contextuais usando Google Gemini.
 * Analisa a query SQL, tabelas usadas e pergunta original para sugerir
 * próximos passos relevantes para o usuário.
 */

import { GoogleGenAI } from '@google/genai';
import { logger } from '../config/logger';
import { config } from '../config/env.config';

// ==================== Types ====================

export interface FollowUpContext {
    /** Query SQL executada */
    sql: string;
    /** Tabelas envolvidas */
    tables: string[];
    /** Número de registros retornados */
    rowCount: number;
    /** Pergunta original do usuário */
    originalQuestion: string;
    /** Colunas principais nos resultados */
    columns?: string[];
}

export interface FollowUpResult {
    /** Sugestões geradas */
    suggestions: string[];
    /** Se usou LLM ou fallback */
    source: 'gemini' | 'fallback';
    /** Tempo de processamento em ms */
    processingTime: number;
}

// ==================== Configuration ====================

// API Key do Gemini (usar env var em produção)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || config.geminiApiKey || '';

// Modelo mais econômico e rápido
const MODEL_NAME = 'gemini-2.0-flash';

// ==================== Service ====================

class FollowUpSuggesterService {
    private client: GoogleGenAI | null = null;
    private isInitialized = false;

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        if (!GEMINI_API_KEY) {
            logger.warn('⚠️ GEMINI_API_KEY não configurada - Follow-up Suggester usará fallback');
            return;
        }

        try {
            this.client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
            this.isInitialized = true;
            logger.info('✅ Follow-up Suggester inicializado com Gemini API');
        } catch (error) {
            logger.error('❌ Erro ao inicializar Gemini:', error);
        }
    }

    /**
     * Gera sugestões de follow-up contextuais
     */
    async generateFollowUps(context: FollowUpContext): Promise<FollowUpResult> {
        const startTime = Date.now();

        // Tentar usar Gemini
        if (this.isInitialized && this.client) {
            try {
                const suggestions = await this.callGemini(context);
                return {
                    suggestions,
                    source: 'gemini',
                    processingTime: Date.now() - startTime,
                };
            } catch (error) {
                logger.error('❌ Erro ao chamar Gemini:', error);
                // Fall through to fallback
            }
        }

        // Fallback: sugestões baseadas em regras
        const suggestions = this.generateFallbackSuggestions(context);
        return {
            suggestions,
            source: 'fallback',
            processingTime: Date.now() - startTime,
        };
    }

    /**
     * Chama Gemini para gerar sugestões
     */
    private async callGemini(context: FollowUpContext): Promise<string[]> {
        if (!this.client) {
            throw new Error('Gemini client not initialized');
        }

        const prompt = this.buildPrompt(context);

        const response = await this.client.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                temperature: 0.7,
                maxOutputTokens: 200,
            },
        });

        const text = response.text || '';
        return this.parseResponse(text);
    }

    /**
     * Constrói o prompt para o Gemini
     */
    private buildPrompt(context: FollowUpContext): string {
        const { sql, tables, rowCount, originalQuestion, columns } = context;

        return `Você é um assistente de análise de dados. Baseado no contexto abaixo, sugira exatamente 2 perguntas de follow-up que o usuário poderia fazer para aprofundar sua análise.

## Contexto
- **Pergunta do usuário:** "${originalQuestion}"
- **Tabelas usadas:** ${tables.join(', ')}
- **Resultados:** ${rowCount} registro(s)
${columns ? `- **Colunas:** ${columns.slice(0, 5).join(', ')}` : ''}
- **Query executada:** ${sql.substring(0, 200)}${sql.length > 200 ? '...' : ''}

## Regras
1. Sugira perguntas que façam sentido como continuação natural da análise
2. Seja específico e use os nomes das tabelas/colunas quando relevante
3. Máximo 15 palavras por sugestão
4. Escreva em português brasileiro
5. Não repita a pergunta original
6. Foque em: comparações, tendências, detalhamentos ou filtros adicionais

## Formato de Resposta
Retorne APENAS as 2 sugestões, uma por linha, sem numeração ou marcadores:

[Sugestão 1]
[Sugestão 2]`;
    }

    /**
     * Parseia a resposta do Gemini
     */
    private parseResponse(text: string): string[] {
        const lines = text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && line.length < 100)
            .filter(line => !line.startsWith('#') && !line.startsWith('-') && !line.match(/^\d+\./));

        // Remover possíveis prefixos/sufixos indesejados
        const cleaned = lines.map(line =>
            line
                .replace(/^[•\-\*]\s*/, '')
                .replace(/^\d+\.\s*/, '')
                .replace(/^Sugestão \d+:\s*/i, '')
                .trim()
        );

        // Retornar no máximo 2 sugestões válidas
        return cleaned.slice(0, 2);
    }

    /**
     * Sugestões de fallback baseadas em regras
     */
    private generateFallbackSuggestions(context: FollowUpContext): string[] {
        const { tables, rowCount, originalQuestion } = context;
        const tableName = tables[0] || 'dados';
        const questionLower = originalQuestion.toLowerCase();

        const suggestions: string[] = [];

        // Baseado no tipo de pergunta
        if (questionLower.includes('quant') || questionLower.includes('total') || questionLower.includes('count')) {
            suggestions.push(`Quais são os últimos 10 registros de ${tableName}?`);
            suggestions.push(`Como esses dados se distribuem por categoria?`);
        }
        else if (questionLower.includes('lista') || questionLower.includes('mostr') || questionLower.includes('exib')) {
            suggestions.push(`Qual o total de registros em ${tableName}?`);
            suggestions.push(`Existe algum padrão nesses dados?`);
        }
        else if (questionLower.includes('filtr') || questionLower.includes('busc') || questionLower.includes('onde')) {
            suggestions.push(`Quantos registros correspondem a esse filtro?`);
            suggestions.push(`Quais os mais recentes com esse critério?`);
        }
        else if (questionLower.includes('média') || questionLower.includes('soma') || questionLower.includes('máximo') || questionLower.includes('mínimo')) {
            suggestions.push(`Como esse valor se compara aos últimos meses?`);
            suggestions.push(`Quais registros contribuem mais para esse resultado?`);
        }
        else {
            // Sugestões genéricas
            if (rowCount > 10) {
                suggestions.push(`Quais são os top 5 dessa análise?`);
                suggestions.push(`Posso ver um resumo agrupado desses dados?`);
            } else {
                suggestions.push(`Existem mais dados relacionados em ${tableName}?`);
                suggestions.push(`Qual a tendência desses dados ao longo do tempo?`);
            }
        }

        return suggestions.slice(0, 2);
    }

    /**
     * Verifica se o serviço está disponível
     */
    isAvailable(): boolean {
        return this.isInitialized;
    }
}

// Singleton export
export const followUpSuggester = new FollowUpSuggesterService();

// Named exports for testing
export { FollowUpSuggesterService };
