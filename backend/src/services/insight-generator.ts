/**
 * Insight Generator Service
 * 
 * Analisa dados e gera insights acionáveis usando IA.
 * Identifica padrões, anomalias e oportunidades nos resultados.
 */

import { GoogleGenAI } from '@google/genai';
import { logger } from '../config/logger';
import { config } from '../config/env.config';

// ==================== Types ====================

export interface InsightContext {
    /** Pergunta original do usuário */
    question: string;
    /** Amostra dos dados */
    sampleData: Record<string, unknown>[];
    /** Estatísticas calculadas */
    stats?: {
        sum?: number;
        avg?: number;
        min?: number;
        max?: number;
        numericColumn?: string;
    };
    /** Número total de registros */
    rowCount: number;
    /** Tabela usada */
    tableName?: string;
}

export interface Insight {
    /** Título curto do insight */
    title: string;
    /** Descrição explicativa */
    description: string;
    /** Tipo do insight */
    type: 'positive' | 'warning' | 'neutral';
    /** Ícone associado */
    icon: string;
}

export interface InsightResult {
    /** Array de insights gerados */
    insights: Insight[];
    /** Se usou LLM ou fallback */
    source: 'gemini' | 'fallback';
    /** Tempo de processamento em ms */
    processingTime: number;
}

// ==================== Configuration ====================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || config.geminiApiKey || '';
const MODEL_NAME = 'gemini-2.0-flash';

// ==================== Service ====================

class InsightGeneratorService {
    private client: GoogleGenAI | null = null;
    private isInitialized = false;

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        if (!GEMINI_API_KEY) {
            logger.warn('⚠️ GEMINI_API_KEY não configurada - Insight Generator usará fallback');
            return;
        }

