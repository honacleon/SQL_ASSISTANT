import { Router } from 'express';
import { NLPService } from '../services/nlp';
import { DatabaseService } from '../services/database';
import { NLQueryRequest, ApiResponse, ChatMessage } from '@ai-data-assistant/shared';
import { generateId } from '@ai-data-assistant/shared';
import logger from '../config/logger';
import Joi from 'joi';

const router = Router();
const nlpService = new NLPService();
const databaseService = new DatabaseService();

// In-memory chat history (in production, use Redis or database)
const chatHistory = new Map<string, ChatMessage[]>();

// Validation schema
const chatSchema = Joi.object({
  message: Joi.string().required().min(1).max(500),
  sessionId: Joi.string().optional(),
  context: Joi.object({
    currentTable: Joi.string().optional(),
    availableTables: Joi.array().items(Joi.string()).optional(),
    previousQueries: Joi.array().items(Joi.string()).optional()
  }).optional()
});

// POST /api/chat/message - Process natural language query
router.post('/message', async (req, res) => {
  try {
    const { error, value } = chatSchema.validate(req.body);
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: error.details[0].message
      };
      return res.status(400).json(response);
    }

    const { message, sessionId = 'default', context } = value;

    // Create user message
    const userMessage: ChatMessage = {
      id: generateId(),
      content: message,
      role: 'user',
      timestamp: new Date()
    };

    // Get or create chat history
    if (!chatHistory.has(sessionId)) {
      chatHistory.set(sessionId, []);
    }
    const history = chatHistory.get(sessionId)!;
    history.push(userMessage);

    try {
      // Get available tables for context
      const availableTables = await databaseService.getTables();

      // Create NL query request
      const nlRequest: NLQueryRequest = {
        message,
        context: {
          ...context,
          availableTables: availableTables.map(t => t.name),
          previousQueries: history
            .filter(msg => msg.queryGenerated)
            .slice(-3) // Last 3 queries for context
            .map(msg => msg.queryGenerated!)
        }
      };

      // Process natural language query
      const nlResponse = await nlpService.processNaturalLanguageQuery(nlRequest, availableTables);

      // ⚡ FAST PATH: Se confiança é alta (>= 0.9), aceita mesmo sem SQL (resposta conversacional)
      const isConversational = !nlResponse.sqlQuery && nlResponse.confidence >= 0.9;
      
      // Só retorna erro se confiança baixa E não é conversacional
      if (!isConversational && (!nlResponse.sqlQuery || nlResponse.confidence < 0.3)) {
        const assistantMessage: ChatMessage = {
          id: generateId(),
          content: `Desculpe, não consegui entender sua pergunta. Pode reformular ou ser mais específico sobre quais dados você gostaria de ver?

Algumas sugestões:
- "Mostre todos os registros da tabela [nome]"
- "Quantos registros existem na tabela [nome]?"
- "Filtre dados por [coluna] igual a [valor]"`,
          role: 'assistant',
          timestamp: new Date()
        };

        history.push(assistantMessage);

        const response: ApiResponse = {
          success: true,
          data: {
            message: assistantMessage,
            queryResult: null,
            confidence: nlResponse.confidence
          }
        };

        return res.json(response);
      }

      // O multiagente JÁ executou a query e formatou a resposta!
      // NÃO precisamos executar novamente
      const chatResponse = nlResponse.explanation;
      
      // Para compatibilidade com o frontend, criamos um queryResult vazio
      const queryResult = {
        data: [],
        count: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0
      };

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: generateId(),
        content: chatResponse,
        role: 'assistant',
        timestamp: new Date(),
        queryGenerated: nlResponse.sqlQuery,
        resultsCount: queryResult.count
      };

      history.push(assistantMessage);

      // Keep only last 20 messages per session
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          message: assistantMessage,
          queryResult,
          confidence: nlResponse.confidence,
          sqlQuery: nlResponse.sqlQuery
        }
      };

      res.json(response);

    } catch (queryError) {
      logger.error('Error processing query:', queryError);

      const assistantMessage: ChatMessage = {
        id: generateId(),
        content: 'Ocorreu um erro ao processar sua consulta. Por favor, tente reformular a pergunta ou verifique se os nomes das tabelas e colunas estão corretos.',
        role: 'assistant',
        timestamp: new Date()
      };

      history.push(assistantMessage);

      const response: ApiResponse = {
        success: true,
        data: {
          message: assistantMessage,
          queryResult: null,
          confidence: 0.0
        }
      };

      res.json(response);
    }

  } catch (error) {
    logger.error('Error in chat endpoint:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to process chat message'
    };
    res.status(500).json(response);
  }
});

// GET /api/chat/history/:sessionId - Get chat history
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = chatHistory.get(sessionId) || [];

    const response: ApiResponse = {
      success: true,
      data: history,
      message: 'Chat history retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Error retrieving chat history:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve chat history'
    };
    res.status(500).json(response);
  }
});

// DELETE /api/chat/history/:sessionId - Clear chat history
router.delete('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    chatHistory.delete(sessionId);

    const response: ApiResponse = {
      success: true,
      message: 'Chat history cleared successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Error clearing chat history:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to clear chat history'
    };
    res.status(500).json(response);
  }
});

// GET /api/chat/suggestions - Get query suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const tables = await databaseService.getTables();

    const suggestions = [
      'Mostre todos os dados',
      'Quantos registros existem?',
      'Mostre os últimos 10 registros',
      'Filtre por data de hoje',
      'Agrupe por categoria e conte',
      'Mostre estatísticas básicas',
    ];

    // Add table-specific suggestions if tables exist
    if (tables.length > 0) {
      const firstTable = tables[0];
      suggestions.push(
        `Mostre dados da tabela ${firstTable.name}`,
        `Quantos registros na tabela ${firstTable.name}?`
      );
    }

    const response: ApiResponse = {
      success: true,
      data: suggestions,
      message: 'Query suggestions retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Error getting suggestions:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get query suggestions'
    };
    res.status(500).json(response);
  }
});

export default router;