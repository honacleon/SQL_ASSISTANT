import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { NLQueryRequest, NLQueryResponse, TableInfo } from '@ai-data-assistant/shared';
import logger from '../config/logger';
import { MultiAgentService } from './multiagent';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
}) : null;

export class NLPService {
  private preferredProvider: 'openai' | 'anthropic' = 'anthropic';
  private multiAgentService: MultiAgentService;

  constructor() {
    // Determine which provider to use based on available API keys
    // Prioritize Anthropic since OpenAI key appears to be invalid
    if (process.env.ANTHROPIC_API_KEY) {
      this.preferredProvider = 'anthropic';
    } else if (process.env.OPENAI_API_KEY) {
      this.preferredProvider = 'openai';
    } else {
      throw new Error('No AI provider API key found. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY');
    }

    // Inicializar sistema multiagente
    this.multiAgentService = new MultiAgentService();
  }

  async processNaturalLanguageQuery(
    request: NLQueryRequest,
    availableTables: TableInfo[]
  ): Promise<NLQueryResponse> {
    try {
      logger.info('🔄 NLPService: Iniciando processamento com sistema multiagente');
      
      // Primeiro tentar usar o sistema multiagente (mais rápido e confiável)
      try {
        const multiAgentResponse = await this.multiAgentService.processQuery(request, availableTables);
        
        // Se a confiança for alta, usar a resposta do multiagente
        if (multiAgentResponse.confidence >= 0.7) {
          logger.info(`✅ NLPService: Usando resposta do multiagente (confiança: ${multiAgentResponse.confidence})`);
          return multiAgentResponse;
        }
        
        logger.info(`⚠️ NLPService: Confiança baixa do multiagente (${multiAgentResponse.confidence}), usando IA`);
      } catch (multiAgentError) {
        logger.warn('⚠️ NLPService: Multiagente falhou, usando IA tradicional:', multiAgentError);
      }

      // Fallback para IA tradicional se multiagente falhar ou tiver confiança baixa
      return await this.processWithTraditionalAI(request, availableTables);
      
    } catch (error) {
      logger.error('❌ NLPService: Erro no processamento:', error);
      throw new Error('Failed to process natural language query');
    }
  }

  private async processWithTraditionalAI(
    request: NLQueryRequest,
    availableTables: TableInfo[]
  ): Promise<NLQueryResponse> {
    const systemPrompt = this.buildSystemPrompt(availableTables);
    const userPrompt = this.buildUserPrompt(request);

    let response: string;

    // Try preferred provider first, then fallback to the other
    if (this.preferredProvider === 'openai' && openai) {
      try {
        response = await this.queryOpenAI(systemPrompt, userPrompt);
      } catch (error) {
        logger.warn('OpenAI failed, trying Anthropic:', error);
        if (anthropic) {
          response = await this.queryAnthropic(systemPrompt, userPrompt);
        } else {
          throw error;
        }
      }
    } else if (this.preferredProvider === 'anthropic' && anthropic) {
      try {
        response = await this.queryAnthropic(systemPrompt, userPrompt);
      } catch (error) {
        logger.warn('Anthropic failed, trying OpenAI:', error);
        if (openai) {
          response = await this.queryOpenAI(systemPrompt, userPrompt);
        } else {
          throw error;
        }
      }
    } else {
      throw new Error('No AI provider available');
    }

    return this.parseAIResponse(response);
  }

