/**
 * Organization Routes
 * Handles organization creation, verification, and management
 */

import { Router, Request, Response } from 'express';
import {
    createOrganization,
    getUserOrganization,
    getOrganization,
    listMembers
} from '../services/organization.service';
import { logger } from '../config/logger';

const router = Router();

/**
 * GET /api/organizations/me
 * Get current user's organization (if any)
 */
router.get('/me', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user?.id) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const organization = await getUserOrganization(user.id);

        res.json({
            success: true,
            data: organization,
            hasOrganization: !!organization,
        });
    } catch (error: any) {
        logger.error('Error getting user organization', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar organização',
        });
    }
});

/**
 * POST /api/organizations
 * Create a new organization for the current user
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user?.id) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ error: 'Nome da organização é obrigatório (mínimo 2 caracteres)' });
        }

        // Check if user already has an organization
        const existingOrg = await getUserOrganization(user.id);
        if (existingOrg) {
            return res.status(400).json({
                error: 'Você já está associado a uma organização',
                organization: existingOrg,
            });
        }

        logger.info('Creating organization', { userId: user.id, name: name.trim() });

        const organization = await createOrganization(name.trim(), user.id);

        res.status(201).json({
            success: true,
            data: organization,
            message: 'Organização criada com sucesso! Faça logout e login novamente para ativar.',
        });
    } catch (error: any) {
        logger.error('Error creating organization', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao criar organização',
        });
    }
});

/**
 * GET /api/organizations/:id
 * Get organization details by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user?.id) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const { id } = req.params;
        const organization = await getOrganization(id);

        // Verify user has access to this organization
        if (user.orgId !== id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        res.json({
            success: true,
            data: organization,
        });
    } catch (error: any) {
        logger.error('Error getting organization', { error: error.message });
        res.status(404).json({
            success: false,
            error: 'Organização não encontrada',
        });
    }
});

/**
 * GET /api/organizations/:id/members
 * Get organization members
 */
router.get('/:id/members', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user?.orgId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const { id } = req.params;

        // Verify user has access
        if (user.orgId !== id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const members = await listMembers(id);

        res.json({
            success: true,
            data: members,
        });
    } catch (error: any) {
        logger.error('Error listing members', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Erro ao listar membros',
        });
    }
});

export { router as organizationRoutes };
