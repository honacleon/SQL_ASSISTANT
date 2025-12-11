/**
 * StatusPage - System health and configuration monitoring
 */

import React from 'react';
import { useHealth } from '@/hooks/useHealth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle2, Database, Activity, Cpu, RefreshCw, MessageSquare } from 'lucide-react';
import type { HealthStatus } from '@ai-assistant/shared';

// ==================== Helper Functions ====================

const formatUptime = (uptime?: number): string => {
  if (!uptime || uptime <= 0) return '—';
  const totalSeconds = Math.floor(uptime);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0 && minutes === 0) {
    return `${totalSeconds}s`;
  }

  if (hours === 0) {
    return `${minutes}min`;
  }

  return `${hours}h ${minutes}min`;
};

const formatOldestSessionAge = (age?: number | null): string => {
  if (age == null || age <= 0) return '—';
  const minutes = Math.floor(age / 60);
  const hours = Math.floor(minutes / 60);

  if (hours === 0) return `${minutes}min`;
  return `${hours}h`;
};

// ==================== Sub-components ====================

interface StatusCardProps {
  data: HealthStatus | null;
  loading: boolean;
}

const SystemStatusCard: React.FC<StatusCardProps> = ({ data, loading }) => {
  const status = data?.status ?? 'unknown';

  const statusConfig = {
    healthy: {
      label: 'Saudável',
      color: 'bg-emerald-500',
      icon: CheckCircle2,
    },
    degraded: {
      label: 'Degradado',
      color: 'bg-amber-500',
      icon: Activity,
    },
    unhealthy: {
      label: 'Indisponível',
      color: 'bg-red-500',
      icon: AlertCircle,
    },
    unknown: {
      label: 'Desconhecido',
      color: 'bg-slate-400',
      icon: AlertCircle,
    },
  }[status];

  const Icon = statusConfig.icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${statusConfig.color} text-white`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm">Status geral</CardTitle>
            <CardDescription className="text-xs">
              Estado agregado da API.
            </CardDescription>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {statusConfig.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-2 text-xs text-muted-foreground">
        {loading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <>
            <div>
              <span className="font-medium text-foreground">Uptime:</span>{' '}
              {formatUptime(data?.uptime)}
            </div>
            <div>
              <span className="font-medium text-foreground">Última checagem:</span>{' '}
              {data?.timestamp
                ? new Date(data.timestamp).toLocaleString()
                : '—'}
            </div>
            <div>
              <span className="font-medium text-foreground">Tempo de resposta:</span>{' '}
              {data?.responseTime ?? '—'}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const DatabaseStatusCard: React.FC<StatusCardProps> = ({ data, loading }) => {
  const dbStatus = data?.database ?? 'unknown';

  const isConnected = dbStatus === 'connected';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm">Banco de dados</CardTitle>
            <CardDescription className="text-xs">
              Estado da conexão com o Supabase.
            </CardDescription>
          </div>
        </div>
        <Badge
          variant={isConnected ? 'outline' : 'destructive'}
          className="text-xs"
        >
          {isConnected ? 'Conectado' : 'Desconectado'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-2 text-xs text-muted-foreground">
        {loading ? (
          <>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </>
        ) : (
          <>
            <div>
              <span className="font-medium text-foreground">Status:</span>{' '}
              {dbStatus ?? '—'}
            </div>
            {data?.supabaseUrl && (
              <div>
                <span className="font-medium text-foreground">URL configurada:</span>{' '}
                {data.supabaseUrl}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

const ChatSessionsStatusCard: React.FC<StatusCardProps> = ({ data, loading }) => {
  const stats = data?.chatSessions;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm">Sessões de chat</CardTitle>
            <CardDescription className="text-xs">
              Uso atual do assistente de dados.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 text-xs text-muted-foreground">
        {loading || !stats ? (
          <>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </>
        ) : (
          <>
            <div>
              <span className="font-medium text-foreground">Sessões ativas:</span>{' '}
              {stats.activeSessions}
            </div>
            <div>
              <span className="font-medium text-foreground">Mensagens totais:</span>{' '}
              {stats.totalMessages}
            </div>
            <div>
              <span className="font-medium text-foreground">Sessão mais antiga:</span>{' '}
              {formatOldestSessionAge(stats.oldestSessionAge)}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const EnvironmentStatusCard: React.FC<StatusCardProps> = ({ data, loading }) => {
  const env = data?.environment;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-500 text-white">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm">Ambiente & Config</CardTitle>
            <CardDescription className="text-xs">
              Informações de runtime da API.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 text-xs text-muted-foreground">
        {loading || !env ? (
          <>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-28" />
          </>
        ) : (
          <>
            <div>
              <span className="font-medium text-foreground">NODE_ENV:</span>{' '}
              {env.nodeEnv}
            </div>
            <div>
              <span className="font-medium text-foreground">Proteção por API Key:</span>{' '}
              {env.apiKeyEnabled ? 'Ativada' : 'Desativada'}
            </div>
            <div>
              <span className="font-medium text-foreground">Provider de IA:</span>{' '}
              {env.aiProvider ?? 'Nenhum (IA desativada)'}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== Main Component ====================

export function StatusPage() {
  const { data, loading, error, refresh } = useHealth();

  const handleRefresh = () => {
    refresh();
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Status do Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe a saúde do backend, banco de dados e sessões de chat.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Separator />

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <CardTitle className="text-sm">Erro ao carregar status</CardTitle>
              <CardDescription className="text-xs text-destructive">
                {error}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Card status geral */}
        <SystemStatusCard data={data} loading={loading} />

        {/* Banco de dados */}
        <DatabaseStatusCard data={data} loading={loading} />

        {/* Sessões de chat */}
        <ChatSessionsStatusCard data={data} loading={loading} />

        {/* Ambiente / Config */}
        <EnvironmentStatusCard data={data} loading={loading} />
      </div>
    </div>
  );
}

export default StatusPage;