  private async queryOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!openai) throw new Error('OpenAI client not initialized');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 1000
    });

    return completion.choices[0]?.message?.content || '';
  }

  private async queryAnthropic(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!anthropic) throw new Error('Anthropic client not initialized');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.1,
      max_tokens: 1000
    });

    const content = message.content[0];
    return content.type === 'text' ? content.text : '';
  }

  private buildSystemPrompt(tables: TableInfo[]): string {
    const tableSchemas = tables.map(table => {
      const columnsInfo = table.columns.map(col =>
        `${col.name} (${col.type}${col.nullable ? ', nullable' : ', not null'}${col.isPrimaryKey ? ', primary key' : ''})`
      ).join(', ');

      return `Table: ${table.name}\\nColumns: ${columnsInfo}`;
    }).join('\\n\\n');

    return `You are an expert SQL analyst specialized in PostgreSQL. Your ONLY task is to convert natural language questions into valid SQL queries based on the provided database schema.

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. Generate ONLY valid PostgreSQL SQL queries
2. ALWAYS use exact table and column names from the schema
3. For counting records: ALWAYS use SELECT COUNT(*) FROM table_name
4. For listing data: ALWAYS use SELECT * FROM table_name LIMIT 100
5. Use PostgreSQL functions appropriately (CURRENT_DATE, NOW(), etc.)
6. For text searches: Use ILIKE for case-insensitive matching
7. ALWAYS respond in EXACT JSON format: {"sql": "query", "explanation": "what the query does", "confidence": 0.9, "suggestedTable": "table_name"}
8. NEVER add any additional text, comments, or explanations outside the JSON
9. If unsure about table names, use the most logical table from the schema

Database Schema:
${tableSchemas}

EXAMPLES - FOLLOW THESE EXACTLY:

Input: "How many users are there?"
Output: {"sql": "SELECT COUNT(*) FROM users", "explanation": "Counts total records in users table", "confidence": 1.0, "suggestedTable": "users"}

Input: "Show me all products"
Output: {"sql": "SELECT * FROM products LIMIT 100", "explanation": "Shows all records from products table (limited to 100)", "confidence": 1.0, "suggestedTable": "products"}

Input: "List the latest 10 orders"
Output: {"sql": "SELECT * FROM orders ORDER BY created_at DESC LIMIT 10", "explanation": "Shows 10 most recent orders", "confidence": 1.0, "suggestedTable": "orders"}

Input: "Find users with email containing gmail"
Output: {"sql": "SELECT * FROM users WHERE email ILIKE '%gmail%' LIMIT 100", "explanation": "Finds users with gmail in email address", "confidence": 1.0, "suggestedTable": "users"}

Input: "Count products with price over 50"
Output: {"sql": "SELECT COUNT(*) FROM products WHERE price > 50", "explanation": "Counts products with price greater than 50", "confidence": 1.0, "suggestedTable": "products"}

YOUR RESPONSE MUST BE PURE JSON ONLY - NO ADDITIONAL TEXT.`;
  }

  private buildUserPrompt(request: NLQueryRequest): string {
    let prompt = `USER QUERY: "${request.message}"`;

    if (request.context?.currentTable) {
      prompt += `\\nCurrent Table Context: ${request.context.currentTable}`;
    }

    if (request.context?.previousQueries?.length) {
      prompt += `\\nPrevious Queries: ${request.context.previousQueries.join(', ')}`;
    }

    prompt += '\\n\\nGENERATE SQL QUERY ONLY. RESPONSE MUST BE PURE JSON: {"sql": "query", "explanation": "explanation", "confidence": 0.9, "suggestedTable": "table_name"}';

    return prompt;
  }

  private parseAIResponse(response: string): NLQueryResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\\{[\\s\\S]*\\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          sqlQuery: parsed.sql || '',
          explanation: parsed.explanation || 'Query generated successfully',
          confidence: parsed.confidence || 0.8,
          suggestedTable: parsed.suggestedTable
        };
      }

      // Fallback: try to extract SQL query from response
      const sqlMatch = response.match(/SELECT[\\s\\S]*?(?:;|$)/i);
      return {
        sqlQuery: sqlMatch ? sqlMatch[0].trim() : '',
        explanation: 'Query extracted from AI response',
        confidence: 0.6
      };
    } catch (error) {
      logger.error('Error parsing AI response:', error);
      return {
        sqlQuery: '',
        explanation: 'Failed to parse AI response',
        confidence: 0.0
      };
    }
  }

  async generateChatResponse(
    userMessage: string,
    queryResult: any,
    queryExecuted: string
  ): Promise<string> {
    try {
      const prompt = `User asked: "${userMessage}"
Query executed: ${queryExecuted}
Results: ${JSON.stringify(queryResult, null, 2)}

Generate a conversational response that:
1. Answers the user's question based on the data
2. Highlights key insights or patterns
3. Suggests follow-up questions if appropriate
4. Keeps the tone friendly and professional
5. Limit response to 2-3 sentences

Response:`;

      let response: string;

      if (this.preferredProvider === 'openai' && openai) {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 300
        });
        response = completion.choices[0]?.message?.content || '';
      } else if (this.preferredProvider === 'anthropic' && anthropic) {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 300
        });
        const content = message.content[0];
        response = content.type === 'text' ? content.text : '';
      } else {
        response = `Found ${queryResult.count} results for your query.`;
      }

      return response.trim();
    } catch (error) {
      logger.error('Error generating chat response:', error);
      return `Found ${queryResult.count} results matching your query.`;
    }
  }
}