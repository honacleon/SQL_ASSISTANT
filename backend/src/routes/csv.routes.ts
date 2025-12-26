/**
 * CSV Upload Routes
 * Handles file upload, listing, and deletion endpoints
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { csvUploadService, CSV_LIMITS } from '../services/csv-upload.service';
import { logger } from '../config/logger';

const router = Router();

// Configure multer for memory storage (files kept in buffer)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: CSV_LIMITS.MAX_FILE_SIZE,
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        // Accept only CSV and text files
        const allowedMimes = ['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel'];
        const allowedExts = ['.csv', '.txt'];

        const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

        if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos CSV são permitidos'));
        }
    },
});

/**
 * POST /api/csv/upload
 * Upload a CSV file
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user?.id) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        if (!user?.orgId) {
            return res.status(400).json({ error: 'Você precisa estar associado a uma organização para fazer upload de arquivos. Acesse o dashboard primeiro.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        // Check if can upload
        const canUpload = await csvUploadService.canUpload(user.orgId);
        if (!canUpload.allowed) {
            return res.status(400).json({ error: canUpload.message });
        }

        // Get options from request body
        const options = {
            encoding: req.body.encoding || 'UTF-8',
            delimiter: req.body.delimiter,
            expiresIn: req.body.expiresIn as '24h' | '7d' | '30d' | 'never',
        };

        logger.info('CSV upload started', {
            userId: user.id,
            orgId: user.orgId,
            filename: req.file.originalname,
            size: req.file.size,
        });

        const result = await csvUploadService.processUpload(
            req.file.buffer,
            req.file.originalname,
            user.orgId,
            user.id,
            options
        );

        res.status(201).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        logger.error('CSV upload error', { error: error.message });
        res.status(400).json({
            success: false,
            error: error.message || 'Erro ao processar arquivo',
        });
    }
});

/**
 * GET /api/csv/tables
 * List all CSV tables for the organization
 */
router.get('/tables', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user?.orgId) {
            // Sem organização, retornar lista vazia
            return res.json({
                success: true,
                data: [],
                count: 0,
                limits: {
                    maxTables: CSV_LIMITS.MAX_TABLES_PER_ORG,
                    maxFileSize: CSV_LIMITS.MAX_FILE_SIZE,
                    maxRows: CSV_LIMITS.MAX_ROWS,
                    maxColumns: CSV_LIMITS.MAX_COLUMNS,
                },
            });
        }

        const uploads = await csvUploadService.listUploads(user.orgId);

        res.json({
            success: true,
            data: uploads,
            count: uploads.length,
            limits: {
                maxTables: CSV_LIMITS.MAX_TABLES_PER_ORG,
                maxFileSize: CSV_LIMITS.MAX_FILE_SIZE,
                maxRows: CSV_LIMITS.MAX_ROWS,
                maxColumns: CSV_LIMITS.MAX_COLUMNS,
            },
        });
    } catch (error: any) {
        logger.error('Error listing CSV tables', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao listar arquivos',
        });
    }
});

/**
 * DELETE /api/csv/tables/:id
 * Delete a CSV table
 */
router.delete('/tables/:id', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user?.orgId) {
            return res.status(400).json({ error: 'Organização não encontrada' });
        }

        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'ID do arquivo não informado' });
        }

        await csvUploadService.deleteUpload(id, user.orgId);

        res.json({
            success: true,
            message: 'Arquivo excluído com sucesso',
        });
    } catch (error: any) {
        logger.error('Error deleting CSV table', { error: error.message });
        res.status(400).json({
            success: false,
            error: error.message || 'Erro ao excluir arquivo',
        });
    }
});

/**
 * GET /api/csv/limits
 * Get upload limits
 */
router.get('/limits', (_req: Request, res: Response) => {
    res.json({
        success: true,
        data: {
            maxFileSize: CSV_LIMITS.MAX_FILE_SIZE,
            maxFileSizeMB: CSV_LIMITS.MAX_FILE_SIZE / (1024 * 1024),
            maxRows: CSV_LIMITS.MAX_ROWS,
            maxColumns: CSV_LIMITS.MAX_COLUMNS,
            maxTablesPerOrg: CSV_LIMITS.MAX_TABLES_PER_ORG,
        },
    });
});

// Multer error handler
router.use((err: any, _req: Request, res: Response, next: any) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: `Arquivo excede o limite de ${CSV_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
            });
        }
        return res.status(400).json({
            success: false,
            error: err.message,
        });
    }

    if (err) {
        return res.status(400).json({
            success: false,
            error: err.message || 'Erro no upload',
        });
    }

    next();
});

export { router as csvRoutes };
