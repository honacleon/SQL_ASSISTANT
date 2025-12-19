/**
 * Response Narrator Service
 * 
 * Gera resumos conversacionais em linguagem natural dos resultados de queries.
 * Transforma dados brutos em narrativas fáceis de entender.
 */

import { GoogleGenAI } from '@google/genai';
import { logger } from '../config/logger';
import { config } from '../config/env.config';

// ==================== Types ====================

export interface NarrativeContext {
    /** Pergunta original do usuário */
    question: string;
    /** Número de registros retornados */
    rowCount: number;
    /** Colunas presentes nos dados */
    columns: string[];
    /** Amostra dos dados (primeiros registros) */
    sampleData?: Record<string, unknown>[];
    /** Estatísticas calculadas */
    stats?: DataStatistics;
    /** Tabela principal usada */
    tableName?: string;
}

export interface DataStatistics {
    sum?: number;
    avg?: number;
    min?: number;
    max?: number;
    /** Coluna usada para cálculos */
    numericColumn?: string;
}

export interface NarrativeResult {
    /** Texto da narrativa */
    narrative: string;
    /** Se usou LLM ou fallback */
    source: 'gemini' | 'fallback';
    /** Tempo de processamento em ms */
    processingTime: number;
}

// ==================== Configuration ====================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || config.geminiApiKey || '';
const MODEL_NAME = 'gemini-2.0-flash';

// ==================== Service ====================

class ResponseNarratorService {
    private client: GoogleGenAI | null = null;
    private isInitialized = false;

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        if (!GEMINI_API_KEY) {
            logger.warn('⚠️ GEMINI_API_KEY não configurada - Response Narrator usará fallback');
            return;
        }

