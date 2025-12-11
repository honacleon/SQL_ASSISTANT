/**
 * Environment configuration with validation
 * Single source of truth for all runtime configuration
 */

import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file
dotenvConfig();

interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
  ai: {
    provider: 'openai' | 'anthropic';
    apiKey: string;
    model?: string;
  };
  server: {
    port: number;
    nodeEnv: string;
  };
  apiKey?: string;
  frontendUrl: string;
  isDevelopment: boolean;
  anthropicApiKey?: string;
  openaiApiKey?: string;
}

/**
 * Validates that a required environment variable exists
 * Throws descriptive error if missing
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing ${key} — check .env file. Required for application startup.`
    );
  }
  return value;
}

/**
 * Gets optional environment variable with fallback
 */
function getEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

/**
 * Validates and exports type-safe configuration
 */
export function loadConfig(): EnvironmentConfig {
  // Validate critical Supabase credentials
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
  
  // Get AI provider keys (at least one must be present)
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  // Determine which provider to use
  let aiProvider: 'openai' | 'anthropic';
  let aiApiKey: string;
  
  if (anthropicApiKey) {
    aiProvider = 'anthropic';
    aiApiKey = anthropicApiKey;
  } else if (openaiApiKey) {
    aiProvider = 'openai';
    aiApiKey = openaiApiKey;
  } else {
    throw new Error(
      'Missing AI provider API key — set either ANTHROPIC_API_KEY or OPENAI_API_KEY in .env file'
    );
  }

  const nodeEnv = getEnv('NODE_ENV', 'development');
  
  return {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    ai: {
      provider: aiProvider,
      apiKey: aiApiKey,
      model: process.env.AI_MODEL,
    },
    server: {
      port: parseInt(getEnv('PORT', '3000'), 10),
      nodeEnv,
    },
    apiKey: process.env.API_KEY,
    frontendUrl: getEnv('FRONTEND_URL', '*'),
    isDevelopment: nodeEnv === 'development',
    anthropicApiKey,
    openaiApiKey,
  };
}

/**
 * Logs startup configuration (sanitized)
 */
export function logConfig(config: EnvironmentConfig): void {
  console.log('🚀 Configuration loaded:');
  console.log(`   Environment: ${config.server.nodeEnv}`);
  console.log(`   Port: ${config.server.port}`);
  console.log(`   Supabase URL: ${config.supabase.url}`);
  console.log(`   AI Provider: ${config.ai.provider}`);
  console.log(`   AI Model: ${config.ai.model || 'default'}`);
  console.log('');
}

/**
 * Singleton configuration instance
 * Loaded once at startup and reused throughout the application
 */
export const config = loadConfig();
