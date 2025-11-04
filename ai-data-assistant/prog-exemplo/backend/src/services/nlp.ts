import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { NLQueryRequest, NLQueryResponse, TableInfo } from '@ai-data-assistant/shared';
import logger from '../config/logger';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
}) : null;

export class NLPService {
  private preferredProvider: 'openai' | 'anthropic' = 'openai';

  constructor() {
    // Determine which provider to use based on available API keys
    if (process.env.OPENAI_API_KEY) {
      this.preferredProvider = 'openai';
    } else if (process.env.ANTHROPIC_API_KEY) {
      this.preferredProvider = 'anthropic';
    } else {
      throw new Error('No AI provider API key found. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY');
    }
  }

  async processNaturalLanguageQuery(
    request: NLQueryRequest,
    availableTables: TableInfo[]
  ): Promise<NLQueryResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(availableTables);
      const userPrompt = this.buildUserPrompt(request);

      let response: string;

      if (this.preferredProvider === 'openai' && openai) {
        response = await this.queryOpenAI(systemPrompt, userPrompt);
      } else if (this.preferredProvider === 'anthropic' && anthropic) {
        response = await this.queryAnthropic(systemPrompt, userPrompt);
      } else {
        throw new Error('No AI provider available');
      }

      return this.parseAIResponse(response);
    } catch (error) {
      logger.error('Error processing natural language query:', error);
      throw new Error('Failed to process natural language query');
    }
  }

  private async queryOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!openai) throw new Error('OpenAI client not initialized');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
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
      model: 'claude-3-sonnet-20240229',
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

    return `You are a SQL query generator for PostgreSQL. Your task is to convert natural language questions into SQL queries based on the provided database schema.

Database Schema:
${tableSchemas}

Rules:
1. Generate valid PostgreSQL SQL queries only
2. Always use proper table and column names from the schema
3. For date comparisons, use PostgreSQL date functions
4. Use ILIKE for case-insensitive text searches
5. Always include appropriate WHERE clauses for filtering
6. Use LIMIT for queries that might return too many results
7. Respond in JSON format with: {"sql": "query", "explanation": "what the query does", "confidence": 0.9, "suggestedTable": "main_table"}

Examples:
- "Show me all users" → SELECT * FROM users LIMIT 100
- "How many orders were placed today?" → SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE
- "Find products with price over 100" → SELECT * FROM products WHERE price > 100`;
  }

  private buildUserPrompt(request: NLQueryRequest): string {
    let prompt = `Natural Language Query: "${request.message}"`;

    if (request.context?.currentTable) {
      prompt += `\\nCurrent Table Context: ${request.context.currentTable}`;
    }

    if (request.context?.previousQueries?.length) {
      prompt += `\\nPrevious Queries: ${request.context.previousQueries.join(', ')}`;
    }

    prompt += '\\n\\nGenerate the SQL query and respond in the specified JSON format.';

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
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 300
        });
        response = completion.choices[0]?.message?.content || '';
      } else if (this.preferredProvider === 'anthropic' && anthropic) {
        const message = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
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