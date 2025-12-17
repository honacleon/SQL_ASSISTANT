/**
 * AI Service
 * Handles natural language to SQL conversion using Anthropic Claude or OpenAI
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { logger } from '../config/logger';
import { config } from '../config/env.config';
import type {
  NLQueryRequest,
  NLQueryResult,
  TableSummary,
  AIProviderConfig
} from '@ai-assistant/shared';

class AIService {
  private anthropicClient?: Anthropic;
  private openaiClient?: OpenAI;
  private providerConfig: AIProviderConfig;

  constructor() {
    // Check which provider is available
    const anthropicKey = config.anthropicApiKey;
    const openaiKey = config.openaiApiKey;

    if (anthropicKey) {
      this.anthropicClient = new Anthropic({
        apiKey: anthropicKey
      });
      this.providerConfig = {
        provider: 'anthropic',
        apiKey: anthropicKey,
        model: config.ai.model || 'claude-3-5-sonnet-20241022',
        maxTokens: 2000,
        temperature: 0.3  // Mais criativa para entender nuances
      };
      logger.info('AI Service initialized with Anthropic Claude');
    } else if (openaiKey) {
      this.openaiClient = new OpenAI({
        apiKey: openaiKey
      });

      // Some GPT-5 style models only accept the default temperature (1). Keep it flexible but safe.
      const modelName = config.ai.model || 'gpt-4o';
      const temperature =
        modelName.includes('gpt-5') ? 1 : 0.3;  // Mais criativa para entender nuances

      this.providerConfig = {
        provider: 'openai',
        apiKey: openaiKey,
        model: modelName,
        maxTokens: 2000,
        temperature
      };
      logger.info('AI Service initialized with OpenAI', { model: modelName, temperature });
    } else {
      logger.error('CRITICAL: No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY');
      throw new Error('No AI provider configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY in environment variables.');
    }
  }

  /**
   * Converte pergunta em linguagem natural para SQL
   * 
   * PROMPT STRATEGY:
   * - Fornecer schema completo (tabelas + colunas)
   * - Exemplos de queries comuns (few-shot learning)
   * - Instruções para retornar JSON estruturado
   * - Instruções de segurança (apenas SELECT, sem DROP/DELETE/UPDATE)
   * - Avaliar confiança baseado em ambiguidade
   * 
   * @param request - Pergunta + contexto do schema
   * @returns SQL + explicação + confiança
   */
  async parseNaturalLanguage(
    request: NLQueryRequest
  ): Promise<NLQueryResult> {
    try {
      logger.info('Parsing natural language query:', {
        query: request.query,
        tablesAvailable: request.context.availableTables.length,
        provider: this.providerConfig.provider
      });

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt();

      // Build user message with schema context
      const userMessage = this.buildUserMessage(request);

      // Call appropriate provider
      let responseText: string;
      if (this.providerConfig.provider === 'anthropic' && this.anthropicClient) {
        responseText = await this.callAnthropic(systemPrompt, userMessage);
      } else if (this.providerConfig.provider === 'openai' && this.openaiClient) {
        responseText = await this.callOpenAI(systemPrompt, userMessage);
      } else {
        throw new Error('No AI provider available');
      }

      // Extract and parse JSON response
      const parsedResponse = this.extractJSON(responseText);

      // Validate SQL if present
      if (parsedResponse.sql) {
        this.validateSQL(parsedResponse.sql);
      }

      // Build result
      const result: NLQueryResult = {
        sql: parsedResponse.sql || '',
        explanation: parsedResponse.explanation || '',
        confidence: parsedResponse.confidence || 0,
        suggestedTable: parsedResponse.suggestedTable || '',
        requiresClarification: parsedResponse.requiresClarification || false,
        clarificationQuestion: parsedResponse.clarificationQuestion,
        metadata: parsedResponse.metadata
      };

      logger.info('Natural language parsing completed:', {
        confidence: result.confidence,
        requiresClarification: result.requiresClarification,
        suggestedTable: result.suggestedTable
      });

      return result;

    } catch (error) {
      logger.error('AI parsing failed:', {
        error: error instanceof Error ? error.message : String(error),
        provider: this.providerConfig.provider
      });
      throw new Error('Failed to parse natural language query');
    }
  }

  /**
   * Builds the system prompt with instructions and examples
   */
  private buildSystemPrompt(): string {
    return `You are an expert SQL generator for PostgreSQL databases.

YOUR TASK:
Convert natural language questions into valid PostgreSQL SELECT queries.

STRICT RULES:
1. Generate ONLY SELECT queries (no INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE)
2. Use proper PostgreSQL syntax
3. Always include table aliases for clarity
4. Use explicit JOIN conditions
5. Respond ONLY with valid JSON (no markdown, no explanations outside JSON)
6. RESPECT the exact number of records requested (use LIMIT)
7. RESPECT the specific columns requested (don't SELECT * when user asks for specific columns)
8. Use ORDER BY for "últimos" (latest) queries with DESC

JSON RESPONSE FORMAT:
{
  "sql": "SELECT ... FROM ... WHERE ...",
  "explanation": "Esta query busca X filtrando por Y",
  "confidence": 85,
  "suggestedTable": "main_table_name",
  "requiresClarification": false,
  "clarificationQuestion": null,
  "metadata": {
    "columnsUsed": ["column1", "column2"],
    "filtersApplied": ["status = 'active'"],
    "aggregationUsed": null
  }
}

CONFIDENCE SCORING:
- 90-100: Query clara, tabelas/colunas óbvias
- 70-89: Query razoável, pequena ambiguidade
- 50-69: Query ambígua, múltiplas interpretações possíveis
- 0-49: Query impossível sem clarificação

If confidence < 70:
- Set "requiresClarification": true
- Provide "clarificationQuestion" in Portuguese asking for missing info

EXAMPLES:

User: "Mostre todos os usuários ativos"
Response:
{
  "sql": "SELECT * FROM users u WHERE u.status = 'active'",
  "explanation": "Esta query retorna todos os registros da tabela users onde o status é 'active'",
  "confidence": 95,
  "suggestedTable": "users",
  "requiresClarification": false,
  "metadata": {
    "columnsUsed": ["*"],
    "filtersApplied": ["status = 'active'"],
    "aggregationUsed": null
  }
}

User: "Qual o email dos 5 últimos clientes?"
Response:
{
  "sql": "SELECT c.email FROM customers c ORDER BY c.created_at DESC LIMIT 5",
  "explanation": "Esta query retorna apenas os emails dos 5 clientes mais recentes",
  "confidence": 95,
  "suggestedTable": "customers",
  "requiresClarification": false,
  "metadata": {
    "columnsUsed": ["email"],
    "filtersApplied": [],
    "aggregationUsed": null
  }
}

User: "Quais os nomes dos 3 primeiros produtos?"
Response:
{
  "sql": "SELECT p.name FROM products p ORDER BY p.id ASC LIMIT 3",
  "explanation": "Esta query retorna apenas os nomes dos 3 primeiros produtos",
  "confidence": 95,
  "suggestedTable": "products",
  "requiresClarification": false,
  "metadata": {
    "columnsUsed": ["name"],
    "filtersApplied": [],
    "aggregationUsed": null
  }
}

User: "Quantos pedidos foram feitos no último mês?"
Response:
{
  "sql": "SELECT COUNT(*) as total FROM orders o WHERE o.created_at >= CURRENT_DATE - INTERVAL '1 month'",
  "explanation": "Esta query conta todos os pedidos criados nos últimos 30 dias",
  "confidence": 90,
  "suggestedTable": "orders",
  "requiresClarification": false,
  "metadata": {
    "columnsUsed": ["created_at"],
    "filtersApplied": ["created_at >= last month"],
    "aggregationUsed": "COUNT"
  }
}

User: "Mostre os dados"
Response:
{
  "sql": null,
  "explanation": "Preciso de mais informações para gerar a query",
  "confidence": 30,
  "suggestedTable": null,
  "requiresClarification": true,
  "clarificationQuestion": "De qual tabela você gostaria de ver os dados? Temos: users, orders, products.",
  "metadata": null
}`;
  }

  /**
   * Builds user message with schema context
   */
  private buildUserMessage(request: NLQueryRequest): string {
    const schemaContext = this.formatSchemaContext(request.context.availableTables);

    let message = `${schemaContext}\n\nUser question: "${request.query}"`;

    if (request.context.currentTable) {
      message += `\n\nCurrent table in focus: ${request.context.currentTable}`;
    }

    if (request.context.recentQueries && request.context.recentQueries.length > 0) {
      message += `\n\nRecent queries executed:\n${request.context.recentQueries.slice(0, 3).join('\n')}`;
    }

    message += '\n\nGenerate the SQL query following the JSON format specified.';

    return message;
  }

  /**
   * Chama Anthropic Claude
   */
  private async callAnthropic(
    systemPrompt: string,
    userMessage: string
  ): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const response = await this.anthropicClient.messages.create({
      model: this.providerConfig.model,
      max_tokens: this.providerConfig.maxTokens,
      temperature: this.providerConfig.temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    throw new Error('Unexpected response format from Anthropic');
  }

  /**
   * Chama OpenAI GPT
   */
  private async callOpenAI(
    systemPrompt: string,
    userMessage: string
  ): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openaiClient.chat.completions.create({
      model: this.providerConfig.model,
      // gpt-4o/5 style models expect max_completion_tokens instead of max_tokens
      max_completion_tokens: this.providerConfig.maxTokens,
      temperature: this.providerConfig.temperature,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    return content;
  }

  /**
   * Valida SQL gerado para prevenir comandos destrutivos
   * CRÍTICO: Rejeitar qualquer SQL que não seja SELECT puro
   */
  private validateSQL(sql: string): void {
    const sqlLower = sql.toLowerCase().trim();

    // Check if starts with SELECT
    if (!sqlLower.startsWith('select')) {
      logger.warn('Attempted to generate non-SELECT SQL:', { sql });
      throw new Error('Only SELECT queries are allowed');
    }

    // Block dangerous keywords
    const dangerousKeywords = [
      'drop', 'delete', 'update', 'insert', 'alter',
      'truncate', 'create', 'grant', 'revoke',
      'exec', 'execute'
    ];

    for (const keyword of dangerousKeywords) {
      const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
      if (pattern.test(sql)) {
        logger.error('SECURITY: Attempted to generate dangerous SQL:', {
          sql,
          keyword
        });
        throw new Error(`Dangerous SQL keyword detected: ${keyword}`);
      }
    }
  }

  /**
   * Formata schema de tabelas para o prompt
   */
  private formatSchemaContext(tables: TableSummary[]): string {
    if (tables.length === 0) {
      return 'No tables available in the database.';
    }

    let context = 'Available tables:\n';
    tables.forEach((table, index) => {
      context += `${index + 1}. ${table.name} (${table.columnCount} columns)\n`;
    });

    return context;
  }

  /**
   * Extrai JSON da resposta (remove markdown se presente)
   */
  private extractJSON(response: string): any {
    let jsonText = response.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      return JSON.parse(jsonText);
    } catch (error) {
      // Try to find JSON object in the text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (innerError) {
          logger.error('Failed to parse JSON from response:', { response });
          throw new Error('Invalid JSON response from AI provider');
        }
      }

      logger.error('Failed to extract JSON from response:', { response });
      throw new Error('Invalid JSON response from AI provider');
    }
  }
}

export const aiService = new AIService();
