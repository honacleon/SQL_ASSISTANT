/**
 * Query Validator
 * Joi schema for validating query options
 * Provides strict validation to prevent SQL injection
 */

import Joi from 'joi';
import type { FilterOperator } from '@ai-assistant/shared';

const ALLOWED_OPERATORS: FilterOperator[] = [
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'like', 'ilike', 'in', 'is'
];

export const queryOptionsSchema = Joi.object({
  table: Joi.string()
    .required()
    .pattern(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .messages({
      'string.pattern.base': 'Invalid table name format'
    }),

  filters: Joi.array()
    .items(
      Joi.object({
        column: Joi.string()
          .required()
          .pattern(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
          .messages({
            'string.pattern.base': 'Invalid column name format'
          }),
        
        operator: Joi.string()
          .valid(...ALLOWED_OPERATORS)
          .required()
          .messages({
            'any.only': `Operator must be one of: ${ALLOWED_OPERATORS.join(', ')}`
          }),
        
        value: Joi.any().required()
      })
    )
    .optional(),

  sort: Joi.object({
    column: Joi.string()
      .required()
      .pattern(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    
    order: Joi.string()
      .valid('asc', 'desc')
      .required(),
    
    nullsFirst: Joi.boolean().optional()
  }).optional(),

  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),
    
    pageSize: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
  }).optional(),

  search: Joi.object({
    query: Joi.string()
      .required()
      .min(1)
      .max(500),
    
    columns: Joi.array()
      .items(
        Joi.string().pattern(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
      )
      .min(1)
      .required(),
    
    caseSensitive: Joi.boolean()
      .optional()
      .default(false)
  }).optional(),

  columns: Joi.array()
    .items(
      Joi.string().pattern(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    )
    .optional()
});
