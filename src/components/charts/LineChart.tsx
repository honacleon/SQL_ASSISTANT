/**
 * LineChart - Gráfico de linha para dados temporais
 * Suporta área preenchida e múltiplas séries
 */

import React from 'react';
import {
    LineChart as RechartsLineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Area,
    TooltipProps,
} from 'recharts';

interface LineChartData {
    name?: string;
    date?: string;
    value: number;
    [key: string]: string | number | undefined;
}

interface LineChartProps {
    data: LineChartData[];
    xKey?: string;
    yKey?: string | string[];
    colors?: string[];
    showGrid?: boolean;
    showArea?: boolean;
    showDots?: boolean;
    animate?: boolean;
}

// Custom Tooltip Component
interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ value: number; color: string; name: string }>;
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
            <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
            {payload.map((entry, index) => (
                <p
                    key={index}
                    className="text-sm"
                    style={{ color: entry.color }}
                >
                    <span className="font-medium">
                        {typeof entry.value === 'number'
                            ? entry.value.toLocaleString('pt-BR')
                            : entry.value}
                    </span>
                </p>
            ))}
        </div>
    );
};

export const LineChart: React.FC<LineChartProps> = ({
    data,
    xKey = 'date',
    yKey = 'value',
    colors = ['#d4a418', '#d9b84d'],
    showGrid = true,
    showArea = false,
    showDots = true,
    animate = true,
}) => {
    const yKeys = Array.isArray(yKey) ? yKey : [yKey];
    const areaGradientId = `areaGradient-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <RechartsLineChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
            <defs>
                {colors.map((color, index) => (
                    <linearGradient
                        key={index}
                        id={`${areaGradientId}-${index}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                    </linearGradient>
                ))}
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
            />

            <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                    typeof value === 'number' ? value.toLocaleString('pt-BR') : value
                }
            />

            <Tooltip content={<CustomTooltip />} />

            {yKeys.map((key, index) => (
                <React.Fragment key={key}>
                    {showArea && (
                        <Area
                            type="monotone"
                            dataKey={key}
                            stroke="none"
                            fill={`url(#${areaGradientId}-${index})`}
                            isAnimationActive={animate}
                            animationDuration={800}
                        />
                    )}
                    <Line
                        type="monotone"
                        dataKey={key}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        dot={
                            showDots
                                ? {
                                    fill: colors[index % colors.length],
                                    strokeWidth: 0,
                                    r: 4,
                                }
                                : false
                        }
                        activeDot={{
                            fill: colors[index % colors.length],
                            stroke: 'hsl(var(--background))',
                            strokeWidth: 2,
                            r: 6,
                        }}
                        isAnimationActive={animate}
                        animationDuration={800}
                        animationEasing="ease-out"
                    />
                </React.Fragment>
            ))}
        </RechartsLineChart>
    );
};

export default LineChart;
