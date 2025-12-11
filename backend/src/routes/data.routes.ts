/**
 * Data Routes
 * Provides REST endpoints for database schema introspection and data access
 */

import { Router, Request, Response } from 'express';
import { databaseService } from '../services';
import { logger } from '../config/logger';
import type { TableSummary, ColumnInfo } from '@ai-assistant/shared';

const router = Router();

/**
 * GET /api/data/tables
 * Lista todas as tabelas disponíveis
 */
router.get('/tables', async (_req: Request, res: Response) => {
  try {
    const tables: TableSummary[] = await databaseService.getTables();
    
    res.json({
      success: true,
      data: tables,
      count: tables.length,
    });
  } catch (error) {
    logger.error('Error fetching tables', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tables',
    });
  }
});

/**
 * GET /api/data/tables/:tableName
 * Retorna detalhes completos de uma tabela específica
 */
router.get('/tables/:tableName', async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;

    // Validate tableName
    if (!tableName || tableName.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Table name is required',
      });
      return;
    }

    const tableInfo = await databaseService.getTableDetails(tableName);

    if (!tableInfo) {
      res.status(404).json({
        success: false,
        error: `Table '${tableName}' not found`,
      });
      return;
    }

    res.json({
      success: true,
      data: tableInfo,
    });
  } catch (error) {
    logger.error('Error fetching table details', {
      tableName: req.params.tableName,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch table details',
    });
  }
});

/**
 * GET /api/data/tables/:tableName/columns
 * Retorna colunas de uma tabela específica
 */
router.get('/tables/:tableName/columns', async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;

    // Validate tableName
    if (!tableName || tableName.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Table name is required',
      });
      return;
    }

    const columns: ColumnInfo[] = await databaseService.getTableColumns(tableName);

    res.json({
      success: true,
      data: columns,
      count: columns.length,
    });
  } catch (error) {
    logger.error('Error fetching columns', {
      tableName: req.params.tableName,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch columns',
    });
  }
});

/**
 * GET /api/data/tables/:tableName/sample
 * Retorna amostra de dados (máximo 100 registros)
 * Query param: ?size=10 (default: 10, max: 100)
 */
router.get('/tables/:tableName/sample', async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const sizeParam = req.query.size as string | undefined;

    // Validate tableName
    if (!tableName || tableName.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Table name is required',
      });
      return;
    }

    // Parse and validate size parameter
    let size = 10; // default
    if (sizeParam) {
      const parsedSize = parseInt(sizeParam, 10);
      if (isNaN(parsedSize) || parsedSize < 1) {
        res.status(400).json({
          success: false,
          error: 'Size must be a positive integer',
        });
        return;
      }
      size = Math.min(parsedSize, 100); // max 100
    }

    const data = await databaseService.getSampleData(tableName, size);

    res.json({
      success: true,
      data,
      count: data.length,
      requestedSize: size,
    });
  } catch (error) {
    logger.error('Error fetching sample data', {
      tableName: req.params.tableName,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch sample data',
    });
  }
});

export default router;
