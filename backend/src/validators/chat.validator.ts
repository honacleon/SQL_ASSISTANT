/**
 * Chat Validators
 * Joi schemas and middleware for chat-related validation
 */

import Joi from 'joi';
import { validate as uuidValidate } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

/**
 * Schema for chat message request
 */
export const chatMessageSchema = Joi.object({
  message: Joi.string()
    .required()
    .min(1)
    .max(2000)
    .messages({
      'string.empty': 'Message cannot be empty',
      'string.max': 'Message cannot exceed 2000 characters'
    }),

  sessionId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Invalid session ID format (must be valid UUID)'
    }),

  context: Joi.object({
    currentTable: Joi.string()
      .pattern(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
      .optional()
  }).optional()
});

/**
 * Middleware para validar UUID em params
 */
export const validateSessionIdParam = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Routes use :id not :sessionId
  const { id } = req.params;

  if (!id || !uuidValidate(id)) {
    res.status(400).json({
      success: false,
      error: 'Invalid session ID format (must be valid UUID)'
    });
    return;
  }

  next();
};
