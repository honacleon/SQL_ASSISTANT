import { Router } from 'express';
import { DatabaseService } from '../services/database';
import { FilterOption, SortOption, ApiResponse } from '@ai-data-assistant/shared';
import logger from '../config/logger';
import Joi from 'joi';

const router = Router();
const databaseService = new DatabaseService();

// Validation schemas
const querySchema = Joi.object({
  tableName: Joi.string().required(),
  filters: Joi.array().items(Joi.object({
    column: Joi.string().required(),
    operator: Joi.string().valid('eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'in').required(),
    value: Joi.any().required()
  })).default([]),
  sorts: Joi.array().items(Joi.object({
    column: Joi.string().required(),
    direction: Joi.string().valid('asc', 'desc').required()
  })).default([]),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(1000).default(50),
  searchQuery: Joi.string().optional()
});

// GET /api/data/tables - Get all available tables
router.get('/tables', async (req, res) => {
  try {
    const tables = await databaseService.getTables();
    const response: ApiResponse = {
      success: true,
      data: tables,
      message: 'Tables retrieved successfully'
    };
    res.json(response);
  } catch (error) {
    logger.error('Error fetching tables:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch tables'
    };
    res.status(500).json(response);
  }
});

// GET /api/data/tables/:tableName/columns - Get columns for a specific table
router.get('/tables/:tableName/columns', async (req, res) => {
  try {
    const { tableName } = req.params;
    const columns = await databaseService.getTableColumns(tableName);
    const response: ApiResponse = {
      success: true,
      data: columns,
      message: 'Columns retrieved successfully'
    };
    res.json(response);
  } catch (error) {
    logger.error(`Error fetching columns for table ${req.params.tableName}:`, error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch table columns'
    };
    res.status(500).json(response);
  }
});

// GET /api/data/tables/:tableName/sample - Get sample data for a table
router.get('/tables/:tableName/sample', async (req, res) => {
  try {
    const { tableName } = req.params;
    const sampleSize = parseInt(req.query.size as string) || 5;
    const sampleData = await databaseService.getTableSample(tableName, sampleSize);
    const response: ApiResponse = {
      success: true,
      data: sampleData,
      message: 'Sample data retrieved successfully'
    };
    res.json(response);
  } catch (error) {
    logger.error(`Error fetching sample data for table ${req.params.tableName}:`, error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch sample data'
    };
    res.status(500).json(response);
  }
});

// POST /api/data/query - Execute a data query
router.post('/query', async (req, res) => {
  try {
    const { error, value } = querySchema.validate(req.body);
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: error.details[0].message
      };
      return res.status(400).json(response);
    }

    const {
      tableName,
      filters,
      sorts,
      page,
      pageSize,
      searchQuery
    } = value;

    const result = await databaseService.executeQuery(
      tableName,
      filters as FilterOption[],
      sorts as SortOption[],
      page,
      pageSize,
      searchQuery
    );

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Query executed successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Error executing query:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to execute query'
    };
    res.status(500).json(response);
  }
});

// POST /api/data/raw-sql - Execute raw SQL query (admin only)
router.post('/raw-sql', async (req, res) => {
  try {
    const { sqlQuery } = req.body;

    if (!sqlQuery) {
      const response: ApiResponse = {
        success: false,
        error: 'SQL query is required'
      };
      return res.status(400).json(response);
    }

    // Basic SQL injection protection (in production, use more sophisticated methods)
    const dangerousPatterns = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE'];
    const queryUpper = sqlQuery.toUpperCase();

    if (dangerousPatterns.some(pattern => queryUpper.includes(pattern))) {
      const response: ApiResponse = {
        success: false,
        error: 'Only SELECT queries are allowed'
      };
      return res.status(403).json(response);
    }

    const result = await databaseService.executeRawSQL(sqlQuery);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Raw SQL query executed successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Error executing raw SQL:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to execute raw SQL query'
    };
    res.status(500).json(response);
  }
});

export default router;