        try {
            this.client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
            this.isInitialized = true;
            logger.info('✅ Insight Generator inicializado com Gemini API');
        } catch (error) {
            logger.error('❌ Erro ao inicializar Gemini para Insights:', error);
        }
    }

    /**
     * Gera insights a partir dos dados
     */
    async generateInsights(context: InsightContext): Promise<InsightResult> {
        const startTime = Date.now();

        // Pular se não houver dados suficientes
        if (!context.sampleData || context.sampleData.length === 0) {
            return {
                insights: [],
                source: 'fallback',
                processingTime: Date.now() - startTime,
            };
        }

        // Tentar usar Gemini
        if (this.isInitialized && this.client) {
            try {
                const insights = await this.callGemini(context);
                return {
                    insights,
                    source: 'gemini',
                    processingTime: Date.now() - startTime,
                };
            } catch (error) {
                logger.error('❌ Erro ao chamar Gemini para insights:', error);
            }
        }

        // Fallback: insights baseados em regras
        const insights = this.generateFallbackInsights(context);
        return {
            insights,
            source: 'fallback',
            processingTime: Date.now() - startTime,
        };
    }

    /**
     * Chama Gemini para gerar insights
     */
    private async callGemini(context: InsightContext): Promise<Insight[]> {
        if (!this.client) {
            throw new Error('Gemini client not initialized');
        }

        const prompt = this.buildPrompt(context);

        const response = await this.client.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                temperature: 0.7,
                maxOutputTokens: 500,
            },
        });

        const text = response.text || '';
        return this.parseInsights(text);
    }

    /**
     * Constrói o prompt para o Gemini
     */
    private buildPrompt(context: InsightContext): string {
        const { question, sampleData, stats, rowCount, tableName } = context;

        const dataPreview = JSON.stringify(sampleData.slice(0, 5), null, 2);
        const statsJson = stats ? JSON.stringify(stats, null, 2) : 'Não disponível';

        return `Analise estes dados e gere 2-3 insights acionáveis em português (BR).

PERGUNTA DO USUÁRIO: "${question}"
TABELA: ${tableName || 'dados'}
TOTAL DE REGISTROS: ${rowCount}

AMOSTRA DOS DADOS (primeiros 5):
${dataPreview}

ESTATÍSTICAS:
${statsJson}

Retorne APENAS um array JSON válido com 2-3 insights:
[
  {
    "title": "Título curto (máx 6 palavras)",
    "description": "Explicação em 1-2 frases",
    "type": "positive|warning|neutral",
    "icon": "✅|⚠️|📊|📈|📉|💡|🎯"
  }
]

REGRAS:
1. Insights devem ser específicos aos dados mostrados
2. Use "positive" para bons resultados, "warning" para atenção, "neutral" para informativos
3. Seja direto e acionável
4. Máximo 3 insights
5. Retorne APENAS o JSON, sem texto adicional`;
    }

    /**
     * Parseia a resposta do Gemini
     */
    private parseInsights(text: string): Insight[] {
        try {
            // Tentar extrair JSON do texto
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                logger.warn('Não foi possível extrair JSON dos insights');
                return [];
            }

            const parsed = JSON.parse(jsonMatch[0]);

            if (!Array.isArray(parsed)) {
                return [];
            }

            // Validar e limpar cada insight
            return parsed
                .filter((item: unknown) =>
                    item &&
                    typeof item === 'object' &&
                    'title' in item &&
                    'description' in item
                )
                .map((item: Record<string, unknown>) => ({
                    title: String(item.title || '').substring(0, 50),
                    description: String(item.description || '').substring(0, 200),
                    type: this.validateType(item.type),
                    icon: this.validateIcon(item.icon, this.validateType(item.type)),
                }))
                .slice(0, 3);

        } catch (error) {
            logger.error('Erro ao parsear insights:', error);
            return [];
        }
    }

    /**
     * Valida e retorna tipo correto
     */
    private validateType(type: unknown): 'positive' | 'warning' | 'neutral' {
        if (type === 'positive' || type === 'warning' || type === 'neutral') {
            return type;
        }
        return 'neutral';
    }

    /**
     * Valida e retorna ícone correto
     */
    private validateIcon(icon: unknown, type: 'positive' | 'warning' | 'neutral'): string {
        const validIcons = ['✅', '⚠️', '📊', '📈', '📉', '💡', '🎯', '🔥', '💰', '👥'];

        if (typeof icon === 'string' && validIcons.includes(icon)) {
            return icon;
        }

        // Ícone padrão baseado no tipo
        switch (type) {
            case 'positive': return '✅';
            case 'warning': return '⚠️';
            default: return '📊';
        }
    }

    /**
     * Gera insights de fallback baseados em regras
     */
    private generateFallbackInsights(context: InsightContext): Insight[] {
        const { sampleData, stats, rowCount } = context;
        const insights: Insight[] = [];

        // Insight sobre quantidade
        if (rowCount > 0) {
            if (rowCount === 1) {
                insights.push({
                    title: 'Registro único encontrado',
                    description: 'A busca retornou exatamente um resultado.',
                    type: 'neutral',
                    icon: '🎯',
                });
            } else if (rowCount > 100) {
                insights.push({
                    title: 'Grande volume de dados',
                    description: `${rowCount} registros encontrados. Considere filtrar para análise mais específica.`,
                    type: 'neutral',
                    icon: '📊',
                });
            }
        }

        // Insights sobre estatísticas
        if (stats && stats.numericColumn) {
            // Verificar se há grande variação
            if (stats.max && stats.min && stats.max > stats.min * 10) {
                insights.push({
                    title: 'Alta variação nos valores',
                    description: `Diferença significativa entre mínimo e máximo em ${stats.numericColumn}.`,
                    type: 'warning',
                    icon: '📈',
                });
            }

            // Verificar média vs máximo
            if (stats.avg && stats.max && stats.avg < stats.max * 0.3) {
                insights.push({
                    title: 'Possíveis outliers',
                    description: 'A média está muito abaixo do valor máximo, indicando possíveis valores atípicos.',
                    type: 'neutral',
                    icon: '📉',
                });
            }
        }

        // Verificar status nos dados
        if (sampleData.length > 0) {
            const statusColumn = Object.keys(sampleData[0]).find(k =>
                k.toLowerCase().includes('status')
            );

            if (statusColumn) {
                const statuses = sampleData.map(r => r[statusColumn]).filter(Boolean);
                const pendingCount = statuses.filter(s =>
                    String(s).toLowerCase().includes('pending') ||
                    String(s).toLowerCase().includes('pendente')
                ).length;

                if (pendingCount > 0 && pendingCount / statuses.length > 0.3) {
                    insights.push({
                        title: `${pendingCount} itens pendentes`,
                        description: 'Quantidade significativa de itens aguardando ação.',
                        type: 'warning',
                        icon: '⚠️',
                    });
                }
            }
        }

        // Garantir pelo menos um insight
        if (insights.length === 0) {
            insights.push({
                title: 'Dados carregados com sucesso',
                description: `${rowCount} registro${rowCount !== 1 ? 's' : ''} disponíve${rowCount !== 1 ? 'is' : 'l'} para análise.`,
                type: 'positive',
                icon: '✅',
            });
        }

        return insights.slice(0, 3);
    }

    /**
     * Verifica se o serviço está disponível
     */
    isAvailable(): boolean {
        return this.isInitialized;
    }
}

// Singleton export
export const insightGenerator = new InsightGeneratorService();

// Named exports for testing
export { InsightGeneratorService };
