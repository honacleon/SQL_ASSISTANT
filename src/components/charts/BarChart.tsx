/**
 * BarChart - Gráfico de barras com estilo premium
 * Usa gradiente dourado e tooltips customizados
 */

import React from 'react';
import {
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    TooltipProps,
} from 'recharts';

interface BarChartData {
    name: string;
    value: number;
    [key: string]: string | number;
}

interface BarChartProps {
    data: BarChartData[];
    xKey?: string;
    yKey?: string;
    color?: string;
    gradientFrom?: string;
    gradientTo?: string;
    showGrid?: boolean;
    showTooltip?: boolean;
    animate?: boolean;
}

// Custom Tooltip Component
interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
    active,
    payload,
    label,
}) => {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="bg-card/95 backdrop-blur-sm border border-gold-500/30 rounded-lg px-3 py-2 shadow-lg">
            <p className="text-sm font-medium text-foreground">{label}</p>
            {payload.map((entry, index) => (
                <p key={index} className="text-sm text-gold-400">
                    {typeof entry.value === 'number'
                        ? entry.value.toLocaleString('pt-BR')
                        : entry.value}
                </p>
            ))}
        </div>
    );
};

export const BarChart: React.FC<BarChartProps> = ({
    data,
    xKey = 'name',
    yKey = 'value',
    gradientFrom = '#d4a418',
    gradientTo = '#b88a14',
    showGrid = true,
    showTooltip = true,
    animate = true,
}) => {
    const gradientId = `barGradient-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <RechartsBarChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={gradientFrom} stopOpacity={1} />
                    <stop offset="100%" stopColor={gradientTo} stopOpacity={0.8} />
                </linearGradient>
            </defs>

            {showGrid && (
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.3}
                    vertical={false}
                />
            )}

            <XAxis
                dataKey={xKey}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                angle={data.length > 6 ? -45 : 0}
                textAnchor={data.length > 6 ? 'end' : 'middle'}
                height={data.length > 6 ? 60 : 30}
            />

            <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                    typeof value === 'number' ? value.toLocaleString('pt-BR') : value
                }
            />

            {showTooltip && <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />}

            <Bar
                dataKey={yKey}
                fill={`url(#${gradientId})`}
                radius={[4, 4, 0, 0]}
                isAnimationActive={animate}
                animationDuration={800}
                animationEasing="ease-out"
            >
                {data.map((_, index) => (
                    <Cell
                        key={`cell-${index}`}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                ))}
            </Bar>
        </RechartsBarChart>
    );
};

export default BarChart;
