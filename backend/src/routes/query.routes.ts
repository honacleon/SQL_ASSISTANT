/**
 * Query Routes
 * Secure query endpoint with filtering, sorting, and pagination
 */

import { Router } from 'express';
import { databaseService } from '../services';
import { logger } from '../config/logger';
import { queryOptionsSchema } from '../validators/query.validator';
import type { QueryOptions, QueryResult } from '@ai-assistant/shared';

const router = Router();

/**
 * POST /api/data/query
 * Executa query segura com filtros, ordenação e paginação
 * 
 * Body esperado:
 * {
 *   "table": "users",
 *   "filters": [
 *     { "column": "age", "operator": "gte", "value": 18 },
 *     { "column": "status", "operator": "eq", "value": "active" }
 *   ],
 *   "sort": { "column": "created_at", "order": "desc" },
 *   "pagination": { "page": 1, "pageSize": 20 },
 *   "search": {
 *     "query": "john",
 *     "columns": ["name", "email"]
 *   }
 * }
 */
router.post('/', async (req, res) => {
  try {
    // Validar request body
    const { error, value } = queryOptionsSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      logger.warn('Query validation failed:', {
        errors: error.details.map(d => d.message)
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const options: QueryOptions = value;

    logger.info('Executing secure query:', {
      table: options.table,
      filterCount: options.filters?.length || 0,
      hasSearch: !!options.search,
      page: options.pagination?.page || 1
    });

    // Executar query
    const result: QueryResult = await databaseService.executeSecureQuery(options);

    res.json({
      success: true,
      result
    });

  } catch (error: any) {
    logger.error('Query execution error:', error);

    // Tratar erros específicos
    if (error.message?.includes('Invalid operator')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      return res.status(404).json({
        success: false,
        error: `Table not found: ${req.body.table}`
      });
    }

    res.status(500).json({
      success: false,
      error: 'Query execution failed',
      message: error.message
    });
  }
});

export default router;
