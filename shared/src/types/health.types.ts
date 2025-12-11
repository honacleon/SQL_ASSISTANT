/**
 * Health check types
 */

export type SystemStatus = 'healthy' | 'degraded' | 'unhealthy';
export type DatabaseStatus = 'connected' | 'disconnected' | 'unknown';

export interface ChatSessionsStats {
  activeSessions: number;
  totalMessages: number;
  oldestSessionAge: number | null; // in seconds
}

export interface EnvironmentInfo {
  nodeEnv: string;
  apiKeyEnabled: boolean;
  aiProvider?: 'anthropic' | 'openai' | null;
}

export interface HealthStatus {
  status: SystemStatus;
  timestamp: string;
  uptime: number; // in seconds
  responseTime?: string;
  database: DatabaseStatus;
  supabaseUrl?: string;
  chatSessions?: ChatSessionsStats;
  environment?: EnvironmentInfo;
}
