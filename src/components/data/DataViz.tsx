/**
 * DataViz - Wrapper inteligente para visualização de dados
 * Detecta automaticamente o melhor tipo de visualização e permite toggle
 */

import React, { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChartContainer, BarChart, LineChart, PieChart } from '@/components/charts';
import { DataTable, DataTableColumn } from '@/components/data/DataTable';
import { ExportMenu } from '@/components/data/ExportMenu';
import { suggestChartType, ChartSuggestion, ChartType } from '@/services/chart-suggester';
import { BarChart3, Table2, TrendingUp, PieChartIcon } from 'lucide-react';

interface DataVizProps {
    data: Record<string, unknown>[];
    question?: string;
    defaultView?: 'chart' | 'table';
    title?: string;
    className?: string;
}

type ViewMode = 'chart' | 'table';

/**
 * Ícone do tipo de gráfico
 */
function ChartTypeIcon({ type }: { type: ChartType }) {
    switch (type) {
        case 'bar':
            return <BarChart3 className="h-4 w-4" />;
        case 'line':
            return <TrendingUp className="h-4 w-4" />;
        case 'pie':
            return <PieChartIcon className="h-4 w-4" />;
        default:
            return <Table2 className="h-4 w-4" />;
    }
}

/**
 * Gera colunas para DataTable a partir dos dados
 */
function generateTableColumns(
    data: Record<string, unknown>[]
): DataTableColumn<Record<string, unknown>>[] {
    if (data.length === 0) return [];

    const firstRow = data[0];
    return Object.keys(firstRow).map((key) => ({
        id: key,
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        accessorKey: key,
        sortable: true,
    }));
}

/**
 * Renderiza o gráfico apropriado
 */
function renderChart(
    data: Record<string, unknown>[],
    suggestion: ChartSuggestion,
    chartRef: React.RefObject<HTMLDivElement>
) {
    const { type, xKey, yKey } = suggestion;

    // Prepara dados para os gráficos
    const chartData = data.map((row) => ({
        name: String(row[xKey] || ''),
        value: Number(row[yKey] || 0),
        ...row,
    }));

    switch (type) {
        case 'bar':
            return (
                <ChartContainer
                    ref={chartRef}
                    title="Gráfico de Barras"
                    subtitle={`${xKey} × ${yKey}`}
                >
                    <BarChart data={chartData} xKey="name" yKey="value" />
                </ChartContainer>
            );

        case 'line':
            return (
                <ChartContainer
                    ref={chartRef}
                    title="Gráfico de Linha"
                    subtitle={`${xKey} × ${yKey}`}
                >
                    <LineChart data={chartData} xKey="name" yKey="value" showArea />
                </ChartContainer>
            );

        case 'pie':
            return (
                <ChartContainer
                    ref={chartRef}
                    title="Gráfico de Pizza"
                    subtitle={`Distribuição por ${xKey}`}
                >
                    <PieChart data={chartData} showLegend showLabels />
                </ChartContainer>
            );

        case 'metric':
            const value = chartData[0]?.value || 0;
            return (
                <div
                    ref={chartRef}
                    className="flex flex-col items-center justify-center p-8 bg-card/50 rounded-lg border border-gold-500/20"
                >
                    <span className="text-4xl font-bold text-gold-400">
                        {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
                    </span>
                    <span className="text-sm text-muted-foreground mt-2">{yKey}</span>
                </div>
            );

        default:
            return null;
    }
}

export const DataViz: React.FC<DataVizProps> = ({
    data,
    question,
    defaultView,
    title,
    className,
}) => {
    const chartRef = useRef<HTMLDivElement>(null);

    // Analisa dados e sugere tipo de gráfico
    const suggestion = useMemo(
        () => suggestChartType(data, question),
        [data, question]
    );

    // Determina visualização inicial
    const initialView: ViewMode = useMemo(() => {
        if (defaultView) return defaultView;
        if (suggestion.type === 'table' || suggestion.confidence < 0.7) return 'table';
        return 'chart';
    }, [defaultView, suggestion]);

    const [viewMode, setViewMode] = useState<ViewMode>(initialView);

    // Gera colunas para tabela
    const tableColumns = useMemo(() => generateTableColumns(data), [data]);

    // Verifica se gráfico é viável
    const chartAvailable =
        suggestion.type !== 'table' && suggestion.confidence >= 0.5;

    if (data.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-8">
                Nenhum dado disponível para visualização.
            </div>
        );
    }

    return (
        <div className={cn('space-y-3', className)}>
            {/* Header com toggle e exportação */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Toggle Chart/Table */}
                    {chartAvailable && (
                        <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
                            <Button
                                variant={viewMode === 'chart' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('chart')}
                                className="gap-1.5 h-7"
                            >
                                <ChartTypeIcon type={suggestion.type} />
                                <span className="hidden sm:inline">Gráfico</span>
                            </Button>
                            <Button
                                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('table')}
                                className="gap-1.5 h-7"
                            >
                                <Table2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Tabela</span>
                            </Button>
                        </div>
                    )}

                    {/* Indicador de sugestão */}
                    {chartAvailable && viewMode === 'chart' && (
                        <span className="text-xs text-muted-foreground hidden md:inline">
                            {suggestion.reason}
                        </span>
                    )}
                </div>

                {/* Export Menu */}
                <ExportMenu
                    data={data as Record<string, unknown>[]}
                    filename={title || 'dados'}
                    chartRef={viewMode === 'chart' ? chartRef : undefined}
                />
            </div>

            {/* Visualization */}
            <div style={{ minHeight: '300px', width: '100%' }}>
                {viewMode === 'chart' && chartAvailable ? (
                    renderChart(data, suggestion, chartRef)
                ) : (
                    <DataTable
                        columns={tableColumns}
                        data={data}
                        maxHeight="400px"
                        emptyMessage="Nenhum dado encontrado"
                        hideIdColumns={true}
                        smartFormatting={true}
                    />
                )}
            </div>
        </div>
    );
};

export default DataViz;
