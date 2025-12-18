/**
 * ChartContainer - Container responsivo para gráficos
 * Fornece header, loading, error states e suporte a exportação
 */

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Maximize2, AlertCircle } from 'lucide-react';

interface ChartContainerProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    loading?: boolean;
    error?: string;
    onExport?: () => void;
    onFullscreen?: () => void;
    className?: string;
    height?: number;
}

export const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(
    (
        {
            title,
            subtitle,
            children,
            loading = false,
            error,
            onExport,
            onFullscreen,
            className,
            height = 300,
        },
        ref
    ) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'relative rounded-lg border border-gold-500/20 bg-card/50 backdrop-blur-sm',
                    'hover:border-gold-500/40 transition-colors duration-300',
                    className
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                    <div>
                        <h3 className="text-sm font-medium text-foreground">{title}</h3>
                        {subtitle && (
                            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {onFullscreen && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-gold-400"
                                onClick={onFullscreen}
                            >
                                <Maximize2 className="h-4 w-4" />
                            </Button>
                        )}
                        {onExport && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-gold-400"
                                onClick={onExport}
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Chart Area */}
                <div
                    className="relative p-4"
                    style={{
                        height: `${height}px`,
                        minHeight: '250px',
                        width: '100%'
                    }}
                >
                    {/* Loading State */}
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                            <div className="flex flex-col items-center gap-2">
                                <div className="h-8 w-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm text-muted-foreground">
                                    Carregando...
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                            <div className="flex flex-col items-center gap-2 text-destructive">
                                <AlertCircle className="h-8 w-8" />
                                <span className="text-sm">{error}</span>
                            </div>
                        </div>
                    )}

                    {/* Chart Content */}
                    {!loading && !error && (
                        <ResponsiveContainer width="99%" height={height - 32}>
                            {children as React.ReactElement}
                        </ResponsiveContainer>
                    )}

                    {/* Loading Skeleton Fallback */}
                    {loading && !error && (
                        <div className="absolute inset-4 z-0">
                            <Skeleton className="w-full h-full" />
                        </div>
                    )}
                </div>
            </div>
        );
    }
);

ChartContainer.displayName = 'ChartContainer';

export default ChartContainer;
