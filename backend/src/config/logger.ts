/**
 * Logger configuration using Winston
 * Console transport in development, file transport in production
 */

import winston from 'winston';
import { config } from './env.config';
import path from 'path';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

/**
 * Custom format for console output in development
 */
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0 && metadata.stack === undefined) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  if (metadata.stack) {
    msg += `\n${metadata.stack}`;
  }
  return msg;
});

/**
 * Create transports based on environment
 */
const transports: winston.transport[] = [
  // Console transport - always enabled
  new winston.transports.Console({
    format: config.isDevelopment
      ? combine(
          colorize({ all: true }),
          timestamp({ format: 'HH:mm:ss' }),
          errors({ stack: true }),
          devFormat
        )
      : combine(
          timestamp(),
          errors({ stack: true }),
          json()
        ),
  }),
];

// File transports - only in production
if (!config.isDevelopment) {
  const logsDir = path.join(process.cwd(), 'logs');
  
  // All logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      format: combine(timestamp(), errors({ stack: true }), json()),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Error logs only
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: combine(timestamp(), errors({ stack: true }), json()),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

/**
 * Winston logger instance
 * Configured with appropriate transports based on environment
 */
export const logger = winston.createLogger({
  level: config.isDevelopment ? 'debug' : 'info',
  defaultMeta: { service: 'ai-data-assistant' },
  transports,
});

/**
 * Stream for Morgan HTTP logger integration (if needed)
 */
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