        try {
            this.client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
            this.isInitialized = true;
            logger.info('✅ Response Narrator inicializado com Gemini API');
        } catch (error) {
            logger.error('❌ Erro ao inicializar Gemini para Narrator:', error);
        }
    }

    /**
     * Gera narrativa conversacional para os resultados
     */
    async generateNarrative(context: NarrativeContext): Promise<NarrativeResult> {
        const startTime = Date.now();

        // Tentar usar Gemini
        if (this.isInitialized && this.client) {
            try {
                const narrative = await this.callGemini(context);
                return {
                    narrative,
                    source: 'gemini',
                    processingTime: Date.now() - startTime,
                };
            } catch (error) {
                logger.error('❌ Erro ao chamar Gemini para narrativa:', error);
            }
        }

        // Fallback: narrativa baseada em template
        const narrative = this.generateFallbackNarrative(context);
        return {
            narrative,
            source: 'fallback',
            processingTime: Date.now() - startTime,
        };
    }

    /**
     * Chama Gemini para gerar narrativa
     */
    private async callGemini(context: NarrativeContext): Promise<string> {
        if (!this.client) {
            throw new Error('Gemini client not initialized');
        }

        const prompt = this.buildPrompt(context);

        const response = await this.client.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                temperature: 0.7,
                maxOutputTokens: 300,
            },
        });

        const text = response.text || '';
        return this.cleanNarrative(text);
    }

    /**
     * Constrói o prompt para o Gemini
     */
    private buildPrompt(context: NarrativeContext): string {
        const { question, rowCount, columns, stats, tableName, sampleData } = context;

        let statsSection = '';
        if (stats && stats.numericColumn) {
            statsSection = `
ESTATÍSTICAS (coluna ${stats.numericColumn}):
- Total: ${stats.sum?.toLocaleString('pt-BR') || 'N/A'}
- Média: ${stats.avg?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || 'N/A'}
- Mínimo: ${stats.min?.toLocaleString('pt-BR') || 'N/A'}
- Máximo: ${stats.max?.toLocaleString('pt-BR') || 'N/A'}`;
        }

        let dataPreview = '';
        if (sampleData && sampleData.length > 0) {
            const preview = sampleData.slice(0, 3).map(row =>
                Object.entries(row).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ')
            ).join(' | ');
            dataPreview = `\nAMOSTRA DOS DADOS: ${preview}`;
        }

        return `Gere um resumo conversacional em português (BR) dos resultados de uma consulta de dados.

PERGUNTA DO USUÁRIO: "${question}"
TABELA: ${tableName || 'dados'}
REGISTROS ENCONTRADOS: ${rowCount}
COLUNAS: ${columns.slice(0, 8).join(', ')}${statsSection}${dataPreview}

INSTRUÇÕES:
1. Responda diretamente a pergunta do usuário
2. Inclua 1-2 estatísticas relevantes se disponíveis
3. Seja conversacional e amigável (evite jargão técnico)
4. Use no MÁXIMO 3 frases curtas
5. Use formatação brasileira (R$, dd/mm/yyyy, vírgula para decimais)
6. Não mencione termos técnicos como "query", "tabela", "registros"
7. Se for valor monetário, formate como R$ X.XXX,XX

RESUMO:`;
    }

    /**
     * Limpa a narrativa gerada
     */
    private cleanNarrative(text: string): string {
        return text
            .replace(/^(RESUMO:|Resumo:)\s*/i, '')
            .replace(/^["']|["']$/g, '')
            .trim();
    }

    /**
     * Gera narrativa de fallback baseada em templates
     */
    private generateFallbackNarrative(context: NarrativeContext): string {
        const { question, rowCount, tableName, stats } = context;
        const table = tableName || 'dados';

        // Detectar tipo de pergunta
        const questionLower = question.toLowerCase();
        const isCount = /quantos?|quantidade|total|contar/i.test(questionLower);
        const isList = /listar?|mostr|exib|últimos?|primeiros?/i.test(questionLower);
        const isAnalysis = /média|soma|máximo|mínimo|análise/i.test(questionLower);

        if (rowCount === 0) {
            return `Não encontrei resultados para sua busca em ${table}.`;
        }

        if (isCount) {
            return `Encontrei ${rowCount} ${rowCount === 1 ? 'registro' : 'registros'} em ${table}.`;
        }

        if (isList) {
            let narrative = `Aqui estão ${rowCount > 10 ? 'os primeiros ' + Math.min(rowCount, 10) : rowCount} ${rowCount === 1 ? 'registro' : 'registros'} de ${table}.`;
            if (stats?.sum) {
                narrative += ` O total soma R$ ${(stats.sum / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
            }
            return narrative;
        }

        if (isAnalysis && stats) {
            const parts = [];
            if (stats.sum) parts.push(`Total: R$ ${(stats.sum / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
            if (stats.avg) parts.push(`Média: R$ ${(stats.avg / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
            return `Análise de ${rowCount} registros em ${table}. ${parts.join('. ')}.`;
        }

        // Genérico
        return `Encontrei ${rowCount} ${rowCount === 1 ? 'resultado' : 'resultados'} para sua consulta sobre ${table}.`;
    }

    /**
     * Calcula estatísticas básicas dos dados
     */
    calculateStatistics(data: Record<string, unknown>[]): DataStatistics | undefined {
        if (!data || data.length === 0) return undefined;

        const firstRow = data[0];
        const columns = Object.keys(firstRow);

        // Encontrar primeira coluna numérica relevante (evitar IDs)
        const numericColumn = columns.find(col => {
            const name = col.toLowerCase();
            if (name === 'id' || name.endsWith('_id')) return false;
            const value = firstRow[col];
            return typeof value === 'number';
        });

        if (!numericColumn) return undefined;

        const values = data
            .map(row => row[numericColumn])
            .filter((v): v is number => typeof v === 'number');

        if (values.length === 0) return undefined;

        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        return { sum, avg, min, max, numericColumn };
    }

    /**
     * Verifica se o serviço está disponível
     */
    isAvailable(): boolean {
        return this.isInitialized;
    }
}

// Singleton export
export const responseNarrator = new ResponseNarratorService();

// Named exports for testing
export { ResponseNarratorService };
